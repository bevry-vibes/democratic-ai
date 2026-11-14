export interface PullItem {
  source: string
  source_id: string
  kind: string
  title: string
  url: string
  published_at: string | null
  summary: string
  source_tags: string[]
  source_meta: Record<string, unknown>
  raw: string
  fetched_at: string
  in_window: boolean
}

export function makeItem(input: Partial<PullItem> & Pick<PullItem, "source" | "source_id" | "kind" | "raw" | "fetched_at">): PullItem {
  return {
    source: input.source,
    source_id: input.source_id,
    kind: input.kind,
    title: input.title ?? "",
    url: input.url ?? "",
    published_at: input.published_at ?? null,
    summary: input.summary ?? "",
    source_tags: input.source_tags ?? [],
    source_meta: input.source_meta ?? {},
    raw: input.raw,
    fetched_at: input.fetched_at,
    in_window: input.in_window ?? true,
  }
}
