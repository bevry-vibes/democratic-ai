import { sleep } from "./time.ts"

const USER_AGENT = "democratic-ai-catalogue/0.1 (+https://github.com/bevry-vibes/democratic-ai)"

export interface FetchResult {
  status: number
  body: string
  headers: Headers
  finalUrl: string
}

export interface FetchOptions {
  headers?: Record<string, string>
  retries?: number
  timeoutMs?: number
  accept?: string
}

/** Fetch text with a bounded timeout, a retry on transient failures, and no secret logging. */
export async function fetchText(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const retries = options.retries ?? 2
  const timeoutMs = options.timeoutMs ?? 30_000
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": USER_AGENT,
          accept: options.accept ?? "*/*",
          ...options.headers,
        },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
      })
      const body = await response.text()
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`)
        if (attempt < retries) {
          await sleep(800 * (attempt + 1))
          continue
        }
      }
      return { status: response.status, body, headers: response.headers, finalUrl: response.url }
    } catch (error) {
      lastError = error
      if (attempt < retries) await sleep(500 * (attempt + 1))
    }
  }
  throw lastError instanceof Error ? lastError : new Error("fetch failed")
}

export function htmlToText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}
