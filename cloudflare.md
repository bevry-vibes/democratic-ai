# cloudflare.md

Local application of the bevry-vibes skills [cloudflare.md](https://github.com/bevry-vibes/skills/blob/main/cloudflare.md) — see the upstream [local tweaks pattern](https://github.com/bevry-vibes/skills#local-tweaks-pattern).

## this project's tweaks

- The catalogue deploys from `site/` as the Cloudflare Worker `democratic-ai`. The canonical host is **https://democratic-ai.bevry.workers.dev**.
- The site is an Astro static build. Wrangler deploys the `dist/` directory as Workers static assets, with no worker script in the first release. The JSON API is prerendered, so it needs no runtime.
- `site/wrangler.jsonc` holds `name`, `compatibility_date`, and `assets.directory`. Do not add a `main` entry until an on-demand route exists.
- If a custom domain is added later, use the `agent-detect` pattern: a `custom_domain` entry for `democratic-ai.bevry.me` plus a host-scoped `zone_name` route. Add a thin worker and `assets.run_worker_first: true` only to redirect `democratic-ai.bevry.workers.dev` to the custom domain. Never add a `*.bevry.me/*` wildcard.
- `site/public/_headers` carries the API CORS and cache headers. Static `_headers` do not apply to worker-generated responses.
- Build with `deno task build` from `site/`. Deploy with `deno task deploy` from `site/`. The tasks run Deno and Wrangler, matching the `agent-detect` convention.
- If the Cloudflare adapter is adopted for on-demand routes, `wrangler deploy` uses the adapter's generated config. Never run `wrangler deploy --config wrangler.jsonc` on that project shape; it re-bundles `main` from source and fails on Astro virtual modules.
- Restart `wrangler dev` after every Astro build. Stale asset manifests serve the old bundle as the fallback.
