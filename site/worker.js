const MAX_MODELS = 4

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function score(value) {
  return value == null ? "—" : String(value)
}

function yesNo(value) {
  return value === true ? "Yes" : value === false ? "No" : "Unknown"
}

function context(tokens) {
  if (tokens == null) return "Unknown"
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`
  return String(tokens)
}

function row(label, cells) {
  return `<tr><th scope="row">${escapeHtml(label)}</th>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
}

function countPill(label, count, href, tone, tooltip) {
  return `<a class="count-pill ${escapeHtml(tone)}" href="${escapeHtml(href)}" data-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(`${label}: ${count}. ${tooltip}`)}"><span class="count-pill-label">${escapeHtml(label)}</span><span class="count-pill-count">${escapeHtml(count)}</span></a>`
}

function chip(label, href, className, tooltip) {
  return `<a class="chip ${escapeHtml(className)}" href="${escapeHtml(href)}" data-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(`${label}. ${tooltip}`)}">${escapeHtml(label)}</a>`
}

function tierDescription(tier) {
  if (tier === "commons") return "Weights, training data, and training code are open. The licence permits reuse."
  if (tier === "reciprocal") return "Weights and training code are open, and the training data is documented or open. The licence permits reuse."
  if (tier === "shared") return "The weights are available, but the training data is not open and the licence may restrict reuse."
  if (tier === "closed") return "The weights are not available."
  return "The evidence about the weights is not sufficient to make a determination."
}

async function asset(request, env, path) {
  return env.ASSETS.fetch(new Request(new URL(path, request.url), request))
}

async function renderComparison(request, env, ids) {
  const shellResponse = await asset(request, env, "/comparison-shell/")
  if (!shellResponse.ok) return new Response("Comparison shell unavailable", { status: 500 })
  let shell = await shellResponse.text()

  if (ids.length < 2) {
    shell = shell.replace(
      "<!-- COMPARISON_CONTENT -->",
      `<div class="empty" style="text-align:left"><h2>Pick at least two models</h2><p>Open a model page and use the Compare card to add models.</p><p><a class="button" href="/models/">Choose models</a></p></div>`,
    )
    return new Response(shell, { headers: { "content-type": "text/html; charset=utf-8" } })
  }

  const records = []
  for (const id of ids) {
    const response = await asset(request, env, `/api/v1/models/${encodeURIComponent(id)}.json`)
    if (!response.ok) {
      shell = shell.replace(
        "<!-- COMPARISON_CONTENT -->",
        `<div class="empty" style="text-align:left"><h2>Model not found</h2><p>${escapeHtml(id)} is not in the catalogue.</p><p><a class="button" href="/models/">Choose models</a></p></div>`,
      )
      return new Response(shell, { headers: { "content-type": "text/html; charset=utf-8" } })
    }
    records.push(await response.json())
  }

  let vocabulary = { namespaces: {} }
  const tagsResponse = await asset(request, env, "/api/v1/tags.json")
  if (tagsResponse.ok) vocabulary = await tagsResponse.json()
  const tagDefinition = (tag) => {
    const [namespace, ...rest] = tag.split(":")
    const value = rest.join(":")
    return vocabulary.namespaces?.[namespace]?.values?.[value] ?? vocabulary.namespaces?.[namespace]?.definition ?? "A tag in the catalogue."
  }

  const head = `<tr><th scope="col">Field</th>${records
    .map(
      (model) =>
        `<th scope="col"><a href="/models/${escapeHtml(model.id)}/">${escapeHtml(model.name)}</a><span class="compare-org">${escapeHtml(model.organization)}</span></th>`,
    )
    .join("")}</tr>`

  const rows = [
    row(
      "Overall",
      records.map((model) => {
        const overall = model.scorecard?.overall
        return countPill(
          "overall",
          overall?.score == null ? "—" : Math.round(overall.score),
          `/models/${model.id}/#scorecard-overall`,
          "score-overall",
          overall?.score == null
            ? "No overall score is recorded."
            : `Weighted mean of ${overall.coverage} of 4 axes. Missing axes are excluded, not zero.`,
        )
      }),
    ),
    row(
      "Syndication",
      records.map((model) => {
        const value = model.scorecard?.syndication
        return countPill(
          "syndication",
          value ? `${value.score}/${value.max}` : "—",
          `/models/${model.id}/#scorecard-syndication`,
          "score-syndication",
          value ? `Independent listings. Band: ${value.band.replaceAll("-", " ")}. Not quality.` : "No syndication score is recorded.",
        )
      }),
    ),
    row(
      "Performance",
      records.map((model) => {
        const value = model.scorecard?.performance
        return countPill(
          "performance",
          value?.score == null ? "—" : Math.round(value.score),
          `/models/${model.id}/#scorecard-performance`,
          "score-performance",
          value?.score == null
            ? "No current performance benchmark is recorded."
            : `Current task performance${value.basis ? ` on a ${value.basis} basis` : ""}${value.match === "base" ? "; base-model match" : ""}.`,
        )
      }),
    ),
    row(
      "Openness",
      records.map((model) => {
        const value = model.scorecard?.openness_morality
        return countPill(
          "openness",
          value ? Math.round(value.score) : "—",
          `/models/${model.id}/#scorecard-openness`,
          "score-openness",
          value ? `Release terms only. Tier: ${value.tier}.` : "No openness score is recorded.",
        )
      }),
    ),
    row(
      "Citation",
      records.map((model) => {
        const value = model.scorecard?.research_citation
        return countPill(
          "citation",
          value?.score == null ? "—" : Math.round(value.score),
          `/models/${model.id}/#scorecard-research`,
          "score-research",
          value?.score == null ? "No current citation or research benchmark is recorded." : "Current research benchmark. Citation accuracy is not measured.",
        )
      }),
    ),
    row(
      "Tier",
      records.map((model) => {
        const tier = model.openness?.tier ?? model.tier ?? "unproven"
        return chip(tier, `/models/?tier=${encodeURIComponent(tier)}`, `badge badge-${tier}`, tierDescription(tier))
      }),
    ),
    row(
      "Licence",
      records.map((model) => {
        const licence = model.license?.id ?? "unknown"
        return chip(licence, `/tags/license/${encodeURIComponent(licence)}/`, "tag-license", tagDefinition(`license:${licence}`))
      }),
    ),
    row(
      "Tasks",
      records.map((model) => {
        const tasks = (model.tags ?? []).filter((tag) => tag.startsWith("task:"))
        return tasks.length > 0
          ? tasks
              .map((tag) => chip(tag, `/tags/task/${encodeURIComponent(tag.slice(5))}/`, "tag-task", tagDefinition(tag)))
              .join(" ")
          : "—"
      }),
    ),
    row(
      "Runtime",
      records.map((model) => {
        const runtimes = (model.tags ?? []).filter((tag) => tag.startsWith("runtime:"))
        return runtimes.length > 0
          ? runtimes
              .map((tag) => chip(tag, `/tags/runtime/${encodeURIComponent(tag.slice(8))}/`, "tag-runtime", tagDefinition(tag)))
              .join(" ")
          : "—"
      }),
    ),
    row(
      "Context",
      records.map((model) => {
        const tokens = model.capabilities?.context_tokens
        return chip(
          `context: ${context(tokens)}`,
          tokens ? `/models/?min_context=${tokens}` : "/models/",
          "meta-context",
          tokens ? "Filter the model index to models with at least this context window." : "No context window is recorded.",
        )
      }),
    ),
    row(
      "Size",
      records.map((model) => {
        const params = model.footprint?.params_b
        return chip(
          params == null ? "Unknown size" : `${params}B`,
          params == null ? "/models/" : `/models/?min_params=${params}`,
          "capability",
          params == null ? "No parameter count is recorded." : "Filter the model index to models of at least this parameter class.",
        )
      }),
    ),
    row(
      "Tool calling",
      records.map((model) =>
        chip(yesNo(model.capabilities?.tool_calling), "/models/?capability=tool-calling", `capability-${model.capabilities?.tool_calling === true ? "yes" : model.capabilities?.tool_calling === false ? "no" : "unknown"}`, "Filter the model index to models with this tool-calling value."),
      ),
    ),
    row(
      "Reasoning",
      records.map((model) =>
        chip(yesNo(model.capabilities?.reasoning), "/models/?capability=reasoning", `capability-${model.capabilities?.reasoning === true ? "yes" : model.capabilities?.reasoning === false ? "no" : "unknown"}`, "Filter the model index to models with this reasoning value."),
      ),
    ),
    row(
      "Structured output",
      records.map((model) =>
        chip(yesNo(model.capabilities?.structured_output), "/models/?capability=structured-output", `capability-${model.capabilities?.structured_output === true ? "yes" : model.capabilities?.structured_output === false ? "no" : "unknown"}`, "Filter the model index to models with this structured-output value."),
      ),
    ),
    row(
      "Builds",
      records.map((model) =>
        countPill(
          "builds",
          String((model.builds ?? []).length),
          `/models/${model.id}/#builds`,
          "meta-builds",
          "A build is packaging, not a new model. It inherits the base task and terms.",
        ),
      ),
    ),
    row(
      "Released",
      records.map((model) =>
        chip(model.released ?? "—", "/models/?sort=released", "meta-released", "Release date. Open the index sorted by release date."),
      ),
    ),
    row(
      "Links",
      records.map((model) => {
        const access = model.access ?? {}
        return [
          access.hugging_face ? `<a href="https://huggingface.co/${escapeHtml(access.hugging_face)}">Hugging Face</a>` : "",
          access.models_dev ? `<a href="${escapeHtml(access.models_dev)}">models.dev</a>` : "",
          access.agent_detect ? `<a href="${escapeHtml(access.agent_detect)}">agent-detect</a>` : "",
        ]
          .filter(Boolean)
          .join(" · ") || "—"
      }),
    ),
  ].join("")

  const table = `<div class="compare-table-wrap"><table class="compare-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`
  shell = shell.replace("<!-- COMPARISON_CONTENT -->", table)
  const title = records.map((model) => model.name).join(" vs ")
  shell = shell.replace("<title>Compare models — Democratic AI</title>", `<title>${escapeHtml(title)} — Democratic AI</title>`)

  return new Response(shell, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const legacy = {
      "/tags": "/#tags",
      "/tags/": "/#tags",
      "/thesis": "/#thesis",
      "/thesis/": "/#thesis",
      "/about": "/#method",
      "/about/": "/#method",
    }
    if (legacy[url.pathname]) return Response.redirect(new URL(legacy[url.pathname], url), 301)
    if (!url.pathname.startsWith("/comparison/")) return env.ASSETS.fetch(request)

    const ids = decodeURIComponent(url.pathname.slice("/comparison/".length))
      .split("/")
      .map((id) => id.trim())
      .filter(Boolean)
    const unique = [...new Set(ids)].slice(0, MAX_MODELS)
    if (unique.some((id) => !/^[a-z0-9-]+$/.test(id))) {
      return new Response("Invalid model id", { status: 400 })
    }
    return renderComparison(request, env, unique)
  },
}
