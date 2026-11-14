import { makeItem } from "../lib/items.ts"
import { writeText, readIfExists } from "../lib/cache.ts"
import { fetchText } from "../lib/http.ts"
import { isSince } from "../lib/time.ts"
import { elements, findAll, parseXml, textOf } from "../lib/xml.ts"
import { result, slug, type PullContext, type SourceResult } from "../lib/types.ts"

function locOf(node: import("../lib/xml.ts").XmlNode): string {
  return textOf(elements(node, "loc")[0])
}

function lastmodOf(node: import("../lib/xml.ts").XmlNode): string {
  return textOf(elements(node, "lastmod")[0])
}

export async function pullSitemaps(ctx: PullContext): Promise<SourceResult> {
  const started = Date.now()
  const rawPaths: string[] = []
  let count = 0
  let failures = 0
  let undated = 0

  async function addSitemap(id: string, url: string, body: string, rawPath: string): Promise<void> {
    const root = parseXml(body)
    const children = findAll(root, "sitemap")
    if (children.length > 0) {
      let nested = 0
      for (const child of children.slice(0, 20)) {
        const childUrl = locOf(child)
        if (!childUrl) continue
        const childRaw = `data/raw/sitemaps/${id}/${ctx.stamp}-${slug(childUrl.split("/").pop() ?? String(nested))}.xml`
        try {
          let childBody = await readIfExists(childRaw)
          if (childBody == null) {
            const response = await fetchText(childUrl, { accept: "application/xml, text/xml;q=0.9, */*;q=0.8" })
            if (response.status !== 200) continue
            childBody = response.body
            await writeText(childRaw, childBody)
          }
          rawPaths.push(childRaw)
          await addSitemap(id, childUrl, childBody, childRaw)
          nested++
        } catch {
          failures++
        }
      }
      return
    }

    for (const entry of findAll(root, "url")) {
      const loc = locOf(entry)
      if (!loc) continue
      const lastmod = lastmodOf(entry)
      if (!lastmod) {
        undated++
        continue
      }
      if (!isSince(lastmod, ctx.since)) continue
      ctx.items.push(
        makeItem({
          source: `sitemap:${id}`,
          source_id: loc,
          kind: "page",
          title: "",
          url: loc,
          published_at: lastmod,
          summary: "",
          source_tags: [`sitemap:${id}`],
          source_meta: { sitemap: id, source_url: url },
          raw: rawPath,
          fetched_at: ctx.fetchedAt,
        }),
      )
      count++
    }
  }

  for (const target of ctx.targets.sitemaps) {
    const rawPath = `data/raw/sitemaps/${target.id}/${ctx.stamp}.xml`
    try {
      let body = await readIfExists(rawPath)
      if (body == null) {
        const response = await fetchText(target.url, { accept: "application/xml, text/xml;q=0.9, */*;q=0.8" })
        if (response.status !== 200) {
          failures++
          continue
        }
        body = response.body
        await writeText(rawPath, body)
      }
      rawPaths.push(rawPath)
      await addSitemap(target.id, target.url, body, rawPath)
    } catch {
      failures++
    }
  }

  return result("sitemaps", started, {
    status: failures > 0 ? "partial" : "ok",
    items: count,
    raw: rawPaths,
    detail: `${ctx.targets.sitemaps.length} sitemaps, ${count} dated pages, ${undated} undated pages skipped, ${failures} failures`,
  })
}
