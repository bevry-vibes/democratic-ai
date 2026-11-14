# cloudflare.md

Local application of the bevry-vibes skills [cloudflare.md](https://github.com/bevry-vibes/skills/blob/main/cloudflare.md) — see the upstream [local tweaks pattern](https://github.com/bevry-vibes/skills#local-tweaks-pattern).

## this project's tweaks

- The catalogue deploys from `site/` as the Cloudflare Worker `democratic-ai`. The canonical host is **https://democratic-ai.bevry.me**. `democratic-ai.bevry.workers.dev` and `democraticai.bevry.me` redirect to it.
- The site is an Astro static build. Wrangler deploys `dist/` as Workers static assets, plus `worker.js` for shareable comparisons and host redirects. The JSON API is prerendered.
- `site/wrangler.jsonc` holds `name`, `compatibility_date`, `assets.directory`, `main`, and the two custom-domain routes. `assets.run_worker_first` is on so host redirects apply to every path.
- The custom domains are `democratic-ai.bevry.me` and `democraticai.bevry.me`, both `custom_domain: true`. The worker redirects any other host, including `democratic-ai.bevry.workers.dev`, to the canonical host. Never add a `*.bevry.me/*` wildcard.
- `site/public/_headers` carries the API CORS and cache headers. Static `_headers` do not apply to worker-generated responses.
- Build with `deno task build` from `site/`. Deploy with `deno task deploy` from `site/`. The tasks run Deno and Wrangler, matching the `agent-detect` convention.
- If the Cloudflare adapter is adopted for on-demand routes, `wrangler deploy` uses the adapter's generated config. Never run `wrangler deploy --config wrangler.jsonc` on that project shape; it re-bundles `main` from source and fails on Astro virtual modules.
- Restart `wrangler dev` after every Astro build. Stale asset manifests serve the old bundle as the fallback.
