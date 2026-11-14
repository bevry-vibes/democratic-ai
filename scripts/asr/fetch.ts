import { readIfExists, writeReplace, writeText } from "../fetch/lib/cache.ts"
import { isoDate } from "../fetch/lib/time.ts"

const SPACE = "https://huggingface.co/spaces/hf-audio/open_asr_leaderboard"
const CONFIG_URL = "https://hf-audio-open-asr-leaderboard.hf.space/config"

async function main(): Promise<void> {
  const refresh = Deno.args.includes("--refresh")
  const path = `data/raw/asr/open-asr-leaderboard/${isoDate()}/config.json`
  const existing = await readIfExists(path)
  if (existing != null && !refresh) {
    console.log(`asr: cached ${path} (${(existing.length / 1024).toFixed(0)} KiB); pass --refresh to replace it`)
    return
  }

  const response = await fetch(CONFIG_URL, { signal: AbortSignal.timeout(45_000) })
  if (!response.ok) throw new Error(`asr: ${CONFIG_URL} returned ${response.status}`)
  const body = await response.text()
  JSON.parse(body) // fail before writing a malformed snapshot
  if (existing != null) await writeReplace(path, body)
  else await writeText(path, body)
  console.log(`asr: cached ${path} (${(body.length / 1024).toFixed(0)} KiB)`)
  console.log(`asr: source ${SPACE}`)
}

if (import.meta.main) await main()
