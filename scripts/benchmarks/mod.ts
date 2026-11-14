import { readJSON, writeReplace } from "../fetch/lib/cache.ts"
import { isoDate } from "../fetch/lib/time.ts"

interface Syndication {
  models: Record<string, { sources: Array<{ id: string; url: string }> }>
}

interface ModelRecord {
  id: string
  access: { hugging_face: string }
}

interface Benchmark {
  benchmark_id: string
  name: string
  normalized_score: number | null
  self_reported: boolean
  categories?: string[]
}

interface Snapshot {
  source_url: string
  fetched_at: string
  model: { name: string; benchmarks?: Benchmark[] }
}

interface Group {
  key: string
  ids: string[]
}

interface BenchmarkEvidence {
  id: string
  name: string
  group: string
  score: number
  self_reported: boolean
}

interface CardBenchmarks {
  models: Record<
    string,
    {
      performance: number
      benchmarks: Array<{ id: string; name: string; score: number; self_reported: boolean }>
      source: string
      as_of: string
      note: string
    }
  >
}

interface ModelScore {
  value: number
  basis: "primary" | "secondary" | "tertiary"
  match: "exact" | "base"
  inherited_from: string | null
  evidence: BenchmarkEvidence[]
}

const PRIMARY: Group[] = [
  { key: "swe_verified", ids: ["swe-bench-verified"] },
  { key: "swe_pro", ids: ["swe-bench-pro"] },
  { key: "terminal", ids: ["terminal-bench-2.1", "terminal-bench-2"] },
  { key: "livecodebench", ids: ["livecodebench-v6", "livecodebench-v5", "livecodebench"] },
]

const SECONDARY: Group[] = [
  { key: "deepswe", ids: ["deepswe-1.1", "deepswe"] },
  { key: "frontierswe", ids: ["frontierswe"] },
  { key: "swe_marathon", ids: ["swe-marathon"] },
  { key: "mcp_atlas", ids: ["mcp-atlas"] },
  { key: "toolathlon", ids: ["toolathlon"] },
  { key: "nl2repo", ids: ["nl2repo"] },
  { key: "program_bench", ids: ["program-bench"] },
  { key: "swe_multilingual", ids: ["swe-bench-multilingual"] },
  { key: "multi_swe", ids: ["multi-swe-bench"] },
  { key: "swe_fficiency", ids: ["swe-fficiency"] },
  { key: "swe_refactor", ids: ["swe-refactor-bench"] },
  { key: "claw_eval", ids: ["claw-eval"] },
  { key: "skillsbench", ids: ["skillsbench"] },
]

const TERTIARY: Group[] = [
  { key: "agents_last_exam", ids: ["agents-last-exam"] },
  { key: "automationbench", ids: ["automationbench", "automationbench-aa", "automationbench-1.0.6"] },
  { key: "apex_agents", ids: ["apex-agents"] },
  { key: "browsecomp", ids: ["browsecomp"] },
  { key: "osworld", ids: ["osworld-verified", "osworld-2.0"] },
  { key: "posttrainbench", ids: ["posttrainbench"] },
  { key: "paperbench", ids: ["paperbench"] },
  { key: "kernelbench", ids: ["kernelbench-hard"] },
  { key: "livesqlbench", ids: ["livesqlbench"] },
  { key: "svg_bench", ids: ["svg-bench"] },
  { key: "vibe_v2", ids: ["vibe-v2"] },
  { key: "kimi_code_bench", ids: ["kimi-code-bench-v2"] },
]

const RESEARCH: Group[] = [
  { key: "browsecomp", ids: ["browsecomp"] },
  { key: "deepsearchqa", ids: ["deepsearchqa"] },
  { key: "researchclawbench", ids: ["researchclawbench"] },
  { key: "widesearch", ids: ["widesearch"] },
  { key: "finsearchcomp", ids: ["finsearchcomp-t3"] },
]

const INHERIT_SLUG: Record<string, string> = {
  "deepseek-v4-1-flash-1017": "deepseek-v4.1-flash",
  "kimi-k3-1-pro": "kimi-k3",
  "minimax-m3-1-flash": "minimax-m3",
  "ling-3-0-flash-fin": "ling-3.0-flash",
  "ling-3-1-flash-1019": "ling-3-1-flash",
}

function evidenceFor(benchmarks: Benchmark[], groups: Group[]): BenchmarkEvidence[] {
  const byId = new Map(
    benchmarks.filter((benchmark) => benchmark.normalized_score != null).map((benchmark) => [benchmark.benchmark_id, benchmark]),
  )
  const evidence: BenchmarkEvidence[] = []
  for (const group of groups) {
    for (const id of group.ids) {
      const benchmark = byId.get(id)
      if (!benchmark) continue
      evidence.push({
        id,
        name: benchmark.name,
        group: group.key,
        score: Math.round(benchmark.normalized_score! * 1000) / 10,
        self_reported: benchmark.self_reported,
      })
      break
    }
  }
  return evidence
}

function scoreSnapshot(benchmarks: Benchmark[]): { score: ModelScore | null; fallback: ModelScore | null } {
  const primary = evidenceFor(benchmarks, PRIMARY)
  const secondary = evidenceFor(benchmarks, SECONDARY)
  const tertiary = evidenceFor(benchmarks, TERTIARY)
  const make = (evidence: BenchmarkEvidence[], basis: ModelScore["basis"]): ModelScore => ({
    value: Math.round((evidence.reduce((sum, entry) => sum + entry.score, 0) / evidence.length) * 10) / 10,
    basis,
    match: "exact",
    inherited_from: null,
    evidence,
  })
  const fallback = secondary.length > 0 ? make(secondary, "secondary") : tertiary.length > 0 ? make(tertiary, "tertiary") : null
  return { score: primary.length > 0 ? make(primary, "primary") : null, fallback }
}

function researchFor(benchmarks: Benchmark[]): BenchmarkEvidence[] {
  return evidenceFor(benchmarks, RESEARCH)
}

interface AaModel {
  terminalBench21?: number | null
  terminalBench40?: number | null
  frontierCode?: number | null
  frontierCode20?: number | null
  livecodebench?: number | null
}

interface AaSnapshot {
  source_url: string
  fetched_at: string
  hugging_face: string | null
  model: AaModel
}

function aaScore(model: AaModel): { primary: ModelScore | null; fallback: ModelScore | null } {
  const make = (entries: Array<{ id: string; name: string; score: number }>, basis: "primary" | "secondary"): ModelScore => ({
    value: Math.round((entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length) * 10) / 10,
    basis,
    match: "exact",
    inherited_from: null,
    evidence: entries.map((entry) => ({ ...entry, group: "artificial-analysis", self_reported: false })),
  })
  const primary: Array<{ id: string; name: string; score: number }> = []
  if (model.terminalBench21 != null) primary.push({ id: "terminal-bench-2.1", name: "Terminal-Bench 2.1", score: model.terminalBench21 * 100 })
  if (model.livecodebench != null) primary.push({ id: "livecodebench", name: "LiveCodeBench", score: model.livecodebench * 100 })
  const secondary: Array<{ id: string; name: string; score: number }> = []
  if (model.terminalBench40 != null) secondary.push({ id: "terminal-bench-4.0", name: "Terminal-Bench 4.0", score: model.terminalBench40 * 100 })
  if (model.frontierCode != null) secondary.push({ id: "frontier-code", name: "FrontierCode", score: model.frontierCode * 100 })
  else if (model.frontierCode20 != null) secondary.push({ id: "frontier-code-2.0", name: "FrontierCode 2.0", score: model.frontierCode20 * 100 })
  return {
    primary: primary.length > 0 ? make(primary, "primary") : null,
    fallback: secondary.length > 0 ? make(secondary, "secondary") : null,
  }
}

async function main(): Promise<void> {
  const syndication = await readJSON<Syndication>("data/syndication.json")
  const cardBenchmarks = await readJSON<CardBenchmarks>("data/benchmarks.cards.json")
  const snapshots = new Map<string, Snapshot>()
  for await (const entry of Deno.readDir("data/raw/aggregators/llm-stats")) {
    if (!entry.isDirectory) continue
    try {
      snapshots.set(entry.name, await readJSON<Snapshot>(`data/raw/aggregators/llm-stats/${entry.name}/${isoDate()}.json`))
    } catch {
      // no snapshot for today
    }
  }

  const aaSnapshots = new Map<string, AaSnapshot>()
  const aaByHf = new Map<string, AaSnapshot>()
  try {
    for await (const entry of Deno.readDir("data/raw/aggregators/artificial-analysis")) {
      if (!entry.isDirectory) continue
      try {
        const snapshot = await readJSON<AaSnapshot>(`data/raw/aggregators/artificial-analysis/${entry.name}/${isoDate()}.json`)
        aaSnapshots.set(entry.name, snapshot)
        if (snapshot.hugging_face) aaByHf.set(snapshot.hugging_face, snapshot)
      } catch {
        // no snapshot for today
      }
    }
  } catch {
    // no AA snapshots yet
  }

  const hfToSlug = new Map<string, string>()
  const hfToAaSlug = new Map<string, string>()
  for (const [hf, model] of Object.entries(syndication.models)) {
    for (const source of model.sources) {
      if (source.id === "llm-stats") hfToSlug.set(hf, source.url.split("/").pop()!)
      if (source.id === "artificial-analysis") hfToAaSlug.set(hf, source.url.split("/").pop()!)
    }
  }

  const records: ModelRecord[] = []
  for await (const entry of Deno.readDir("data/models")) {
    if (!entry.isFile || !entry.name.endsWith(".json")) continue
    records.push(await readJSON<ModelRecord>(`data/models/${entry.name}`))
  }

  const scores = new Map<string, ModelScore>()
  const byId = new Map(records.map((record) => [record.id, record]))
  const scoreSlug = (slug: string, primaryOnly = false): ModelScore | null => {
    const snapshot = snapshots.get(slug)
    if (snapshot) {
      const result = scoreSnapshot(snapshot.model.benchmarks ?? [])
      return primaryOnly ? result.score : (result.score ?? result.fallback)
    }
    const aa = aaSnapshots.get(slug)
    if (aa) {
      const result = aaScore(aa.model)
      return primaryOnly ? result.primary : (result.primary ?? result.fallback)
    }
    return null
  }
  const scoreRecord = (record: ModelRecord, primaryOnly = false): ModelScore | null => {
    const slug = hfToSlug.get(record.access.hugging_face)
    return slug ? scoreSlug(slug, primaryOnly) : null
  }

  for (const record of records) {
    const own = scoreRecord(record)
    if (own?.basis === "primary") {
      scores.set(record.id, own)
      continue
    }
    const inheritSlug = INHERIT_SLUG[record.id]
    if (inheritSlug) {
      const base = scoreSlug(inheritSlug)
      if (base) {
        scores.set(record.id, { ...base, match: "base", inherited_from: inheritSlug })
        continue
      }
    }
    if (own) scores.set(record.id, own)
  }

  for (const [id, entry] of Object.entries(cardBenchmarks.models)) {
    const existing = scores.get(id)
    if (existing?.basis === "primary") continue
    if (!byId.has(id)) continue
    scores.set(id, {
      value: entry.performance,
      basis: "primary",
      match: "exact",
      inherited_from: null,
      evidence: entry.benchmarks.map((benchmark) => ({ ...benchmark, group: "card" })),
    })
  }

  for (const record of records) {
    const existing = scores.get(record.id)
    if (existing?.basis === "primary") continue
    const direct = aaByHf.get(record.access.hugging_face)
    const aaSlug = hfToAaSlug.get(record.access.hugging_face)
    const snapshot = direct ?? (aaSlug ? aaSnapshots.get(aaSlug) : undefined)
    if (!snapshot) continue
    const result = aaScore(snapshot.model)
    if (result.primary) scores.set(record.id, result.primary)
    else if (!existing && result.fallback) scores.set(record.id, result.fallback)
  }

  const now = new Date().toISOString()
  const models: Record<string, unknown> = {}
  for (const [id, result] of scores) {
    const record = byId.get(id)!
    const slug = hfToSlug.get(record.access.hugging_face)
    const snapshot = slug ? snapshots.get(slug) : undefined
    const aaSlug = hfToAaSlug.get(record.access.hugging_face)
    const aaSnapshot = aaByHf.get(record.access.hugging_face) ?? (aaSlug ? aaSnapshots.get(aaSlug) : undefined)
    const inheritedLlm = result.inherited_from ? snapshots.get(result.inherited_from) : undefined
    const inheritedAa = result.inherited_from ? aaSnapshots.get(result.inherited_from) : undefined
    const card = cardBenchmarks.models[id]
    const research = researchFor(snapshot?.model.benchmarks ?? [])
    const ownBenchmarks = (snapshot?.model.benchmarks ?? [])
      .filter(
        (benchmark) =>
          benchmark.normalized_score != null &&
          (benchmark.categories ?? []).some((category) => ["code", "agents", "tool_calling"].includes(category)),
      )
      .map((benchmark) => ({
        id: benchmark.benchmark_id,
        name: benchmark.name,
        group: "own",
        score: Math.round(benchmark.normalized_score! * 1000) / 10,
        self_reported: benchmark.self_reported,
      }))
    models[id] = {
      performance: result.value,
      performance_basis: result.basis,
      performance_match: result.match,
      inherited_from: result.inherited_from,
      benchmarks: result.evidence,
      own_benchmarks: result.match === "base" ? ownBenchmarks : [],
      research: research.length > 0 ? Math.round((research.reduce((sum, entry) => sum + entry.score, 0) / research.length) * 10) / 10 : null,
      research_benchmarks: research,
      self_reported: result.evidence.every((entry) => entry.self_reported),
      source: card?.source ?? snapshot?.source_url ?? aaSnapshot?.source_url ?? inheritedLlm?.source_url ?? inheritedAa?.source_url ?? null,
      as_of: card?.as_of ?? snapshot?.fetched_at ?? aaSnapshot?.fetched_at ?? inheritedLlm?.fetched_at ?? inheritedAa?.fetched_at ?? now,
      note:
        card?.note ??
        (result.evidence.some((entry) => entry.group === "artificial-analysis")
          ? "Mean of the available Artificial Analysis terminal or coding evaluations. Independent test run."
          : result.match === "base"
          ? `The update has no comparable benchmark of its own, so this uses the base model's ${result.basis} result.`
          : result.basis === "primary"
            ? `Mean of the available primary benchmarks: SWE-bench Verified, SWE-bench Pro, Terminal-Bench 2.x, and LiveCodeBench.`
            : `No primary benchmark is available; this is the mean of ${result.basis} agentic-coding benchmarks. Treat it as a weaker comparison.`),
    }
  }

  const report = {
    updated_at: now,
    generated_on: isoDate(),
    source: "https://llm-stats.com",
    models: records.length,
    scored: Object.keys(models).length,
    primary: Object.values(models).filter((model) => (model as { performance_basis: string }).performance_basis === "primary").length,
    secondary: Object.values(models).filter((model) => (model as { performance_basis: string }).performance_basis === "secondary").length,
    tertiary: Object.values(models).filter((model) => (model as { performance_basis: string }).performance_basis === "tertiary").length,
    inherited: Object.values(models).filter((model) => (model as { performance_match: string }).performance_match === "base").length,
    card_reported: Object.keys(cardBenchmarks.models).filter((id) => scores.get(id)?.evidence.some((entry) => entry.group === "card")).length,
    artificial_analysis: Object.values(models).filter((model) => (model as { benchmarks: BenchmarkEvidence[] }).benchmarks.some((entry) => entry.group === "artificial-analysis")).length,
    note: "A primary score is the mean of the benchmarks the scorecard already used. A secondary or tertiary score is a weaker fallback and says so. A base match borrows the base model's primary result only when the update has no comparable primary benchmark. Missing is not zero.",
  }

  await writeReplace(
    "data/benchmarks.json",
    JSON.stringify(
      {
        schema_version: 1,
        updated_at: now,
        source: "https://llm-stats.com",
        sources: ["https://llm-stats.com", "https://artificialanalysis.ai", "model cards"],
        as_of: isoDate(),
        method: report.note,
        models,
      },
      null,
      2,
    ) + "\n",
  )
  await writeReplace("data/benchmarks.report.json", JSON.stringify(report, null, 2) + "\n")

  const sorted = Object.entries(models).sort(
    (a, b) => (b[1] as { performance: number }).performance - (a[1] as { performance: number }).performance,
  )
  console.log(`benchmarks: ${sorted.length} models scored (${report.primary} primary, ${report.secondary} secondary, ${report.tertiary} tertiary)`)
  for (const [id, model] of sorted.slice(0, 25)) {
    const value = model as { performance: number; performance_basis: string; performance_match: string }
    console.log(`  ${value.performance.toFixed(1).padStart(5)}  ${id} (${value.performance_basis}${value.performance_match === "base" ? ", base" : ""})`)
  }
  console.log("report: data/benchmarks.report.json")
}

await main()
