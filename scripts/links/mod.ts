import { readIfExists, writeReplace, writeText } from "../fetch/lib/cache.ts"
import { fetchText } from "../fetch/lib/http.ts"
import { compactStamp, isoDate } from "../fetch/lib/time.ts"

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

interface ModelsDevCost {
  input?: number
  output?: number
  cache_read?: number
  cache_write?: number
}

interface ModelsDevModel {
  id: string
  name?: string
  canonical_model_id?: string
  cost?: ModelsDevCost
}

interface ModelsDevApi {
  [provider: string]: {
    id: string
    name?: string
    models?: Record<string, ModelsDevModel>
  }
}

interface AgentDetectModel {
  id: string
  name: string
  label?: string
  variations?: string[]
}

interface AgentDetectIndex {
  models?: AgentDetectModel[]
}

const MODELS_DEV_URL = "https://models.dev/api.json"
const AGENT_DETECT_URL = "https://agent-detect.bevry.me/data/index.json"

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
  candidates.sort((a, b) => b.size - a.size)
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

async function main(): Promise<void> {
  const args = parseArgs(Deno.args)
  const pullId = args.pull ?? (await latestPull())
  const tagsPath = `data/pulls/${pullId}/tags.proposed.jsonl`
  const lines = (await Deno.readTextFile(tagsPath)).split("\n").filter(Boolean)
  const entries = lines.map((line) => JSON.parse(line) as TaggedItem)

  const stamp = args.refresh ? compactStamp() : isoDate()
  const api = (await cachedJSON(
    MODELS_DEV_URL,
    `.cache/links/models-dev-${stamp}.json`,
    args.refresh,
  )) as ModelsDevApi
  const agentDetect = (await cachedJSON(
    AGENT_DETECT_URL,
    `.cache/links/agent-detect-${stamp}.json`,
    args.refresh,
  )) as AgentDetectIndex

  const modelsDev = new Map<string, { url: string; canonical: string; name: string }>()
  const providersByCanonical = new Map<string, Set<string>>()
  const providerModelsByCanonical = new Map<
    string,
    Record<string, Array<{ id: string; name: string; cost: ModelsDevCost | null }>>
  >()
  for (const [providerId, provider] of Object.entries(api)) {
    for (const [key, model] of Object.entries(provider.models ?? {})) {
      const canonical = model.canonical_model_id
      if (!canonical) continue
      const url = `https://models.dev/models/${canonical}`
      const providerSet = providersByCanonical.get(canonical) ?? new Set<string>()
      providerSet.add(providerId)
      providersByCanonical.set(canonical, providerSet)
      const providerModels = providerModelsByCanonical.get(canonical) ?? {}
      const entries = providerModels[providerId] ?? []
      entries.push({ id: key, name: model.name ?? key, cost: model.cost ?? null })
      providerModels[providerId] = entries
      providerModelsByCanonical.set(canonical, providerModels)
      for (const candidate of [canonical, key, model.name ?? ""]) {
        const name = norm(candidate)
        if (!name) continue
        if (!modelsDev.has(name)) {
          modelsDev.set(name, { url, canonical, name: model.name ?? key })
        }
      }
    }
  }

  const agentDetectMap = new Map<string, { url: string; id: string; name: string }>()
  for (const model of agentDetect.models ?? []) {
    const url = `https://agent-detect.bevry.me/model/${model.id}`
    for (const candidate of [model.name, model.label ?? "", model.id, ...(model.variations ?? [])]) {
      const name = norm(candidate)
      if (!name) continue
      if (!agentDetectMap.has(name)) {
        agentDetectMap.set(name, { url, id: model.id, name: model.name })
      }
    }
  }

  const models: Record<
    string,
    {
      models_dev?: string
      agent_detect?: string
      providers?: string[]
      provider_models?: Record<string, Array<{ id: string; name: string; cost: ModelsDevCost | null }>>
    }
  > = {}
  const unmatched: Array<{ id: string; name: string }> = []
  let withModelsDev = 0
  let withAgentDetect = 0
  for (const entry of entries) {
    if (entry.item.kind !== "model") continue
    const id = entry.item.source_id
    const name = norm(id)
    const md = modelsDev.get(name)
    const ad = agentDetectMap.get(name)
    if (!md && !ad) {
      if (unmatched.length < 30) unmatched.push({ id, name })
      continue
    }
    models[id] = {
      ...(md ? { models_dev: md.url } : {}),
      ...(ad ? { agent_detect: ad.url } : {}),
      ...(md ? { providers: [...(providersByCanonical.get(md.canonical) ?? [])].sort() } : {}),
      ...(md ? { provider_models: providerModelsByCanonical.get(md.canonical) ?? {} } : {}),
    }
    if (md) withModelsDev++
    if (ad) withAgentDetect++
  }

  const sortedModels = Object.fromEntries(
    Object.entries(models).sort(([a], [b]) => a.localeCompare(b)),
  )
  const report = {
    schema_version: 1,
    updated_at: new Date().toISOString(),
    pull_id: pullId,
    sources: {
      models_dev: {
        url: MODELS_DEV_URL,
        fetched_at: stamp,
        models: modelsDev.size,
        note: "Only entries with a canonical_model_id are linked.",
      },
      agent_detect: {
        url: AGENT_DETECT_URL,
        fetched_at: stamp,
        models: agentDetectMap.size,
        note: "Links use the agent-detect model id.",
      },
    },
    counts: {
      models: Object.keys(sortedModels).length,
      with_models_dev: withModelsDev,
      with_agent_detect: withAgentDetect,
      unmatched: entries.filter((entry) => entry.item.kind === "model").length - Object.keys(sortedModels).length,
    },
    models: sortedModels,
    unmatched_samples: unmatched,
  }

  await writeReplace("data/links.json", JSON.stringify(report, null, 2) + "\n")

  console.log(`pull ${pullId}`)
  console.log(`models.dev entries ${modelsDev.size}, agent-detect entries ${agentDetectMap.size}`)
  console.log(`linked models ${report.counts.models}, models.dev ${withModelsDev}, agent-detect ${withAgentDetect}`)
  console.log(`unmatched model items ${report.counts.unmatched}`)
  for (const sample of unmatched.slice(0, 8)) console.log(`  unmatched: ${sample.id} (${sample.name})`)
  console.log("\nlinks: data/links.json")
}

if (import.meta.main) {
  await main()
}
