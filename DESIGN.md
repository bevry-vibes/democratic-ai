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

## Categories and contexts

Categories are editorial. They describe what a thing is for. The tier is computed. The two axes are independent, so a `Shared` model can sit in the on-device category and a `Commons` dataset can sit in the open-data category.

### Domains

| Domain | What it covers |
| --- | --- |
| `language` | General text and reasoning models. |
| `code` | Code generation, repair, and repository agents. |
| `vision` | Image and video understanding or generation. |
| `speech` | Text-to-speech, speech-to-text, and audio models. |
| `multimodal` | Models that cross two or more modalities. |
| `embeddings` | Retrieval, clustering, and representation models. |
| `datasets` | Training and evaluation data. |
| `tooling` | Runtimes, servers, harnesses, and user interfaces. |
| `evaluation` | Benchmarks, leaderboards, audits, and red-team results. |
| `governance` | Licences, policy, and standards that change what is possible. |

### Contexts

Contexts are tags for a consumer's constraint. They do not change the tier.

`on-device`, `edge`, `multilingual`, `low-resource`, `sovereign`, `privacy`, `education`, `accessibility`, `science`, `agents`, `reproducible`.

`on-device` means the model can run on consumer hardware without a network connection. `edge` means the model targets phones, wearables, or embedded devices. A model can be both.

### Discoveries

A discovery is a dated change in the field: a release, a paper, a licence change, a benchmark result, or a policy decision. A discovery links to the entities it affects. The journal is the chronological view; a discovery page is the topical view.

## Entity model

The catalogue has six entity kinds:

- `model` — a set of weights and its release terms.
- `organization` — the lab, foundation, or company behind one or more entities.
- `dataset` — a training or evaluation dataset.
- `tool` — a runtime, server, harness, or interface.
- `evaluation` — a benchmark, leaderboard, or audit.
- `discovery` — a dated event or finding.

A model record carries these groups:

- identity: `id`, `name`, `aliases`, `organization`, `released`;
- classification: `domains`, `contexts`, `modality`, `size`;
- terms: `license`, `openness`, `conduct`, `lineage`;
- access: `hugging_face`, `github`, `paper`, `homepage`, `demo`, `api`, `gated`;
- evidence: `sources`, `verified_at`, `notes`.

### Data principles

1. **One entity per file.** The filename is the id. A record is easy to diff and easy to link.
2. **Stable ids.** Ids are lowercase slugs. A rename adds an alias; it never changes an id.
3. **Facets before prose.** If a consumer needs to filter on it, it is a field. Prose is for context.
4. **Unknown is a value.** `unknown` and `NOASSERTION` are explicit. An absent field means “not assessed”.
5. **Evidence is a link, not a sentence.** Each claim points to a source record with a URL, a retrieval date, and a content hash.
6. **Conflicts are data.** If a model card and a news article disagree, record both and mark the record `contested`.
7. **Generated data is never hand-edited.** Rollups, indexes, and API files are build artefacts.
8. **Derivation is explicit.** A quantised, distilled, merged, or fine-tuned model names its base and the relation.
9. **Concepts align with `agent-detect`.** Reuse its enums for openness, licence, and provider training. Do not invent a second vocabulary.
10. **The source of truth is the record, not the website.** The site is a view. A consumer can use the JSON without the site.

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
- **No client framework.** Astro renders static HTML. Small scripts add filters and sorting. The site works without JavaScript.
- **Accessible.** Semantic landmarks, a skip link, visible focus rings, WCAG AA contrast, and respect for reduced motion.
- **Light first.** A warm dark theme is a later option, not a launch requirement.

The visual identity is defined in the site's theme tokens, not in this document. This section records the intent; the tokens carry the values.

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
2. **An agent that must state its own reciprocity.** For example, `agent-detect` needs the licence, openness, and provider-training facts for its model rules.
3. **A person or a journalistic enquiry.** For example, “which labs train on the commons and release only weights?”

The machine contract is the versioned JSON API. The human contract is the site and the README. The two must agree, and CI enforces the agreement.

## Proposed decisions log

These entries record the design proposed in the current plan. Rename this section to “Decisions log” when the owner accepts them.

- **2026-11-14** — The defining test is reciprocity with the commons, not OSI compliance. Open weights are necessary but not sufficient; training-data openness is the distinguishing axis.
- **2026-11-14** — Tiers are computed from component values. Categories are editorial. The two axes stay separate.
- **2026-11-14** — Provider conduct is tracked separately from model openness, using the `agent-detect` vocabulary.
- **2026-11-14** — Facts have one source in `data/`. README generated blocks, the site, and the API are generated from it and checked in CI.
- **2026-11-14** — The site is an Astro static build on Cloudflare Workers. It is editorial and warm, not a technical dashboard.
- **2026-11-14** — Automation fetches and drafts; a person reviews and merges. A reciprocal agent gate runs before any agent work.
