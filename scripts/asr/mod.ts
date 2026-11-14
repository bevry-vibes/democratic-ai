import { readJSON, writeReplace } from "../fetch/lib/cache.ts"
import { isoDate } from "../fetch/lib/time.ts"

interface Leaderboard {
  name: string
  tab: string
  version: string
  as_of: string
  url: string
  cache: string
  metric: string
  unit: string
  direction: "lower" | "higher"
  note: string
}

interface AsrMapping {
  id: string
  entry?: string
  value?: number
  match: "exact" | "family"
  via?: string
  source?: string
  source_kind?: "leaderboard" | "model-card"
  as_of?: string
  note?: string
}

interface AsrFile {
  schema_version: number
  updated_at: string
  leaderboard: Leaderboard
  models: AsrMapping[]
}

interface SpaceConfig {
  components?: Array<{
    type?: string
    props?: { value?: { headers?: string[]; data?: unknown[][] } }
  }>
}

interface Table {
  headers: string[]
  rows: unknown[][]
}

interface CompactModel {
  id: string
  name: string
  [key: string]: unknown
}

interface ModelIndex {
  generated_at: string
  pull_id: string
  models: CompactModel[]
}

interface ModelRecord extends CompactModel {
  [key: string]: unknown
}

function plain(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
}

function findTable(config: SpaceConfig): Table {
  for (const component of config.components ?? []) {
    const value = component.props?.value
    if (!value?.headers || !value.data) continue
    const headers = value.headers.map((header) => plain(header))
    const hasModel = headers.some((header) => /^(model|model name)$/i.test(header))
    const hasWer = headers.some((header) => /average wer/i.test(header))
    if (hasModel && hasWer) return { headers, rows: value.data }
  }
  throw new Error("asr: no Average WER table in the cached Space config")
}

function valueFor(table: Table, entry: string): number {
  const modelIndex = table.headers.findIndex((header) => /^(model|model name)$/i.test(header))
  const werIndex = table.headers.findIndex((header) => /average wer/i.test(header))
  for (const row of table.rows) {
    if (plain(row[modelIndex]) !== entry) continue
    const value = Number(row[werIndex])
    if (!Number.isFinite(value)) throw new Error(`asr: ${entry} has no numeric Average WER`)
    return value
  }
  throw new Error(`asr: ${entry} is not in the cached Average WER table`)
}

async function main(): Promise<void> {
  const asr = await readJSON<AsrFile>("data/asr.json")
  const leaderboard = asr.leaderboard
  const config = await readJSON<SpaceConfig>(leaderboard.cache)
  const table = findTable(config)
  const index = await readJSON<ModelIndex>("data/dist/models.json")

  const applied: Array<{ id: string; value: number; match: string; source_kind: string }> = []
  const missing: string[] = []

  for (const mapping of asr.models) {
    const compact = index.models.find((model) => model.id === mapping.id)
    if (!compact) {
      missing.push(`${mapping.id}: no model in the index`)
      continue
    }

    const sourceKind = mapping.source_kind ?? "leaderboard"
    const value = mapping.value ?? (mapping.entry ? valueFor(table, mapping.entry) : null)
    if (value == null) {
      missing.push(`${mapping.id}: no value or leaderboard entry`)
      continue
    }

    const taskPerformance = {
      task: "transcription",
      metric: leaderboard.metric,
      value,
      unit: leaderboard.unit,
      direction: leaderboard.direction,
      source: mapping.source ?? leaderboard.url,
      source_kind: sourceKind,
      as_of: mapping.as_of ?? leaderboard.as_of,
      match: mapping.match,
      via: mapping.via ?? mapping.entry ?? null,
      note: mapping.note ?? leaderboard.note,
    }

    compact.task_performance = taskPerformance
    const record = await readJSON<ModelRecord>(`data/models/${mapping.id}.json`)
    record.task_performance = taskPerformance
    await writeReplace(`data/models/${mapping.id}.json`, JSON.stringify(record, null, 2) + "\n")
    applied.push({ id: mapping.id, value, match: mapping.match, source_kind: sourceKind })
  }

  await writeReplace(
    "data/dist/models.json",
    JSON.stringify(
      {
        ...index,
        asr: {
          name: leaderboard.name,
          tab: leaderboard.tab,
          version: leaderboard.version,
          as_of: leaderboard.as_of,
          source: leaderboard.url,
        },
        models: index.models,
      },
      null,
      2,
    ) + "\n",
  )

  applied.sort((a, b) => a.value - b.value || a.id.localeCompare(b.id))
  const report = {
    updated_at: new Date().toISOString(),
    generated_on: isoDate(),
    leaderboard: {
      name: leaderboard.name,
      tab: leaderboard.tab,
      version: leaderboard.version,
      as_of: leaderboard.as_of,
      source: leaderboard.url,
    },
    models: index.models.length,
    matched: applied.length,
    leaderboard_rows: applied.filter((entry) => entry.source_kind === "leaderboard").length,
    self_reported: applied.filter((entry) => entry.source_kind === "model-card").length,
    exact: applied.filter((entry) => entry.match === "exact").length,
    family: applied.filter((entry) => entry.match === "family").length,
    applied,
    missing,
    note: "A leaderboard row is a measured result. A model-card row is self-reported and marked as such. A family match carries the base model's row, not an exact version result. Never treat a missing score as zero.",
  }
  await writeReplace("data/asr.report.json", JSON.stringify(report, null, 2) + "\n")

  console.log(
    `asr: ${applied.length} models scored (${report.leaderboard_rows} leaderboard, ${report.self_reported} self-reported)`,
  )
  for (const entry of applied) console.log(`  ${entry.value.toFixed(2)}%  ${entry.id} (${entry.match}, ${entry.source_kind})`)
  for (const entry of missing) console.log(`  missing: ${entry}`)
  console.log("report: data/asr.report.json")
}

await main()
