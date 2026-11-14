import { readJSON, writeReplace } from "../fetch/lib/cache.ts"
import { isoDate } from "../fetch/lib/time.ts"

interface ScorecardEntry {
  name: string
  lab: string
  match: string[]
  openness_morality: number
  code_reasoning: number | null
  research_citation: number
  note: string
}

interface Scorecard {
  source: string
  as_of: string
  models: ScorecardEntry[]
}

interface CompactModel {
  id: string
  name: string
  organization: string
  tags: string[]
  [key: string]: unknown
}

interface ModelIndex {
  generated_at: string
  pull_id: string
  models: CompactModel[]
}

interface ModelRecord extends CompactModel {
  aliases?: string[]
  [key: string]: unknown
}

const BUILD_MARKERS = [
  "-gguf", "-mlx", "-coreml", "-onnx", "-nvfp4", "-q8_0", "-q4_k_m", "-q4", "-q8", "-q6",
  "-4bit", "-8bit", "-bf16", "-int4", "-int8", "-ov", "-quant", "-dflash", "-singprobe", "-server",
  "-fp8", "-fp4", "-mxfp8", "-w4a4", "-w8a8", "-q3k", "-q4k", "-q5k", "-q6k", "-litert-lm", "-coreai", "-lora", "-peft",
]

function norm(value: string): string {
  let result = value.toLowerCase()
  for (const marker of BUILD_MARKERS) result = result.split(marker).join("")
  return result
    .split("/")
    .pop()!
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function main(): Promise<void> {
  const scorecard = await readJSON<Scorecard>("data/scorecard.json")
  const index = await readJSON<ModelIndex>("data/dist/models.json")
  const matches: Array<{ model: string; scorecard: string; match: "exact" | "family" }> = []
  const unmatched: string[] = []

  for (const model of index.models) {
    const haystacks = [model.id, model.name, model.organization].map(norm)
    let best: { entry: ScorecardEntry; match: "exact" | "family"; length: number } | null = null
    for (const entry of scorecard.models) {
      for (const candidate of entry.match) {
        const needle = norm(candidate)
        const exact = haystacks.some((haystack) => haystack === needle)
        const family = haystacks.some((haystack) => haystack.includes(needle))
        if (!exact && !family) continue
        if (!best || (exact && best.match !== "exact") || (exact === (best.match === "exact") && needle.length > best.length)) {
          best = { entry, match: exact ? "exact" : "family", length: needle.length }
        }
      }
    }
    if (!best) continue
    const performance = {
      openness_morality: best.entry.openness_morality,
      code_reasoning: best.entry.code_reasoning,
      research_citation: best.entry.research_citation,
      source: scorecard.source,
      as_of: scorecard.as_of,
      match: best.match,
      note: best.entry.note,
      name: best.entry.name,
    }
    model.performance = performance
    matches.push({ model: model.id, scorecard: best.entry.name, match: best.match })

    const recordPath = `data/models/${model.id}.json`
    const record = await readJSON<ModelRecord>(recordPath)
    record.performance = performance
    await writeReplace(recordPath, JSON.stringify(record, null, 2) + "\n")
  }

  await writeReplace(
    "data/dist/models.json",
    JSON.stringify({ ...index, scorecard: { source: scorecard.source, as_of: scorecard.as_of }, models: index.models }, null, 2) + "\n",
  )

  const report = {
    updated_at: new Date().toISOString(),
    source: scorecard.source,
    as_of: scorecard.as_of,
    models: index.models.length,
    matched: matches.length,
    exact: matches.filter((entry) => entry.match === "exact").length,
    family: matches.filter((entry) => entry.match === "family").length,
    unmatched_scorecard_entries: scorecard.models
      .filter((entry) => !matches.some((match) => match.scorecard === entry.name))
      .map((entry) => entry.name),
    matches,
    note: "Family matches carry the scorecard result for the named model family, not an exact version. Check the source before relying on a score.",
    generated_on: isoDate(),
  }
  await writeReplace("data/scorecard.report.json", JSON.stringify(report, null, 2) + "\n")

  console.log(`scorecard: ${matches.length} models matched (${report.exact} exact, ${report.family} family)`) 
  for (const match of matches.slice(0, 20)) console.log(`  ${match.model} ← ${match.scorecard} (${match.match})`)
  console.log(`report: data/scorecard.report.json`)
}

await main()
