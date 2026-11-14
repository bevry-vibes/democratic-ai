import { makeItem } from "../lib/items.ts"
import { writeText, readIfExists } from "../lib/cache.ts"
import { fetchText, htmlToText } from "../lib/http.ts"
import { isSince } from "../lib/time.ts"
import { findAll, firstLink, firstText, parseXml } from "../lib/xml.ts"
import { result, slug, type PullContext, type SourceResult } from "../lib/types.ts"

export async function pullArxiv(ctx: PullContext): Promise<SourceResult> {
  const started = Date.now()
  const rawPaths: string[] = []
  let count = 0
  let failures = 0
  let feedEntries = 0
  for (const category of ctx.targets.arxiv.categories) {
    const url = `https://arxiv.org/rss/${category}`
    const rawPath = `data/raw/arxiv/${slug(category)}/${ctx.stamp}.feed.xml`
    try {
      let body = await readIfExists(rawPath)
      if (body == null) {
        const response = await fetchText(url, { accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8" })
        if (response.status !== 200) {
          failures++
          continue
        }
        body = response.body
        await writeText(rawPath, body)
      }
      rawPaths.push(rawPath)
      const root = parseXml(body)
      const nodes = findAll(root, "item")
      feedEntries += nodes.length
      for (const node of nodes) {
        const link = firstLink(node) || firstText(node, "guid")
        const published = firstText(node, "pubDate")
        if (!link || !isSince(published, ctx.since)) continue
        ctx.items.push(
          makeItem({
            source: `arxiv:${category}`,
            source_id: link,
            kind: "paper",
            title: htmlToText(firstText(node, "title")),
            url: link,
            published_at: published || null,
            summary: htmlToText(firstText(node, "description")).slice(0, 1200),
            source_tags: [`arxiv:${category}`],
            source_meta: { category, feed: url },
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
  return result("arxiv", started, {
    status: failures > 0 ? "partial" : "ok",
    items: count,
    raw: rawPaths,
    detail: `${ctx.targets.arxiv.categories.length} categories, ${feedEntries} feed entries, ${failures} failures. RSS covers only the most recent entries.`,
  })
}
