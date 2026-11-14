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
      `<div class="empty" style="text-align:left"><h2>Pick at least two models</h2><p>Use the comparison picker on the homepage or on any model page.</p><p><a class="button" href="/#compare">Choose models</a></p></div>`,
    )
    return new Response(shell, { headers: { "content-type": "text/html; charset=utf-8" } })
  }

  const records = []
  for (const id of ids) {
    const response = await asset(request, env, `/api/v1/models/${encodeURIComponent(id)}.json`)
    if (!response.ok) {
      shell = shell.replace(
        "<!-- COMPARISON_CONTENT -->",
        `<div class="empty" style="text-align:left"><h2>Model not found</h2><p>${escapeHtml(id)} is not in the catalogue.</p><p><a class="button" href="/#compare">Choose models</a></p></div>`,
      )
      return new Response(shell, { headers: { "content-type": "text/html; charset=utf-8" } })
    }
    records.push(await response.json())
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
        return overall?.score == null
          ? "—"
          : `<strong>${score(overall.score)}</strong><small>${overall.coverage} of 4 axes</small>`
      }),
    ),
    row(
      "Syndication",
      records.map((model) => {
        const value = model.scorecard?.syndication
        return value
          ? `<strong>${value.score}/${value.max}</strong><small>${escapeHtml(value.band.replaceAll("-", " "))}</small>`
          : "—"
      }),
    ),
    row(
      "Performance",
      records.map((model) => {
        const value = model.scorecard?.performance
        if (!value || value.score == null) return "—"
        return `<strong>${score(value.score)}</strong><small>${escapeHtml(value.basis ?? "")}${value.match === "base" ? " · base match" : ""}</small>`
      }),
    ),
    row(
      "Openness",
      records.map((model) => {
        const value = model.scorecard?.openness_morality
        return value ? `<strong>${score(value.score)}</strong><small>${escapeHtml(value.tier)}</small>` : "—"
      }),
    ),
    row(
      "Citation",
      records.map((model) => {
        const value = model.scorecard?.research_citation
        return value?.score == null ? "—" : `<strong>${score(value.score)}</strong><small>citation not measured</small>`
      }),
    ),
    row(
      "Tier",
      records.map((model) => `<span class="badge badge-${escapeHtml(model.tier)}">${escapeHtml(model.tier)}</span>`),
    ),
    row("Licence", records.map((model) => escapeHtml(model.license?.id ?? "unknown"))),
    row(
      "Tasks",
      records.map((model) =>
        (model.tags ?? [])
          .filter((tag) => tag.startsWith("task:"))
          .map((tag) => `<span class="chip tag-task">${escapeHtml(tag.slice(5))}</span>`)
          .join(" ") || "—",
      ),
    ),
    row("Context", records.map((model) => escapeHtml(context(model.capabilities?.context_tokens)))),
    row(
      "Size",
      records.map((model) => (model.footprint?.params_b == null ? "Unknown" : `${escapeHtml(model.footprint.params_b)}B`)),
    ),
    row("Tool calling", records.map((model) => escapeHtml(yesNo(model.capabilities?.tool_calling)))),
    row("Reasoning", records.map((model) => escapeHtml(yesNo(model.capabilities?.reasoning)))),
    row("Structured output", records.map((model) => escapeHtml(yesNo(model.capabilities?.structured_output)))),
    row("Builds", records.map((model) => String((model.builds ?? []).length))),
    row("Released", records.map((model) => escapeHtml(model.released ?? "—"))),
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
