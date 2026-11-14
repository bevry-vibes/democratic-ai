# Democratic AI catalogue — research and proposal

Assisted-by: OpenCode · DeepSeek V4.1 Flash <opencode-deepseek-deepseekv41flash@local>

Provenance: [prompts](./1794621986000-democratic-ai-catalogue.prompts.md)

Status: proposal. The repository scaffold is in place; the data, the site, and the automation are not implemented yet.

## Summary

The repository becomes a **data product with three views**: a machine contract (`data/` and a versioned JSON API), a human catalogue (`README.md` and the Astro site), and a dated record of change (`journal/` and the newsletter).

The central proposal is that **reciprocity is measured by what a release gives back, not by whether the weights are downloadable**. Open weights are necessary but not sufficient. The distinguishing axis is training-data openness. A weights-only release with a permissive licence is **Shared** once the training data is verified closed, and **Unproven** until that check is done. It is never **Reciprocal**, because the recipe stays closed.

The catalogue therefore records four dimensions separately:

1. **Openness** — weights, training data, training code.
2. **Reuse terms** — the licence class and the exact licence.
3. **Lineage** — the base model and the relation, so a re-licence is visible.
4. **Conduct** — whether a provider trains on user data, using the `agent-detect` vocabulary.

Fit is the second axis. A use case plus a set of constraints yields a verdict with reasons and evidence. The `translation-comparison-en-id` work is the model: direction, latency class, provider, quantization, prompt, test set, and the failure that matters. The catalogue generalises that method instead of inventing a new score.

The site is an Astro static build on Cloudflare Workers at `democratic-ai.bevry.workers.dev`. It is editorial and warm, not a technical dashboard. The home page renders `README.md` directly, and the generated blocks in both are produced from `data/`, so the two cannot drift. CI runs the generator in check mode and fails on a difference.

A weekly GitHub Actions job fetches releases and metadata, runs a **permitted** agent to propose assessments and a journal draft, and opens a pull request. A person reviews the evidence and merges. Deployment happens on merge. The job gates itself first with `agent-detect check-reciprocal`, so the repository's own maintenance obeys the policy it documents.

## What was asked

The owner asked for:

- initialisation with [bevry-vibes/skills](https://github.com/bevry-vibes/skills);
- a catalogue of Democratic AI, defined as reciprocal AI, because all AI trains on the commons;
- models and discoveries placed into categories;
- support for a Twitter/X list, named members, and a Hugging Face following list;
- consumption by `tts-comparison` and `agent-detect`;
- a Cloudflare Workers page that mirrors the README, with a sync guarantee and JSON data;
- an Astro site with a warm pastel, elegant, informative, approachable design — not the technical `agent-detect` aesthetic and not playful or childish;
- a CI task that maintains the catalogue and a journal, changelog, or newsletter;
- `DESIGN.md` for enduring discernments and `README.md` for end users;
- research on fetching, syncing, and design, followed by a plan.

## Research findings

### The two private lists

| Source | What happens without credentials | What is needed | Recommendation |
| --- | --- | --- | --- |
| X list `2084302656580034676` | `x.com` redirects to a login page. There is no public member list. | An X developer app attached to a Project, with pay-per-use credits. The list lookup and member endpoints accept app-only auth. | Resolved on 2026-11-14: credits added, 47 members cached under `data/raw/x/`. |
| Hugging Face `balupton/following` | The HTML page returns 401. The public overview reports `numFollowing: 0` and `numFollowingOrgs: 13`. | A fine-grained access token with gated-repo read. The documented `/api/users/{username}/following/orgs` endpoint works. | Resolved on 2026-11-14: the token returned 13 organisations, cached under `data/raw/hf/`. |

#### Credential test (2026-11-14)

The owner supplied credentials in `.dev.vars`. The first test reached the API, but every read failed at the account level.

| Attempt | Result |
| --- | --- |
| First app, `GET /2/lists/:id/members` with the bearer token | 403 `client-not-enrolled` — the app was not attached to a Project. |
| First app, `GET /2/users/me` with OAuth 1.0a user context | The same 403. |
| First app, `GET /1.1/lists/list.json` with OAuth 1.0a | 403 code 453 — the access level covered only a subset of v1.1. |
| Second app, `GET /2/lists/:id` with the bearer token | 402 `credits depleted` — the app is now enrolled, but the account has no pay-per-use credits. |
| Second app, `GET /2/lists/:id/members` with the bearer token | The same 402. |
| Second app, `GET /2/users/me` with the bearer token | 403 `Unsupported Authentication` — this endpoint needs user context, not app-only auth. |

The second result is the useful one: the list lookup and member endpoints accept app-only auth. They fail only because the account has no credits. Add credits in the X developer console and the existing bearer token will work. The cost is metered per resource; a list of 100 members is about USD 0.10 at the owned-read rate.

`GET /2/users/me` is not needed. The list id is known, so the fetcher can start at `GET /2/lists/<id>` and continue to `/members`. Until credits exist, the list is a manual seed.

#### Hugging Face credential test (2026-11-14)

The fine-grained token `democratic-ai` has `canReadGatedRepos: true` and collection read/write. It returned:

| Request | Result |
| --- | --- |
| `GET /api/users/balupton/following/orgs` | 200 — 13 organisations |
| `GET /api/users/balupton/following` | 200 — empty |
| `GET /api/models/prism-ml/Ternary-Bonsai-2-27B-gguf` | 200 — gated metadata is readable |

The 13 organisations are Edge0, webAI-Official, desert-ant-labs, inclusionAI, unsloth, bosonai, stepfun-ai, zai-org, thinkingmachines, Qwen, deepseek-ai, MiniMaxAI, and moonshotai.

Two are not on the X list: Boson AI and Thinking Machines Lab. The watchlist now has 48 entities.

The token needs only the gated-repo read permission. Collection read/write is optional; it is useful when a collection becomes a seed source. A browser session token is not needed and was not used: browser credential stores are outside the documented secret locations, and a session cookie grants far more access than this task needs.

#### Named members

- **Underdog AI** (`@UnderdogAI`, Conway Research) — consumer on-device models. The 27B Saluki build is a 2-bit derivative of Qwen3.8-27B. Its Hugging Face card says CC-BY-NC-4.0; several news articles report Apache-2.0. The base is Apache-2.0. This is a live example of a licence conflict that the catalogue must record.
- **Edge0 AI** (`@Edge0_AI`) — on-device streaming MoE inference and quantised model builds. The 145B build names Qwen3.8-Flash-Next as its base and carries a custom `edge0-community-model-1.0` licence. The inference framework is Apache-2.0.
- **Desert Ant Labs** (`@desertantlabs`) — 18 small on-device models with Swift, Kotlin, and JavaScript SDKs. The weights are on Hugging Face and gated. The licence is source-available, not OSI-approved, with a 100,000 monthly-active-device free tier.

The common pattern is important: **the most interesting democratic-AI work is often a derivative of a permissive base, re-released under more restrictive terms.** A catalogue that only records “open weights yes/no” will miss this.

#### X list seed (2026-11-14)

The list is named **Democratic AI** and its description is “AIs that are for the people, not empire”. It has 47 members.

`data/watchlist.json` records 48 entities: 46 from the X list (47 handles, because the two Kimi accounts merge) and 2 from the Hugging Face following list. The seed has 36 organisations, 7 projects, and 5 people. By role: 29 model labs, 6 agent harnesses, 3 evaluators, 2 infrastructure providers, 2 tooling projects, and the rest are a platform, a data lab, a media account, and individuals.

The context distribution is a useful signal: 11 entities are on-device, 7 are agent-related, 2 are edge, 2 are privacy-focused, and 1 is sovereign. The owner's list leans strongly toward on-device and consumer-owned AI, which supports the proposed first-release scope of text plus on-device speech.

33 of the 46 X-derived entities have a verified Hugging Face identity; 35 of the 48 total do. 13 are followed on Hugging Face, including Boson AI and Thinking Machines Lab, which are not on the X list.

The raw X responses are committed under `data/raw/x/lists/2084302656580034676/` so the list never costs a second read. The snapshot is the evidence; `data/watchlist.json` is the curated view.

### Journal and aggregator sources

The list includes four journal or aggregator accounts. Their sites were scanned for feeds and APIs. The results are in `data/feeds.json`.

| Source | Feed or API | Result | Use |
| --- | --- | --- | --- |
| Hugging Face | `https://huggingface.co/blog/feed.xml` | RSS, 907 items | Primary discovery feed |
| Hugging Face Papers | `/api/papers`, `/api/daily_papers` | JSON, no auth | Research discovery |
| Simplifying AI | beehiiv RSS link | The host does not resolve; the sitemap has 521 URLs | Sitemap fallback |
| LLM Stats | none | No feed; robots.txt disallows `/api/` | Sitemap only |
| Artificial Analysis | Free Data API | Key required; internal use only, no redistribution | Capability context only |
| Arena | none | No feed and no public API | Leaderboard links only |
| BigCode | none | No feed; the sitemap is from 2020 | GitHub releases and Hugging Face |
| Unsloth | none | No feed; the sitemap is current | Sitemap and GitHub releases |

The useful conclusion is that **the open ecosystem already has better feeds than the aggregators**: the Hugging Face blog, the Hugging Face papers API, arXiv RSS, and GitHub release Atom feeds cover releases, research, and tooling with no key and no redistribution limit. The aggregators are useful as human context, not as a data pipeline.

This changes the fetching priority. Phase 3 starts with Hugging Face, arXiv, and GitHub. The aggregator sitemaps are a later addition. Artificial Analysis is optional and must never become an openness source.

### The seed landscape

These facts were checked against the Hugging Face API on 2026-11-14. They are seeds for the first import, not yet accepted records. The tier is the rule output for the evidence available today.

| Entity | Licence (checked) | Data evidence | Tier now | Why it matters |
| --- | --- | --- | --- | --- |
| `allenai/Olmo-3.1-32B-Think` | Apache-2.0 | `allenai/Dolci-Think-RL` on the card | **Commons** | Weights, data, and recipe are the Ai2 norm. The reference case for a full return. |
| `EleutherAI/pythia-6.9b` | Apache-2.0 | `EleutherAI/pile` on the card | **Commons** | A research suite with open data and open training code. |
| `bigscience/bloom-7b1` | BLOOM RAIL 1.0 | BigScience corpus (open) | **Shared** | A full contribution with a use-restricted licence. The tier records the reuse limit, not a lack of generosity. |
| `Qwen/Qwen3.8-27B` | Apache-2.0 | none on the card | **Unproven → likely Shared** | Strong open-weight release. Check the announcement and repository before recording the data as closed. |
| `deepseek-ai/DeepSeek-V4-Flash-0731` | MIT | none on the card | **Unproven → likely Shared** | Same pattern. The MIT licence is generous; the training data is not public on the card. |
| `zai-org/GLM-5.2` | MIT | none on the card | **Unproven → likely Shared** | Same pattern. |
| `openai/gpt-oss-120b` | Apache-2.0 | none on the card | **Unproven → likely Shared** | Open weights from a closed-data lab. A useful test of the definition. |
| `google/gemma-3-27b-it` | Gemma licence | none on the card | **Shared** | Weights plus a conditional community licence. The licence caps the tier. |
| `meta-llama/Llama-4-Scout-17B-16E-Instruct` | Llama community licence | none on the card | **Shared** | Weights plus scale and use conditions. |
| `MiniMaxAI/MiniMax-M3` | custom (`other`) | none on the card | **Unproven** | The licence class needs a manual assignment before the tier can resolve. |
| `CohereLabs/aya-expanse-32b` | CC-BY-NC-4.0 | open Aya data family | **Shared** | A strong multilingual contribution with a non-commercial limit. |
| `HuggingFaceTB/SmolLM3-3B` | Apache-2.0 | data references need verification | **Unproven** | A likely on-device candidate. Do not assume the data is open because the lab publishes data elsewhere. |
| `Edge0/Edge0-145B-NVFP4` | `edge0-community-model-1.0` | none on the card | **Shared** (confirm the licence class) | A quantised Qwen derivative with a custom licence. The framework is Apache-2.0. |
| `ConwayResearch/Underdog-Saluki-27B-1.0` | CC-BY-NC-4.0 | none on the card | **Shared** | The licence conflict with secondary reporting is the reason for the source hierarchy. |
| Desert Ant Labs models | source-available, 100k MAU cap | none on the card | **Shared** | Gated weights and a scale condition. The SDK is open; the models are not OSI open source. |
| `LiquidAI/LFM2-2.6B` | custom (`other`) | none on the card | **Unproven** | An on-device family with a custom licence. Classify the licence before the tier resolves. |
| `kyutai/moshiko-pytorch-bf16` | CC-BY-4.0 | research release | **Unproven** | Open speech model with code. Check whether the data and recipe are released. |

A card with no dataset is not proof of closed data. The first assessment must check the release announcement, the repository, and any data statement. Until that check is done, the record is `Unproven`. This is the “never guess” rule in practice, and it is why the first import is a review task, not a bulk scrape.

The table already demonstrates the main finding: **most “open” releases are `Shared` or `Unproven`, not `Reciprocal`.** That is not a criticism of the labs. It is the distinction the catalogue exists to make.

### Existing evidence in the consumer repositories

Four repositories already hold verified evidence. The first import must use them instead of starting from zero.

- **`agent-detect`** (`src/lib/rules.zig`) has per-model `openness`, `license`, `open_training`, `closed_training`, `sources`, and `variations`, plus per-provider training conduct. Its `NOASSERTION` convention means “checked, inconclusive”, which is the right model for this catalogue too. It covers many text models and the provider side.
- **`tts-comparison`** (`FINDINGS.md`, `auditions/`, `engines/`) has verified speech results: Kokoro 82M (Apache-2.0), Piper (MIT/GPL family), Chatterbox (MIT), Magpie (NVIDIA Open Model License), Higgs Audio v3 (non-commercial), Breeze TTS 2, VibeVoice, Voxtral (CC BY-NC), and the Apple-Silicon feasibility notes. This is the seed for the `speech` domain and the first consumer query.
- **`translation-comparison-en-id`** (`docs/model-survey.md`, `docs/recommendation.json`, `docs/recommendation-history.md`, `results/`) is the strongest prior art for use-case fit. It measures Indonesian↔English translation across specialised NMT models, local LLMs, and hosted providers. It records quality (chrF, BLEU, COMET, MetricX), direction, latency, cost, licence, deployability, masked-name survival, and availability. Its `recommendation.json` holds `primary`, `alternatives`, `disqualified`, and `caveats`; its history is a decision log. Its evaluation rules are the source of the doctrine in DESIGN.md.
- **`pati-website`** and **`pati-reports`** are the live use cases. `pati-website` selected Qwen-MT, then a Qwen chat model, then DeepSeek for translation, and it uses on-device Desert Ant Gist for tagging. `pati-reports` generates Indonesian student reports from teacher notes with DeepSeek, and evaluates a Clef/Clairic cascade for association and marking. Both show the real constraints: Cloudflare Workers limits, browser WASM, a five-minute cron budget, provider rate limits, retirement risk, child-data privacy, and a human review step.

The import shape is a one-way conversion, not a shared database:

1. `agent-detect` model rules → `data/models/*.json` + `data/sources/*.json`.
2. `tts-comparison` findings → speech model records with `contexts: ["on-device"]` and `domains: ["speech"]`.
3. `translation-comparison-en-id` results and recommendation → `data/evaluations/*.json` + `data/recommendations/translation-id-en.json`.
4. `pati-*` plans and field reports → use-case constraints, caveats, and field evidence.
5. Conflicts stay visible with both sources. The importer never overwrites a newer assessment.

### What the Pati work teaches about selection

The Pati plans show a repeatable loop:

1. Name the job and the hard constraints.
2. Measure the candidates on that job, not on a generic leaderboard.
3. Record the decision, the alternatives, the disqualified models, and the caveats.
4. Pin the choice in the product.
5. Watch for retirement, price changes, and rate limits.
6. Keep the human review step for high-stakes output.

The concrete cases:

| Use case | Hard constraints | What decided it | Evidence |
| --- | --- | --- | --- |
| Indonesian ↔ English translation | Cloudflare Workers, five-minute cron, name preservation, commercial-safe licence, trivial cost | Quality plus 10/10 masked-name survival plus a fit to the cron budget | `translation-comparison-en-id` results and `recommendation.json` |
| On-device topic tagging | Browser, 101 languages, about 74 MB, free up to 100k monthly devices | On-device privacy and multilingual coverage, not raw size | Desert Ant Gist evaluation |
| Student report generation | Indonesian output, cite teacher notes, never invent evidence, child-data privacy | Evidence grounding and a review step, not prose quality alone | `pati-reports` fixtures and field use |
| Association and marking | Calibrated confidence, multi-label behaviour, Indonesian notes | F1 against the single prompt, token cost, and overconfidence | Clef/Clairic fixture run |
| Speech transcription | Offline, accuracy on real meetings, laptop runtime | Word error rate plus speed plus runtime fit | `tts-comparison` and the audition notes |
| Coding agent | Tool-call accuracy, local memory, licence | Tool-call reliability and on-device fit | `agent-detect` rule work |

This table is the argument for the `use-cases`, `evaluations`, `recommendations`, and `fits` model in section 3. The catalogue does not invent a new selection method. It generalises the one the owner already uses.

### Fetching options

| Source | Endpoint | Auth | Constraints | What it gives |
| --- | --- | --- | --- | --- |
| Hugging Face models | `GET /api/models?author=<org>&sort=lastModified&direction=-1` | none for public models | Gated models return 401 on the detail endpoint; rate limits apply | New releases, licence tags, base-model tags, downloads, likes, creation date |
| Hugging Face model detail | `GET /api/models/<id>` | none for public models | Gated models need a token and an accepted licence | `cardData` licence, datasets, base model, tags, files |
| Hugging Face datasets | `GET /api/datasets?author=<org>` | none | Same | Open-data evidence |
| Hugging Face follows | `huggingface.co/<user>/following` | session or token | 401 anonymously | The owner's watchlist |
| X list members | `GET /2/lists/<id>/members` | OAuth 2.0 bearer | Paid API tier; list endpoints are not free | The owner's watchlist |
| GitHub | REST and GraphQL | optional token | 60 requests per hour unauthenticated, 5,000 with a token | Releases, licence files, repository metadata |
| arXiv | export API | none | Be polite; cache | Papers and methods |
| OpenRouter | `GET /api/v1/models` | optional | Public | Serving availability, pricing, `:free` variants |
| Organisation blogs and RSS | per-site feeds | none | Varies | Announcements that precede model cards |
| SPDX licence list | `spdx.org/licenses/` | none | Static | Licence ids and canonical names |
| Artificial Analysis, LMArena | HTML pages | none | No stable public API | Capability context, never openness evidence |

Fetch rules:

- Cache every response with an ETag or `fetched_at`. The build never fetches.
- A billable response is cached under `data/raw/<source>/` and committed before a parser reads it. The X API is the first billable source. A repeated X read costs money, so a refresh needs an explicit request. The snapshot is immutable; a refresh adds a new dated file.
- Snapshot only what the record needs: the licence, the base model, the dataset claim, the release date, and a short excerpt. Store a SHA-256 of the fetched body.
- Treat a gated 401 as `gated`, not `closed`.
- Treat a missing dataset declaration as `unknown`, not `closed`.
- Never scrape a private list or a logged-in page. Use a documented token or a manual snapshot.
- Keep the fetch stage deterministic. The same snapshot must produce the same records.

### Website architecture conventions in bevry-vibes

`agent-detect` is the only existing bevry-vibes website. Its conventions are:

- a `site/` directory with its own deployment and its own README;
- Deno tasks for `dev`, `build`, `check`, and `deploy`;
- `wrangler.jsonc` with a `custom_domain` entry and explicit host-scoped routes;
- `assets.run_worker_first: true` only when the worker owns redirects;
- data generated at build time into the site's `public/data/`, never hand-copied;
- a worker that serves JSON routes and falls through to assets;
- the canonical domain in the worker, with `workers.dev` and typo hosts redirected.

This project keeps the Deno tasks, the separate `site/` deployment, the generated data, and the explicit routes. It does not copy the React SPA, the custom-domain redirect, or the worker-first design, because the first release is static and `workers.dev` is the requested canonical host.

### Astro and Cloudflare facts

Checked on 2026-11-14:

- Astro `7.4.12`, `@astrojs/cloudflare` `14.4.8`, Tailwind CSS `4.3.5`, Wrangler `4.162.0`.
- A static Astro site does **not** need the Cloudflare adapter. `astro build` plus `wrangler deploy` with `assets.directory` produces a Workers static-assets deployment.
- With the adapter, Astro 6+ uses the unified entrypoint `@astrojs/cloudflare/entrypoints/server`, and the Wrangler config is optional for simple projects.
- Static assets are served before the worker on the adapter path. `assets.run_worker_first` is only for requests the worker must see, such as host redirects.
- `_headers` and `_redirects` in `public/` are copied to the output. `_headers` does not apply to worker responses.
- The `agent-detect` custom-domain pattern is the reference if a `bevry.me` host is added later.

## Proposal

### 1. Definition and tier model

The definition and the tier rules are recorded in [DESIGN.md](../DESIGN.md). The proposal is to accept them as written, with one naming decision left open: whether the tiers should be called `Commons`, `Reciprocal`, `Shared`, `Closed`, and `Unproven`, or whether `Shared` should be split into `Weights-only` and `Conditional`.

The recommendation is to keep five tiers. Five is enough to be actionable and few enough to explain on one screen. The record carries the component values, so a consumer that wants the split can derive it.

A model moves between tiers only through a recorded evidence change. The journal entry states the old tier, the new tier, and the source.

### 2. Categories

Three facets, as DESIGN.md records:

- **Tier** — computed: `commons`, `reciprocal`, `shared`, `closed`, `unproven`.
- **Domain** — editorial: `language`, `code`, `vision`, `speech`, `multimodal`, `embeddings`, `datasets`, `tooling`, `evaluation`, `governance`.
- **Context** — tags: `on-device`, `edge`, `multilingual`, `low-resource`, `sovereign`, `privacy`, `education`, `accessibility`, `science`, `agents`, `reproducible`.

The README presents the tiers first, because they are the distinctive idea, then five consumer-oriented browse sections:

1. **Runs on your device** — `on-device` or `edge`, any tier.
2. **Speaks your language** — `multilingual`, `low-resource`, or `sovereign`.
3. **Works with speech** — `speech`.
4. **Writes code and drives agents** — `code` or `agents`.
5. **Builds on the commons** — `datasets`, `tooling`, `evaluation`, `governance`.

This keeps the README readable. The site exposes the full facet set as filters.

### 3. Use-case fit and selection

This is the core of the product, not a side filter. The Pati work shows the shape: a use case, a set of hard constraints, a measured comparison, a recommendation with alternatives and caveats, and a decision log.

#### Use-case record

```json
{
  "$schema": "../../schemas/use-case.schema.json",
  "schema_version": 1,
  "id": "translation-id-en",
  "name": "Indonesian ↔ English translation",
  "summary": "Translate school content between Indonesian and English while preserving names, terms, and formatting.",
  "task": "translation",
  "directions": ["id->en", "en->id"],
  "requirements": {
    "languages": ["id", "en"],
    "modalities": ["text"],
    "runtime": ["cloudflare-workers", "local"],
    "license_class": ["permissive", "reciprocal"],
    "privacy": "no-training-on-content",
    "latency": "batch",
    "offline": false,
    "structured_output": false
  },
  "success_criteria": [
    "Masked names survive 10/10 in both directions",
    "Quality stays at or above the previous primary",
    "A 300-segment entry fits a five-minute cron budget"
  ],
  "evaluations": ["eval-translation-id-en-deepseek-v4-flash-v2"],
  "recommendation": "rec-translation-id-en",
  "sources": ["translation-comparison-en-id", "pati-website"],
  "updated_at": "2026-11-14"
}
```

#### Evaluation record

One measured run, with the setup that makes it reproducible:

```json
{
  "schema_version": 1,
  "id": "eval-translation-id-en-deepseek-v4-flash-v2",
  "use_case": "translation-id-en",
  "model": "deepseek-v4-flash",
  "direction": "id->en",
  "setup": {
    "provider": "DeepSeek official",
    "runtime": "hosted",
    "quantization": null,
    "reasoning": "disabled",
    "prompt": "engine-preserve",
    "test_set": "translation-comparison testset-v2",
    "segments": 78,
    "temperature": 0
  },
  "metrics": {
    "chrf": 77.10,
    "seconds_per_segment": 0.8,
    "cost_usd_per_million_input": 0.15,
    "cost_usd_per_million_output": 0.60
  },
  "verdict": "recommended",
  "caveats": [],
  "source": "https://github.com/bevry-vibes/translation-comparison-en-id",
  "measured_at": "2026-09-30"
}
```

#### Recommendation record

The current decision, not a score:

```json
{
  "schema_version": 1,
  "id": "rec-translation-id-en",
  "use_case": "translation-id-en",
  "summary": "DeepSeek V4 Flash is the primary: the best bracket-verified quality that fits the cron budget.",
  "primary": {
    "model": "deepseek-v4-flash",
    "why": ["Best bracket-verified quality", "Fits the cron budget", "Trivial cost per entry"]
  },
  "alternatives": [
    {
      "model": "qwen3-235b-a22b-2507",
      "role": "cost pick",
      "why": "Cheapest safe model at 1.4–1.6 seconds per segment"
    }
  ],
  "disqualified": [
    {
      "model": "qwen-mt-turbo",
      "why": "Retires 2026-10-10, with non-raisable rate limits"
    }
  ],
  "caveats": [
    "DeepSeek API rate limits are unproven under production traffic"
  ],
  "evidence": ["eval-translation-id-en-deepseek-v4-flash-v2"],
  "updated_at": "2026-11-14"
}
```

#### Query semantics

The “find” page and the JSON API use the same predicate set over the generated `fit` index:

- task and direction;
- language or language pair;
- input and output modality;
- runtime: browser, Cloudflare Workers, Node, Python, llama.cpp, Ollama, MLX, Core ML, Android, or iOS;
- hardware: CPU, Apple Silicon, CUDA, mobile, or server;
- memory budget;
- offline or local-only operation;
- licence class: commercial-safe, reciprocal, or non-commercial;
- cost ceiling: free, free-tier, or paid;
- latency class: interactive, batch, or a cron budget;
- structured output, tool calling, and context length;
- privacy: zero-training, local-only, or no child-data transfer.

Each result is a model with a verdict and reasons. The page groups results by verdict — recommended, viable, disqualified, and unproven — instead of hiding the failures. A disqualified result is useful: it says why a popular model does not fit.

#### Fit is not one score

Do not compute a numeric score across quality, cost, licence, and latency. The weights belong to the consumer, not the catalogue. The catalogue provides the facts and a verdict for a stated use case; the consumer sets the priorities.

#### Reuse of existing evidence

`translation-comparison-en-id` already has the data for the first use case. The import is a mapping, not a re-run:

- its `results/*.json` → evaluation records, with the run label, direction, test set, metrics, and per-segment samples;
- its `docs/recommendation.json` → a recommendation record;
- its `docs/recommendation-history.md` → journal entries;
- its evaluation rules → the doctrine in DESIGN.md.

Do not re-run a benchmark the source already ran. Add a new evaluation only when the model, prompt, provider, quantization, or test set changes.

### 4. Data model

The data model is a set of JSON records with a JSON Schema per entity kind. The model record is the most important.

```json
{
  "$schema": "../../schemas/model.schema.json",
  "schema_version": 1,
  "id": "olmo-3-1-32b-think",
  "kind": "model",
  "name": "OLMo 3.1 32B Think",
  "aliases": ["allenai/Olmo-3.1-32B-Think"],
  "organization": "allenai",
  "released": "2025-12-10",
  "domains": ["language"],
  "contexts": ["reproducible"],
  "modality": { "input": ["text"], "output": ["text"] },
  "capabilities": {
    "tasks": [
      { "task": "reasoning", "strength": "capable", "evidence": ["hf-olmo-3-1-32b-think"] }
    ],
    "languages": ["en"]
  },
  "license": {
    "id": "Apache-2.0",
    "class": "permissive",
    "url": "https://huggingface.co/allenai/Olmo-3.1-32B-Think/blob/main/LICENSE"
  },
  "openness": {
    "weights": "open-weight",
    "training_data": "open",
    "training_code": "open",
    "tier": "commons",
    "tier_method": "reciprocity-v1",
    "evidence": ["hf-olmo-3-1-32b-think", "ai2-olmo-3-report"]
  },
  "lineage": [
    {
      "base": "allenai/Olmo-3-32B-Think-DPO",
      "relation": "finetune",
      "license_inherited": false
    }
  ],
  "footprint": { "params_b": 32 },
  "access": {
    "hugging_face": "allenai/Olmo-3.1-32B-Think",
    "github": "allenai/OLMo-core",
    "gated": false
  },
  "conduct": {
    "closed_training": "never",
    "open_training": "never",
    "evidence": ["hf-olmo-3-1-32b-think"]
  },
  "verified_at": "2026-11-14",
  "updated_at": "2026-11-14",
  "notes": "The model card lists the Dolci-Think-RL training dataset."
}
```

A source record keeps the evidence addressable:

```json
{
  "$schema": "../../schemas/source.schema.json",
  "schema_version": 1,
  "id": "hf-olmo-3-1-32b-think",
  "url": "https://huggingface.co/allenai/Olmo-3.1-32B-Think",
  "kind": "model-card",
  "publisher": "allenai",
  "retrieved_at": "2026-11-14",
  "http_status": 200,
  "sha256": "<hash of the fetched body>",
  "excerpt": "Training data: allenai/Dolci-Think-RL",
  "supports": ["license", "training_data", "lineage"]
}
```

A discovery record is the journal's structured twin:

```json
{
  "$schema": "../../schemas/discovery.schema.json",
  "schema_version": 1,
  "id": "2026-11-13-edge0-145b",
  "kind": "discovery",
  "date": "2026-11-13",
  "title": "Edge0 releases a 145B on-device build",
  "type": "release",
  "summary": "A quantised build of Qwen3.8-Flash-Next with a streaming-MoE runtime and a custom community licence.",
  "entities": ["edge0-145b"],
  "domains": ["language"],
  "sources": ["edge0-blog-145b", "hf-edge0-145b"],
  "verified_at": "2026-11-14"
}
```

Schema rules:

- `additionalProperties: false` so a typo fails CI.
- Enums are closed. A new value needs a schema change and a note in DESIGN.md.
- `id` matches `^[a-z0-9]+(-[a-z0-9]+)*$`.
- Dates are ISO `YYYY-MM-DD`.
- URLs are absolute.
- `unknown` is a valid enum value where evidence is missing.
- `NOASSERTION` is reserved for the `agent-detect` conduct fields, where it means “checked, inconclusive”.

### 5. Repository layout

```text
README.md                     end-user overview and generated catalogue
DESIGN.md                     enduring design decisions
CONTRIBUTING.md               maintainer runbook (phase 1)
LICENSE.md                    RPL-1.5
AGENTS.md                     the skills contract
cloudflare.md                 local Cloudflare tweaks
data/
  models/<id>.json            one model per file
  organizations/<id>.json
  datasets/<id>.json
  tools/<id>.json
  use-cases/<id>.json         a job, its constraints, and its success criteria
  evaluations/<id>.json       one measured model × use-case run
  recommendations/<id>.json   the current decision for a use case
  discoveries/<id>.json
  sources/<id>.json
  taxonomy.json               domains, contexts, enums, tier method
  feeds.json                  verified feeds and APIs (discovery sources)
  raw/                        committed snapshots (X, HF, and later billable sources)
  dist/                       generated rollups, including fits.json
journal/
  2026-11.md                  canonical, append-only
  index.json                  generated
schemas/
  model.schema.json
  organization.schema.json
  source.schema.json
  discovery.schema.json
scripts/
  fetch/                      one module per source
  build.ts                    validate, compute tiers, generate
  check.ts                    build in check mode
  propose.ts                  diff snapshots into proposals
  import-agent-detect.ts      one-way seed import
  import-tts-comparison.ts    one-way seed import
site/
  astro.config.mjs
  deno.json
  package.json
  wrangler.jsonc
  public/_headers
  src/pages/
  src/components/
  src/data/                   generated JSON imported by pages
  src/styles/theme.css
.github/workflows/
  ci.yml
  deploy.yml
  research.yml
  journal.yml
```

### 6. Build and sync

One command writes every generated artefact. One command checks that the working tree matches.

```text
deno task build      # validate → compute → write README blocks, site data, API files
deno task check      # run build in check mode, fail on a difference
deno task fetch      # refresh snapshots into .cache/ (never run in CI's build job)
deno task deploy     # build, then deploy site/ to Workers
```

The pipeline:

1. Read `data/taxonomy.json` and validate every record against its schema.
2. Resolve source ids. Fail on a dangling reference.
3. Compute the tier from the component values. Compare it with the stored tier. A mismatch fails the build, so a tier cannot silently drift from its components.
4. Build the indexes: entities by id, by domain, by tier, by organization, and by context.
5. Render the generated README blocks between markers.
6. Write `data/dist/*.json`, `site/src/data/*.json`, and `site/public/api/v1/*.json`.
7. Build the journal index from front matter.
8. In check mode, render into memory and compare with the files on disk. Report every difference and exit non-zero.

The README markers are limited to facts that come from data:

```markdown
<!-- BEGIN GENERATED: tier-summary -->
| Tier | Models | What it means |
| --- | --- | --- |
...
<!-- END GENERATED: tier-summary -->
```

The narrative around the markers is hand-written. The site home imports `README.md` as raw text, renders it with Astro's Markdown pipeline, and strips the licence segment. The generated tables therefore render on both surfaces from the same bytes.

Trade-off:

| Option | Sync guarantee | Flexibility | Verdict |
| --- | --- | --- | --- |
| Generate README; site reads data independently | Facts agree, prose can drift | High | Rejected as the only mechanism |
| Site renders README verbatim | Prose and facts agree | Low for the home page; high elsewhere | **Recommended for the home page** |
| Hand-maintain both; CI link check only | Weak | High | Rejected |

The site's detailed pages use richer components than a Markdown table can express. They read the same generated JSON, so they cannot disagree on facts.

### 7. Site architecture and information architecture

- **Framework:** Astro `7`, static output, Tailwind CSS `4` through the Vite plugin, no client framework.
- **Deployment:** Wrangler static assets, Worker name `democratic-ai`, canonical host `democratic-ai.bevry.workers.dev`.
- **Data:** generated JSON imported at build time. No runtime fetch, no database, no session.
- **API:** prerendered JSON files under `/api/v1/`. Static files are cacheable and need no worker.
- **Feeds:** `/feed.xml` (Atom) and `/feed.json` (JSON Feed 1.1) generated from the journal.

Routes:

| Route | Purpose |
| --- | --- |
| `/` | The README rendered as an editorial page, plus category cards and the latest journal entries. |
| `/find/` | Start from a task and a set of constraints; return verdicts grouped by fit. |
| `/use-cases/` and `/use-cases/<id>/` | The job, its constraints, the recommendation, the evidence table, and the decision log. |
| `/models/` | The full catalogue with filters. |
| `/models/<id>/` | The fact sheet: tier, licence, openness, lineage, access, capabilities, fit, and sources. |
| `/organizations/` and `/organizations/<id>/` | The labs and foundations, with their entities and conduct. |
| `/domains/<id>/` | One editorial domain. |
| `/journal/` | The chronological record. |
| `/journal/<yyyy-mm>/` | One month. |
| `/data/` | The API contract, schema links, and example responses. |
| `/about/` | The method, the evidence doctrine, and how to contribute a correction. |

The site is entirely static, so there is no search service. The `/find/` and `/models/` pages filter generated indexes in the browser with a small script. They also support URL parameters, so a result is shareable: `/find/?task=translation&language=id&runtime=cloudflare-workers&license=commercial-safe`.

The `/find/` page is the primary entry point for a consumer with a job. It never hides a disqualified model. It groups results by verdict — recommended, viable, disqualified, unproven — and shows the reason and the evidence for each. A consumer can see why a popular model does not fit, which is often more useful than a short list.

### 8. Design system

The visual direction is a field guide, not a dashboard.

**Palette (warm pastel):**

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#FBF7F0` | Page background |
| `--paper-2` | `#F3ECE0` | Cards and quiet bands |
| `--ink` | `#221E1A` | Body text |
| `--ink-soft` | `#5B5349` | Secondary text |
| `--rule` | `#DED3C2` | Rules and borders |
| `--clay` | `#B5624A` | Primary accent and links |
| `--sage` | `#6F7F5E` | Commons tier |
| `--sky` | `#5F7A8A` | Reciprocal tier |
| `--ochre` | `#B98A2E` | Shared tier |
| `--stone` | `#7A746B` | Closed tier |
| `--plum` | `#7C6273` | Unproven tier |

Tier badges use a pastel tint of the accent with dark text, so the page stays warm and the contrast stays above WCAG AA.

**Typography:**

- Display: `Newsreader` or `Instrument Serif`, self-hosted through Fontsource.
- Body: `Source Sans 3` or `Inter`, self-hosted.
- Code and ids: `IBM Plex Mono`.
- Body size 18–20 px; measure 65–70 characters; line height 1.6.

**Layout:**

- A 12-column grid with a 72 rem maximum width and generous margins.
- A slim header with the wordmark and five links: Find, Models, Journal, Data, About.
- A model page leads with the name, the organization, and two badges: the tier and the licence class.
- The reciprocity ledger is a four-row definition list: weights, data, recipe, access. Each row shows the value and a source link.
- The lineage chain shows the base and the relation, with the licence change called out.
- The source list shows the publisher, the retrieval date, and the claim it supports.
- Empty states say “Unproven — send a source” rather than hiding the record.

**Motion and interaction:**

- A 120 ms fade on navigation; no carousels, no parallax.
- Filters update the URL and the list without a page reload.
- `prefers-reduced-motion` disables transitions.
- No cookie banner, no analytics, no tracking.

### 9. JSON API contract

The API is a set of static JSON files. The contract is versioned by path.

| Path | Contents |
| --- | --- |
| `/api/v1/index.json` | A compact list of every entity: id, name, kind, tier, licence, domains, contexts, updated date. |
| `/api/v1/models/<id>.json` | The full model record, including capabilities and footprint. |
| `/api/v1/organizations/<id>.json` | The full organization record. |
| `/api/v1/datasets/<id>.json` | The full dataset record. |
| `/api/v1/tools/<id>.json` | The full tool record. |
| `/api/v1/use-cases.json` | The use-case index: id, name, task, directions, required constraints, and recommendation. |
| `/api/v1/use-cases/<id>.json` | The use case, its success criteria, its recommendation, and its evaluations. |
| `/api/v1/evaluations/<id>.json` | The full evaluation record, including setup, metrics, verdict, and caveats. |
| `/api/v1/recommendations/<id>.json` | The current recommendation: primary, alternatives, disqualified, caveats, and dates. |
| `/api/v1/fits.json` | The compact fit index: model, use case, verdict, reasons, constraints, evidence, and date. |
| `/api/v1/categories.json` | The taxonomy: tiers, domains, contexts, tasks, runtimes, enums. |
| `/api/v1/journal.json` | The journal index. |
| `/api/v1/journal/<yyyy-mm>.json` | One month of entries. |
| `/api/v1/meta.json` | Schema version, generator version, generated date, counts. |

Rules:

- Additive changes only inside `v1`. A breaking change creates `v2`.
- Every response carries `schema_version` and `generated_at`.
- Arrays are sorted by a documented key, so a diff is stable.
- The compact index is the recommended entry point for consumers that need a shortlist.
- `Access-Control-Allow-Origin: *` on `/api/*`.
- `Cache-Control: public, max-age=300` on the API and the feeds.

The static API returns the full `fits.json`; the consumer applies the predicates. A later version may add a Worker query endpoint if the index outgrows a single file. The predicate fields are the same as the query semantics in section 3, so the site and a programmatic consumer return the same result.

Example consumer query, expressed as a filter over `fits.json`:

```text
task=translation AND direction=id->en AND language=id
AND runtime includes cloudflare-workers AND license.class in [permissive, reciprocal]
AND verdict in [recommended, viable]
```

`tts-comparison` can use the same shape for speech, and `translation-comparison-en-id` can compare its live results against the catalogue's recorded fit.

`agent-detect` can use `license.id`, `openness.weights`, and `conduct` to refresh its model rules, with a human review before the rules change.

### 10. Fetching pipeline

```text
scripts/fetch/
  hf-organizations.ts    # watchlist orgs → new models and datasets
  hf-model.ts            # one model detail, with gated handling
  github-releases.ts     # releases and licence files
  arxiv.ts               # papers by category query
  openrouter.ts          # availability and free variants
  rss.ts                 # lab blogs
  x-list.ts              # optional, token-gated
  hf-following.ts        # optional, token-gated
  mod.ts                 # orchestrator: cache, rate limit, snapshot
```

The watchlist lives in `data/watchlist.json`:

```json
{
  "organizations": [
    {
      "id": "allenai",
      "name": "Ai2",
      "hugging_face": "allenai",
      "github": "allenai",
      "blog": "https://allenai.org/blog",
      "x": "AI2"
    }
  ],
  "x_lists": [
    { "id": "2084302656580034676", "name": "Democratic AI" }
  ],
  "topics": [
    "open-weight model",
    "open training data",
    "on-device model",
    "ternary model",
    "mixture of experts"
  ]
}
```

The fetch stage writes:

- `.cache/<source>/<key>.json` — the raw response and headers.
- `data/sources/<id>.json` — the normalised evidence record.
- `data/dist/changes.json` — what is new or changed since the last run.

The propose stage turns `changes.json` into a reviewable list: new model, new licence, new dataset, new paper, or a changed field. It does not write prose. The assess stage, run by the agent, fills the component values and cites source ids. The build stage validates both.

Rate and safety rules:

- One request at a time per host, with a 250 ms delay.
- Respect `Retry-After`.
- Cache for 24 hours unless the caller passes `--refresh`.
- Never fetch a gated model's files.
- Never store a full model card. Store the excerpt and the hash.
- Never print a token. Read it from the documented environment variable and fail with a named error when it is absent.

### 11. CI/CD

**`ci.yml`** runs on every pull request and on `main`:

1. `deno task check` — schema, references, tier recomputation, README and API drift.
2. `deno task site:check` — `astro check` and a production build.
3. A link check over the generated site, with a small allowlist for rate-limited hosts.

**`deploy.yml`** runs on `main` after CI passes:

1. Build the site.
2. `wrangler deploy` from `site/`.
3. Record the deployment URL in the job summary.

**`research.yml`** runs weekly and on demand:

1. Download the `agent-detect` release binary.
2. Run `agent-detect check-reciprocal --harness=opencode --provider=deepseek --model=deepseekv41flash`. Stop on a non-zero exit.
3. `deno task fetch` with the documented secrets.
4. `deno task propose`.
5. Run the permitted agent with a bounded prompt. The agent writes proposed records and a journal draft. It must cite source ids.
6. `deno task build`.
7. Open a pull request with a summary of new and changed records. If nothing changed, open no pull request.

**`journal.yml`** runs monthly:

1. Read the month's journal entries.
2. Ask the permitted agent to draft a newsletter issue with a fixed structure: the lead change, releases, licence changes, research, and what to watch.
3. Open a pull request with the draft under `newsletter/`.
4. Publish on merge.

Secrets:

| Secret | Used by | Documented location |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | deploy | Repository secret |
| `CLOUDFLARE_ACCOUNT_ID` | deploy | Repository secret |
| `HF_TOKEN` | HF following and gated model metadata | Repository secret |
| `X_BEARER_TOKEN` | X list sync | Repository secret |
| `DEEPSEEK_API_KEY` | research and newsletter agent | Repository secret |

The workflow never runs the agent on a fork. It never pushes to `main`. It never deploys from an agent branch.

### 12. Journal, changelog, and newsletter

The terms are defined in DESIGN.md. The implementation:

- `journal/2026-11.md` is the canonical month file. Entries are append-only and dated. Each entry has a type, a title, a short summary, and source links.
- The site renders the month files and builds an Atom feed and a JSON Feed.
- The README's “Latest” block is generated from the three most recent entries.
- The monthly newsletter is a curated draft in `newsletter/`. It links back to the journal; it does not repeat every entry.
- The repository changelog is GitHub releases, generated from Conventional Commits. It is separate from the field journal.

Journal entry shape:

```markdown
## 2026-11-13 — Edge0 releases a 145B on-device build

**Type:** release · **Entities:** [edge0-145b](/models/edge0-145b)

A quantised build of Qwen3.8-Flash-Next with a streaming-MoE runtime.
The model card names a custom community licence, so the tier is **Shared**:
the weights are available, but the reuse terms are conditional.

Sources: [Edge0 announcement](...) · [Hugging Face card](...)
```

### 13. Consumer integrations

**`tts-comparison`**

The first consumer query is speech, on-device, Apple Silicon, with a clean licence. The catalogue gives it a shortlist and the evidence for each candidate. The integration is a small script in `tts-comparison` that fetches `/api/v1/fits.json`, filters on `task=speech-synthesis`, `runtime=local`, `hardware=apple-silicon`, and a commercial-safe licence, then prints a table. It does not import this repository's code. `tts-comparison` is also a source: its findings seed the speech evaluations.

**`translation-comparison-en-id`**

It is both a source and a consumer. Its measured runs are imported as evaluation records; its `recommendation.json` seeds the first recommendation; its site stays the live benchmark. The catalogue links to the run and records the verdict, not a duplicate of every sample. When the catalogue's fit index changes, the comparison can check that its live results still support the recorded verdict.

**`pati-website` and `pati-reports`**

These are the first live products. `pati-website` pins the translation recommendation and checks the catalogue when the primary retires or a new candidate appears. `pati-reports` pins the report-generation model and records its generation profile. Neither fetches the catalogue at runtime; both pin a version and review it on a schedule. That keeps a live product stable while the catalogue moves.

**`agent-detect`**

`agent-detect` keeps its own rule tables, because its binary must embed them. The catalogue produces a reviewable export:

```json
{
  "model_id": "qwen3-8-27b",
  "openness": "open-weight",
  "license": "Apache-2.0",
  "closed_training": null,
  "open_training": null,
  "tier": "shared",
  "sources": ["hf-qwen3-8-27b"]
}
```

A maintainer applies the export to `src/lib/rules.zig` after review. The export never writes the Zig file directly. The direction of truth is one-way: this catalogue is the upstream source for model facts; `agent-detect` is the upstream source for provider and harness facts.

## Alternatives considered

### Data format

| Option | Strengths | Weaknesses | Verdict |
| --- | --- | --- | --- |
| JSON records + JSON Schema | Direct consumer contract; deterministic; editor support; one format | Verbose to hand-edit | **Recommended** |
| YAML records + generated JSON | Pleasant to edit; comments | Two formats; conversion drift; YAML edge cases | Viable alternative |
| SQLite | Strong queries; one file | Binary diffs; poor review; a runtime dependency | Rejected |
| CSV tables | Simple for spreadsheets | Cannot express lineage, evidence, or nested facets | Rejected |

### Site stack

| Option | Strengths | Weaknesses | Verdict |
| --- | --- | --- | --- |
| Astro static + Workers assets | Fast, cheap, no runtime, excellent content model | No dynamic routes without a rebuild | **Recommended** |
| Astro + Cloudflare adapter (SSR) | Dynamic routes and search | Runtime cost and complexity for no current need | Defer |
| Vite SPA like `agent-detect` | Familiar in the org | JavaScript required; poor for reading | Rejected |
| Cloudflare Pages | Simple | Deprecated by Cloudflare | Rejected |

### Sync

| Option | Strengths | Weaknesses | Verdict |
| --- | --- | --- | --- |
| Generated README blocks + site reads data + CI check | Strong fact sync; flexible pages | Prose can drift | Recommended, with the home page fix below |
| Site renders README verbatim | Prose and facts both cannot drift | Home page limited to Markdown components | **Recommended addition** |
| One source file per surface | Simple locally | Guaranteed drift | Rejected |

### Automation

| Option | Strengths | Weaknesses | Verdict |
| --- | --- | --- | --- |
| Deterministic fetch only | Predictable; no model cost | No synthesis; the journal stays empty | Insufficient |
| Agent proposes, human merges | Evidence review; attributable; safe | Weekly review effort | **Recommended** |
| Agent pushes to `main` | No review queue | Unreviewed claims; policy risk | Rejected |

### Deployment

| Option | Strengths | Weaknesses | Verdict |
| --- | --- | --- | --- |
| `democratic-ai.bevry.workers.dev` only | Matches the request; zero DNS work | Less memorable | **Recommended for launch** |
| Add `democratic-ai.bevry.me` | Canonical, memorable | DNS and certificate setup; redirect logic | Phase 2 |
| Both hosts, no redirect | Simple | Duplicate content and split links | Rejected |

## Implementation phases

### Phase 0 — scaffold (this change)

- Bevry configuration files, `LICENSE.md`, `AGENTS.md`, `cloudflare.md`.
- `README.md` and `DESIGN.md`.
- This plan and its provenance companion.

Acceptance: the repository is initialised, the skills are referenced, and the owner can review the proposal.

### Phase 1 — data foundation

- `schemas/` for model, organization, source, discovery, use-case, evaluation, recommendation, and taxonomy.
- `scripts/build.ts` and `scripts/check.ts`.
- `data/taxonomy.json` and `data/watchlist.json`.
- The first 30 model records: 20 text models, 6 speech models, 4 datasets or tools.
- The first 6 use cases: translation, transcription, on-device speech synthesis, on-device tagging, report generation, and coding agents.
- The first evaluations and recommendations, imported from `translation-comparison-en-id`, `tts-comparison`, and the Pati field work.
- The `agent-detect`, `tts-comparison`, and `translation-comparison-en-id` importers.
- Generated README blocks, `data/dist/`, and `data/dist/fits.json`.
- `CONTRIBUTING.md` with the evidence runbook and the use-case authoring guide.

Acceptance: `deno task check` passes; the README tables match the records; every record has at least one source; the tier is recomputed and equal to the stored tier; every recommended fit cites an evaluation; every disqualified fit states a reason.

### Phase 2 — site and API

- Astro project, theme tokens, layouts, pages.
- The `/find/` page and the `/use-cases/` pages, driven by `fits.json`.
- Generated API files and feeds.
- Cloudflare Worker and `deno task deploy`.
- Accessibility and contrast checks.
- A first deployment to `democratic-ai.bevry.workers.dev`.

Acceptance: the home page renders the README; every model and use case has a page; the find page returns verdicts grouped by fit and a shareable URL; the JSON API matches the schema; Lighthouse accessibility is at least 95.

### Phase 3 — fetch and sync

- HF, GitHub, arXiv, OpenRouter, and RSS fetchers.
- The snapshot cache and the change list.
- Optional X and HF-following fetchers, gated on credentials.
- A manual snapshot path for both private lists.

Acceptance: a new Hugging Face release appears in `data/dist/changes.json` without an agent; the build stays deterministic; a missing credential produces a warning, not a failure.

### Phase 4 — journal and automation

- `research.yml` and `journal.yml`.
- The permitted-agent policy gate.
- The journal month file and the newsletter template.
- The first weekly run and the first monthly dispatch.

Acceptance: the agent opens a pull request with cited sources; a maintainer can review and merge it; the deploy runs on merge; the feed contains the entry.

### Phase 5 — consumers and growth

- The `tts-comparison` shortlist script.
- The `agent-detect` export and review procedure.
- A custom domain, if wanted.
- A public correction flow.

Acceptance: a consumer answers a real selection question from the API; the export is applied to `agent-detect` without hand-copying facts.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Open-washing: a project claims openness it does not have | The catalogue becomes untrustworthy | Evidence doctrine; `unknown` default; source hierarchy; tier changes are journaled |
| Licence conflicts between a card and reporting | A wrong reuse claim | Record both; mark `contested`; prefer the licence file and the card; journal the resolution |
| Source rot and link changes | Records age silently | Snapshot hash and retrieval date; 90-day re-check; archive link where possible |
| The X or HF lists become unavailable | Incomplete watchlist | Manual snapshot; the build never depends on them; the owner can refresh them |
| Agent hallucination in the journal | False public claims | The agent cites source ids; the build rejects unknown ids; a person reviews every pull request |
| Scope creep across every modality | A shallow catalogue | Phase 1 is text plus speech; add a domain when a consumer needs it |
| A capability claim is treated as general | A translation score becomes a fake intelligence score | Use-case-specific fits; no global ranking; record the setup, direction, and test set |
| A recommendation goes stale | A retired model remains the primary | `measured_at` and retirement checks; a fallback in every recommendation; the decision log |
| A fit becomes advocacy | A recommendation without evidence | Every verdict has reasons, evidence, and a disqualified list; no anonymous scores |
| The fit index grows too large | A slow page or a large bundle | Keep the index compact per use case; add a Worker query endpoint only when needed |
| A custom licence is misclassified | Wrong tier | Manual class assignment with a note; the exact licence id stays visible |
| The generated site and README drift | Two truths | One generator; CI check; the home page renders the README |
| CI cost and rate limits | Noisy failures | Deterministic fetch; cache; one scheduled run per week; bounded agent prompts |
| The project looks political | Reduced trust | Define reciprocity precisely; assess artefacts; publish the method; avoid naming people |
| Cloudflare deployment breaks on a config change | No site | The static build is reproducible; the deploy is a single Wrangler command; the Worker is assets-only |

## Open decisions

The owner must decide these before Phase 1 ends. Each has a recommendation.

1. **Private-list access — resolved on 2026-11-14.** The X app has credits and the 47 members are cached. The Hugging Face token reads the 13 followed organisations, which are cached. The remaining work is the sync script, not access. */Recommendation: build the cache-first sync in Phase 3.*
2. **Tier names.** Keep `Commons / Reciprocal / Shared / Closed / Unproven`, or split `Shared` into `Weights-only` and `Conditional`. *Recommendation: keep five tiers; the component values carry the split.*
3. **Modality scope for the first release.** Text plus speech, or every modality. *Recommendation: text plus speech, because both consumers need them now.*
4. **Authoring format.** JSON or YAML. *Recommendation: JSON with a schema and a `deno task new` scaffolder.*
5. **Canonical host.** `democratic-ai.bevry.workers.dev` only, or add `democratic-ai.bevry.me`. *Recommendation: workers.dev at launch; revisit after the first release.*
6. **Data licence.** The repository is RPL-1.5. Should the data be RPL-1.5 too, or CC BY-SA 4.0 for easier reuse? *Recommendation: RPL-1.5 for code and site; CC BY-SA 4.0 for `data/` and `journal/`, stated in `README.md` and `LICENSE.md`.*
7. **Watchlist naming.** List closed and extractive organisations by name in the public catalogue, or keep the watchlist private. *Recommendation: name artefacts, not motives; include closed models only for contrast and always with a source.*
8. **CI agent.** Which permitted model and key. *Recommendation: OpenCode with DeepSeek V4.1 Flash, gated by `agent-detect check-reciprocal`; change the pinned model only after a policy check.*
9. **Newsletter delivery.** Site and RSS only, or email through Mailgun. *Recommendation: site and RSS first; email after the journal has a stable voice.*
10. **Public corrections.** GitHub issues only, or a form. *Recommendation: GitHub issues with a template; add a form only if the audience is not technical.*
11. **First use-case set.** Which jobs get a full recommendation in Phase 1. *Recommendation: Indonesian translation, speech transcription, on-device speech synthesis, on-device tagging, student report generation, and coding agents. Each has a real consumer and existing evidence.*
12. **Fit vocabulary.** Use `recommended / viable / disqualified / unproven`, or compute a numeric score. *Recommendation: verdicts with reasons. No numeric score across quality, cost, licence, and latency; the weights belong to the consumer.*
13. **Evaluation ownership.** Re-run every benchmark in this repository, or import and link to the specialist benchmark. *Recommendation: import and link. Run a new evaluation only when a model, prompt, provider, quantization, or test set changes, or when a consumer has no evidence.*
14. **Capability evidence standard.** Accept vendor claims, or require a measured run or a field report. *Recommendation: a capability claim is `reported` until a measured run or a field report supports it. The site labels the difference.*

## Sources

- X list: <https://x.com/i/lists/2084302656580034676> (login required).
- Hugging Face following: <https://huggingface.co/balupton/following> (401 anonymously); public overview: <https://huggingface.co/api/users/balupton/overview>.
- Underdog Saluki card: <https://huggingface.co/ConwayResearch/Underdog-Saluki-27B-1.0>.
- Underdog coverage with the Apache-2.0 claim: <https://www.marktechpost.com/2026/10/09/meet-the-underdog-saluki-27b-a-2-bit-qwen3-8-27b-that-beats-the-original-at-tool-calling>.
- Edge0 framework: <https://github.com/Edge0-AI/Edge0>.
- Edge0 145B card: <https://huggingface.co/Edge0/Edge0-145B-NVFP4>.
- Desert Ant Labs: <https://github.com/Desert-Ant-Labs>; <https://huggingface.co/desert-ant-labs>.
- Public AI Network: <https://publicai.network>.
- OSI open weights: <https://opensource.org/ai/open-weights>.
- Open Future public AI: <https://openfuture.eu/our-work/public-ai>.
- Astro Cloudflare adapter: <https://docs.astro.build/en/guides/integrations-guide/cloudflare/>.
- Bevry Cloudflare skill: <https://github.com/bevry-vibes/skills/blob/main/cloudflare.md>.
- `agent-detect` rules: <https://github.com/bevry-vibes/agent-detect/blob/main/src/lib/rules.zig>.
- `tts-comparison` findings: <https://github.com/bevry-vibes/tts-comparison/blob/main/FINDINGS.md>.
- `translation-comparison-en-id`: <https://github.com/bevry-vibes/translation-comparison-en-id>.
- Translation model survey: <https://github.com/bevry-vibes/translation-comparison-en-id/blob/main/docs/model-survey.md>.
- Translation recommendation: <https://github.com/bevry-vibes/translation-comparison-en-id/blob/main/docs/recommendation.json>.
- Translation decision log: <https://github.com/bevry-vibes/translation-comparison-en-id/blob/main/docs/recommendation-history.md>.
- `pati-website` plans: <https://github.com/bevry-vibes/pati-website/tree/main/.plans>.
- `pati-reports` plan and design: <https://github.com/bevry-vibes/pati-reports>.
- Desert Ant Gist: <https://desertant.com/models/gist/>.
