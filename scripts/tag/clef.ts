import { readIfExists, writeText, writeReplace } from "../fetch/lib/cache.ts"
import { loadDotVars } from "../fetch/lib/dotenv.ts"
import { isoDate, sleep } from "../fetch/lib/time.ts"

interface TagVocabulary {
  namespaces: Record<string, { definition: string; values: Record<string, string> }>
}

interface ProposedTag {
  tag: string
  confidence: number
  method: "source-native" | "rule" | "title" | "fallback" | "clef"
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
  clef?: {
    model: string
    accepted: Array<{ task: string; probability: number }>
    rejected: Array<{ task: string; probability: number }>
    usage: { input_tokens: number; output_tokens: number }
  }
}

interface ClefResponse {
  result?: {
    model?: string
    answers?: Record<string, { type: string; noul?: number }>
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  success?: boolean
  errors?: unknown[]
}

const ACCOUNT_ID = "24b06b96f9ca1534f18b69c07c4e6c29"
const CLEF_MODEL = "@cf/cloudflare/clef-flash"
const CLEF_SELECTOR = "clef-flash"
const PRICE_PER_MILLION_INPUT = 0.24
const PROMPT_VERSION = 1

const DOMAIN_BY_TASK: Record<string, string[]> = {
  transcription: ["domain:speech", "modality:audio"],
  "speech-synthesis": ["domain:speech", "modality:audio"],
  "speech-enhancement": ["domain:speech", "modality:audio"],
  "word-timestamps": ["domain:speech", "modality:audio"],
  diarization: ["domain:speech", "modality:audio"],
  "voice-activity-detection": ["domain:speech", "modality:audio"],
  "audio-classification": ["domain:speech", "modality:audio"],
  "image-generation": ["domain:vision", "modality:image"],
  "image-understanding": ["domain:vision", "modality:image"],
  "image-classification": ["domain:vision", "modality:image"],
  "face-matching": ["domain:vision", "modality:image"],
  ocr: ["domain:vision", "modality:image"],
  "video-generation": ["domain:vision", "modality:video"],
  embedding: ["domain:embeddings"],
  code: ["domain:code"],
  translation: ["domain:language"],
  "text-generation": ["domain:language"],
  "text-classification": ["domain:language"],
  reasoning: ["domain:language"],
  "tool-calling": ["domain:language"],
  "topic-tagging": ["domain:language"],
  "pii-redaction": ["domain:language"],
  "content-moderation": ["domain:language"],
  "structured-extraction": ["domain:language"],
  "title-generation": ["domain:language"],
  "report-generation": ["domain:language"],
  "language-identification": ["domain:language"],
  "filler-word-detection": ["domain:language"],
  "time-series-forecasting": ["domain:language"],
  "clip-selection": ["domain:language"],
  "emoji-suggestion": ["domain:language"],
  retrieval: ["domain:language"],
}

function parseArgs(argv: string[]): { pull: string | null; limit: number | null; threshold: number } {
  let pull: string | null = null
  let limit: number | null = null
  let threshold = 0.8
  for (const arg of argv) {
    if (arg.startsWith("--pull=")) pull = arg.slice("--pull=".length)
    else if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length))
      if (Number.isFinite(value) && value > 0) limit = value
    } else if (arg.startsWith("--threshold=")) {
      const value = Number(arg.slice("--threshold=".length))
      if (Number.isFinite(value) && value >= 0 && value <= 1) threshold = value
    }
  }
  return { pull, limit, threshold }
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

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

async function readCachedClef(sourceId: string): Promise<ClefResponse | null> {
  const name = `${slug(sourceId)}.v${PROMPT_VERSION}.json`
  const today = await readIfExists(`data/raw/clef/${isoDate()}/${name}`)
  if (today != null) return JSON.parse(today) as ClefResponse
  try {
    const dates: string[] = []
    for await (const entry of Deno.readDir("data/raw/clef")) {
      if (entry.isDirectory) dates.push(entry.name)
    }
    dates.sort().reverse()
    for (const date of dates) {
      const cached = await readIfExists(`data/raw/clef/${date}/${name}`)
      if (cached != null) return JSON.parse(cached) as ClefResponse
    }
  } catch {
    // The cache is optional; a missing directory means no cached response.
  }
  return null
}

function stripMarkdown(value: string): string {
  return value
    .replace(/^---[\s\S]*?---\s*/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim()
}

async function cloudflareToken(vars: Record<string, string>): Promise<string> {
  if (vars.CLOUDFLARE_API_TOKEN) return vars.CLOUDFLARE_API_TOKEN
  const home = Deno.env.get("HOME")
  if (!home) throw new Error("HOME is unset")
  const path = `${home}/.wrangler/config/default.toml`
  let text: string
  try {
    text = await Deno.readTextFile(path)
  } catch {
    throw new Error("no Cloudflare token: set CLOUDFLARE_API_TOKEN in .dev.vars or run wrangler login")
  }
  const match = text.match(/oauth_token\s*=\s*"([^"]+)"/)
  if (!match) throw new Error("no oauth_token in the wrangler config; run wrangler login")
  return match[1]
}

async function readModelCard(sourceId: string, vars: Record<string, string>): Promise<string> {
  const path = `data/raw/hf/model-cards/${slug(sourceId)}/${isoDate()}.md`
  const cached = await readIfExists(path)
  if (cached != null) return stripMarkdown(cached).slice(0, 1600)
  const token = vars.HF_ACCESS_TOKEN ?? vars.HF_TOKEN ?? ""
  try {
    const response = await fetch(`https://huggingface.co/${sourceId}/raw/main/README.md`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(20_000),
      redirect: "follow",
    })
    if (!response.ok) return ""
    const text = await response.text()
    await writeText(path, text)
    return stripMarkdown(text).slice(0, 1600)
  } catch {
    return ""
  }
}

async function clef(
  token: string,
  state: string,
  questions: Record<string, unknown>,
): Promise<ClefResponse> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${CLEF_MODEL}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: CLEF_SELECTOR, state, questions }),
      signal: AbortSignal.timeout(60_000),
    },
  )
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Clef HTTP ${response.status}: ${body.slice(0, 300)}`)
  }
  return JSON.parse(body) as ClefResponse
}

function addTag(tags: ProposedTag[], tag: string, confidence: number, evidence: string): void {
  const existing = tags.find((entry) => entry.tag === tag)
  if (existing) {
    if (confidence > existing.confidence) existing.confidence = confidence
    if (!existing.evidence.includes(evidence)) existing.evidence.push(evidence)
    return
  }
  tags.push({ tag, confidence, method: "clef", evidence: [evidence] })
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args)
  const pullId = args.pull ?? (await latestPull())
  const pullDir = `data/pulls/${pullId}`
  const rulesPath = `${pullDir}/tags.rules.jsonl`
  const outputPath = `${pullDir}/tags.proposed.jsonl`
  const reportPath = `${pullDir}/tags.clef.report.json`
  const vocabulary = JSON.parse(await Deno.readTextFile("data/tags.json")) as TagVocabulary
  const vars = await loadDotVars(".dev.vars")
  const token = await cloudflareToken(vars)
  const lines = (await Deno.readTextFile(rulesPath)).split("\n").filter(Boolean)
  const entries = lines.map((line) => JSON.parse(line) as TaggedItem)
  const review = entries.filter((entry) => entry.needs_review && entry.item.kind === "model")
  const selected = args.limit ? review.slice(0, args.limit) : review
  const taskValues = vocabulary.namespaces.task.values
  const questions: Record<string, { type: "noul"; instructions: string }> = {}
  for (const [task, definition] of Object.entries(taskValues)) {
    questions[task] = {
      type: "noul",
      instructions: `Does this model perform the task "${task}"? ${definition} Answer yes only when the model name, model card, or tags state this task.`,
    }
  }

  let calls = 0
  let reused = 0
  let inputTokens = 0
  let acceptedItems = 0
  let stillReview = 0
  const failures: Array<{ model: string; error: string }> = []

  for (const entry of selected) {
    const sourceId = entry.item.source_id
    const cachePath = `data/raw/clef/${isoDate()}/${slug(sourceId)}.v${PROMPT_VERSION}.json`
    let response: ClefResponse
    const cached = await readCachedClef(sourceId)
    if (cached != null) {
      response = cached
      reused++
    } else {
      const card = await readModelCard(sourceId, vars)
      const org = entry.tags.find((tag) => tag.tag.startsWith("org:"))?.tag ?? ""
      const state = [
        `Model: ${sourceId}`,
        org ? `Organisation: ${org.slice("org:".length)}` : "",
        `Source tags: ${entry.tags.map((tag) => tag.tag).join(", ")}`,
        card ? `Model card: ${card}` : "No model card text is available.",
      ]
        .filter(Boolean)
        .join("\n")
      try {
        response = await clef(token, state, questions)
        await writeText(
          cachePath,
          JSON.stringify(
            {
              model: CLEF_SELECTOR,
              prompt_version: PROMPT_VERSION,
              requested_at: new Date().toISOString(),
              state,
              questions,
              result: response.result,
              success: response.success,
              errors: response.errors,
            },
            null,
            2,
          ) + "\n",
        )
        calls++
      } catch (error) {
        failures.push({ model: sourceId, error: error instanceof Error ? error.message : String(error) })
        await sleep(200)
        continue
      }
    }

    inputTokens += response.result?.usage?.input_tokens ?? 0
    const answers = response.result?.answers ?? {}
    const scores = Object.entries(answers)
      .filter(([, answer]) => answer.type === "noul" && typeof answer.noul === "number")
      .map(([task, answer]) => ({ task, probability: answer.noul as number }))
      .sort((a, b) => b.probability - a.probability)
    const accepted = scores.filter((score) => score.probability >= args.threshold).slice(0, 3)
    const rejected = scores.filter((score) => score.probability < args.threshold).slice(0, 5)
    entry.clef = {
      model: CLEF_SELECTOR,
      accepted,
      rejected,
      usage: {
        input_tokens: response.result?.usage?.input_tokens ?? 0,
        output_tokens: response.result?.usage?.output_tokens ?? 0,
      },
    }
    if (accepted.length === 0) {
      stillReview++
      continue
    }
    for (const score of accepted) {
      const tag = `task:${score.task}`
      addTag(entry.tags, tag, score.probability, `clef-flash:${score.task}=${score.probability.toFixed(4)}`)
      for (const mapped of DOMAIN_BY_TASK[score.task] ?? []) {
        addTag(entry.tags, mapped, Math.min(score.probability, 0.9), `clef-flash:${score.task}=${score.probability.toFixed(4)}`)
      }
    }
    entry.tags.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence
      return a.tag.localeCompare(b.tag)
    })
    entry.needs_review = false
    entry.review_reason = null
    acceptedItems++
    await sleep(120)
  }

  await writeReplace(outputPath, entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n")
  const tagCounts: Record<string, number> = {}
  const byKind: Record<string, { items: number; tagged: number; review: number }> = {}
  for (const entry of entries) {
    const kind = entry.item.kind
    byKind[kind] ??= { items: 0, tagged: 0, review: 0 }
    byKind[kind].items++
    if (entry.tags.some((tag) => tag.tag.startsWith("task:"))) byKind[kind].tagged++
    if (entry.needs_review) byKind[kind].review++
    for (const tag of entry.tags) tagCounts[tag.tag] = (tagCounts[tag.tag] ?? 0) + 1
  }
  const models = entries.filter((entry) => entry.item.kind === "model")
  const report = {
    pull_id: pullId,
    generated_at: new Date().toISOString(),
    model: CLEF_SELECTOR,
    prompt_version: PROMPT_VERSION,
    threshold: args.threshold,
    review_models: review.length,
    attempted: selected.length,
    accepted: acceptedItems,
    still_review: stillReview,
    calls,
    reused,
    input_tokens: inputTokens,
    estimated_cost_usd: Number(((inputTokens * PRICE_PER_MILLION_INPUT) / 1_000_000).toFixed(6)),
    failures,
    models: {
      total: models.length,
      with_task: models.filter((entry) => entry.tags.some((tag) => tag.tag.startsWith("task:"))).length,
      without_task: models.filter((entry) => !entry.tags.some((tag) => tag.tag.startsWith("task:"))).length,
    },
    by_kind: byKind,
    tag_counts: Object.fromEntries(Object.entries(tagCounts).sort((a, b) => b[1] - a[1])),
    notes: [
      "Only models marked needs_review by the rules pass are sent to Clef.",
      "Clef answers one independent yes/no question per task. The accepted tasks are the ones at or above the threshold.",
      "Every response is cached under data/raw/clef/ and is never overwritten.",
      "A cached response from an earlier day is reused when today's response is missing.",
      "A model with no accepted task stays in review. It is not guessed.",
    ],
  }
  await writeReplace(reportPath, JSON.stringify(report, null, 2) + "\n")

  console.log(`pull ${pullId}`)
  console.log(`review models ${review.length}, attempted ${selected.length}`)
  console.log(`accepted ${acceptedItems}, still review ${stillReview}`)
  console.log(`calls ${calls}, reused ${reused}, input tokens ${inputTokens}, estimated cost $${report.estimated_cost_usd}`)
  if (failures.length > 0) {
    console.log(`failures ${failures.length}`)
    for (const failure of failures.slice(0, 5)) console.log(`  ${failure.model}: ${failure.error}`)
  }
  console.log(`\nproposed: ${outputPath}`)
  console.log(`report: ${reportPath}`)
}

if (import.meta.main) {
  await main()
}
