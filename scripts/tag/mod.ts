import { readJSON, writeReplace } from "../fetch/lib/cache.ts"
import { isoDate } from "../fetch/lib/time.ts"
import type { Watchlist } from "../fetch/lib/types.ts"

interface TagRuleFile {
  pipelines: Record<string, string[]>
  libraries: Record<string, string>
  families: Record<string, string>
  keywords: Record<string, string[]>
  contexts: Record<string, string[]>
  domains: Record<string, string[]>
  title_tasks: Record<string, string[]>
  title_runtimes: Record<string, string[]>
  desert_ant: Record<string, string>
  sitemaps: Record<string, string[]>
  build_markers: Record<string, string[]>
  relation_markers: Record<string, string[]>
  model_overrides: Record<string, string[]>
  packager_orgs: string[]
}

interface TagVocabulary {
  namespaces: Record<string, { definition: string; values: Record<string, string> }>
}

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
  raw: string
  fetched_at: string
  in_window: boolean
}

interface ProposedTag {
  tag: string
  confidence: number
  method: "source-native" | "rule" | "title" | "fallback" | "manual"
  evidence: string[]
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
  tags: ProposedTag[]
  needs_review: boolean
  review_reason: string | null
  warnings: string[]
}

function parseArgs(argv: string[]): {
  pull: string | null
  limit: number | null
  kinds: Set<string> | null
} {
  let pull: string | null = null
  let limit: number | null = null
  let kinds: Set<string> | null = null
  for (const arg of argv) {
    if (arg.startsWith("--pull=")) pull = arg.slice("--pull=".length)
    else if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length))
      if (Number.isFinite(value) && value > 0) limit = value
    } else if (arg.startsWith("--kind=")) {
      kinds = new Set(arg.slice("--kind=".length).split(",").map((value) => value.trim()).filter(Boolean))
    }
  }
  return { pull, limit, kinds }
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

function normalise(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}

function hasPhrase(text: string, phrase: string): boolean {
  const needle = normalise(phrase)
  if (!needle) return false
  if (needle.includes(" ")) return text.includes(needle)
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(text)
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

class TagSet {
  private readonly values = new Map<string, ProposedTag>()

  add(tag: string, confidence: number, method: ProposedTag["method"], evidence: string): void {
    const existing = this.values.get(tag)
    if (existing) {
      if (confidence > existing.confidence) {
        existing.confidence = confidence
        existing.method = method
      }
      if (!existing.evidence.includes(evidence)) existing.evidence.push(evidence)
      return
    }
    this.values.set(tag, { tag, confidence, method, evidence: [evidence] })
  }

  has(tag: string): boolean {
    return this.values.has(tag)
  }

  hasNamespace(namespace: string): boolean {
    return [...this.values.keys()].some((tag) => tag.startsWith(`${namespace}:`))
  }

  toArray(): ProposedTag[] {
    return [...this.values.values()].sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence
      return a.tag.localeCompare(b.tag)
    })
  }
}

function sourceTag(source: string): string {
  if (source === "hf-models") return "source:hf-model"
  if (source === "hf-datasets") return "source:hf-dataset"
  if (source === "hf-blog") return "source:hf-blog"
  if (source === "x") return "source:x"
  if (source.startsWith("arxiv:")) return "source:arxiv"
  if (source.startsWith("github:")) return "source:github-release"
  if (source.startsWith("sitemap:")) return "source:sitemap"
  return `source:${slug(source)}`
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

function applyList(
  tags: TagSet,
  text: string,
  rules: Record<string, string[]>,
  confidenceOne: number,
  confidenceMany: number,
  method: ProposedTag["method"],
  evidencePrefix: string,
): void {
  for (const [tag, phrases] of Object.entries(rules)) {
    const matches = phrases.filter((phrase) => hasPhrase(text, phrase))
    if (matches.length === 0) continue
    tags.add(tag, matches.length === 1 ? confidenceOne : confidenceMany, method, `${evidencePrefix}:${matches.join(",")}`)
  }
}

function tagItem(item: PullItem, rules: TagRuleFile, orgMap: Map<string, string>, vocabulary: TagVocabulary): TaggedItem {
  const tags = new TagSet()
  const warnings: string[] = []
  const title = normalise(item.title)
  const text = normalise(`${item.title} ${item.summary}`)
  const sourceTags = item.source_tags.map((tag) => tag.toLowerCase())
  const meta = item.source_meta ?? {}
  const author = typeof meta.author === "string" ? meta.author : ""

  tags.add(sourceTag(item.source), 1, "source-native", `source:${item.source}`)

  for (const tag of sourceTags) {
    if (tag.startsWith("pipeline:")) {
      const pipeline = tag.slice("pipeline:".length)
      for (const mapped of rules.pipelines[pipeline] ?? []) {
        tags.add(mapped, 0.9, "source-native", tag)
      }
    } else if (tag.startsWith("license:")) {
      const license = tag.slice("license:".length)
      tags.add(`license:${license}`, 0.95, "source-native", tag)
      if (["apache-2.0", "mit", "cc-by-4.0", "cc-by-sa-4.0"].includes(license)) {
        tags.add("licensing:commercial-safe", 0.9, "source-native", tag)
      }
      if (license.includes("nc") || license.includes("noncommercial")) {
        tags.add("licensing:non-commercial", 0.9, "source-native", tag)
      }
    } else if (tag.startsWith("library:")) {
      const library = tag.slice("library:".length)
      const runtime = rules.libraries[library]
      if (runtime) tags.add(runtime, 0.9, "source-native", tag)
    } else if (tag.startsWith("base_model:")) {
      for (const [key, family] of Object.entries(rules.families)) {
        if (tag.includes(key)) tags.add(`family:${family}`, 0.85, "source-native", tag)
      }
    } else if (tag.startsWith("repo:")) {
      tags.add("domain:tooling", 0.9, "source-native", tag)
      const repo = tag.slice("repo:".length)
      if (repo.includes("llama.cpp")) tags.add("access:llama.cpp", 0.9, "source-native", tag)
      if (repo.includes("mlx")) tags.add("access:mlx", 0.9, "source-native", tag)
      if (repo.includes("onnxruntime")) tags.add("access:onnx", 0.9, "source-native", tag)
    }
  }

  if (item.kind === "dataset") tags.add("domain:datasets", 0.95, "rule", "kind:dataset")
  if (item.kind === "release" || item.source.startsWith("github:")) {
    tags.add("domain:tooling", 0.9, "rule", "kind:release")
  }
  if (item.source.startsWith("sitemap:")) {
    const id = item.source.slice("sitemap:".length)
    for (const mapped of rules.sitemaps[id] ?? []) tags.add(mapped, 0.9, "source-native", `sitemap:${id}`)
  }
  if (meta.gated === true || meta.gated === "auto" || meta.gated === "manual") {
    tags.add("status:gated", 0.9, "source-native", "source_meta:gated")
  }
  if (author) {
    const org = orgMap.get(author.toLowerCase()) ?? slug(author)
    tags.add(`org:${org}`, 0.8, "source-native", `source_meta:author=${author}`)
    if (item.kind === "model" && rules.packager_orgs.includes(author.toLowerCase())) {
      tags.add("status:build", 0.95, "rule", `packager:${author}`)
      tags.add("relation:repackaged", 0.95, "rule", `packager:${author}`)
    }
  }

  applyList(tags, text, rules.keywords, 0.65, 0.85, "rule", "keyword")
  applyList(tags, text, rules.contexts, 0.65, 0.85, "rule", "keyword")
  applyList(tags, text, rules.domains, 0.65, 0.85, "rule", "keyword")

  if (item.kind === "model") {
    applyList(tags, title, rules.title_tasks, 0.7, 0.8, "title", "title")

    const markerTitle = title.replaceAll("_", "-")
    for (const [tag, markers] of Object.entries(rules.build_markers)) {
      const marker = markers.find((value) => markerTitle.includes(value))
      if (marker) tags.add(tag, 0.95, "title", `build-marker:${marker}`)
    }
    for (const [tag, markers] of Object.entries(rules.relation_markers)) {
      const marker = markers.find((value) => markerTitle.includes(value))
      if (marker) tags.add(tag, 0.95, "title", `relation-marker:${marker}`)
    }
    if (title.includes("-server")) tags.add("domain:tooling", 0.8, "title", "title:server")

    const finalSegment = title.split("/").pop() ?? title
    if (author.toLowerCase().includes("desert-ant") || author.toLowerCase() === "desert-ant-labs") {
      const job = rules.desert_ant[finalSegment]
      if (job) tags.add(job, 0.95, "title", `desert-ant:${finalSegment}`)
    }

    for (const [runtime, markers] of Object.entries(rules.title_runtimes)) {
      if (markers.some((marker) => hasPhrase(title, marker))) {
        tags.add(runtime, 0.8, "title", `title-runtime:${markers.find((m) => hasPhrase(title, m))}`)
      }
    }

    if (!tags.hasNamespace("task")) {
      const nonText = ["audio", "speech", "tts", "asr", "voice", "transcrib", "ocr", "image", "video", "vision", "vl", "vlm", "multimodal", "diar", "vad"].some((marker) => hasPhrase(title, marker))
      const family = nonText ? undefined : Object.entries(rules.families).find(([key]) => hasPhrase(title, key))
      if (family) {
        tags.add("task:text-generation", 0.6, "fallback", `family-fallback:${family[0]}`)
        tags.add("domain:language", 0.6, "fallback", `family-fallback:${family[0]}`)
        tags.add(`family:${family[1]}`, 0.6, "fallback", `family-fallback:${family[0]}`)
      }
    }
  }

  if (item.kind === "model") {
    const override = rules.model_overrides[item.source_id]
    if (override) {
      for (const tag of override) tags.add(tag, 0.95, "manual", `override:${item.source_id}`)
    }
  }

  const proposed = tags.toArray()
  const knownTags = new Set(
    Object.entries(vocabulary.namespaces).flatMap(([namespace, entry]) =>
      Object.keys(entry.values).map((value) => `${namespace}:${value}`),
    ),
  )
  for (const tag of proposed) {
    if (tag.tag.startsWith("org:")) continue
    if (!knownTags.has(tag.tag)) {
      warnings.push(`tag not in vocabulary: ${tag.tag}`)
    }
  }

  const hasTask = proposed.some((tag) => tag.tag.startsWith("task:"))
  const hasDomain = proposed.some((tag) => tag.tag.startsWith("domain:"))
  let needsReview = false
  let reviewReason: string | null = null
  const isBuild = proposed.some((tag) => tag.tag === "status:build" || tag.tag === "status:probe")
  const isDocumentation = proposed.some((tag) => tag.tag === "status:documentation")
  if (item.kind === "model" && !hasTask && !isBuild && !isDocumentation) {
    needsReview = true
    reviewReason = "model has no task tag"
  } else if (item.kind === "dataset" && !hasDomain) {
    needsReview = true
    reviewReason = "dataset has no domain tag"
  }
  if (item.kind === "model" && !proposed.some((tag) => tag.tag.startsWith("license:"))) {
    warnings.push("model has no licence tag")
  }

  return {
    item: {
      source: item.source,
      source_id: item.source_id,
      kind: item.kind,
      title: item.title,
      url: item.url,
      published_at: item.published_at,
    },
    tags: proposed,
    needs_review: needsReview,
    review_reason: reviewReason,
    warnings,
  }
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args)
  const pullId = args.pull ?? (await latestPull())
  const pullDir = `data/pulls/${pullId}`
  const itemsPath = `${pullDir}/items.jsonl`
  const rules = await readJSON<TagRuleFile>("data/tag-rules.json")
  const vocabulary = await readJSON<TagVocabulary>("data/tags.json")
  const watchlist = await readJSON<Watchlist>("data/watchlist.json")
  const orgMap = buildOrgMap(watchlist)

  const lines = (await Deno.readTextFile(itemsPath)).split("\n").filter(Boolean)
  const items = lines.map((line) => JSON.parse(line) as PullItem)
  const selected = items.filter((item) => {
    if (args.kinds && !args.kinds.has(item.kind)) return false
    return true
  })
  const limited = args.limit ? selected.slice(0, args.limit) : selected

  const tagged = limited.map((item) => tagItem(item, rules, orgMap, vocabulary))
  const taggedPath = `${pullDir}/tags.rules.jsonl`
  await writeReplace(taggedPath, tagged.map((entry) => JSON.stringify(entry)).join("\n") + "\n")

  const tagCounts: Record<string, number> = {}
  const byKind: Record<string, { items: number; tagged: number; review: number }> = {}
  const reviewSamples: Array<{ kind: string; title: string; url: string; reason: string }> = []
  for (const entry of tagged) {
    const kind = entry.item.kind
    byKind[kind] ??= { items: 0, tagged: 0, review: 0 }
    byKind[kind].items++
    if (entry.tags.length > 1) byKind[kind].tagged++
    if (entry.needs_review) {
      byKind[kind].review++
      if (reviewSamples.length < 30) {
        reviewSamples.push({
          kind,
          title: entry.item.title,
          url: entry.item.url,
          reason: entry.review_reason ?? "needs review",
        })
      }
    }
    for (const tag of entry.tags) tagCounts[tag.tag] = (tagCounts[tag.tag] ?? 0) + 1
  }

  const report = {
    pull_id: pullId,
    generated_at: new Date().toISOString(),
    generated_on: isoDate(),
    vocabulary_status: (vocabulary as unknown as { status?: string }).status ?? null,
    items: tagged.length,
    tagged_items: tagged.filter((entry) => entry.tags.length > 1).length,
    needs_review: tagged.filter((entry) => entry.needs_review).length,
    by_kind: byKind,
    tag_counts: Object.fromEntries(Object.entries(tagCounts).sort((a, b) => b[1] - a[1])),
    review_samples: reviewSamples,
    notes: [
      "The pass is rules-first. It reads source-native tags and specific title or text phrases. It does not call a language model.",
      "A model with no task tag is marked needs_review. It is not guessed.",
      "Sitemap pages are discovery links, not catalogue records. They carry source:sitemap and a domain when the sitemap itself is a known evaluation or tooling source.",
      "No tag is written to a model record. This file is a proposal for review.",
    ],
  }
  const reportPath = `${pullDir}/tags.report.json`
  await writeReplace(reportPath, JSON.stringify(report, null, 2) + "\n")

  console.log(`pull ${pullId}`)
  console.log(`items ${tagged.length}, tagged ${report.tagged_items}, needs review ${report.needs_review}`)
  console.log("by kind:")
  for (const [kind, counts] of Object.entries(byKind)) {
    console.log(`  ${kind.padEnd(8)} items=${String(counts.items).padStart(5)} tagged=${String(counts.tagged).padStart(5)} review=${String(counts.review).padStart(4)}`)
  }
  console.log("top tags:")
  for (const [tag, count] of Object.entries(report.tag_counts).slice(0, 25)) {
    console.log(`  ${String(count).padStart(5)} ${tag}`)
  }
  if (reviewSamples.length > 0) {
    console.log("review samples:")
    for (const sample of reviewSamples.slice(0, 10)) {
      console.log(`  ${sample.kind} | ${sample.title.slice(0, 70)} | ${sample.reason}`)
    }
  }
  console.log(`\nrules: ${taggedPath}`)
  console.log(`report: ${reportPath}`)
}

if (import.meta.main) {
  await main()
}
