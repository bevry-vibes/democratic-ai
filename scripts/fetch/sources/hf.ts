import { makeItem } from "../lib/items.ts"
import { writeText, readIfExists } from "../lib/cache.ts"
import { fetchText, htmlToText } from "../lib/http.ts"
import { sleep, isSince } from "../lib/time.ts"
import { findAll, firstLink, firstText, parseXml, textOf } from "../lib/xml.ts"
import { result, slug, type PullContext, type SourceResult } from "../lib/types.ts"

interface HfModel {
  id: string
  pipeline_tag?: string
  library_name?: string
  tags?: string[]
  createdAt?: string
  lastModified?: string
  downloads?: number
  likes?: number
  gated?: boolean | string
  private?: boolean
}

interface HfDataset {
  id: string
  tags?: string[]
  createdAt?: string
  lastModified?: string
  downloads?: number
  likes?: number
  gated?: boolean | string
  private?: boolean
}

function authHeaders(ctx: PullContext): Record<string, string> {
  const token = ctx.vars.HF_ACCESS_TOKEN ?? ctx.vars.HF_TOKEN ?? ""
  return token ? { authorization: `Bearer ${token}` } : {}
}

export async function pullHfBlog(ctx: PullContext): Promise<SourceResult> {
  const started = Date.now()
  const rawPath = `data/raw/hf/blog/${ctx.stamp}.feed.xml`
  try {
    let body = await readIfExists(rawPath)
    if (body == null) {
      const response = await fetchText(ctx.targets.hugging_face.blog_feed, {
        accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
      })
      if (response.status !== 200) {
        return result("hf-blog", started, { status: "error", items: 0, error: `HTTP ${response.status}` })
      }
      body = response.body
      await writeText(rawPath, body)
    }
    const root = parseXml(body)
    const nodes = [...findAll(root, "item"), ...findAll(root, "entry")]
    const seen = new Set<string>()
    let count = 0
    for (const node of nodes) {
      const link = firstLink(node) || firstText(node, "guid")
      if (!link || seen.has(link)) continue
      seen.add(link)
      const published = firstText(node, "pubDate") || firstText(node, "updated") || firstText(node, "published")
      if (!isSince(published, ctx.since)) continue
      ctx.items.push(
        makeItem({
          source: "hf-blog",
          source_id: link,
          kind: "article",
          title: htmlToText(firstText(node, "title")),
          url: link,
          published_at: published || null,
          summary: htmlToText(firstText(node, "description") || textOf(node)).slice(0, 600),
          source_tags: ["hf:blog"],
          source_meta: { feed: ctx.targets.hugging_face.blog_feed },
          raw: rawPath,
          fetched_at: ctx.fetchedAt,
        }),
      )
      count++
    }
    return result("hf-blog", started, {
      status: "ok",
      items: count,
      raw: [rawPath],
      detail: `${nodes.length} feed entries, ${count} inside the window`,
    })
  } catch (error) {
    return result("hf-blog", started, {
      status: "error",
      items: 0,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function pullHfOrgs(ctx: PullContext): Promise<SourceResult> {
  const started = Date.now()
  const seen = new Set<string>()
  const orgs = ctx.watchlist.members
    .map((member) => member.hugging_face)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .filter((value) => {
      const key = value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  const rawPaths: string[] = []
  let count = 0
  let failures = 0
  for (const org of orgs) {
    const author = encodeURIComponent(org)
    const modelUrl = `https://huggingface.co/api/models?author=${author}&sort=lastModified&direction=-1&limit=${ctx.targets.hugging_face.model_limit}`
    const datasetUrl = `https://huggingface.co/api/datasets?author=${author}&sort=lastModified&direction=-1&limit=${ctx.targets.hugging_face.dataset_limit}`
    const orgSlug = slug(org)
    const modelRaw = `data/raw/hf/models/${orgSlug}/${ctx.stamp}.models.json`
    const datasetRaw = `data/raw/hf/datasets/${orgSlug}/${ctx.stamp}.datasets.json`

    try {
      let body = await readIfExists(modelRaw)
      if (body == null) {
        const response = await fetchText(modelUrl, { headers: authHeaders(ctx), accept: "application/json" })
        if (response.status === 200) {
          body = response.body
          await writeText(modelRaw, body)
        } else {
          failures++
        }
      }
      if (body != null) {
        rawPaths.push(modelRaw)
        const models = JSON.parse(body) as HfModel[]
        for (const model of models) {
          if (!isSince(model.createdAt, ctx.since) && !isSince(model.lastModified, ctx.since)) continue
          const tags = model.tags ?? []
          ctx.items.push(
            makeItem({
              source: "hf-models",
              source_id: model.id,
              kind: "model",
              title: model.id,
              url: `https://huggingface.co/${model.id}`,
              published_at: model.createdAt ?? model.lastModified ?? null,
              summary: [model.pipeline_tag, model.library_name].filter(Boolean).join(" · "),
              source_tags: [
                "hf:model",
                ...(model.pipeline_tag ? [`pipeline:${model.pipeline_tag}`] : []),
                ...(model.library_name ? [`library:${model.library_name}`] : []),
                ...tags,
              ],
              source_meta: {
                author: org,
                downloads: model.downloads ?? null,
                likes: model.likes ?? null,
                gated: model.gated ?? null,
                private: model.private ?? null,
                createdAt: model.createdAt ?? null,
                lastModified: model.lastModified ?? null,
                pipeline_tag: model.pipeline_tag ?? null,
                library_name: model.library_name ?? null,
                tags,
              },
              raw: modelRaw,
              fetched_at: ctx.fetchedAt,
            }),
          )
          count++
        }
      }
    } catch {
      failures++
    }

    await sleep(80)

    try {
      let body = await readIfExists(datasetRaw)
      if (body == null) {
        const response = await fetchText(datasetUrl, { headers: authHeaders(ctx), accept: "application/json" })
        if (response.status === 200) {
          body = response.body
          await writeText(datasetRaw, body)
        } else {
          failures++
        }
      }
      if (body != null) {
        rawPaths.push(datasetRaw)
        const datasets = JSON.parse(body) as HfDataset[]
        for (const dataset of datasets) {
          if (!isSince(dataset.createdAt, ctx.since) && !isSince(dataset.lastModified, ctx.since)) continue
          const tags = dataset.tags ?? []
          ctx.items.push(
            makeItem({
              source: "hf-datasets",
              source_id: dataset.id,
              kind: "dataset",
              title: dataset.id,
              url: `https://huggingface.co/datasets/${dataset.id}`,
              published_at: dataset.createdAt ?? dataset.lastModified ?? null,
              summary: "",
              source_tags: ["hf:dataset", ...tags],
              source_meta: {
                author: org,
                downloads: dataset.downloads ?? null,
                likes: dataset.likes ?? null,
                gated: dataset.gated ?? null,
                private: dataset.private ?? null,
                createdAt: dataset.createdAt ?? null,
                lastModified: dataset.lastModified ?? null,
                tags,
              },
              raw: datasetRaw,
              fetched_at: ctx.fetchedAt,
            }),
          )
          count++
        }
      }
    } catch {
      failures++
    }

    await sleep(80)
  }
  return result("hf-orgs", started, {
    status: failures > 0 ? "partial" : "ok",
    items: count,
    raw: rawPaths,
    detail: `${orgs.length} authors, ${failures} request failures`,
  })
}
