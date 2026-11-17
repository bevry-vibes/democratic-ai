export const SITE = "https://democratic-ai.bevry.me"

export interface FeedItem {
  title: string
  link: string
  guid: string
  date: string | null
  description: string
  categories?: string[]
}

export interface Feed {
  title: string
  description: string
  home: string
  path: string
  items: FeedItem[]
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function timestamp(date: string | null): number | null {
  if (!date) return null
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00Z`)
    : new Date(date)
  return Number.isNaN(parsed.valueOf()) ? null : parsed.valueOf()
}

function rfc822(date: string | null): string | null {
  const ts = timestamp(date)
  return ts == null ? null : new Date(ts).toUTCString()
}

export function renderRss(feed: Feed): string {
  const dated = feed.items.map((item) => ({ item, pubDate: rfc822(item.date) }))
  const newest = Math.max(0, ...feed.items.map((item) => timestamp(item.date) ?? 0))
  const lastBuildDate = newest > 0 ? new Date(newest).toUTCString() : new Date().toUTCString()

  const items = dated
    .map(({ item, pubDate }) => {
      const categories = (item.categories ?? [])
        .map((category) => `      <category>${escapeXml(category)}</category>`)
        .join("\n")
      return [
        "    <item>",
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(item.link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : null,
        `      <description>${escapeXml(item.description)}</description>`,
        categories || null,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n")
    })
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <link>${escapeXml(`${SITE}${feed.home}`)}</link>
    <description>${escapeXml(feed.description)}</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(`${SITE}${feed.path}`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`
}
