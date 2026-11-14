import fs from "node:fs"
import { defineConfig } from "astro/config"

const aliases = JSON.parse(fs.readFileSync(new URL("../data/model-aliases.json", import.meta.url), "utf8"))
const redirects = Object.fromEntries(
  aliases.aliases.map((alias) => [`/models/${alias.id}/`, `/models/${alias.canonical_id}/`]),
)

export default defineConfig({
  site: "https://democratic-ai.bevry.me",
  output: "static",
  build: { format: "directory" },
  redirects,
})
