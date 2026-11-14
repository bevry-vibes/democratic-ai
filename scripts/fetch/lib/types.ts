import type { PullItem } from "./items.ts"

export interface WatchlistMember {
  id: string
  name: string
  kind: string
  hugging_face?: string | null
  x?: string[]
  [key: string]: unknown
}

export interface Watchlist {
  members: WatchlistMember[]
  [key: string]: unknown
}

export interface FetchTargets {
  windows: { feeds_days: number; x_days: number; x_limit: number }
  x: { list_id: string; members_snapshot: string }
  hugging_face: { blog_feed: string; model_limit: number; dataset_limit: number }
  arxiv: { categories: string[] }
  github: { repos: string[] }
  sitemaps: Array<{ id: string; url: string }>
}

export interface SourceResult {
  id: string
  status: "ok" | "partial" | "error" | "skipped"
  items: number
  raw: string[]
  detail?: string
  error?: string
  started_at: string
  finished_at: string
}

export interface PullContext {
  pullId: string
  stamp: string
  fetchedAt: string
  since: Date
  xSince: Date
  vars: Record<string, string>
  targets: FetchTargets
  watchlist: Watchlist
  items: PullItem[]
  results: SourceResult[]
}

export function result(
  id: string,
  started: number,
  input: Partial<SourceResult> & Pick<SourceResult, "status" | "items">,
): SourceResult {
  return {
    id,
    status: input.status,
    items: input.items,
    raw: input.raw ?? [],
    detail: input.detail,
    error: input.error,
    started_at: new Date(started).toISOString(),
    finished_at: new Date().toISOString(),
  }
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
