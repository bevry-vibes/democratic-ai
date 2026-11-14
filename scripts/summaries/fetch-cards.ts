import { readJSON, readIfExists, writeText } from "../fetch/lib/cache.ts"
import { loadDotVars } from "../fetch/lib/dotenv.ts"
import { isoDate, sleep } from "../fetch/lib/time.ts"

interface CompactModel {
  id: string
  name: string
  summary: string
}

interface ModelIndex {
  models: CompactModel[]
}

interface ModelRecord {
  id: string
  summary: string
  access: { hugging_face: string }
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

async function main(): Promise<void> {
  const index = await readJSON<ModelIndex>("data/dist/models.json")
  const vars = await loadDotVars(".dev.vars")
  const token = vars.HF_ACCESS_TOKEN ?? vars.HF_TOKEN ?? ""
  const missing = index.models.filter((model) => !model.summary)
  let fetched = 0
  let cached = 0
  let failed = 0
  const failures: Array<{ id: string; status: number | string }> = []

  for (const compact of missing) {
    const record = await readJSON<ModelRecord>(`data/models/${compact.id}.json`)
    const hfId = record.access.hugging_face
    const path = `data/raw/hf/model-cards/${slug(hfId)}/${isoDate()}.md`
    const existing = await readIfExists(path)
    if (existing != null) {
      cached++
      continue
    }
    try {
      const response = await fetch(`https://huggingface.co/${hfId}/raw/main/README.md`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(25_000),
        redirect: "follow",
      })
      if (!response.ok) {
        failed++
        if (failures.length < 30) failures.push({ id: hfId, status: response.status })
        await sleep(120)
        continue
      }
      const body = await response.text()
      await writeText(path, body)
      fetched++
    } catch (error) {
      failed++
      if (failures.length < 30) failures.push({ id: hfId, status: error instanceof Error ? error.message : String(error) })
    }
    await sleep(120)
  }

  console.log(`summaries: ${missing.length} missing, ${fetched} fetched, ${cached} already cached, ${failed} failed`)
  if (failures.length > 0) {
    console.log("failures:")
    for (const failure of failures) console.log(`  ${failure.id}: ${failure.status}`)
  }
  console.log("Now run `deno task index --pull=20261114T025658Z` to rebuild the summaries.")
}

if (import.meta.main) await main()
