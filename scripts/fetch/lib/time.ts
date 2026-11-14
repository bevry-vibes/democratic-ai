export function isoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function compactStamp(date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

export function daysAgo(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * 86_400_000)
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function isSince(value: string | null | undefined, since: Date): boolean {
  const date = parseDate(value)
  return date != null && date.getTime() >= since.getTime()
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function secondsSince(start: number): string {
  return ((Date.now() - start) / 1000).toFixed(1)
}
