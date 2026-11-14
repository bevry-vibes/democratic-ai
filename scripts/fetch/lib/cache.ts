export interface WriteResult {
  path: string
  reused: boolean
  bytes: number
}

function dirname(path: string): string {
  const index = path.lastIndexOf("/")
  return index === -1 ? "." : path.slice(0, index)
}

async function ensureDir(path: string): Promise<void> {
  try {
    await Deno.mkdir(dirname(path), { recursive: true })
  } catch {
    // directory exists
  }
}

/** Write a file if it is absent. Never overwrite an existing snapshot. */
export async function writeNew(path: string, body: string): Promise<WriteResult> {
  await ensureDir(path)
  try {
    const existing = await Deno.stat(path)
    if (existing.isFile) {
      return { path, reused: true, bytes: existing.size }
    }
  } catch {
    // absent
  }
  await Deno.writeTextFile(path, body)
  return { path, reused: false, bytes: new TextEncoder().encode(body).byteLength }
}

export async function writeJSON(path: string, value: unknown): Promise<WriteResult> {
  return await writeNew(path, JSON.stringify(value, null, 2) + "\n")
}

/** Replace a generated artefact. Never use this for a raw snapshot. */
export async function writeReplace(path: string, body: string): Promise<WriteResult> {
  await ensureDir(path)
  await Deno.writeTextFile(path, body)
  return { path, reused: false, bytes: new TextEncoder().encode(body).byteLength }
}

export async function writeText(path: string, body: string): Promise<WriteResult> {
  return await writeNew(path, body)
}

export async function readJSON<T>(path: string): Promise<T> {
  return JSON.parse(await Deno.readTextFile(path)) as T
}

/** Read a cached snapshot, or return null when it is absent. */
export async function readIfExists(path: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(path)
  } catch {
    return null
  }
}

export async function sha256(body: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}
