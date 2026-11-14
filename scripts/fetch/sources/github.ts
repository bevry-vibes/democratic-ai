import { makeItem } from "../lib/items.ts"
import { writeText, readIfExists } from "../lib/cache.ts"
import { fetchText, htmlToText } from "../lib/http.ts"
import { isSince } from "../lib/time.ts"
import { findAll, firstLink, firstText, parseXml, textOf } from "../lib/xml.ts"
import { result, type PullContext, type SourceResult } from "../lib/types.ts"

export async function pullGitHub(ctx: PullContext): Promise<SourceResult> {
  const started = Date.now()
  const rawPaths: string[] = []
  let count = 0
  let failures = 0
  for (const repo of ctx.targets.github.repos) {
    const url = `https://github.com/${repo}/releases.atom`
    const rawPath = `data/raw/github/${repo}/${ctx.stamp}.releases.atom`
    try {
      let body = await readIfExists(rawPath)
      if (body == null) {
        const response = await fetchText(url, { accept: "application/atom+xml, application/xml;q=0.9, */*;q=0.8" })
        if (response.status !== 200) {
          failures++
          continue
        }
        body = response.body
        await writeText(rawPath, body)
      }
      rawPaths.push(rawPath)
      const root = parseXml(body)
      for (const entry of findAll(root, "entry")) {
        const updated = firstText(entry, "updated") || firstText(entry, "published")
        if (!isSince(updated, ctx.since)) continue
        const link = firstLink(entry)
        const title = firstText(entry, "title")
        ctx.items.push(
          makeItem({
            source: `github:${repo}`,
            source_id: firstText(entry, "id") || `${repo}@${title}`,
            kind: "release",
            title: `[${repo}] ${title}`,
            url: link,
            published_at: updated || null,
            summary: htmlToText(firstText(entry, "content") || textOf(entry)).slice(0, 1200),
            source_tags: ["github:release", `repo:${repo}`],
            source_meta: { repo },
            raw: rawPath,
            fetched_at: ctx.fetchedAt,
          }),
        )
        count++
      }
    } catch {
      failures++
    }
  }
  return result("github", started, {
    status: failures > 0 ? "partial" : "ok",
    items: count,
    raw: rawPaths,
    detail: `${ctx.targets.github.repos.length} repositories, ${failures} failures`,
  })
}
