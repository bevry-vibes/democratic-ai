import type { APIRoute } from "astro"
import { getJournal } from "../../lib/data"
import { renderRss, SITE } from "../../lib/feeds"

export const GET: APIRoute = () => {
  const entries = getJournal()
  const xml = renderRss({
    title: "Democratic AI Journal",
    description: "Site updates, catalogue changes, and models whose weights are promised but not yet released.",
    home: "/journal/",
    path: "/journal/feed.xml",
    items: entries.map((entry) => ({
      title: entry.title,
      link: `${SITE}${entry.href}`,
      guid: `${SITE}${entry.href}`,
      date: entry.date,
      description: entry.summary,
      categories: [entry.kind],
    })),
  })
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  })
}
