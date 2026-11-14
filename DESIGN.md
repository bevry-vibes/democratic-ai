# Design

This document records the enduring design decisions for the Democratic AI catalogue. Read it before you change the data model, the tiers, the categories, the site, or the maintenance workflow. The plan that introduced these decisions lives in `.plans/`. When the owner accepts a proposal, record the decision here with a date.

> **Status:** initial design. The definition, the evidence doctrine, and the sync model are settled. The tier rules, the schema, and the category list are proposals under review in the current plan.

## Purpose

The catalogue must let a future project answer one question quickly and defensibly: **which models are reciprocal enough for this context?**

The answer must be machine-readable, sourced, and current. A person must also be able to read it without a data background.

This repository is not:

- a leaderboard — it does not rank raw capability;
- a download portal — it links to primary sources;
- a news site — the journal records only changes that affect reciprocity, availability, or how a model can be used;
- a verdict on people or organisations — it assesses artefacts and published conduct;
- a copy of `agent-detect` — it complements the agent rules with training-data openness, lineage, and reuse terms.

## What democratic AI means here

Democratic AI is reciprocal AI.

Every model learns from the commons: public text, code, images, audio, research, and the work of everyone who came before. A democratic AI returns value to that commons. It also refuses to extract value from its users without consent.

A release returns value in four ways:

1. **Weights** — the trained parameters are downloadable and reusable.
2. **Data** — the training data is released, or its sources and construction are documented well enough to audit.
3. **Recipe** — the training code, evaluation code, and data pipeline are available.
4. **Access** — the licence permits reuse, and the model can run without a permanent dependency on the vendor.

A release respects its users in two ways:

1. **No training on private data** without explicit consent.
2. **No terms that block the commons** — for example, non-commercial terms, user caps, field-of-use bans, or a ban on distillation.

Reciprocity is a property of the whole release, not a licence label. Open weights with closed data are a partial return. Open data with a non-commercial licence is a partial return. The catalogue records the weakest link, because that is the limit a consumer will meet.

### Related work

The vocabulary overlaps with [Public AI](https://publicai.network), the [OSI Open Source AI definition](https://opensource.org/ai/open-source-ai-definition), and the [Open Future](https://openfuture.eu/our-work/public-ai) programme.

We use their vocabulary. Our test is different: reciprocity with the commons, not compliance with a software licence definition. The OSI definition does not require open training data. That omission is the reason this catalogue exists.

## Central discernments

These rules resolve the cases that confuse readers and models alike.

1. **Open weights are not open source.** A weights-only release is a shared artefact with a closed recipe. Record it as such.
2. **Open weights are not democratic.** A company can train on the commons and release only the weights. That is a partial return.
3. **A permissive licence is not a requirement for reciprocity.** Apache-2.0 and MIT give value to the commons. A reciprocal licence is stronger, but permissiveness is not extraction.
4. **A conditional licence limits the gift.** Non-commercial terms, user caps, and use restrictions mean the commons cannot reuse the work freely. The tier records the limit, not a judgement on the giver.
5. **Gated is not closed.** Weights behind a click-through licence are available. Record `gated: true`. Record `closed` only when the weights are unavailable.
6. **A derivative cannot grant more reuse rights than its base.** Record the lineage. A restrictive licence on a permissive base is a real change in terms, and it must be visible.
7. **Provider conduct is separate from model openness.** A model can be open-weight while a provider trains on your prompts, and a closed model can have a zero-training provider. Track both.
8. **Silence is unknown.** A missing data statement is not evidence of open data. It is not evidence of closed data either. Record `unknown`.
9. **Popularity is context, not quality.** Downloads and likes are signals of use. They do not verify openness.
10. **A claim without a source is not a record.** Every factual field links to evidence with a retrieval date.

## Tiers

The tier is the headline result. It is computed from three components: what the release provides, what the licence permits, and how strong the evidence is.

### Component values

| Component | Values | Meaning |
| --- | --- | --- |
| `weights` | `open-weight`, `closed`, `unknown` | `open-weight` means the parameters are downloadable, including behind a gated licence. |
| `training_data` | `open`, `documented`, `closed`, `unknown` | `open` publishes a usable dataset. `documented` describes the sources and pipeline without releasing the data. |
| `training_code` | `open`, `partial`, `closed`, `unknown` | `partial` publishes inference or evaluation code only. |
| `license.class` | `reciprocal`, `permissive`, `use-restricted`, `non-commercial`, `proprietary`, `unknown` | The legal terms, not the licence name. |

### Decision order

Apply the first rule that matches.

1. `weights = closed` → **Closed**.
2. `weights = unknown` or `license.class = unknown` → **Unproven**.
3. `license.class` is `use-restricted`, `non-commercial`, or `proprietary` → **Shared**.
4. `training_data = unknown` or `training_code = unknown` → **Unproven**.
5. `training_data = open` and `training_code = open` and `license.class` is `reciprocal` or `permissive` → **Commons**.
6. `training_data` is `open` or `documented` and `training_code` is `open` or `partial` and `license.class` is `reciprocal` or `permissive` → **Reciprocal**.
7. Otherwise → **Shared**.

The rules are strict on purpose. A weights-only release with an Apache licence is **Shared** once the data is verified closed, and **Unproven** until that check is done. It is never **Reciprocal**, because the recipe stays closed. This is the most common case in the current landscape, and it is the case the catalogue must make visible.

Rule 3 is an early exit: a conditional licence caps the tier at **Shared**, so the catalogue does not need to resolve the data question before it can warn a consumer about the reuse limit. Rule 4 is the guard against guessing: an unchecked data statement cannot produce **Commons** or **Reciprocal**.

### What the tier is not

- It is not a score. Two models in the same tier can differ in capability, size, and licence.
- It is not a moral ranking. A `Shared` model can be a large gift to the commons.
- It is not permanent. New evidence or a licence change can move a record. The journal records the move.

### Provider conduct

Provider conduct uses the `agent-detect` vocabulary so the two projects can exchange data:

- `closed_training`: `enforced`, `opt-in`, `opt-out`, `never`, `NOASSERTION`, or unset.
- `open_training`: the same values.

`NOASSERTION` means the source was checked and the answer is inconclusive. An unset value means the question was not checked. This distinction is load-bearing: it stops an unchecked provider from looking like a safe one.

## Tags and overlay reports

The catalogue classifies with tags, not fixed categories. A model can carry several jobs, modalities, runtimes, and languages at once. Tags are additive, so a new dimension never forces a schema change or a re-categorisation of old records.

### Tag namespaces

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

A tag is a string `namespace:value`. The vocabulary lives in `data/tags.json` and each tag has a definition. A tag without a definition is a proposal, not a classification.

### The Desert Ant pattern

Desert Ant names each model for the job it does: Align for word timestamps, Clear for speech enhancement, Clips for clip selection, Gist for topic tagging, Redact for PII redaction. The site groups by medium and availability, not by a rigid taxonomy.

The catalogue follows that pattern with tags:

- `desert-ant-labs/align` → `task:word-timestamps`, `modality:audio`, `runtime:on-device`, `status:available`.
- `desert-ant-labs/gist` → `task:topic-tagging`, `modality:text`, `language:multilingual`, `runtime:browser`, `license:source-available`.

The model keeps its own name. The tags make it findable across jobs and constraints. A model can gain a tag without a rename, and a tag can be retired without touching the model.

### When tags are assigned

The fetch stage records only source-native metadata and source-native tags. It does not assign `task:` or `context:` tags. Tagging is a separate pass that runs after a pull, reads the raw data, and proposes tags with evidence.

This order matters. A tag assigned before the data is complete becomes a bias in the next pull. A tag assigned after the pull can be reviewed against the full set.

The tagging pass is human-gated. It may be assisted by an agent, but a person accepts the vocabulary and the evidence. Tag changes are journaled.

### The tagging pass

The first pass is rules-first:

1. Source-native tags: the Hugging Face pipeline, licence, library, and base-model tags; the repository; the source.
2. Specific title and text phrases, with token boundaries. A generic word such as “code” or “image” is not enough on its own.
3. A Clef confirmation only for models the rules mark `needs_review`.

Clef is a decision model, not a writer. It answers one independent yes/no question per task and returns a probability. The pass accepts a task at 0.8 or above. It caches every response under `data/raw/clef/`.

Gist was evaluated and not used for task tags. Its 36 topics describe a subject such as technology or finance, not the job a model performs. It may be useful later for a `domain:` hint, but it cannot label a task.

The first pass covered 664 Hugging Face models. The rules gave 603 a task tag. Clef accepted 17 of the 78 review models at the 0.8 threshold. 61 models remain in review. The Clef input cost about USD 0.08.

A model in review is not guessed. It stays visible with its licence, runtime, family, and org tags, and it reads `unmeasured` for the task.

### Derivatives and builds

A build is not a new model. A GGUF, MLX, CoreML, ONNX, fp8, or 2-bit release is a packaging of a base model. It inherits the base model's task and terms. It does not get a separate model page.

A model page is created only when:

- it is a root release;
- it changes the capability or the licence enough to stand alone; or
- it has its own card, announcement, or benchmark that a consumer needs.

A build attaches to the base model as a `builds` entry with its runtime, quantization, size, and link. A probe (`status:probe`) is not a product release and never gets a page.

The first pull shows why this matters: 394 of 664 Hugging Face items are builds and 29 are probes. They are not 423 models. They are packaging around a smaller set of roots.

No card, no announcement, and no benchmark means no page. The catalogue is not a mirror of the Hugging Face firehose.

### Overlay reports

An evaluation is downstream. The core index is useful without it.

A report is an optional overlay for a specific use case. It references model ids, adds measured results, and states a recommendation. It can live in this repository under `reports/`, or in a downstream repository that consumes the index. The catalogue displays a report when it is present and links to it when it is hosted elsewhere.

A report records:

- the use case and its hard constraints;
- the models and the setups: provider, runtime, quantization, prompt, test set, direction;
- the measured results and the noise floor;
- the recommendation: primary, alternatives, disqualified, and caveats;
- the date and the sources.

The first report is `translation-id-en`, imported from `translation-comparison-en-id`. It does not change the core index. It adds a verdict layer on top of it.

The absence of a report is not a gap in the index. It means no one has measured that use case yet.

### Discoveries

A discovery is a dated change in the field: a release, a paper, a licence change, a benchmark result, or a policy decision. A discovery links to the entities it affects. The journal is the chronological view; a discovery page is the topical view.

## Syndication and the web of trust

Reciprocity is what a release gives back. Syndication is whether independent parties picked it up. They are different.

The catalogue records a syndication score from independent sources:

| Source | Kind | Weight |
| --- | --- | --- |
| models.dev | registry | 3 |
| agent-detect | registry | 3 |
| OpenRouter | aggregator | 2 |
| LLM Stats | evaluation | 2 |
| Artificial Analysis | evaluation | 2 |
| a research paper or code release | research | 1 |
| the model's own Hugging Face page | host | 0 |
| Arena | evaluation | 2, currently blocked |

The score is the sum, capped at 10. Bands: `self-only`, `weak`, `emerging`, `moderate`, `strong`, `very-strong`.

Rules:

- The model's own host never counts as independent.
- A build or probe inherits the base model's score. It is not scored separately.
- The score is not a quality score, a reciprocity tier, or a measure of openness.
- Every point links to the listing. A score without sources is not recorded.
- A missing source is not a negative claim. It means the source did not list the model.
- Arena is a valuable leaderboard, but its pages are behind a bot challenge and its sitemap has no per-model pages. It adds no points until a verifiable snapshot or API is available. The site links to its leaderboard as a general source.

The first pass scored 240 root and notable models. It skipped 424 builds, probes, and documentation items. The average score is 1.42. 21 models are `very-strong`, 8 are `strong`, and 183 are `self-only`.

The inclusionAI real models show why the score matters. Duo has an arXiv paper and scores 1. Ming-3.0-audio-flash, Realtime-Venus, and Ming-UniAudio have cards but little independent pickup; they score 0–1. They are real models, but they are not yet part of a wider web of trust.

## Evaluation doctrine

These rules come from the translation comparison and the Pati work. They apply to every use case.

1. **Measure directions separately.** `id→en` and `en→id` are different tasks. Do not average them into one score.
2. **Keep latency classes separate.** A hosted round trip and a local inference are not comparable.
3. **Treat the same weights at different providers as one model.** Record the provider and a parity band. Do not let serving differences look like model differences.
4. **Quantization is a separate build.** A 2-bit or fp8 build can lose quality. Record the build and do not collapse it with full precision without evidence.
5. **Record the reasoning mode.** Reasoning changes cost, latency, and output cleanliness. A run with hidden thinking tokens is not comparable to one without.
6. **Do not rank inside the noise.** A difference below the measured noise floor is not a result.
7. **Test the failure that matters.** For translation it is masked-name survival. For extraction it is schema validity. For speech it is pronunciation. For an agent it is tool-call accuracy.
8. **Record the prompt and the test set.** A benchmark without them is not reproducible.
9. **Record availability and retirement risk.** A model that is best today can disappear next month. A fallback is part of the recommendation.
10. **Keep the human in the loop for high-stakes output.** A model suggests. A person confirms. The evidence must show which is which.

## Entity model

The core catalogue has six authored entity kinds and one optional overlay:

- `model` — a set of weights and its release terms.
- `organization` — the lab, foundation, or company behind one or more entities.
- `dataset` — a training or evaluation dataset.
- `tool` — a runtime, server, harness, or interface.
- `discovery` — a dated event or finding.
- `source` — the evidence behind a claim.
- `report` — an optional overlay for a use case: measured results, a recommendation, and caveats. It is not required for the index.

A model record carries these groups:

- identity: `id`, `name`, `aliases`, `organization`, `released`;
- classification: `tags` (namespaced), `modality`;
- capabilities: `tasks`, `languages`, `tools`, `structured_output`, `context_tokens`, with evidence;
- footprint: `params_b`, `quantized_sizes`, `memory_gb`, `runtimes`;
- terms: `license`, `openness`, `conduct`, `lineage`;
- access: `hugging_face`, `github`, `paper`, `homepage`, `demo`, `api`, `gated`;
- syndication: `score`, `band`, `sources` — independent listings, never the model's own host;
- evidence: `sources`, `verified_at`, `notes`.

### Data principles

1. **One entity per file.** The filename is the id. A record is easy to diff and easy to link.
2. **Stable ids.** Ids are lowercase slugs. A rename adds an alias; it never changes an id.
3. **Tags before categories.** If a consumer needs to filter on it, it is a tag. A new dimension is a new namespace, not a schema migration.
4. **Unknown is a value.** `unknown` and `NOASSERTION` are explicit. An absent field means “not assessed”.
5. **Evidence is a link, not a sentence.** Each claim points to a source record with a URL, a retrieval date, and a content hash.
6. **Conflicts are data.** If a model card and a news article disagree, record both and mark the record `contested`.
7. **Generated data is never hand-edited.** Rollups, indexes, and API files are build artefacts.
8. **Derivation is explicit.** A quantised, distilled, merged, or fine-tuned model names its base and the relation.
9. **Concepts align with `agent-detect`.** Reuse its enums for openness, licence, and provider training. Do not invent a second vocabulary.
10. **The source of truth is the record, not the website.** The site is a view. A consumer can use the JSON without the site.
11. **A report is contextual, not global.** It names the use case, the constraints, the setup, and the date. The index has no universal ranking.
12. **Capability evidence and openness evidence are separate.** A benchmark result never raises a tier, and a licence never proves a capability.
13. **Tags are additive.** No model has one true category. A model can carry several jobs, modalities, and runtimes.
14. **Reports are overlays.** The index is complete without them. A missing report means the use case is unmeasured, not that the model is unfit.
15. **A build is not a model.** A quantized, converted, or packaged release attaches to its base model. It does not get its own page.
16. **No evidence, no page.** A card, an announcement, or a benchmark is the minimum. Silence is not an invitation to guess.

### Canonical format

The proposal recommends JSON records with a JSON Schema. The reasons:

- JSON is the consumer contract already.
- A schema gives editor completion and CI validation.
- Serialisation is deterministic, so diffs are meaningful.
- There is no second format to keep in sync.

The cost is hand-editing. A `deno task new` scaffolder and a schema-aware editor reduce it. The alternative, YAML for authoring plus generated JSON, is reconsidered in the plan.

## Evidence doctrine

1. **Never guess.** If the evidence is missing, write `unknown`.
2. **Source order:** the licence file, then the model card, then the Hugging Face metadata, then the official announcement, then reputable reporting, then a community claim.
3. **Primary beats secondary.** A model card beats a news article. A licence file beats a model card.
4. **Record the retrieval date.** A fact is only as good as the date it was checked.
5. **Record conflicts.** Do not average them or pick the convenient one.
6. **Do not mirror.** Store a short excerpt and a content hash. Link to the source.
7. **Do not infer from silence.** “No training data statement” is `unknown`, not `closed` and not `open`.
8. **Do not infer endorsement.** A follow, like, or repost is not a partnership or a verification.
9. **Re-check on events and on age.** A release, a licence change, or a new paper triggers a review. Every record is reviewed at least every 90 days.
10. **Journal every tier change.** A move between tiers is a public event. Record the old value, the new value, and the evidence.

### Fetching economics

- Every billable response is cached under `data/raw/<source>/` before it is used.
- A snapshot is immutable. A refresh adds a new dated file. It never overwrites an older snapshot.
- The cache is committed when it contains no secret. The catalogue must rebuild offline.
- A derived record cites the snapshot file. The snapshot is the evidence.
- CI never fetches a billable source. A missing cache is an error, not a silent fetch.
- The X API is the first billable source. Every read costs credits, so a refresh needs an explicit request and a documented token.
- Free sources use the same cache shape. The rule is uniform, so a source can become billable without a design change.
- The cache filename carries the endpoint and the capture date. A reader can see what was fetched and when without opening the file.

This rule exists because a catalogue that can be rebuilt only by paying again is not a commons artefact. The snapshot is part of the public record.

## Single source of truth

The repository has one source for facts and one source for narrative.

- **Facts** live in `data/`.
- **Narrative** lives in `README.md` for the public overview and in `journal/` for dated entries.
- **The generator** reads `data/` and writes the generated blocks in `README.md`, the site's JSON, and the API files.
- **The site** renders the same data. The home page renders `README.md` directly, so the public explanation cannot drift from the repository.
- **CI** runs the generator in check mode. A difference fails the build.

No generated block is edited by hand. The markers name the block:

```markdown
<!-- BEGIN GENERATED: tiers -->
...
<!-- END GENERATED: tiers -->
```

The journal is canonical Markdown, so it needs no generation. The monthly newsletter is a curated view of the journal, not a second source.

## Site design

The site must feel informative, approachable, and legible. It must not feel like an internal dashboard, and it must not feel like a children's product.

Direction:

- **Editorial, not technical.** A magazine or field guide, not a metrics console.
- **Warm pastel, not playful.** Cream paper, ink text, and muted clay, sage, ochre, sky, and plum accents. No neon, no gradients as decoration.
- **Legible first.** A 65–70 character measure, 18–20 px body text, generous line height, and strong contrast.
- **Quiet hierarchy.** Serif display headings, a humanist sans for body text, and a monospace face only for ids, JSON, and code.
- **Facts with sources.** A reciprocity ledger, a lineage chain, and a source list are the core of a model page.
- **Tags first.** A “Find a model” page filters tags and constraints. It groups results by fit when an overlay report exists; otherwise it shows the facts without a verdict.
- **Evidence over confidence.** A report shows its test set, direction, runtime, provider, and date. A missing measurement is `unproven`, not a guess.
- **No client framework.** Astro renders static HTML. Small scripts add filters and sorting. The site works without JavaScript.
- **Accessible.** Semantic landmarks, a skip link, visible focus rings, WCAG AA contrast, and respect for reduced motion.
- **Light first.** A warm dark theme is a later option, not a launch requirement.

The visual identity is defined in the site's theme tokens, not in this document. This section records the intent; the tokens carry the values.

The first deployment is live at <https://democratic-ai.bevry.workers.dev>. It is an assets-only Worker: the home page renders the README, the model pages render the records, and the API is static.

## Maintenance

### Journal, changelog, newsletter

These are three different things. Do not use the words interchangeably.

- **Journal** — dated entries about the field. Canonical Markdown in `journal/`. Append-only. This is the public record.
- **Changelog** — the repository's own release notes. Generated from Conventional Commits and published as GitHub releases.
- **Newsletter** — a monthly curated digest of the journal. It reads like a letter, not a data dump. It is published on the site and, later, sent by email.

### Automation doctrine

1. **Fetch is deterministic.** A script collects releases, metadata, and licence tags. It writes snapshots and a change list.
2. **Synthesis is assisted.** A permitted agent proposes records and prose. It cites source ids for every claim.
3. **Publication is human-gated.** The agent opens a pull request. A person reviews the evidence and merges. Deployment happens on merge.
4. **The policy gate runs first.** The CI agent must pass `agent-detect check-reciprocal` for its own harness, provider, and model before it does any work.
5. **A missing credential never blocks the build.** The X list and the Hugging Face follows are enrichment sources. The catalogue builds without them.
6. **Every automated change is attributable.** The pull request states the sources, the model that drafted it, and the checks that ran.

### Cadence

- Weekly: fetch, assess, journal draft, pull request.
- Monthly: newsletter draft, source re-checks for records older than 90 days.
- On demand: a release, a licence change, or a correction.

## Consumers

The catalogue serves three consumer classes.

1. **A project selecting a model for a constraint.** For example, `tts-comparison` needs free, offline, Apple-Silicon speech models with clean licences.
2. **A live product selecting an engine for a job.** For example, `pati-website` needs Indonesian translation that preserves names inside a five-minute cron budget, and `translation-comparison-en-id` measures the candidates.
3. **A staff tool selecting an inference model.** For example, `pati-reports` needs an Indonesian report generator that cites teacher notes and does not invent evidence.
4. **An agent that must state its own reciprocity.** For example, `agent-detect` needs the licence, openness, and provider-training facts for its model rules.
5. **A person or a journalistic enquiry.** For example, “which labs train on the commons and release only weights?”

The machine contract is the versioned JSON API. The human contract is the site and the README. The two must agree, and CI enforces the agreement.

## Proposed decisions log

These entries record the design proposed in the current plan. Rename this section to “Decisions log” when the owner accepts them.

- **2026-11-14** — The defining test is reciprocity with the commons, not OSI compliance. Open weights are necessary but not sufficient; training-data openness is the distinguishing axis.
- **2026-11-14** — Tiers are computed from component values. Classification is tag-based. The two are separate.
- **2026-11-14** — Provider conduct is tracked separately from model openness, using the `agent-detect` vocabulary.
- **2026-11-14** — Facts have one source in `data/`. README generated blocks, the site, and the API are generated from it and checked in CI.
- **2026-11-14** — The site is an Astro static build on Cloudflare Workers. It is editorial and warm, not a technical dashboard.
- **2026-11-14** — Automation fetches and drafts; a person reviews and merges. A reciprocal agent gate runs before any agent work.
- **2026-11-14** — Tags are the classification mechanism. A use case is a tag, not a rigid category. A model can carry several jobs. The naming follows the Desert Ant pattern: name the model for the job it does.
- **2026-11-14** — Fetch before tag. The pull records source-native metadata only. Task, runtime, and context tags are assigned in a separate pass after the pull.
- **2026-11-14** — Evaluations are downstream overlays. The core index is complete without them. A report adds measured results and a recommendation for one use case.
- **2026-11-14** — Evaluation follows the lessons of `translation-comparison-en-id`: separate directions, separate latency classes, one model across providers within a parity band, quantization recorded, reasoning mode recorded, and noise floors respected.
