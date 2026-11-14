import { defineConfig } from "astro/config"

export default defineConfig({
  site: "https://democratic-ai.bevry.workers.dev",
  output: "static",
  build: { format: "directory" },
})
