import fs from "node:fs"
import path from "node:path"

const site = process.cwd()
const root = path.resolve(site, "..")
const out = path.join(site, "public", "api", "v1")

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(path.join(out, "models"), { recursive: true })

function read(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"))
}

function write(rel, value) {
  fs.writeFileSync(path.join(out, rel), JSON.stringify(value, null, 2) + "\n")
}

const index = read("data/dist/models.json")
const tags = read("data/tags.json")
const syndication = read("data/syndication.json")
const links = read("data/links.json")

write("index.json", index)
write("tags.json", tags)
write("syndication.json", syndication)
write("links.json", links)

for (const model of index.models) {
  const record = read(`data/models/${model.id}.json`)
  write(`models/${model.id}.json`, record)
}

write("meta.json", {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  models: index.models.length,
  api: "v1",
  source: "https://github.com/bevry-vibes/democratic-ai",
})

console.log(`api: ${index.models.length} models, ${Object.keys(tags.namespaces).length} namespaces`)
