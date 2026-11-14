import { makeItem } from "../lib/items.ts"
import { readJSON, writeText } from "../lib/cache.ts"
import { fetchText } from "../lib/http.ts"
import { isSince, sleep } from "../lib/time.ts"
import { result, slug, type PullContext, type SourceResult } from "../lib/types.ts"

interface XMember {
  id: string
  username: string
}

interface XMembersSnapshot {
  data?: XMember[]
}

interface XTweet {
  id: string
  text: string
  created_at?: string
  lang?: string
  public_metrics?: Record<string, number>
  referenced_tweets?: Array<{ type: string; id: string }>
  entities?: Record<string, unknown>
  note_tweet?: { text?: string }
}

interface XTweetsResponse {
  data?: XTweet[]
  meta?: Record<string, unknown>
  errors?: unknown[]
  detail?: string
  title?: string
}

export async function pullX(ctx: PullContext): Promise<SourceResult> {
  const started = Date.now()
  const token = ctx.vars.TWITTER_BEARER_TOKEN ?? ""
  if (!token) {
    return result("x", started, {
      status: "skipped",
      items: 0,
      detail: "TWITTER_BEARER_TOKEN is absent",
    })
  }

  let members: XMember[] = []
  try {
    const snapshot = await readJSON<XMembersSnapshot>(ctx.targets.x.members_snapshot)
    members = snapshot.data ?? []
  } catch (error) {
    return result("x", started, {
      status: "error",
      items: 0,
      error: `members snapshot unavailable: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  const rawPaths: string[] = []
  let count = 0
  let failures = 0
  let stopped: string | undefined

  for (const member of members) {
    const rawPath = `data/raw/x/users/${slug(member.username)}/${ctx.stamp}.tweets.json`
    let body: string
    try {
      body = await Deno.readTextFile(rawPath)
    } catch {
      const url =
        `https://api.x.com/2/users/${member.id}/tweets` +
        `?max_results=${Math.max(5, Math.min(100, ctx.targets.windows.x_limit))}` +
        `&exclude=retweets,replies` +
        `&tweet.fields=created_at,text,lang,public_metrics,entities,referenced_tweets,note_tweet`
      try {
        const response = await fetchText(url, {
          headers: { authorization: `Bearer ${token}` },
          accept: "application/json",
          retries: 1,
        })
        if (response.status === 402) {
          stopped = "X API credits depleted"
          break
        }
        if (response.status === 429) {
          stopped = "X API rate limit reached"
          break
        }
        if (response.status !== 200) {
          failures++
          await sleep(200)
          continue
        }
        body = response.body
        await writeText(rawPath, body)
      } catch {
        failures++
        await sleep(200)
        continue
      }
    }
    rawPaths.push(rawPath)

    try {
      const parsed = JSON.parse(body) as XTweetsResponse
      for (const tweet of parsed.data ?? []) {
        const published = tweet.created_at ?? null
        ctx.items.push(
          makeItem({
            source: "x",
            source_id: tweet.id,
            kind: "post",
            title: `@${member.username}`,
            url: `https://x.com/${member.username}/status/${tweet.id}`,
            published_at: published,
            summary: (tweet.note_tweet?.text ?? tweet.text ?? "").slice(0, 2000),
            source_tags: ["x:post", ...(tweet.lang ? [`lang:${tweet.lang}`] : [])],
            source_meta: {
              author: member.username,
              user_id: member.id,
              lang: tweet.lang ?? null,
              metrics: tweet.public_metrics ?? null,
              referenced_tweets: tweet.referenced_tweets ?? null,
              entities: tweet.entities ?? null,
            },
            raw: rawPath,
            fetched_at: ctx.fetchedAt,
            in_window: published ? isSince(published, ctx.xSince) : false,
          }),
        )
        count++
      }
    } catch {
      failures++
    }
    await sleep(200)
  }

  return result("x", started, {
    status: stopped ? "partial" : failures > 0 ? "partial" : "ok",
    items: count,
    raw: rawPaths,
    detail: stopped
      ? stopped
      : `${members.length} accounts, latest ${ctx.targets.windows.x_limit} posts each, ${failures} failures`,
  })
}
