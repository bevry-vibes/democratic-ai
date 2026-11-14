/** Read `.dev.vars` without printing values. */
export async function loadDotVars(path = ".dev.vars"): Promise<Record<string, string>> {
  try {
    const text = await Deno.readTextFile(path)
    const vars: Record<string, string> = {}
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const index = trimmed.indexOf("=")
      if (index < 1) continue
      const key = trimmed.slice(0, index).trim()
      let value = trimmed.slice(index + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      vars[key] = value
    }
    return vars
  } catch {
    return {}
  }
}
