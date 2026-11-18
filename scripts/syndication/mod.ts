import { readIfExists, writeReplace, writeText } from "../fetch/lib/cache.ts"
import { fetchText } from "../fetch/lib/http.ts"
import { isoDate } from "../fetch/lib/time.ts"

interface TaggedItem {
  item: {
    source: string
    source_id: string
    kind: string
    title: string
    url: string
  }
  tags: Array<{ tag: string }>
}

interface LinkIndex {
  models: Record<string, { models_dev?: string; agent_detect?: string }>
}

interface OpenRouterModel {
  id: string
  name?: string
}

interface OpenRouterResponse {
  data?: OpenRouterModel[]
}

interface Source {
  id: string
  url: string
  weight: number
  kind: "registry" | "aggregator" | "evaluation" | "research" | "host"
  self: boolean
}

const BUILD_MARKERS = [
  "-gguf",
  "-mlx",
  "-coreml",
  "-onnx",
  "-nvfp4",
  "-q8_0",
  "-q4_k_m",
  "-q4",
  "-q8",
  "-q6",
  "-4bit",
  "-8bit",
  "-bf16",
  "-int4",
  "-int8",
  "-ov",
  "-quant",
  "-dflash",
  "-singprobe",
  "-server",
  "-fp8",
  "-fp4",
  "-mxfp8",
  "-w4a4",
  "-w8a8",
  "-q3k",
  "-q4k",
  "-q5k",
  "-q6k",
  "-litert-lm",
  "-coreai",
  "-lora",
  "-peft",
]

const WEIGHTS: Record<string, number> = {
  "models.dev": 3,
  "agent-detect": 3,
  openrouter: 2,
  "llm-stats": 2,
  "artificial-analysis": 2,
  research: 1,
  "hugging-face": 0,
}

function parseArgs(argv: string[]): { pull: string | null; refresh: boolean } {
  let pull: string | null = null
  let refresh = false
  for (const arg of argv) {
    if (arg.startsWith("--pull=")) pull = arg.slice("--pull=".length)
    else if (arg === "--refresh") refresh = true
  }
  return { pull, refresh }
}

async function latestPull(): Promise<string> {
  const candidates: Array<{ name: string; size: number }> = []
  for await (const entry of Deno.readDir("data/pulls")) {
    if (!entry.isDirectory) continue
    try {
      const stat = await Deno.stat(`data/pulls/${entry.name}/items.jsonl`)
      candidates.push({ name: entry.name, size: stat.size })
    } catch {
      // not a complete pull
    }
  }
  candidates.sort((a, b) => b.name.localeCompare(a.name))
  if (candidates.length === 0) throw new Error("no complete pulls found under data/pulls")
  return candidates[0]!.name
}

function baseName(value: string): string {
  return value.split("/").pop() ?? value
}

function stripBuilds(value: string): string {
  let result = value.toLowerCase()
  for (const marker of BUILD_MARKERS) result = result.split(marker).join("")
  return result
}

function norm(value: string): string {
  return stripBuilds(baseName(value))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function slugFromUrl(url: string, prefix: string): string | null {
  if (!url.startsWith(prefix)) return null
  const rest = url.slice(prefix.length)
  if (!rest || rest.includes("/")) return null
  return norm(rest)
}

async function cachedJSON(url: string, path: string, refresh: boolean): Promise<unknown> {
  if (!refresh) {
    const cached = await readIfExists(path)
    if (cached != null) return JSON.parse(cached)
  }
  const response = await fetchText(url, { accept: "application/json" })
  if (response.status !== 200) throw new Error(`${url} → HTTP ${response.status}`)
  await writeText(path, response.body)
  return JSON.parse(response.body)
}

async function readSitemapSlugs(path: string, prefix: string): Promise<Map<string, string>> {
  const slugs = new Map<string, string>()
  try {
    const text = await Deno.readTextFile(path)
    for (const match of text.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
      const url = match[1]!.trim()
      const slug = slugFromUrl(url, prefix)
      if (slug && !slugs.has(slug)) slugs.set(slug, url)
    }
  } catch {
    // sitemap absent
  }
  return slugs
}

function bandFor(score: number): string {
  if (score === 0) return "self-only"
  if (score <= 2) return "weak"
  if (score <= 4) return "emerging"
  if (score <= 6) return "moderate"
  if (score <= 8) return "strong"
  return "very-strong"
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args)
  const pullId = args.pull ?? (await latestPull())
  const pullDir = `data/pulls/${pullId}`
  const tagsPath = `${pullDir}/tags.proposed.jsonl`
  const entries = (await Deno.readTextFile(tagsPath))
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TaggedItem)
  const links = JSON.parse(await Deno.readTextFile("data/links.json")) as LinkIndex

  const openRouter = (await cachedJSON(
    "https://openrouter.ai/api/v1/models",
    `.cache/syndication/openrouter-${isoDate()}.json`,
    args.refresh,
  )) as OpenRouterResponse
  const openRouterUrls = new Map<string, string>()
  for (const model of openRouter.data ?? []) {
    const raw = model.id.split(":")[0]!.replace(/^~/, "")
    const key = norm(raw)
    if (!openRouterUrls.has(key)) openRouterUrls.set(key, `https://openrouter.ai/${raw}`)
  }

  const llmStats = await readSitemapSlugs(
    `data/raw/sitemaps/llm-stats/${isoDate()}-models-xml.xml`,
    "https://llm-stats.com/models/",
  )
  const artificialAnalysis = await readSitemapSlugs(
    `data/raw/sitemaps/artificial-analysis/${isoDate()}.xml`,
    "https://artificialanalysis.ai/models/",
  )

  const models: Record<string, {
    score: number
    points: number
    band: string
    sources: Source[]
    checked_at: string
  }> = {}
  const sourceCounts: Record<string, number> = {}
  const bands: Record<string, number> = {}
  let totalScore = 0
  let scored = 0

  let skipped = 0
  for (const entry of entries) {
    if (entry.item.kind !== "model") continue
    const tags = entry.tags.map((tag) => tag.tag)
    if (tags.includes("status:build") || tags.includes("status:probe") || tags.includes("status:documentation")) {
      skipped++
      continue
    }
    const id = entry.item.source_id
    const name = norm(id)
    const sources: Source[] = []

    const link = links.models[id]
    if (link?.models_dev) {
      sources.push({ id: "models.dev", url: link.models_dev, weight: WEIGHTS["models.dev"]!, kind: "registry", self: false })
    }
    if (link?.agent_detect) {
      sources.push({ id: "agent-detect", url: link.agent_detect, weight: WEIGHTS["agent-detect"]!, kind: "registry", self: false })
    }
    if (openRouterUrls.has(name)) {
      sources.push({
        id: "openrouter",
        url: openRouterUrls.get(name)!,
        weight: WEIGHTS.openrouter!,
        kind: "aggregator",
        self: false,
      })
    }
    if (llmStats.has(name)) {
      sources.push({
        id: "llm-stats",
        url: llmStats.get(name)!,
        weight: WEIGHTS["llm-stats"]!,
        kind: "aggregator",
        self: false,
      })
    }
    if (artificialAnalysis.has(name)) {
      sources.push({
        id: "artificial-analysis",
        url: artificialAnalysis.get(name)!,
        weight: WEIGHTS["artificial-analysis"]!,
        kind: "evaluation",
        self: false,
      })
    }

    const cardPath = `data/raw/hf/model-cards/${id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}/${isoDate()}.md`
    const card = await readIfExists(cardPath)
    if (card) {
      const arxiv = card.match(/https?:\/\/(?:www\.)?arxiv\.org\/[^\s)"']+/)
      if (arxiv) {
        sources.push({
          id: "research",
          url: arxiv[0]!,
          weight: WEIGHTS.research!,
          kind: "research",
          self: false,
        })
      }
    }

    sources.push({
      id: "hugging-face",
      url: `https://huggingface.co/${id}`,
      weight: WEIGHTS["hugging-face"]!,
      kind: "host",
      self: true,
    })

    const points = sources.reduce((sum, source) => sum + source.weight, 0)
    const score = Math.min(10, points)
    const band = bandFor(score)
    models[id] = {
      score,
      points,
      band,
      sources,
      checked_at: isoDate(),
    }
    totalScore += score
    scored++
    bands[band] = (bands[band] ?? 0) + 1
    for (const source of sources) sourceCounts[source.id] = (sourceCounts[source.id] ?? 0) + 1
  }

  const sorted = Object.fromEntries(Object.entries(models).sort((a, b) => {
    if (b[1].score !== a[1].score) return b[1].score - a[1].score
    return a[0].localeCompare(b[0])
  }))

  const report = {
    schema_version: 1,
    updated_at: new Date().toISOString(),
    pull_id: pullId,
    method: {
      note: "A count of independent listings and evidence. It is not a quality score, a reciprocity tier, or a measure of weights openness.",
      weights: WEIGHTS,
      bands: {
        "self-only": "Hugging Face only",
        weak: "1–2 points",
        emerging: "3–4 points",
        moderate: "5–6 points",
        strong: "7–8 points",
        "very-strong": "9–10 points",
      },
    },
    unavailable_sources: [
      {
        id: "arena",
        url: "https://arena.ai/leaderboard",
        kind: "evaluation",
        weight: 2,
        reason: "Cloudflare blocks automated reads. The sitemap has leaderboard pages, not per-model pages. Arena adds no points until a verifiable snapshot or API is available.",
      },
    ],
    counts: {
      models: scored,
      builds_and_probes_skipped: skipped,
      average_score: scored > 0 ? Number((totalScore / scored).toFixed(2)) : 0,
      bands,
      sources: sourceCounts,
    },
    models: sorted,
  }
  await writeReplace("data/syndication.json", JSON.stringify(report, null, 2) + "\n")

  console.log(`pull ${pullId}`)
  console.log(`scored models ${scored}, skipped builds/probes/docs ${skipped}, average ${report.counts.average_score}`)
  console.log(`bands ${Object.entries(bands).map(([band, count]) => `${band}=${count}`).join(" ")}`)
  console.log(`sources ${Object.entries(sourceCounts).map(([id, count]) => `${id}=${count}`).join(" ")}`)
  const top = Object.entries(sorted).slice(0, 8)
  for (const [id, value] of top) {
    console.log(`  ${String(value.score).padStart(2)}/10 ${value.band.padEnd(11)} ${id}`)
  }
  console.log("\nsyndication: data/syndication.json")
}

if (import.meta.main) {
  await main()
}
