import fs from "node:fs"
import path from "node:path"

const root = path.resolve(process.cwd(), "..")

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
  score: number
  band: string
  tool_calling: boolean | null
  reasoning: boolean | null
  context_tokens: number | null
  released: string | null
  task_performance?: TaskPerformance | null
  performance?: {
    openness_morality: number
    code_reasoning: number | null
    research_citation: number
    source: string
    as_of: string
    match: string
    note: string
    name: string
  } | null
  models_dev: string | null
  agent_detect: string | null
  builds: number
}

export interface TaskPerformance {
  task: string
  metric: string
  value: number
  unit: string
  direction: "lower" | "higher"
  source: string
  source_kind: "leaderboard" | "model-card"
  as_of: string
  match: string
  via: string | null
  note: string
}

export interface TaskPerformanceView {
  label: string
  value: number | null
  unit: string
  direction: "lower" | "higher"
  source?: string
  source_kind?: string
  as_of?: string
  match?: string
  note?: string
}

export interface ModelIndex {
  generated_at: string
  pull_id: string
  models: CompactModel[]
}

export interface ModelRecord extends Omit<CompactModel, "license"> {
  schema_version: number
  kind: string
  aliases: string[]
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

export function tagStatus(tag: string): "task" | "domain" | "context" | "license" | "other" {
  const namespace = tagNamespace(tag)
  if (namespace === "task") return "task"
  if (namespace === "domain") return "domain"
  if (namespace === "context") return "context"
  if (namespace === "license") return "license"
  return "other"
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
  const performance = model.performance
  if (performance && CODE_TASKS.includes(task)) {
    return { label: "Code/Reasoning", value: performance.code_reasoning, unit: "/100", direction: "higher" }
  }
  if (performance && task === "retrieval") {
    return { label: "Research/Citation", value: performance.research_citation, unit: "/100", direction: "higher" }
  }
  if (task === "transcription") {
    return { label: "Average WER", value: null, unit: "%", direction: "lower" }
  }
  return { label: "Task score", value: null, unit: "", direction: "higher" }
}

export function metricForTask(
  models: CompactModel[],
  task: string,
): { label: string; unit: string; direction: "lower" | "higher" } | null {
  const sample = models.find((model) => model.task_performance?.task === task)?.task_performance
  if (sample) return { label: sample.metric, unit: sample.unit, direction: sample.direction }
  if (CODE_TASKS.includes(task) && models.some((model) => model.performance?.code_reasoning != null)) {
    return { label: "Code/Reasoning", unit: "/100", direction: "higher" }
  }
  if (task === "retrieval" && models.some((model) => model.performance != null)) {
    return { label: "Research/Citation", unit: "/100", direction: "higher" }
  }
  return null
}

export function formatPerformance(view: TaskPerformanceView): string {
  if (view.value == null) return "No score"
  if (view.unit === "%") return `${view.value}%`
  if (view.unit === "/100") return `${view.value}/100`
  return view.unit ? `${view.value} ${view.unit}` : String(view.value)
}

export function formatContext(tokens: number | null): string {
  if (tokens == null) return "Unknown context"
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M context`
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K context`
  return `${tokens} context`
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
    .filter((model) => model.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
}

export function modelHref(id: string): string {
  return `/models/${id}/`
}
