import fs from "node:fs"
import path from "node:path"

const root = path.resolve(process.cwd(), "..")

export interface BenchmarkEvidence {
  id: string
  name: string
  group: string
  score: number
  self_reported: boolean
}

export interface Scorecard {
  overall: {
    score: number | null
    coverage: number
    weights: Record<string, number>
    components: Array<{
      key: string
      label: string
      score: number | null
      weight: number
      included: boolean
      effective_weight: number
      contribution: number | null
    }>
    note: string
  }
  openness_morality: {
    score: number
    tier: string
    note: string
    components: Array<{ label: string; value: string; points: number; max: number }>
  }
  performance: {
    score: number | null
    basis: string | null
    match: string | null
    inherited_from: string | null
    benchmarks: BenchmarkEvidence[]
    own_benchmarks: BenchmarkEvidence[]
    metric: string | null
    source: string | null
    as_of: string | null
    note: string
  }
  research_citation: {
    score: number | null
    basis: string | null
    benchmarks: BenchmarkEvidence[]
    source: string | null
    as_of: string | null
    note: string
    citation: string
  }
  syndication: {
    score: number
    max: number
    band: string
    note: string
  }
  as_of: string
  method: string
  source: string
}

export interface ProviderModel {
  id: string
  name: string
  cost: {
    input?: number
    output?: number
    cache_read?: number
    cache_write?: number
  } | null
}

export interface CompactModel {
  id: string
  name: string
  organization: string
  summary: string
  tasks: string[]
  domains: string[]
  tags: string[]
  license: string
  tier: string
  weights: string
  training_data: string
  training_code: string
  score: number
  band: string
  tool_calling: boolean | null
  reasoning: boolean | null
  structured_output: boolean | null
  context_tokens: number | null
  params_b: number | null
  released: string | null
  aliases: string[]
  releases: number
  task_performance?: TaskPerformance | null
  scorecard?: Scorecard | null
  models_dev: string | null
  agent_detect: string | null
  providers: string[]
  provider_models: Record<string, ProviderModel[]>
  builds: number
}

export interface ModelIndex {
  generated_at: string
  pull_id: string
  models: CompactModel[]
}

export interface ModelRecord extends Omit<CompactModel, "license" | "releases"> {
  schema_version: number
  kind: string
  aliases: string[]
  releases: Array<{
    id: string
    name: string
    hugging_face: string
    released: string | null
    relation: string
    note: string
  }>
  summary: string
  released: string | null
  capabilities: {
    tasks: string[]
    languages: string[]
    modality: string[]
    runtimes: string[]
    tool_calling: boolean | null
    reasoning: boolean | null
    structured_output: boolean | null
    context_tokens: number | null
  }
  footprint: { params_b: number | null; runtimes: string[] }
  license: { id: string; class: string; url: string }
  openness: {
    weights: string
    training_data: string
    training_code: string
    tier: string
    tier_method: string
    evidence: string[]
  }
  lineage: Array<{ base: string; relation: string; license_inherited: boolean | null }>
  access: {
    hugging_face: string
    models_dev: string | null
    agent_detect: string | null
    providers: string[]
    provider_models: Record<string, ProviderModel[]>
    gated: boolean | string | null
  }
  syndication: {
    score: number
    points: number
    band: string
    sources: Array<{ id: string; url: string; weight: number; kind: string; self: boolean }>
  }
  builds: Array<{
    id: string
    name: string
    url: string
    runtime: string[]
    quantization: string | null
    relation: string | null
    status: string
  }>
  usage?: Array<{ language: string; code: string }>
  sources: Array<{ kind: string; url: string; retrieved_at: string }>
  verified_at: string
  updated_at: string
  notes: string
}

export interface TagVocabulary {
  schema_version: number
  updated_at: string
  status: string
  notes: string
  namespaces: Record<string, { definition: string; values: Record<string, string> }>
}

export interface SyndicationFile {
  schema_version: number
  updated_at: string
  method: {
    note: string
    weights: Record<string, number>
    bands: Record<string, string>
  }
  unavailable_sources: Array<{ id: string; url: string; kind: string; weight: number; reason: string }>
  counts: {
    models: number
    builds_and_probes_skipped: number
    average_score: number
    bands: Record<string, number>
    sources: Record<string, number>
  }
}

export interface LinksFile {
  schema_version: number
  updated_at: string
  models: Record<string, { models_dev?: string; agent_detect?: string }>
}

function readJSON<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8")) as T
}

export function getIndex(): ModelIndex {
  return readJSON<ModelIndex>("data/dist/models.json")
}

export function getModel(id: string): ModelRecord {
  return readJSON<ModelRecord>(`data/models/${id}.json`)
}

export function getTags(): TagVocabulary {
  return readJSON<TagVocabulary>("data/tags.json")
}

export function getSyndication(): SyndicationFile {
  return readJSON<SyndicationFile>("data/syndication.json")
}

export function getLinks(): LinksFile {
  return readJSON<LinksFile>("data/links.json")
}

export function getReadme(): string {
  return fs.readFileSync(path.join(root, "README.md"), "utf8")
}

export const TAG_NAMESPACE_ORDER = [
  "task",
  "domain",
  "modality",
  "access",
  "language",
  "context",
  "licensing",
  "license",
  "family",
  "status",
  "relation",
  "org",
  "source",
]

export function sortTags(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    const [aNamespace, ...aRest] = a.split(":")
    const [bNamespace, ...bRest] = b.split(":")
    const aIndex =
      TAG_NAMESPACE_ORDER.indexOf(aNamespace!) === -1 ? TAG_NAMESPACE_ORDER.length : TAG_NAMESPACE_ORDER.indexOf(aNamespace!)
    const bIndex =
      TAG_NAMESPACE_ORDER.indexOf(bNamespace!) === -1 ? TAG_NAMESPACE_ORDER.length : TAG_NAMESPACE_ORDER.indexOf(bNamespace!)
    if (aIndex !== bIndex) return aIndex - bIndex
    return aRest.join(":").localeCompare(bRest.join(":"))
  })
}

export function tagLabel(tag: string): string {
  return tag.split(":").slice(1).join(":").replaceAll("-", " ")
}

export function tagNamespace(tag: string): string {
  return tag.split(":")[0] ?? ""
}

export function tagPath(tag: string): string {
  const [namespace, ...rest] = tag.split(":")
  return `/tags/${namespace}/${rest.join(":")}/`
}

export function tagStatus(tag: string): string {
  const namespace = tagNamespace(tag)
  return TAG_NAMESPACE_ORDER.includes(namespace) ? `tag-${namespace}` : "tag-other"
}

export function tierClass(tier: string): string {
  if (tier === "commons") return "badge-commons"
  if (tier === "reciprocal") return "badge-reciprocal"
  if (tier === "shared") return "badge-shared"
  if (tier === "closed") return "badge-closed"
  return "badge-unproven"
}

export function bandClass(band: string): string {
  if (band === "very-strong") return "badge-band-very"
  if (band === "strong") return "badge-band-strong"
  if (band === "moderate") return "badge-band-moderate"
  if (band === "emerging") return "badge-band-emerging"
  if (band === "weak") return "badge-band-weak"
  return "badge-band-self"
}

export function formatScore(score: number): string {
  return `${score}/10`
}

export function formatParams(params: number | null): string {
  if (params == null) return "Unknown size"
  return `${params}B parameters`
}

const CODE_TASKS = ["code", "tool-calling", "reasoning", "text-generation"]

export function performanceForTask(model: CompactModel, task: string): TaskPerformanceView {
  const taskPerformance = model.task_performance
  if (taskPerformance && taskPerformance.task === task) {
    return {
      label: taskPerformance.metric,
      value: taskPerformance.value,
      unit: taskPerformance.unit,
      direction: taskPerformance.direction,
      source: taskPerformance.source,
      source_kind: taskPerformance.source_kind,
      as_of: taskPerformance.as_of,
      match: taskPerformance.match,
      note: taskPerformance.note,
    }
  }
  const performance = model.scorecard?.performance
  if (performance) {
    return {
      label: "Performance",
      value: performance.score,
      unit: "",
      direction: "higher",
      source: performance.source ?? undefined,
      as_of: performance.as_of ?? undefined,
      note: performance.note,
    }
  }
  return { label: "Performance", value: null, unit: "", direction: "higher" }
}

export function metricForTask(
  models: CompactModel[],
  task: string,
): { label: string; unit: string; direction: "lower" | "higher" } | null {
  const sample = models.find((model) => model.task_performance?.task === task)?.task_performance
  if (sample) return { label: sample.metric, unit: sample.unit, direction: sample.direction }
  if (CODE_TASKS.includes(task) && models.some((model) => model.scorecard?.performance.score != null)) {
    return { label: "Performance", unit: "", direction: "higher" }
  }
  return null
}

export function formatPerformance(view: TaskPerformanceView): string {
  if (view.value == null) return "No score"
  if (view.unit === "%") return `${view.value}%`
  if (view.unit === "/100") return String(view.value)
  return view.unit ? `${view.value} ${view.unit}` : String(view.value)
}

export function formatIndex(value: number | null | undefined): string {
  if (value == null) return "—"
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export const SCORECARD_AXIS_ORDER = ["overall", "syndication", "performance", "openness", "research"] as const

export function scorecardAxes(model: CompactModel): Array<{
  key: "overall" | "openness" | "performance" | "research" | "syndication"
  label: string
  value: number | null
  display: string
}> {
  const scorecard = model.scorecard
  const entries = {
    overall: {
      key: "overall" as const,
      label: "overall",
      value: scorecard?.overall.score ?? null,
      display: scorecard?.overall.score == null ? "—" : String(Math.round(scorecard.overall.score)),
    },
    openness: {
      key: "openness" as const,
      label: "openness",
      value: scorecard?.openness_morality.score ?? null,
      display: scorecard?.openness_morality.score == null ? "—" : String(Math.round(scorecard.openness_morality.score)),
    },
    performance: {
      key: "performance" as const,
      label: "performance",
      value: scorecard?.performance.score ?? null,
      display: scorecard?.performance.score == null ? "—" : String(Math.round(scorecard.performance.score)),
    },
    research: {
      key: "research" as const,
      label: "citation",
      value: scorecard?.research_citation.score ?? null,
      display: scorecard?.research_citation.score == null ? "—" : String(Math.round(scorecard.research_citation.score)),
    },
    syndication: {
      key: "syndication" as const,
      label: "syndication",
      value: scorecard?.syndication.score ?? model.score,
      display: `${scorecard?.syndication.score ?? model.score}/${scorecard?.syndication.max ?? 10}`,
    },
  }
  return SCORECARD_AXIS_ORDER.map((key) => entries[key])
}

export function tierDescription(tier: string): string {
  if (tier === "commons") return "Weights, training data, and training code are open. The licence permits reuse."
  if (tier === "reciprocal") return "Weights and training code are open, and the training data is documented or open. The licence permits reuse."
  if (tier === "shared") return "The weights are available, but the training data is not open and the licence may restrict reuse."
  if (tier === "closed") return "The weights are not available."
  return "The evidence about the weights is not sufficient to make a determination. Unproven is not the same as closed."
}

export function tagDefinition(tag: string): string {
  const [namespace, ...rest] = tag.split(":")
  const value = rest.join(":")
  const vocabulary = getTags()
  const entry = vocabulary.namespaces[namespace]
  return entry?.values?.[value] ?? entry?.definition ?? "A tag in the catalogue."
}

export function formatContextCount(tokens: number | null): string {
  if (tokens == null) return "unknown"
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`
  return String(tokens)
}

export function formatContext(tokens: number | null): string {
  if (tokens == null) return "Unknown context"
  return `${formatContextCount(tokens)} context`
}

export function allTagPairs(index: ModelIndex): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>()
  for (const model of index.models) {
    for (const tag of model.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag))
}

export function taskCounts(index: ModelIndex): Array<{ task: string; count: number }> {
  const counts = new Map<string, number>()
  for (const model of index.models) {
    for (const task of model.tasks) counts.set(task, (counts.get(task) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([task, count]) => ({ task, count }))
    .sort((a, b) => b.count - a.count || a.task.localeCompare(b.task))
}

export function topModels(index: ModelIndex, limit = 12): CompactModel[] {
  return [...index.models]
    .filter((model) => model.scorecard?.overall.score != null && model.scorecard.overall.coverage >= 3)
    .sort((a, b) => {
      const overall = (b.scorecard?.overall.score ?? 0) - (a.scorecard?.overall.score ?? 0)
      if (overall !== 0) return overall
      const coverage = (b.scorecard?.overall.coverage ?? 0) - (a.scorecard?.overall.coverage ?? 0)
      if (coverage !== 0) return coverage
      const performance = (b.scorecard?.performance.score ?? 0) - (a.scorecard?.performance.score ?? 0)
      if (performance !== 0) return performance
      return b.score - a.score || a.name.localeCompare(b.name)
    })
    .slice(0, limit)
}

export function modelHref(id: string): string {
  return `/models/${id}/`
}
