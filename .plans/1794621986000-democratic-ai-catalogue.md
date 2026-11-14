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

Classification is tag-based. A model can carry several jobs, modalities, runtimes, and languages. Task tags follow the Desert Ant pattern: name the model for the job it does, then tag it so it is findable across constraints.

Evaluations are downstream overlays. The core index is complete without them. A report for a specific use case — such as `translation-id-en` — adds measured results and a recommendation on top of the index. It can live in this repository or in a downstream project.

Tagging happens after the pull. The fetch stage records source-native metadata only; a separate pass proposes task, runtime, and context tags with evidence.

The site is an Astro static build on Cloudflare Workers at `democratic-ai.bevry.workers.dev`. It is editorial and warm, not a technical dashboard. The home page renders `README.md` directly, and the generated blocks in both are produced from `data/`, so the two cannot drift. CI runs the generator in check mode and fails on a difference.

A weekly GitHub Actions job fetches releases and metadata, runs a **permitted** agent to propose tags and a journal draft, and opens a pull request. A person reviews the evidence and merges. Deployment happens on merge. The job gates itself first with `agent-detect check-reciprocal`, so the repository's own maintenance obeys the policy it documents.

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
2. `tts-comparison` findings → speech model records with tags `["domain:speech", "context:on-device"]`.
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

This table is the argument for the tag vocabulary and the overlay-report model in sections 2 and 3. The catalogue does not invent a new selection method. It generalises the one the owner already uses.

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

### 2. Tags, not categories

The catalogue does not assign one category per model. It assigns namespaced tags. A model can be `task:speech-enhancement`, `modality:audio`, `runtime:coreml`, `language:multilingual`, `license:source-available`, and `status:available` at the same time.

| Namespace | Examples | Source |
| --- | --- | --- |
| `domain:` | `domain:speech`, `domain:language`, `domain:vision` | Curated |
| `task:` | `task:translation`, `task:transcription`, `task:speech-enhancement`, `task:topic-tagging`, `task:pii-redaction` | Curated |
| `modality:` | `modality:text`, `modality:audio`, `modality:image`, `modality:video` | Source or curated |
| `runtime:` | `runtime:browser`, `runtime:cloudflare-workers`, `runtime:llama.cpp`, `runtime:mlx`, `runtime:coreml`, `runtime:android`, `runtime:ios` | Source or curated |
| `language:` | `language:en`, `language:id`, `language:multilingual` | Source or curated |
| `context:` | `context:on-device`, `context:edge`, `context:offline`, `context:sovereign`, `context:privacy` | Curated |
| `license:` | `license:apache-2.0`, `license:cc-by-nc-4.0` | Source |
| `family:` | `family:qwen`, `family:llama`, `family:gemma` | Source or curated |
| `status:` | `status:beta`, `status:gated`, `status:retired` | Source or curated |
| `org:` | `org:qwen`, `org:desert-ant-labs` | Source |
| `source:` | `source:hf-model`, `source:arxiv`, `source:x` | Fetch |

`data/tags.json` holds the vocabulary. Each tag has a definition and a status: `accepted`, `proposed`, or `retired`. A tag without a definition is a proposal, not a classification.

The Desert Ant pattern is the model. Desert Ant names each model for the job it does: Align for word timestamps, Clear for speech enhancement, Clips for clip selection, Gist for topic tagging, Redact for PII redaction. The site groups by medium and availability, not by a rigid taxonomy.

The catalogue follows that pattern with tags:

- `desert-ant-labs/align` → `task:word-timestamps`, `modality:audio`, `runtime:on-device`, `status:available`.
- `desert-ant-labs/gist` → `task:topic-tagging`, `modality:text`, `language:multilingual`, `runtime:browser`, `license:source-available`.

The model keeps its own name. The tags make it findable across jobs and constraints. A model can gain a tag without a rename, and a tag can be retired without touching the model.

#### When tags are assigned

The fetch stage records source-native metadata and source-native tags only. It does not assign `task:` or `context:` tags. Tagging is a separate pass that runs after a pull, reads the raw data, and proposes tags with evidence.

This order matters. A tag assigned before the data is complete becomes a bias in the next pull. A tag assigned after the pull can be reviewed against the full set.

The tagging pass is human-gated. It may be assisted by an agent, but a person accepts the vocabulary and the evidence. Tag changes are journaled.

### 3. Overlay reports and selection

The core index answers “what exists, and what is it tagged with?” It does not answer “which model is best for my job?” That answer needs a report.

A report is an optional overlay:

- it references model ids;
- it states the use case, constraints, setup, measurements, verdicts, caveats, and date;
- it can live in this repository under `reports/`, or in a downstream project;
- it is displayed when present, and linked when it is hosted elsewhere.

The first report is `translation-id-en`, imported from `translation-comparison-en-id`. Its measured samples stay on the comparison site; the report records the verdicts and links to the evidence.

```json
{
  "schema_version": 1,
  "id": "translation-id-en",
  "name": "Indonesian ↔ English translation",
  "constraints": {
    "languages": ["id", "en"],
    "directions": ["id->en", "en->id"],
    "runtime": ["cloudflare-workers", "local"],
    "license_class": ["permissive", "reciprocal"],
    "latency": "batch",
    "privacy": "no-training-on-content"
  },
  "evaluations": [
    {
      "model": "deepseek-v4-flash",
      "direction": "id->en",
      "setup": {
        "provider": "DeepSeek official",
        "quantization": null,
        "reasoning": "disabled",
        "prompt": "engine-preserve",
        "test_set": "translation-comparison testset-v2",
        "segments": 78
      },
      "metrics": {
        "chrf": 77.10,
        "seconds_per_segment": 0.8,
        "cost_usd_per_million_input": 0.15,
        "cost_usd_per_million_output": 0.60
      },
      "verdict": "recommended",
      "caveats": []
    }
  ],
  "recommendation": {
    "primary": "deepseek-v4-flash",
    "alternatives": ["qwen3-235b-a22b-2507"],
    "disqualified": ["qwen-mt-turbo"],
    "summary": "The best bracket-verified quality that fits the cron budget.",
    "caveats": ["DeepSeek rate limits are unproven under production traffic"]
  },
  "sources": ["https://github.com/bevry-vibes/translation-comparison-en-id"],
  "updated_at": "2026-11-14"
}
```

#### Query semantics

The base query filters tags and model facts: task, direction, language, modality, runtime, hardware, memory, licence, cost, latency, and privacy.

If a matching report exists, the result shows its verdict: `recommended`, `viable`, `disqualified`, or `unproven`. If no report exists, the result shows the facts and `unmeasured`. The absence of a report is not a gap: it means no one has measured that use case yet.

The site groups by verdict when a report is present. It never hides a disqualified model: the reason is the useful part.

#### Reports are not core

- The index builds without reports.
- CI does not require a report for a model.
- A report can be versioned and published independently.
- A downstream project can host its own report and link it from the index.

Do not re-run a benchmark the specialist repository already ran. Add a new measurement only when the model, prompt, provider, quantization, or test set changes.

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
  "tags": [
    "domain:language",
    "context:reproducible",
    "task:reasoning",
    "language:en",
    "license:apache-2.0",
    "status:available"
  ],
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

External links: `scripts/links/` joins the models.dev API and the agent-detect index into `data/links.json`. The model record carries `access.models_dev` and `access.agent_detect` when an entry exists. A build inherits its base model's links; it does not get a separate page. The model record also carries `syndication` from `data/syndication.json`: score, band, and source URLs. It is not a quality score.

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
  "tags": ["domain:language", "context:on-device"],
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
  discoveries/<id>.json
  sources/<id>.json
  tags.json                   tag vocabulary and definitions
  tag-rules.json              rules for the tagging pass
  links.json                  generated models.dev and agent-detect links
  syndication.json            generated independent-listing scores
  feeds.json                  verified feeds and APIs (discovery sources)
  fetch-targets.json          what the fetcher pulls
  raw/                        source snapshots, never overwritten
  pulls/<timestamp>/          manifest.json + items.jsonl (source-native only)
  dist/                       generated rollups
reports/                      optional overlay reports
  translation-id-en.json      the first report (phase 3)
journal/
  2026-11.md                  canonical, append-only
  index.json                  generated
schemas/
  model.schema.json
  organization.schema.json
  source.schema.json
  discovery.schema.json
  tag.schema.json
  report.schema.json
scripts/
  fetch/                      one module per source (implemented)
  tag/                        rules-first tagging plus the Clef gate (implemented)
  links/                      models.dev and agent-detect link resolver (implemented)
  syndication/                independent-listing score (implemented)
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
| `/` | The README rendered as an editorial page, plus tag cards and the latest journal entries. |
| `/find/` | Filter by tags and constraints; show verdicts when an overlay report exists. |
| `/reports/` and `/reports/<id>/` | Optional overlay reports: the use case, evidence, recommendation, and caveats. |
| `/models/` | The full catalogue with filters. |
| `/models/<id>/` | The fact sheet: tier, licence, openness, lineage, access, capabilities, tags, reports, syndication score with source chips, and links to models.dev and agent-detect when they exist. |
| `/organizations/` and `/organizations/<id>/` | The labs and foundations, with their entities and conduct. |
| `/tags/` and `/tags/<namespace>/<value>/` | Browse by tag. |
| `/journal/` | The chronological record. |
| `/journal/<yyyy-mm>/` | One month. |
| `/data/` | The API contract, schema links, and example responses. |
| `/about/` | The method, the evidence doctrine, and how to contribute a correction. |

The site is entirely static, so there is no search service. The `/find/` and `/models/` pages filter generated indexes in the browser with a small script. They also support URL parameters, so a result is shareable: `/find/?task=translation&language=id&runtime=cloudflare-workers&license=commercial-safe`.

The `/find/` page filters tags. When a report covers the job, it groups results by verdict — recommended, viable, disqualified, unmeasured — and shows the reason and the evidence. When no report exists, it shows the facts and marks the job `unmeasured`. It never hides a disqualified model.

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
| `/api/v1/index.json` | A compact list of every entity: id, name, kind, tier, tags, licence, updated date. |
| `/api/v1/models/<id>.json` | The full model record, including capabilities, footprint, tags, syndication, and external model links. |
| `/api/v1/organizations/<id>.json` | The full organization record. |
| `/api/v1/datasets/<id>.json` | The full dataset record. |
| `/api/v1/tools/<id>.json` | The full tool record. |
| `/api/v1/tags.json` | The tag vocabulary, definitions, statuses, and counts. |
| `/api/v1/syndication.json` | The independent-listing score, band, and source URLs for each root or notable model. |
| `/api/v1/reports.json` | The optional overlay index: id, name, constraints, primary, and updated date. Empty until a report exists. |
| `/api/v1/reports/<id>.json` | One full report: constraints, evaluations, recommendation, caveats, and sources. |
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

Model records include `access.models_dev` and `access.agent_detect` when the link resolver finds an entry. The resolver reads the models.dev API and the agent-detect index, and writes `data/links.json`. A build inherits the base model links.

The static API returns the full index; the consumer filters tags. Reports are optional. An empty `/api/v1/reports.json` is valid: it means no use case has been measured yet. The site and a programmatic consumer use the same tags.

Example consumer query:

```text
tags include task:translation AND language:id
AND runtime:cloudflare-workers AND license:apache-2.0
```

If a report covers the task, the consumer joins its verdicts. If no report covers it, the model is `unmeasured` for that task. A report is not a required field on a model.

`tts-comparison` can use the same shape for speech, and `translation-comparison-en-id` can compare its live results against the catalogue's recorded report.

`agent-detect` can use `license.id`, `openness.weights`, and `conduct` to refresh its model rules, with a human review before the rules change.

### 10. Fetching pipeline (implemented)

The first pull is implemented in `scripts/fetch/`:

```text
scripts/fetch/
  mod.ts                  # orchestrator: windows, cache-first, manifest
  lib/                    # cache, dotenv, http, items, time, types, xml
  sources/hf.ts           # blog RSS, models, datasets
  sources/x.ts            # latest posts per list member
  sources/arxiv.ts        # category RSS
  sources/github.ts       # release Atom feeds
  sources/sitemaps.ts     # aggregator sitemaps
```

`data/fetch-targets.json` holds the windows, repositories, arXiv categories, and sitemaps. `data/watchlist.json` holds the watched organisations and X members.

The pull writes:

- `data/raw/<source>/<target>/<date>.<kind>` — the raw response, never overwritten.
- `data/pulls/<timestamp>/items.jsonl` — one source-native item per line.
- `data/pulls/<timestamp>/manifest.json` — sources, counts, windows, and errors.

The first pull on 2026-11-14 recorded 3,932 items:

| Kind | Count |
| --- | --- |
| X posts | 869 from 47 accounts (392 inside the 14-day window) |
| Hugging Face models | 664 |
| Hugging Face datasets | 50 |
| Hugging Face blog articles | 66 |
| GitHub releases | 108 |
| Sitemap pages | 2,175 |

arXiv returned no entries because its RSS feed was empty on the weekend. The feed covers only the most recent entries, so it does not provide a full three-month window. This is recorded in the manifest, not hidden.

Tagging is a separate pass. The pull assigns only source-native tags: `source:`, `license:`, `pipeline:`, `language:` from the source, and `repo:`. The `scripts/tag.ts` pass will read the pulls and propose `task:`, `runtime:`, and `context:` tags for review.

Rate and safety rules:

- Cache first: a same-day snapshot is reused. `--refresh` writes a new timestamped snapshot.
- X: latest 20 posts per account. The 14-day window is marked by `in_window`; older fetched posts are kept.
- One request at a time per host, with an 80–200 ms delay.
- Never print or commit a token.
- Never overwrite a raw snapshot.

### Tagging pass (implemented)

`scripts/tag/` has two stages:

- `mod.ts` — the rules-first pass. It reads source-native tags and specific title or text phrases, maps organisations from the watchlist, and writes `tags.rules.jsonl` plus `tags.report.json`. It never calls a model.
- `clef.ts` — the confirmation gate. It sends only the models the rules mark `needs_review` to Clef-Flash, with one independent yes/no question per task. It accepts a task at 0.8 or above and caches every response under `data/raw/clef/`. It writes `tags.proposed.jsonl` and `tags.clef.report.json`.

Why not Gist: Gist's 36 topics describe a subject, such as technology or finance. They are not the job a model performs. Gist cannot label `task:speech-synthesis` or `task:translation`. It may help with a future `domain:` hint, but it is not a task labeller.

Why Clef only on review: the rules already cover most models from source-native fields. Clef is useful as a confirmation gate, not as a primary labeller. The pati-reports evaluation showed Clef `noul` is a calibrated yes/no signal, while a single `choice` is poor for multi-label work.

First results on the 2026-11-14 pull:

| Metric | Value |
| --- | --- |
| Hugging Face model items | 664 |
| Builds (`status:build`) | 316 |
| Probes (`status:probe`) | 29 |
| Documentation repositories (`status:documentation`) | 1 |
| Models with a task tag | 610 |
| Models sent to Clef after build and probe exclusion | 12 |
| Tasks accepted by Clef at 0.8 | 12 models |
| Models still in review | 0 |
| Manual review overrides | 13 |
| Clef input cost so far | about USD 0.08 |

A model in review keeps its licence, runtime, family, and org tags. It has no task tag, so it reads `unmeasured` for a task. It is not guessed.

The 13 remaining models are real releases, not builds: XiaomiMiMo MiMo-Audio (3), inclusionAI Duo (3), Ming-3.0-audio-flash, Realtime-Venus, AI-Transparency, Ming-UniAudio (2), Higurashi FastDialogueSidon, and unsloth sam3.1.

The link resolver (`scripts/links/`) joined 149 models on the first run: 136 have a models.dev entry and 79 have an agent-detect entry. It strips build suffixes, so a GGUF, MLX, or CoreML build inherits its base model's links. Every model page shows the links when they exist.

The build/probe distinction answers the “why build these?” question. 344 of 664 items are packaging or probes. They are not separate models, and they do not get separate pages. They attach to their base model as build entries. The catalogue records roots and notable derivatives, not the Hugging Face firehose.

### Syndication score (implemented)

`scripts/syndication/` scores each root or notable model from independent listings:

| Source | Kind | Weight |
| --- | --- | --- |
| models.dev | registry | 3 |
| agent-detect | registry | 3 |
| OpenRouter | aggregator | 2 |
| LLM Stats | evaluation | 2 |
| Artificial Analysis | evaluation | 2 |
| a research paper or code release | research | 1 |
| the model's own Hugging Face page | host | 0 |

The score is the sum, capped at 10. Bands: `self-only`, `weak`, `emerging`, `moderate`, `strong`, `very-strong`. Every point carries a source URL. The model's own host never counts as independent. Builds, probes, and documentation are skipped; a build inherits the base model's score.

First results on the 2026-11-14 pull:

| Metric | Value |
| --- | --- |
| Root and notable models scored | 318 |
| Builds, probes, and documentation skipped | 346 |
| Average score | 1.44 |
| Very strong | 29 |
| Strong | 10 |
| Moderate | 8 |
| Emerging | 12 |
| Weak | 15 |
| Self-only | 244 |

The inclusionAI real models show the value of the score: Duo scores 1 from its arXiv paper; Realtime-Venus and FastDialogueSidon score 1 from their papers; Ming-3.0-audio-flash, Ming-UniAudio, and XiaomiMiMo MiMo-Audio score 0. They are real models, but independent registries and aggregators have not picked them up yet.

The score is syndication, not quality, reciprocity, or openness. A closed model can score 10. A reciprocal model can score 0.

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
4. `deno task tag` — draft task, runtime, and context tags from the new pull. Do not write accepted tags without review.
5. `deno task propose`.
6. Run the permitted agent with a bounded prompt. The agent writes proposed tags, records, and a journal draft. It must cite source ids.
7. `deno task build`.
8. Open a pull request with a summary of new and changed records. If nothing changed, open no pull request.

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

The first consumer query is speech, on-device, Apple Silicon, with a clean licence. The catalogue gives it a shortlist and the evidence for each candidate. The integration is a small script in `tts-comparison` that fetches `/api/v1/index.json`, filters on `task:speech-synthesis`, `runtime:local`, `hardware:apple-silicon`, and a commercial-safe licence, then prints a table. If a speech report exists, it joins the verdicts. It does not import this repository's code. `tts-comparison` is also a source: its findings seed the speech report.

**`translation-comparison-en-id`**

It is both a source and a consumer. Its measured runs are imported into the first overlay report; its `recommendation.json` seeds that report; its site stays the live benchmark. The catalogue links to the run and records the verdict, not a duplicate of every sample. When the catalogue's tags or report change, the comparison can check that its live results still support the recorded verdict.

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

### Phase 1 — pull, normalise, tag

- The fetch pipeline (implemented): raw snapshots, pull manifests, and source-native items.
- `data/tags.json` with the namespace vocabulary and definitions.
- `data/tag-rules.json` with the pipeline, library, family, keyword, title, runtime, and sitemap rules.
- `scripts/tag/` (implemented): a rules-first pass plus a Clef confirmation gate for review models. Neither writes a model record.
- `scripts/syndication/` (implemented): an independent-listing score with source URLs. It skips builds, probes, and documentation.
- `schemas/` for model, organization, source, discovery, tag, and report.
- The first 30 model records from the pull, not from memory.
- `scripts/build.ts` and `scripts/check.ts`.
- The `agent-detect`, `tts-comparison`, and `translation-comparison-en-id` importers for facts, not for reports.
- Generated README blocks and `data/dist/`.
- `CONTRIBUTING.md` with the evidence runbook and the tagging guide.

Acceptance: `deno task fetch` writes a manifest and keeps every raw response; `deno task tag` and `deno task tag:clef` write proposals with evidence; no Clef task is accepted below 0.8; a model in review keeps its other tags and has no guessed task; `deno task syndication` gives every score a source URL and skips builds/probes; the index builds without any report; every task tag has a definition; `deno task check` passes; the tier is recomputed and equal to the stored tier.

### Phase 2 — site and tag index

- Astro project, theme tokens, layouts, pages.
- The `/find/` page and the `/tags/` pages, driven by the tag index.
- Generated API files and feeds.
- Cloudflare Worker and `deno task deploy`.
- Accessibility and contrast checks.
- A first deployment to `democratic-ai.bevry.workers.dev`.

Acceptance: the home page renders the README; every model has a page; the find page filters tags and marks unmeasured jobs; the JSON API matches the schema; Lighthouse accessibility is at least 95.

### Phase 3 — overlay reports

- `reports/translation-id-en.json` imported from `translation-comparison-en-id`.
- The speech report from `tts-comparison`.
- The report-generation report from the Pati field work.
- `/reports/` pages and `/api/v1/reports.json`.
- The find page joins a report when one covers the selected task.

Acceptance: a report references model ids and source evidence; removing every report leaves the site and the index functional; a report verdict is never presented as a global model ranking.

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
| A capability claim is treated as general | A translation score becomes a fake intelligence score | Report-specific verdicts; no global ranking; record the setup, direction, and test set |
| A report goes stale | A retired model remains the primary | `measured_at` and retirement checks; a fallback in every report; the decision log |
| A report becomes advocacy | A recommendation without evidence | Every verdict has reasons, evidence, and a disqualified list; no anonymous scores |
| Tag sprawl | A tag per model, with no shared meaning | Namespaced vocabulary, definitions, statuses, and a human-gated tagging pass |
| Early tags bias the pull | The dataset reflects the first hypothesis | Fetch before tag; the pull records source-native metadata only |
| A report is mistaken for the core index | A missing report looks like a missing model | Reports are overlays; the index builds without them; the UI labels unmeasured jobs |
| A custom licence is misclassified | Wrong tier | Manual class assignment with a note; the exact licence id stays visible |
| The generated site and README drift | Two truths | One generator; CI check; the home page renders the README |
| CI cost and rate limits | Noisy failures | Deterministic fetch; cache; one scheduled run per week; bounded agent prompts |
| The project looks political | Reduced trust | Define reciprocity precisely; assess artefacts; publish the method; avoid naming people |
| Cloudflare deployment breaks on a config change | No site | The static build is reproducible; the deploy is a single Wrangler command; the Worker is assets-only |

## Open decisions

The owner must decide these before Phase 1 ends. Each has a recommendation.

1. **Private-list access — resolved on 2026-11-14.** The X app has credits and the 47 members are cached. The Hugging Face token reads the 13 followed organisations, which are cached. The cache-first fetch is implemented. *Recommendation: keep the weekly cadence and the 14-day X window.*
2. **Tier names.** Keep `Commons / Reciprocal / Shared / Closed / Unproven`, or split `Shared` into `Weights-only` and `Conditional`. *Recommendation: keep five tiers; the component values carry the split.*
3. **Modality scope for the first release.** Text plus speech, or every modality. *Recommendation: text plus speech, because both consumers need them now.*
4. **Authoring format.** JSON or YAML. *Recommendation: JSON with a schema and a `deno task new` scaffolder.*
5. **Canonical host.** `democratic-ai.bevry.workers.dev` only, or add `democratic-ai.bevry.me`. *Recommendation: workers.dev at launch; revisit after the first release.*
6. **Data licence.** The repository is RPL-1.5. Should the data be RPL-1.5 too, or CC BY-SA 4.0 for easier reuse? *Recommendation: RPL-1.5 for code and site; CC BY-SA 4.0 for `data/` and `journal/`, stated in `README.md` and `LICENSE.md`.*
7. **Watchlist naming.** List closed and extractive organisations by name in the public catalogue, or keep the watchlist private. *Recommendation: name artefacts, not motives; include closed models only for contrast and always with a source.*
8. **CI agent.** Which permitted model and key. *Recommendation: OpenCode with DeepSeek V4.1 Flash, gated by `agent-detect check-reciprocal`; change the pinned model only after a policy check.*
9. **Newsletter delivery.** Site and RSS only, or email through Mailgun. *Recommendation: site and RSS first; email after the journal has a stable voice.*
10. **Public corrections.** GitHub issues only, or a form. *Recommendation: GitHub issues with a template; add a form only if the audience is not technical.*
11. **Tag vocabulary.** Approve the namespaces and the first definitions in `data/tags.json`. *Recommendation: accept `domain:`, `task:`, `modality:`, `runtime:`, `language:`, `context:`, `license:`, `family:`, `status:`, `org:`, and `source:`. Add values only with a definition.*
12. **Tagging method.** Manual tagging, or an agent-assisted pass that proposes tags for review. *Recommendation: agent-assisted proposals, human acceptance. The pull is complete before tagging starts.*
13. **Report ownership.** Keep reports in this repository under `reports/`, or host them downstream and link them. *Recommendation: the first translation report lives here; large specialist reports stay in their own repositories and are linked.*
14. **Pull cadence.** Weekly, monthly, or on demand. *Recommendation: weekly for feeds and X, with the 14-day X window and the latest-20 limit; keep every historical pull.*
15. **Capability evidence standard.** Accept vendor claims, or require a measured run or a field report. *Recommendation: a capability claim is `reported` until a measured run or a field report supports it. The site labels the difference.*

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
