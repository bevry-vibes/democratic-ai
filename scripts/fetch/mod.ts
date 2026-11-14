import { readJSON, writeText } from "./lib/cache.ts"
import { loadDotVars } from "./lib/dotenv.ts"
import { compactStamp, daysAgo, isoDate, parseDate, secondsSince } from "./lib/time.ts"
import { result, type FetchTargets, type PullContext, type SourceResult, type Watchlist } from "./lib/types.ts"
import { pullHfBlog, pullHfOrgs } from "./sources/hf.ts"
import { pullX } from "./sources/x.ts"
import { pullArxiv } from "./sources/arxiv.ts"
import { pullGitHub } from "./sources/github.ts"
import { pullSitemaps } from "./sources/sitemaps.ts"

interface Args {
  sources: Set<string>
  since: Date
  xSince: Date
  xLimit: number
  refresh: boolean
}

const ALL_SOURCES = ["hf-blog", "hf-orgs", "x", "arxiv", "github", "sitemaps"] as const

function parseArgs(argv: string[], targets: FetchTargets): Args {
  const sources = new Set<string>(ALL_SOURCES)
  let since = daysAgo(targets.windows.feeds_days)
  let xSince = daysAgo(targets.windows.x_days)
  let xLimit = targets.windows.x_limit
  let refresh = false

  for (const arg of argv) {
    if (arg.startsWith("--sources=")) {
      sources.clear()
      for (const name of arg.slice("--sources=".length).split(",")) {
        const trimmed = name.trim()
        if (trimmed) sources.add(trimmed)
      }
    } else if (arg.startsWith("--since=")) {
      const parsed = parseDate(arg.slice("--since=".length))
      if (parsed) since = parsed
    } else if (arg.startsWith("--x-days=")) {
      const days = Number(arg.slice("--x-days=".length))
      if (Number.isFinite(days) && days > 0) xSince = daysAgo(days)
    } else if (arg.startsWith("--x-limit=")) {
      const limit = Number(arg.slice("--x-limit=".length))
      if (Number.isFinite(limit) && limit >= 5) xLimit = limit
    } else if (arg === "--refresh") {
      refresh = true
    }
  }
  return { sources, since, xSince, xLimit, refresh }
}

function countsBy(items: PullContext["items"], key: (item: PullContext["items"][number]) => string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const value = key(item)
    counts[value] = (counts[value] ?? 0) + 1
  }
  return counts
}

function printSummary(ctx: PullContext, elapsed: string): void {
  console.log(`\npull ${ctx.pullId}`)
  console.log(`window ${ctx.since.toISOString().slice(0, 10)} → ${ctx.fetchedAt.slice(0, 10)}`)
  console.log(`x window ${ctx.xSince.toISOString().slice(0, 10)} → ${ctx.fetchedAt.slice(0, 10)} (latest ${ctx.targets.windows.x_limit} per account)`)
  console.log("")
  for (const item of ctx.results) {
    const line = `${item.id.padEnd(14)} ${item.status.padEnd(8)} ${String(item.items).padStart(6)}  ${item.detail ?? ""}`
    console.log(line)
    if (item.error) console.log(`  error: ${item.error}`)
  }
  const kinds = countsBy(ctx.items, (item) => item.kind)
  console.log("")
  console.log(`items ${ctx.items.length} in ${elapsed}s`)
  console.log(`kinds ${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" ")}`)
}

async function main(): Promise<void> {
  const started = Date.now()
  const targets = await readJSON<FetchTargets>("data/fetch-targets.json")
  const watchlist = await readJSON<Watchlist>("data/watchlist.json")
  const args = parseArgs(Deno.args, targets)
  const vars = await loadDotVars(".dev.vars")
  const now = new Date()
  const ctx: PullContext = {
    pullId: compactStamp(now),
    stamp: args.refresh ? compactStamp(now) : isoDate(now),
    fetchedAt: now.toISOString(),
    since: args.since,
    xSince: args.xSince,
    vars,
    targets: {
      ...targets,
      windows: { ...targets.windows, x_limit: args.xLimit },
    },
    watchlist,
    items: [],
    results: [],
  }

  const runners: Record<string, () => Promise<SourceResult>> = {
    "hf-blog": () => pullHfBlog(ctx),
    "hf-orgs": () => pullHfOrgs(ctx),
    x: () => pullX(ctx),
    arxiv: () => pullArxiv(ctx),
    github: () => pullGitHub(ctx),
    sitemaps: () => pullSitemaps(ctx),
  }

  for (const name of ALL_SOURCES) {
    if (!args.sources.has(name)) continue
    const runner = runners[name]
    if (!runner) {
      ctx.results.push(
        result(name, Date.now(), { status: "skipped", items: 0, detail: "unknown source" }),
      )
      continue
    }
    const sourceStarted = Date.now()
    try {
      const sourceResult = await runner()
      ctx.results.push(sourceResult)
    } catch (error) {
      ctx.results.push(
        result(name, sourceStarted, {
          status: "error",
          items: 0,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }
  }

  const pullDir = `data/pulls/${ctx.pullId}`
  const itemsPath = `${pullDir}/items.jsonl`
  const lines = ctx.items.map((item) => JSON.stringify(item)).join("\n")
  const itemsWrite = await writeText(itemsPath, lines.length > 0 ? lines + "\n" : "")

  const manifest = {
    pull_id: ctx.pullId,
    started_at: new Date(started).toISOString(),
    finished_at: new Date().toISOString(),
    windows: {
      feeds_since: ctx.since.toISOString().slice(0, 10),
      x_since: ctx.xSince.toISOString().slice(0, 10),
      x_limit_per_account: ctx.targets.windows.x_limit,
    },
    sources: ctx.results,
    counts: {
      items: ctx.items.length,
      by_kind: countsBy(ctx.items, (item) => item.kind),
      by_source: countsBy(ctx.items, (item) => item.source),
      in_x_window: ctx.items.filter((item) => item.source === "x" && item.in_window).length,
    },
    items: {
      path: itemsPath,
      bytes: itemsWrite.bytes,
    },
    notes: [
      "This pull records raw data only. It assigns no task, runtime, use-case, or licence tags beyond source-native tags.",
      "X data is fetched as the latest posts per account, with the 14-day window marked by in_window. Older fetched posts are kept.",
      "arXiv RSS covers only the most recent entries. The feed window is narrower than the requested three months.",
      "Every raw response is stored under data/raw/ and is never overwritten by a later pull.",
    ],
  }
  const manifestPath = `${pullDir}/manifest.json`
  await writeText(manifestPath, JSON.stringify(manifest, null, 2) + "\n")

  printSummary(ctx, secondsSince(started))
  console.log(`\nitems: ${itemsPath}`)
  console.log(`manifest: ${manifestPath}`)
  if (args.refresh) console.log("refresh requested: a new dated snapshot was written")
}

if (import.meta.main) {
  await main()
}
