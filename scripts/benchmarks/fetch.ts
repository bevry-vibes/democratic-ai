import { readIfExists, readJSON, writeReplace, writeText } from "../fetch/lib/cache.ts"
import { isoDate, sleep } from "../fetch/lib/time.ts"

interface Syndication {
  models: Record<string, { sources: Array<{ id: string; url: string }> }>
}

interface ModelData {
  name?: string
  model_id?: string
  [key: string]: unknown
}

interface AaModel {
  slug?: string
  name?: string
  release?: { slug?: string }
  intelligenceIndex?: number | null
  terminalBench21?: number | null
  terminalBench40?: number | null
  frontierCode?: number | null
  frontierCode20?: number | null
  livecodebench?: number | null
  [key: string]: unknown
}

interface Snapshot {
  source_url: string
  fetched_at: string
  model: ModelData
}

interface AaSnapshot {
  source_url: string
  fetched_at: string
  hugging_face: string | null
  model: AaModel
}

function extractModelData(html: string): ModelData | null {
  const chunks = html.matchAll(/self\.__next_f\.push\(\[1,(.*?)\]\)<\/script>/gs)
  for (const chunk of chunks) {
    let payload: string
    try {
      payload = JSON.parse(chunk[1]) as string
    } catch {
      continue
    }
    if (!payload.includes("modelData")) continue
    const data = JSON.parse(payload.slice(payload.indexOf(":") + 1)) as unknown
    const find = (value: unknown): ModelData | null => {
      if (Array.isArray(value)) {
        for (const entry of value) {
          const found = find(entry)
          if (found) return found
        }
        return null
      }
      if (value && typeof value === "object") {
        const record = value as Record<string, unknown>
        if (record.modelData && typeof record.modelData === "object") return record.modelData as ModelData
        for (const entry of Object.values(record)) {
          const found = find(entry)
          if (found) return found
        }
      }
      return null
    }
    const found = find(data)
    if (found) return found
  }
  return null
}

function extractInitialModels(html: string): AaModel[] | null {
  const chunks = html.matchAll(/self\.__next_f\.push\(\[1,(.*?)\]\)<\/script>/gs)
  for (const chunk of chunks) {
    let payload: string
    try {
      payload = JSON.parse(chunk[1]) as string
    } catch {
      continue
    }
    if (!payload.includes("initialModels")) continue
    const data = JSON.parse(payload.slice(payload.indexOf(":") + 1)) as unknown
    const find = (value: unknown): AaModel[] | null => {
      if (Array.isArray(value)) {
        for (const entry of value) {
          const found = find(entry)
          if (found) return found
        }
        return null
      }
      if (value && typeof value === "object") {
        const record = value as Record<string, unknown>
        if (Array.isArray(record.initialModels)) return record.initialModels as AaModel[]
        for (const entry of Object.values(record)) {
          const found = find(entry)
          if (found) return found
        }
      }
      return null
    }
    const found = find(data)
    if (found) return found
  }
  return null
}

async function main(): Promise<void> {
  const refresh = Deno.args.includes("--refresh")
  const syndication = await readJSON<Syndication>("data/syndication.json")
  const pages = new Map<string, string>()
  for (const model of Object.values(syndication.models)) {
    for (const source of model.sources) {
      if (source.id !== "llm-stats") continue
      pages.set(source.url, source.url)
    }
  }

  let fetched = 0
  let cached = 0
  let failed = 0
  for (const url of [...pages.keys()].sort()) {
    const slug = url.split("/").pop()!
    const path = `data/raw/aggregators/llm-stats/${slug}/${isoDate()}.json`
    const existing = await readIfExists(path)
    if (existing != null && !refresh) {
      cached++
      continue
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(35_000), redirect: "follow" })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const html = await response.text()
      const model = extractModelData(html)
      if (!model) throw new Error("modelData not found")
      const snapshot: Snapshot = { source_url: url, fetched_at: new Date().toISOString(), model }
      const body = JSON.stringify(snapshot, null, 2) + "\n"
      if (existing != null) await writeReplace(path, body)
      else await writeText(path, body)
      fetched++
    } catch (error) {
      failed++
      console.error(`benchmarks: ${url}: ${error instanceof Error ? error.message : String(error)}`)
    }
    await sleep(150)
  }
  const aaPages = new Map<string, string>()
  for (const model of Object.values(syndication.models)) {
    for (const source of model.sources) {
      if (source.id === "artificial-analysis") aaPages.set(source.url, source.url)
    }
  }
  try {
    const extra = await readJSON<{ artificial_analysis?: string[] }>("data/benchmarks.targets.json")
    for (const url of extra.artificial_analysis ?? []) aaPages.set(url, url)
  } catch {
    // optional targets file
  }
  let aaFetched = 0
  let aaCached = 0
  let aaFailed = 0
  for (const url of [...aaPages.keys()].sort()) {
    const slug = url.split("/").pop()!
    const path = `data/raw/aggregators/artificial-analysis/${slug}/${isoDate()}.json`
    const existing = await readIfExists(path)
    if (existing != null && !refresh) {
      aaCached++
      continue
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(35_000), redirect: "follow" })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const html = await response.text()
      const models = extractInitialModels(html)
      if (!models) throw new Error("initialModels not found")
      const model = models.find((entry) => entry.release?.slug === slug) ?? models.find((entry) => entry.slug === slug)
      if (!model) throw new Error("current model not found in initialModels")
      const weights = typeof model.modelWeightsSourceUrl === "string" ? model.modelWeightsSourceUrl : ""
      const huggingFace = weights.match(/huggingface\.co\/([^/?#]+\/[^/?#]+)/)?.[1] ?? null
      const snapshot: AaSnapshot = { source_url: url, fetched_at: new Date().toISOString(), hugging_face: huggingFace, model }
      const body = JSON.stringify(snapshot, null, 2) + "\n"
      if (existing != null) await writeReplace(path, body)
      else await writeText(path, body)
      aaFetched++
    } catch (error) {
      aaFailed++
      console.error(`benchmarks: ${url}: ${error instanceof Error ? error.message : String(error)}`)
    }
    await sleep(150)
  }
  console.log(`benchmarks: ${pages.size} LLM Stats pages, ${aaPages.size} Artificial Analysis pages`)
  console.log(`benchmarks: LLM Stats ${fetched} fetched, ${cached} cached, ${failed} failed; Artificial Analysis ${aaFetched} fetched, ${aaCached} cached, ${aaFailed} failed`)
}

if (import.meta.main) await main()
