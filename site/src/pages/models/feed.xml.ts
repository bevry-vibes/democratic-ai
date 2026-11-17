import type { APIRoute } from "astro"
import { getIndex } from "../../lib/data"
import { renderRss, SITE } from "../../lib/feeds"

export const GET: APIRoute = () => {
  const models = [...getIndex().models].sort((a, b) => {
    const released = (b.released ?? "").localeCompare(a.released ?? "")
    return released !== 0 ? released : a.name.localeCompare(b.name)
  })
  const xml = renderRss({
    title: "Democratic AI Models",
    description: "The reciprocal AI catalogue, ordered by model release date, newest first.",
    home: "/models/",
    path: "/models/feed.xml",
    items: models.map((model) => ({
      title: `${model.name} — ${model.organization}`,
      link: `${SITE}/models/${model.id}/`,
      guid: `${SITE}/models/${model.id}/`,
      date: model.released,
      description: [
        model.summary || `${model.name} is a ${model.tasks.join(", ") || "model"} from ${model.organization}.`,
        `Licence: ${model.license}. Tier: ${model.tier}. Weights: ${model.weights}.`,
      ].join(" "),
      categories: [model.organization, ...model.tasks],
    })),
  })
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  })
}
