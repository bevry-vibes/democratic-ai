import { readJSON, writeReplace } from "../fetch/lib/cache.ts"
import { isoDate } from "../fetch/lib/time.ts"

interface ScorecardFile {
  schema_version: number
  updated_at: string
  title: string
  as_of: string
  scale: string
  source: string
  rubric: {
    openness_morality: {
      weights_open: number
      training_data_open: number
      training_data_documented: number
      training_code_open: number
      training_code_documented: number
      license_permissive: number
      license_conditional: number
      note: string
    }
  }
}

interface BenchmarkEvidence {
  id: string
  name: string
  group: string
  score: number
  self_reported: boolean
}

interface BenchmarkEntry {
  performance: number
  performance_basis: string
  performance_match: string
  inherited_from: string | null
  benchmarks: BenchmarkEvidence[]
  own_benchmarks: BenchmarkEvidence[]
  research: number | null
  research_benchmarks: BenchmarkEvidence[]
  self_reported: boolean
  source: string | null
  as_of: string
  note: string
}

interface Benchmarks {
  models: Record<string, BenchmarkEntry>
}

interface TaskPerformance {
  task: string
  metric: string
  value: number
  unit: string
  direction: "lower" | "higher"
  source: string
  source_kind: string
  as_of: string
  match: string
  via: string | null
  note: string
}

interface ModelRecord {
  id: string
  name: string
  license: { id: string; class: string }
  openness: {
    weights: string
    training_data: string
    training_code: string
    tier: string
  }
  syndication: { score: number; band: string }
  task_performance?: TaskPerformance | null
  performance?: unknown
  scorecard?: unknown
  [key: string]: unknown
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

function opennessScore(record: ModelRecord, rubric: ScorecardFile["rubric"]["openness_morality"]): number {
  const weights = record.openness.weights === "open-weight" ? rubric.weights_open : 0
  const data =
    record.openness.training_data === "open"
      ? rubric.training_data_open
      : record.openness.training_data === "documented"
        ? rubric.training_data_documented
        : 0
  const code =
    record.openness.training_code === "open"
      ? rubric.training_code_open
      : record.openness.training_code === "documented"
        ? rubric.training_code_documented
        : 0
  const license =
    record.license.class === "permissive"
      ? rubric.license_permissive
      : record.license.class === "use-restricted" || record.license.class === "non-commercial"
        ? rubric.license_conditional
        : 0
  return weights + data + code + license
}

function performanceFromTask(task: TaskPerformance | null | undefined): number | null {
  if (!task) return null
  if (task.unit === "/100") return task.value
  if (task.unit === "%") {
    const value = task.direction === "lower" ? 100 - task.value : task.value
    return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10
  }
  return null
}

async function main(): Promise<void> {
  const scorecardFile = await readJSON<ScorecardFile>("data/scorecard.json")
  const benchmarks = await readJSON<Benchmarks>("data/benchmarks.json")
  const index = await readJSON<ModelIndex>("data/dist/models.json")
  const rubric = scorecardFile.rubric.openness_morality

  let opennessCount = 0
  let performanceCount = 0
  let researchCount = 0
  const applied: Array<{ id: string; openness: number; performance: number | null; research: number | null }> = []

  for (const compact of index.models) {
    const record = await readJSON<ModelRecord>(`data/models/${compact.id}.json`)
    const benchmark = benchmarks.models[compact.id]
    const taskScore = performanceFromTask(record.task_performance)
    const performance = taskScore ?? benchmark?.performance ?? null
    const research = benchmark?.research ?? null
    const openness = opennessScore(record, rubric)

    const performanceNote =
      taskScore != null && record.task_performance
        ? `Derived from ${record.task_performance.metric} (${record.task_performance.value}${record.task_performance.unit}) reported by ${record.task_performance.source_kind}.`
        : benchmark
          ? benchmark.note
          : "Not measured. No current benchmark is recorded."
    const performanceSource = taskScore != null ? record.task_performance?.source : benchmark?.source ?? null
    const performanceAsOf = taskScore != null ? record.task_performance?.as_of : benchmark?.as_of ?? null

    const scorecard = {
      openness_morality: {
        score: openness,
        tier: record.openness.tier,
        note: rubric.note,
      },
      performance: {
        score: performance,
        basis: taskScore != null ? "task" : benchmark?.performance_basis ?? null,
        match: taskScore != null ? "exact" : benchmark?.performance_match ?? null,
        inherited_from: benchmark?.inherited_from ?? null,
        benchmarks: benchmark?.benchmarks ?? [],
        own_benchmarks: benchmark?.own_benchmarks ?? [],
        metric: taskScore != null ? record.task_performance?.metric ?? null : null,
        source: performanceSource,
        as_of: performanceAsOf,
        note: performanceNote,
      },
      research_citation: {
        score: research,
        basis: research != null ? "research" : null,
        benchmarks: benchmark?.research_benchmarks ?? [],
        source: research != null ? benchmark?.source ?? null : null,
        as_of: research != null ? benchmark?.as_of ?? null : null,
        note:
          research != null
            ? "Mean of current research benchmarks. Citation accuracy is not measured."
            : "Not measured. No current research benchmark is recorded.",
      },
      syndication: {
        score: record.syndication.score,
        max: 10,
        band: record.syndication.band,
        note: "Independent listings, not quality. The model's own host has weight 0.",
      },
      as_of: isoDate(),
      method: "Openness/Morality is computed from current release terms. Performance/Intelligence is the model's current task or benchmark result. Research/Citation uses current research benchmarks and does not claim citation accuracy. Syndication is current independent listings. The axes are independent; a missing score is not zero.",
      source: "internal://democratic-ai/scorecard-v2",
    }

    delete record.performance
    record.scorecard = scorecard
    compact.scorecard = scorecard
    await writeReplace(`data/models/${record.id}.json`, JSON.stringify(record, null, 2) + "\n")

    opennessCount++
    if (performance != null) performanceCount++
    if (research != null) researchCount++
    applied.push({ id: record.id, openness, performance, research })
  }

  await writeReplace(
    "data/dist/models.json",
    JSON.stringify(
      {
        ...index,
        scorecard: {
          title: scorecardFile.title,
          as_of: scorecardFile.as_of,
          scale: scorecardFile.scale,
          source: scorecardFile.source,
        },
        models: index.models,
      },
      null,
      2,
    ) + "\n",
  )

  const report = {
    updated_at: new Date().toISOString(),
    generated_on: isoDate(),
    title: scorecardFile.title,
    as_of: scorecardFile.as_of,
    models: index.models.length,
    openness_scored: opennessCount,
    performance_scored: performanceCount,
    research_scored: researchCount,
    note: "Current values only. The scorecard computes openness from release terms and takes performance and research from current task benchmarks. Missing axes stay missing; they are not zero.",
    applied,
  }
  await writeReplace("data/scorecard.report.json", JSON.stringify(report, null, 2) + "\n")

  console.log(
    `scorecard: ${opennessCount} openness, ${performanceCount} performance, ${researchCount} research, ${index.models.length} syndication`,
  )
  const withTop = Object.entries(benchmarks.models)
    .sort((a, b) => b[1].performance - a[1].performance)
    .slice(0, 10)
  for (const [id, entry] of withTop) console.log(`  ${entry.performance.toFixed(1).padStart(5)}  ${id} (${entry.performance_basis})`)
  console.log("report: data/scorecard.report.json")
}

await main()
