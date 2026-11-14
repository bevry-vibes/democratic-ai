import { readIfExists, writeReplace } from "../fetch/lib/cache.ts"
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
  models: Record<string, { models_dev?: string; agent_detect?: string }>
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

interface Watchlist {
  members: Array<{ id: string; kind: string; hugging_face?: string | null; x?: string[] }>
}

const BUILD_MARKERS = [
  "-gguf", "-mlx", "-coreml", "-onnx", "-nvfp4", "-q8_0", "-q4_k_m", "-q4", "-q8", "-q6",
  "-4bit", "-8bit", "-bf16", "-int4", "-int8", "-ov", "-quant", "-dflash", "-singprobe", "-server",
]

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
  candidates.sort((a, b) => b.size - a.size)
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
  if (["use-restricted", "non-commercial", "proprietary"].includes(cls)) {
    return { tier: "shared", weights: "open-weight", data: "unknown", code: "unknown" }
  }
  return { tier: "unproven", weights: "open-weight", data: "unknown", code: "unknown" }
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
  const order = ["task", "domain", "modality", "runtime", "language", "context", "license", "family", "status", "relation"]
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

  const buildsByRoot = new Map<string, TaggedItem[]>()
  const unmatchedBuilds: string[] = []
  for (const build of builds) {
    const key = norm(build.item.source_id)
    const root = rootByKey.get(key)
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
    const item = itemMap.get(`${root.item.source}|${root.item.source_id}`) ?? (root.item as unknown as PullItem)
    const sourceId = root.item.source_id
    const org = sourceId.split("/")[0] ?? ""
    const tags = root.tags.map((tag) => tag.tag)
    const modelTags = tagList(tags)
    const licenseTag = tags.find((tag) => tag.startsWith("license:"))
    const licenseId = licenseTag ? licenseTag.slice("license:".length) : "unknown"
    const tier = tierFor(licenseId)
    const tasks = modelTags.filter((tag) => tag.startsWith("task:")).map((tag) => tag.slice(5))
    const languages = modelTags.filter((tag) => tag.startsWith("language:")).map((tag) => tag.slice(9))
    const modalities = modelTags.filter((tag) => tag.startsWith("modality:")).map((tag) => tag.slice(9))
    const runtimes = modelTags.filter((tag) => tag.startsWith("runtime:")).map((tag) => tag.slice(8))
    const orgId = orgMap.get(org.toLowerCase()) ?? slug(org)
    const base = baseName(sourceId)
    let id = slug(base)
    if (usedIds.has(id)) id = `${slug(org)}-${slug(base)}`
    usedIds.add(id)

    const link = links.models[sourceId] ?? {}
    const synd = syndication.models[sourceId]
    const buildEntries = (buildsByRoot.get(sourceId) ?? []).map((build) => {
      const buildTags = build.tags.map((tag) => tag.tag)
      const buildRuntimes = buildTags.filter((tag) => tag.startsWith("runtime:")).map((tag) => tag.slice(8))
      return {
        id: build.item.source_id,
        name: baseName(build.item.source_id),
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
      aliases: [sourceId],
      organization: orgId,
      released: root.item.published_at ? root.item.published_at.slice(0, 10) : null,
      tags: modelTags,
      capabilities: {
        tasks,
        languages,
        modality: modalities,
        runtimes,
      },
      footprint: {
        params_b: paramsFrom(base),
        runtimes,
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
        gated: item.source_meta?.gated ?? null,
      },
      syndication: synd ?? { score: 0, points: 0, band: "self-only", sources: [] },
      builds: buildEntries,
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
      tasks,
      domains: modelTags.filter((tag) => tag.startsWith("domain:")).map((tag) => tag.slice(7)),
      tags: modelTags,
      license: licenseId,
      tier: tier.tier,
      score: synd?.score ?? 0,
      band: synd?.band ?? "self-only",
      models_dev: link.models_dev ?? null,
      agent_detect: link.agent_detect ?? null,
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
    JSON.stringify({ generated_at: new Date().toISOString(), pull_id: pullId, models: compact }, null, 2) + "\n",
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
