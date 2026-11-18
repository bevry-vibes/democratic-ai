import { readIfExists, writeReplace, writeText } from "../fetch/lib/cache.ts"
import { fetchText } from "../fetch/lib/http.ts"
import { isoDate } from "../fetch/lib/time.ts"

interface PullItem {
  source: string
  source_id: string
  kind: string
  title: string
  url: string
  published_at: string | null
  summary: string
  source_tags: string[]
  source_meta: Record<string, unknown>
  fetched_at: string
}

interface TaggedItem {
  item: {
    source: string
    source_id: string
    kind: string
    title: string
    url: string
    published_at: string | null
  }
  tags: Array<{ tag: string; confidence: number; method: string }>
  needs_review: boolean
}

interface LinkIndex {
  models: Record<
    string,
    {
      models_dev?: string
      agent_detect?: string
      providers?: string[]
      provider_models?: Record<
        string,
        Array<{
          id: string
          name: string
          cost: { input?: number; output?: number; cache_read?: number; cache_write?: number } | null
        }>
      >
    }
  >
}

interface SyndicationModel {
  score: number
  points: number
  band: string
  sources: Array<{ id: string; url: string; weight: number; kind: string; self: boolean }>
}

interface Syndication {
  models: Record<string, SyndicationModel>
}

interface ModelAliases {
  aliases: Array<{
    id: string
    canonical_id: string
    hugging_face: string
    canonical_hugging_face: string
    relation: string
    note: string
  }>
}

interface Watchlist {
  members: Array<{ id: string; kind: string; hugging_face?: string | null; x?: string[] }>
}

interface ModelsDevModel {
  id: string
  canonical_model_id?: string
  name?: string
  description?: string
  family?: string
  tool_call?: boolean
  reasoning?: boolean
  structured_output?: boolean
  open_weights?: boolean
  modalities?: { input?: string[]; output?: string[] }
  limit?: { context?: number }
}

interface ModelsDevApi {
  [provider: string]: { models?: Record<string, ModelsDevModel> }
}

const HOSTED_RUNTIMES = new Set(["opencode", "cloudflare", "openrouter", "hosted"])

const BUILD_MARKERS = [
  "-gguf", "-mlx", "-coreml", "-onnx", "-nvfp4", "-q8_0", "-q4_k_m", "-q4", "-q8", "-q6",
  "-4bit", "-8bit", "-bf16", "-int4", "-int8", "-ov", "-quant", "-dflash", "-singprobe", "-server",
  "-fp8", "-fp4", "-mxfp8", "-w4a4", "-w8a8", "-q3k", "-q4k", "-q5k", "-q6k", "-litert-lm", "-coreai", "-lora", "-peft",
]

function stripCard(value: string): string {
  return value
    .replace(/^---[\s\S]*?---\s*/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim()
}

interface HfModelInfo {
  usedStorage?: number
  siblings?: Array<{ size?: number }>
}

async function hfSizeGb(id: string): Promise<number | null> {
  const path = `data/raw/hf/sizes/${slug(id)}/${isoDate()}.json`
  try {
    let text = await readIfExists(path)
    if (text == null) {
      const response = await fetchText(`https://huggingface.co/api/models/${id}?blobs=true`, { accept: "application/json" })
      if (response.status !== 200) return null
      text = response.body
      await writeText(path, text)
    }
    const info = JSON.parse(text) as HfModelInfo
    const siblings = (info.siblings ?? []).reduce((total, file) => total + (file.size ?? 0), 0)
    const bytes = siblings > 0 ? siblings : info.usedStorage ?? 0
    return bytes > 0 ? Math.round(bytes / 1e9) : null
  } catch {
    return null
  }
}

async function cardLicense(id: string): Promise<string | null> {
  const path = `data/raw/hf/model-cards/${slug(id)}/${isoDate()}.md`
  try {
    const text = await Deno.readTextFile(path)
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)
    const declared = frontmatter?.[1].match(/^license:\s*([^\n]+)$/im)?.[1]?.trim().replace(/^["']|["']$/g, "")
    if (declared) {
      const normalized = declared.toLowerCase()
      if (["apache-2.0", "mit", "cc-by-4.0", "cc-by-sa-4.0", "cc-by-nc-4.0", "other"].includes(normalized)) {
        return normalized
      }
    }
    const section = text.match(/^#{2,3}\s+Licen[cs]e\b([\s\S]*?)(?=^#{2,3}\s+|$(?![\s\S]))/im)
    if (!section) return null
    const body = section[1]
    if (/apache\s+(?:license[,\s]+)?(?:version\s+)?2\.0|apache-2\.0/i.test(body)) return "apache-2.0"
    if (/\bMIT\b/i.test(body)) return "mit"
    if (/CC[-\s]?BY[-\s]?NC[-\s]?4\.0/i.test(body)) return "cc-by-nc-4.0"
    if (/CC[-\s]?BY[-\s]?SA[-\s]?4\.0/i.test(body)) return "cc-by-sa-4.0"
    if (/CC[-\s]?BY[-\s]?4\.0/i.test(body)) return "cc-by-4.0"
    return null
  } catch {
    return null
  }
}

async function cardUsage(id: string): Promise<Array<{ language: string; code: string }>> {
  const path = `data/raw/hf/model-cards/${slug(id)}/${isoDate()}.md`
  try {
    const text = await Deno.readTextFile(path)
    const section = text.match(/^##\s+Usage\b([\s\S]*?)(?=^##\s+)/im)
    if (!section) return []
    return [...section[1].matchAll(/```([^\n`]*)\n([\s\S]*?)```/g)]
      .map((block) => ({ language: (block[1] ?? "").trim(), code: (block[2] ?? "").trim() }))
      .filter((block) => block.code.length > 0 && block.code.length <= 4000)
      .slice(0, 3)
  } catch {
    return []
  }
}

async function cardExcerpt(id: string): Promise<string> {
  const path = `data/raw/hf/model-cards/${slug(id)}/${isoDate()}.md`
  try {
    const text = stripCard(await Deno.readTextFile(path))
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.replace(/\*+/g, "").replace(/\s+/g, " ").trim())
      .filter((sentence) => sentence.length > 0)
    const useful = sentences.find(
      (sentence) =>
        sentence.length >= 50 &&
        !/^model card for/i.test(sentence) &&
        !/^citation/i.test(sentence) &&
        !/^tl;?dr/i.test(sentence) &&
        !/table of contents/i.test(sentence) &&
        !/^\d+\.$/.test(sentence) &&
        !/github|paper|project page|hugging face|modelscope|technical report|discord/i.test(sentence),
    )
    return (useful ?? sentences.find((sentence) => sentence.length >= 30) ?? text).slice(0, 400)
  } catch {
    return ""
  }
}

function parseArgs(argv: string[]): { pull: string | null } {
  let pull: string | null = null
  for (const arg of argv) if (arg.startsWith("--pull=")) pull = arg.slice("--pull=".length)
  return { pull }
}

async function latestPull(): Promise<string> {
  const candidates: Array<{ name: string; size: number }> = []
  for await (const entry of Deno.readDir("data/pulls")) {
    if (!entry.isDirectory) continue
    try {
      const stat = await Deno.stat(`data/pulls/${entry.name}/items.jsonl`)
      candidates.push({ name: entry.name, size: stat.size })
    } catch {
      // incomplete pull
    }
  }
  candidates.sort((a, b) => b.name.localeCompare(a.name))
  if (candidates.length === 0) throw new Error("no complete pulls found")
  return candidates[0]!.name
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
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
  return stripBuilds(baseName(value)).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

function licenseClass(id: string): string {
  if (["apache-2.0", "mit", "cc-by-4.0", "cc-by-sa-4.0", "odc-by", "openmdw-1.1"].includes(id)) {
    return id.startsWith("cc-by-sa") ? "reciprocal" : "permissive"
  }
  if (id.includes("nc")) return "non-commercial"
  if (["gemma", "llama3.1", "llama3.2", "llama-community", "bigscience-openrail-m", "other", "source-available"].includes(id)) return "use-restricted"
  if (id === "none") return "proprietary"
  return "unknown"
}

function tierFor(license: string): { tier: string; weights: string; data: string; code: string } {
  const cls = licenseClass(license)
  if (cls === "unknown") {
    // The weights are on Hugging Face. An unknown licence does not make the
    // weights unproven; it makes the reuse terms unknown. Shared is the honest floor.
    return { tier: "shared", weights: "open-weight", data: "unknown", code: "unknown" }
  }
  if (cls === "proprietary") {
    return { tier: "closed", weights: "closed", data: "unknown", code: "unknown" }
  }
  return { tier: "shared", weights: "open-weight", data: "unknown", code: "unknown" }
}

function paramsFrom(name: string): number | null {
  const matches = [...name.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)\s*[bB](?![a-zA-Z])/g)]
  if (matches.length === 0) return null
  const values = matches.map((match) => Number(match[1]))
  const value = Math.max(...values)
  return Number.isFinite(value) ? value : null
}

function quantizationFrom(title: string): string | null {
  const value = title.toLowerCase()
  if (value.includes("gguf")) return "GGUF"
  if (value.includes("mxfp8")) return "MXFP8"
  if (value.includes("fp8")) return "FP8"
  if (value.includes("fp4")) return "FP4"
  if (value.includes("w4a4")) return "W4A4"
  if (value.includes("w8a8")) return "W8A8"
  if (value.includes("q3k")) return "Q3_K"
  if (value.includes("q4k")) return "Q4_K"
  if (value.includes("q5k")) return "Q5_K"
  if (value.includes("q6k")) return "Q6_K"
  if (value.includes("litert")) return "LiteRT"
  if (value.includes("coreai")) return "CoreAI"
  if (value.includes("nvfp4")) return "NVFP4"
  if (value.includes("q4_k_m") || value.includes("q4")) return "Q4"
  if (value.includes("q8")) return "Q8"
  if (value.includes("q6")) return "Q6"
  if (value.includes("4bit")) return "4-bit"
  if (value.includes("8bit")) return "8-bit"
  if (value.includes("bf16")) return "BF16"
  if (value.includes("int4")) return "INT4"
  if (value.includes("int8")) return "INT8"
  if (value.includes("mlx")) return "MLX"
  if (value.includes("coreml")) return "CoreML"
  if (value.includes("onnx")) return "ONNX"
  if (value.includes("openvino") || value.includes("-ov")) return "OpenVINO"
  return null
}

function relationFrom(title: string, tags: string[]): string | null {
  if (tags.includes("relation:quantized")) return "quantized"
  if (tags.includes("relation:conversion")) return "conversion"
  if (tags.includes("relation:adapter")) return "adapter"
  if (tags.includes("relation:probe")) return "probe"
  if (title.toLowerCase().includes("distill")) return "distilled"
  return null
}

function buildOrgMap(watchlist: Watchlist): Map<string, string> {
  const map = new Map<string, string>()
  for (const member of watchlist.members) {
    map.set(member.id, member.id)
    if (member.hugging_face) map.set(member.hugging_face.toLowerCase(), member.id)
    for (const handle of member.x ?? []) map.set(handle.toLowerCase(), member.id)
  }
  return map
}

function tagList(tags: string[]): string[] {
  const order = ["task", "domain", "modality", "access", "language", "context", "licensing", "license", "family", "status", "relation"]
  const unique = [...new Set(tags.filter((tag) => !tag.startsWith("source:") && !tag.startsWith("org:")))]
  return unique.sort((a, b) => {
    const ai = order.indexOf(a.split(":")[0]!)
    const bi = order.indexOf(b.split(":")[0]!)
    if (ai !== bi) return ai - bi
    return a.localeCompare(b)
  })
}

function lineageFrom(meta: Record<string, unknown>): Array<{ base: string; relation: string; license_inherited: null }> {
  const tags = Array.isArray(meta.tags) ? meta.tags.filter((tag): tag is string => typeof tag === "string") : []
  const lineage: Array<{ base: string; relation: string; license_inherited: null }> = []
  for (const tag of tags) {
    if (!tag.startsWith("base_model:")) continue
    const rest = tag.slice("base_model:".length)
    const relation = rest.startsWith("quantized:")
      ? "quantized"
      : rest.startsWith("finetune:")
        ? "finetune"
        : rest.startsWith("adapter:")
          ? "adapter"
          : rest.startsWith("merge:")
            ? "merge"
            : "derivative"
    const base = rest.replace(/^(quantized|finetune|adapter|merge):/, "")
    if (!lineage.some((entry) => entry.base === base)) {
      lineage.push({ base, relation, license_inherited: null })
    }
  }
  return lineage
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args)
  const pullId = args.pull ?? (await latestPull())
  const pullDir = `data/pulls/${pullId}`
  const items = (await Deno.readTextFile(`${pullDir}/items.jsonl`))
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as PullItem)
  const itemMap = new Map(items.map((item) => [`${item.source}|${item.source_id}`, item]))
  const tagged = (await Deno.readTextFile(`${pullDir}/tags.proposed.jsonl`))
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TaggedItem)
  const links = JSON.parse(await Deno.readTextFile("data/links.json")) as LinkIndex
  const syndication = JSON.parse(await Deno.readTextFile("data/syndication.json")) as Syndication
  const watchlist = JSON.parse(await Deno.readTextFile("data/watchlist.json")) as Watchlist
  const aliasFile = JSON.parse(await Deno.readTextFile("data/model-aliases.json")) as ModelAliases
  const aliases = aliasFile.aliases
  let seedSummaries: Record<string, string> = {}
  try {
    seedSummaries = (JSON.parse(await Deno.readTextFile("data/seed-summaries.json")) as { summaries?: Record<string, string> }).summaries ?? {}
  } catch {
    // optional
  }
  const aliasHf = new Set(aliases.map((alias) => alias.hugging_face))
  const vocabulary = JSON.parse(await Deno.readTextFile("data/tags.json")) as {
    namespaces: Record<string, { values: Record<string, string> }>
  }
  let modelsDev: ModelsDevApi = {}
  try {
    modelsDev = JSON.parse(await Deno.readTextFile(`.cache/links/models-dev-${isoDate()}.json`)) as ModelsDevApi
  } catch {
    // models.dev cache absent
  }
  const modelsDevByKey = new Map<string, ModelsDevModel>()
  const contextSamples = new Map<string, number[]>()
  for (const provider of Object.values(modelsDev)) {
    for (const [key, model] of Object.entries(provider.models ?? {})) {
      const name = norm(model.canonical_model_id ?? key)
      if (model.limit?.context) {
        const samples = contextSamples.get(name) ?? []
        samples.push(model.limit.context)
        contextSamples.set(name, samples)
      }
      const existing = modelsDevByKey.get(name)
      if (!existing) {
        modelsDevByKey.set(name, model)
        continue
      }
      const input = [...new Set([...(existing.modalities?.input ?? []), ...(model.modalities?.input ?? [])])]
      const output = [...new Set([...(existing.modalities?.output ?? []), ...(model.modalities?.output ?? [])])]
      modelsDevByKey.set(name, {
        ...existing,
        ...model,
        canonical_model_id: existing.canonical_model_id ?? model.canonical_model_id,
        description: existing.description ?? model.description,
        family: existing.family ?? model.family,
        tool_call: Boolean(existing.tool_call || model.tool_call),
        reasoning: Boolean(existing.reasoning || model.reasoning),
        structured_output: Boolean(existing.structured_output || model.structured_output),
        open_weights: existing.open_weights ?? model.open_weights,
        modalities: { input, output },
        limit: existing.limit,
      })
    }
  }
  for (const [name, samples] of contextSamples) {
    const sorted = samples.sort((a, b) => a - b)
    const median = sorted[Math.floor((sorted.length - 1) / 2)]!
    const entry = modelsDevByKey.get(name)
    if (entry) entry.limit = { context: median }
  }
  const orgMap = buildOrgMap(watchlist)

  const roots: TaggedItem[] = []
  const builds: TaggedItem[] = []
  for (const entry of tagged) {
    if (entry.item.kind !== "model") continue
    const tags = entry.tags.map((tag) => tag.tag)
    if (tags.includes("status:build")) builds.push(entry)
    else if (tags.includes("status:probe") || tags.includes("status:documentation")) continue
    else roots.push(entry)
  }

  const rootByKey = new Map<string, TaggedItem>()
  for (const root of roots) {
    const key = norm(root.item.source_id)
    if (!rootByKey.has(key)) rootByKey.set(key, root)
  }
  const rootByHf = new Map(roots.map((root) => [root.item.source_id, root]))
  for (const alias of aliases) {
    const canonical = rootByHf.get(alias.canonical_hugging_face)
    if (canonical) rootByKey.set(norm(alias.hugging_face), canonical)
  }

  const buildsByRoot = new Map<string, TaggedItem[]>()
  const unmatchedBuilds: string[] = []
  for (const build of builds) {
    const item = itemMap.get(`${build.item.source}|${build.item.source_id}`)
    const baseModel = item?.source_tags
      ?.find((tag) => tag.startsWith("base_model:"))
      ?.replace(/^base_model:(?:finetune|quantized|adapter|merge|conversion):/, "")
      .replace(/^base_model:/, "")
    const candidates = [baseModel, build.item.source_id].filter(
      (candidate): candidate is string => typeof candidate === "string" && candidate.length > 0,
    )
    let root: TaggedItem | undefined
    for (const candidate of candidates) {
      root = rootByKey.get(norm(candidate))
      if (root) break
    }
    if (!root) {
      unmatchedBuilds.push(build.item.source_id)
      continue
    }
    const list = buildsByRoot.get(root.item.source_id) ?? []
    list.push(build)
    buildsByRoot.set(root.item.source_id, list)
  }

  const usedIds = new Set<string>()
  const models: Array<Record<string, unknown>> = []
  const compact: Array<Record<string, unknown>> = []
  let buildCount = 0

  for (const root of roots) {
    if (aliasHf.has(root.item.source_id)) continue
    const item = itemMap.get(`${root.item.source}|${root.item.source_id}`) ?? (root.item as unknown as PullItem)
    const sourceId = root.item.source_id
    const org = sourceId.split("/")[0] ?? ""
    const tags = root.tags.map((tag) => {
      if (tag.tag.startsWith("runtime:")) return `access:${tag.tag.slice("runtime:".length)}`
      if (tag.tag === "context:commercial-safe") return "licensing:commercial-safe"
      if (tag.tag === "context:non-commercial") return "licensing:non-commercial"
      return tag.tag
    })
    const md = modelsDevByKey.get(norm(sourceId))
    const link = links.models[sourceId] ?? {}
    const usage = link.providers?.length ? [] : await cardUsage(sourceId)
    const card = md?.description ? "" : await cardExcerpt(sourceId)
    const summary = md?.description ? md.description.slice(0, 400) : seedSummaries[sourceId] ?? card
    const enriched = new Set(tags)
    const folded = aliases.filter((alias) => alias.canonical_hugging_face === sourceId)
    for (const alias of folded) {
      const aliasRoot = rootByHf.get(alias.hugging_face)
      for (const tag of aliasRoot?.tags ?? []) {
        enriched.add(
          tag.tag.startsWith("runtime:")
            ? `access:${tag.tag.slice("runtime:".length)}`
            : tag.tag === "context:commercial-safe"
              ? "licensing:commercial-safe"
              : tag.tag === "context:non-commercial"
                ? "licensing:non-commercial"
                : tag.tag,
        )
      }
    }
    if (md?.tool_call) enriched.add("task:tool-calling")
    if (md?.reasoning) enriched.add("task:reasoning")
    for (const modality of [...(md?.modalities?.input ?? []), ...(md?.modalities?.output ?? [])]) {
      enriched.add(`modality:${modality}`)
    }
    if (md?.family && Object.hasOwn(vocabulary.namespaces.family?.values ?? {}, md.family)) {
      enriched.add(`family:${md.family}`)
    }
    const libraryName = String(item.source_meta?.library_name ?? "").toLowerCase()
    if (libraryName === "vllm") enriched.add("access:vllm")
    if (libraryName === "sglang") enriched.add("access:sglang")
    const providerIds = new Set(link.providers ?? [])
    if (providerIds.has("opencode") || providerIds.has("opencode-go")) enriched.add("access:opencode")
    if (providerIds.has("cloudflare-workers-ai")) enriched.add("access:cloudflare")
    if (providerIds.has("openrouter")) enriched.add("access:openrouter")
    const modelTags = tagList([...enriched])
    const licenseTag = tags.find((tag) => tag.startsWith("license:"))
    const licenseId = licenseTag ? licenseTag.slice("license:".length) : (await cardLicense(sourceId)) ?? "unknown"
    const tier = tierFor(licenseId)
    const tasks = modelTags.filter((tag) => tag.startsWith("task:")).map((tag) => tag.slice(5))
    const languages = modelTags.filter((tag) => tag.startsWith("language:")).map((tag) => tag.slice(9))
    const modalities = modelTags.filter((tag) => tag.startsWith("modality:")).map((tag) => tag.slice(9))
    const runtimes = modelTags.filter((tag) => tag.startsWith("access:")).map((tag) => tag.slice("access:".length))
    const localRuntimes = runtimes.filter((runtime) => !HOSTED_RUNTIMES.has(runtime))
    const orgId = orgMap.get(org.toLowerCase()) ?? slug(org)
    const base = baseName(sourceId)
    let id = slug(base)
    if (usedIds.has(id)) id = `${slug(org)}-${slug(base)}`
    usedIds.add(id)

    const paramsB = paramsFrom(base)
    const weightsGb = paramsB == null ? await hfSizeGb(sourceId) : null
    const synd = syndication.models[sourceId]
    const buildEntries = (buildsByRoot.get(sourceId) ?? []).map((build) => {
      const buildTags = build.tags.map((tag) => tag.tag)
      const buildRuntimes = buildTags.filter((tag) => tag.startsWith("access:")).map((tag) => tag.slice("access:".length))
      return {
        id: build.item.source_id,
        name: build.item.source_id,
        url: `https://huggingface.co/${build.item.source_id}`,
        runtime: buildRuntimes,
        quantization: quantizationFrom(build.item.title),
        relation: relationFrom(build.item.title, buildTags),
        status: "build",
      }
    })
    buildCount += buildEntries.length

    const record = {
      schema_version: 1,
      id,
      kind: "model",
      name: base,
      aliases: [sourceId, ...folded.map((alias) => alias.hugging_face)],
      releases: folded.map((alias) => {
        const aliasRoot = rootByHf.get(alias.hugging_face)
        const aliasItem = aliasRoot
          ? itemMap.get(`${aliasRoot.item.source}|${aliasRoot.item.source_id}`) ?? (aliasRoot.item as unknown as PullItem)
          : null
        return {
          id: alias.id,
          name: aliasRoot ? baseName(alias.hugging_face) : alias.id,
          hugging_face: alias.hugging_face,
          released: aliasItem?.published_at ? aliasItem.published_at.slice(0, 10) : null,
          relation: alias.relation,
          note: alias.note,
        }
      }),
      organization: orgId,
      released: root.item.published_at ? root.item.published_at.slice(0, 10) : null,
      summary,
      tags: modelTags,
      capabilities: {
        tasks,
        languages,
        modality: modalities,
        runtimes,
        tool_calling: md?.tool_call ?? null,
        reasoning: md?.reasoning ?? null,
        structured_output: md?.structured_output ?? null,
        context_tokens: md?.limit?.context ?? null,
      },
      footprint: {
        params_b: paramsB,
        ...(weightsGb != null ? { weights_gb: weightsGb } : {}),
        runtimes: localRuntimes,
      },
      license: {
        id: licenseId,
        class: licenseClass(licenseId),
        url: `https://huggingface.co/${sourceId}`,
      },
      openness: {
        weights: tier.weights,
        training_data: tier.data,
        training_code: tier.code,
        tier: tier.tier,
        tier_method: "reciprocity-v1",
        evidence: [`https://huggingface.co/${sourceId}`],
      },
      lineage: lineageFrom(item.source_meta ?? {}),
      access: {
        hugging_face: sourceId,
        models_dev: link.models_dev ?? null,
        agent_detect: link.agent_detect ?? null,
        providers: link.providers ?? [],
        provider_models: link.provider_models ?? {},
        gated: item.source_meta?.gated ?? null,
      },
      syndication: synd ?? { score: 0, points: 0, band: "self-only", sources: [] },
      builds: buildEntries,
      ...(usage.length > 0 ? { usage } : {}),
      sources: [
        {
          kind: "hugging-face",
          url: `https://huggingface.co/${sourceId}`,
          retrieved_at: isoDate(),
        },
      ],
      verified_at: isoDate(),
      updated_at: isoDate(),
      notes: buildEntries.length > 0 ? `${buildEntries.length} builds are attached.` : "",
    }
    models.push(record)
    compact.push({
      id,
      name: base,
      organization: orgId,
      summary,
      tasks,
      domains: modelTags.filter((tag) => tag.startsWith("domain:")).map((tag) => tag.slice(7)),
      tags: modelTags,
      license: licenseId,
      tier: tier.tier,
      weights: tier.weights,
      training_data: tier.data,
      training_code: tier.code,
      score: synd?.score ?? 0,
      band: synd?.band ?? "self-only",
      tool_calling: md?.tool_call ?? null,
      reasoning: md?.reasoning ?? null,
      structured_output: md?.structured_output ?? null,
      context_tokens: md?.limit?.context ?? null,
      params_b: paramsB,
      ...(weightsGb != null ? { weights_gb: weightsGb } : {}),
      released: root.item.published_at ? root.item.published_at.slice(0, 10) : null,
      aliases: [sourceId, ...folded.map((alias) => alias.hugging_face)],
      releases: folded.length,
      models_dev: link.models_dev ?? null,
      agent_detect: link.agent_detect ?? null,
      providers: link.providers ?? [],
      provider_models: link.provider_models ?? {},
      builds: buildEntries.length,
    })
  }

  models.sort((a, b) => String(a.id).localeCompare(String(b.id)))
  compact.sort((a, b) => {
    const scoreDiff = Number(b.score) - Number(a.score)
    return scoreDiff !== 0 ? scoreDiff : String(a.id).localeCompare(String(b.id))
  })

  const keep = new Set(models.map((model) => String(model.id)))
  try {
    for await (const entry of Deno.readDir("data/models")) {
      if (!entry.isFile || !entry.name.endsWith(".json")) continue
      const id = entry.name.slice(0, -".json".length)
      if (!keep.has(id)) await Deno.remove(`data/models/${entry.name}`)
    }
  } catch {
    // directory does not exist yet
  }

  for (const model of models) {
    await writeReplace(`data/models/${model.id}.json`, JSON.stringify(model, null, 2) + "\n")
  }

  const report = {
    aliases_folded: aliases.length,
    pull_id: pullId,
    generated_at: new Date().toISOString(),
    roots: models.length,
    builds_attached: buildCount,
    builds_unmatched: unmatchedBuilds.length,
    builds_unmatched_samples: unmatchedBuilds.slice(0, 30),
    skipped: {
      builds: builds.length,
      probes: tagged.filter((entry) => entry.item.kind === "model" && entry.tags.some((tag) => tag.tag === "status:probe")).length,
      documentation: tagged.filter((entry) => entry.item.kind === "model" && entry.tags.some((tag) => tag.tag === "status:documentation")).length,
    },
    notes: [
      "Only root and notable models get a record. Builds attach to the matched root by normalized name.",
      "The reciprocity tier is unproven unless a conditional licence caps it at shared. Training-data and training-code evidence is not assessed in this pass.",
      "The syndication score comes from data/syndication.json. It is independent listings, not quality.",
    ],
  }
  await writeReplace("data/models.report.json", JSON.stringify(report, null, 2) + "\n")
  await writeReplace(
    "data/dist/models.json",
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        pull_id: pullId,
        aliases: aliases.map((alias) => ({
          id: alias.id,
          canonical_id: alias.canonical_id,
          hugging_face: alias.hugging_face,
          relation: alias.relation,
        })),
        models: compact,
      },
      null,
      2,
    ) + "\n",
  )

  console.log(`pull ${pullId}`)
  console.log(`roots ${models.length}, builds attached ${buildCount}, builds unmatched ${unmatchedBuilds.length}`)
  console.log(`skipped builds ${report.skipped.builds}, probes ${report.skipped.probes}, documentation ${report.skipped.documentation}`)
  console.log(`records: data/models/ (${models.length})`)
  console.log(`report: data/models.report.json`)
  console.log(`compact: data/dist/models.json`)
}

if (import.meta.main) {
  await main()
}
