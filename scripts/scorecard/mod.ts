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

function opennessScore(
  record: ModelRecord,
  rubric: ScorecardFile["rubric"]["openness_morality"],
): {
  score: number
  components: Array<{ label: string; value: string; points: number; max: number }>
} {
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
  return {
    score: weights + data + code + license,
    components: [
      { label: "Weights", value: record.openness.weights, points: weights, max: rubric.weights_open },
      { label: "Training data", value: record.openness.training_data, points: data, max: rubric.training_data_open },
      { label: "Training code", value: record.openness.training_code, points: code, max: rubric.training_code_open },
      { label: "Licence", value: record.license.id, points: license, max: rubric.license_permissive },
    ],
  }
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
  const applied: Array<{
    id: string
    openness: number
    performance: number | null
    research: number | null
    overall: number | null
  }> = []

  for (const compact of index.models) {
    const record = await readJSON<ModelRecord>(`data/models/${compact.id}.json`)
    const benchmark = benchmarks.models[compact.id]
    const taskScore = performanceFromTask(record.task_performance)
    const performance = taskScore ?? benchmark?.performance ?? null
    const research = benchmark?.research ?? null
    const opennessResult = opennessScore(record, rubric)
    const openness = opennessResult.score

    const performanceNote =
      taskScore != null && record.task_performance
        ? `Derived from ${record.task_performance.metric} (${record.task_performance.value}${record.task_performance.unit}) reported by ${record.task_performance.source_kind}.`
        : benchmark
          ? benchmark.note
          : "Not measured. No current benchmark is recorded."
    const performanceSource = taskScore != null ? record.task_performance?.source : benchmark?.source ?? null
    const performanceAsOf = taskScore != null ? record.task_performance?.as_of : benchmark?.as_of ?? null

    const axes = [
      { key: "syndication", score: record.syndication.score * 10, weight: 15 },
      { key: "performance", score: performance, weight: 40 },
      { key: "openness", score: openness, weight: 30 },
      { key: "research", score: research, weight: 15 },
    ]
    const available = axes.filter((axis) => axis.score != null)
    const weightTotal = available.reduce((sum, axis) => sum + axis.weight, 0)
    const overallScore =
      weightTotal > 0
        ? Math.round((available.reduce((sum, axis) => sum + axis.score! * axis.weight, 0) / weightTotal) * 10) / 10
        : null
    const overall = {
      score: overallScore,
      coverage: available.length,
      weights: { syndication: 15, performance: 40, openness: 30, research: 15 },
      components: axes.map((axis) => ({
        key: axis.key,
        label:
          axis.key === "openness"
            ? "Openness/Morality"
            : axis.key === "performance"
              ? "Performance/Intelligence"
              : axis.key === "research"
                ? "Research/Citation"
                : "Syndication",
        score: axis.score,
        weight: axis.weight,
        included: axis.score != null,
        effective_weight: axis.score != null ? Math.round((axis.weight / weightTotal) * 1000) / 10 : 0,
        contribution:
          axis.score != null ? Math.round(((axis.score * axis.weight) / weightTotal) * 10) / 10 : null,
      })),
      note:
        "Weighted mean of the available scorecard axes. Missing axes are excluded, not treated as zero. Coverage is shown so a sparse score is not mistaken for a complete one.",
    }

    const scorecard = {
      overall,
      openness_morality: {
        score: openness,
        tier: record.openness.tier,
        note: rubric.note,
        components: opennessResult.components,
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
        citation: research != null ? "not measured" : "not measured",
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
    applied.push({ id: record.id, openness, performance, research, overall: overallScore })
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
    average_overall:
      Math.round(
        (applied.reduce((sum, entry) => sum + (entry.overall ?? 0), 0) / Math.max(1, applied.filter((entry) => entry.overall != null).length)) * 10,
      ) / 10,
    overall_scored: applied.filter((entry) => entry.overall != null).length,
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
