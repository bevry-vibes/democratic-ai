# Democratic AI

AI learns from the commons: books, code, images, speech, and the work of everyone who came before. Democratic AI returns that value. It publishes its weights, documents or releases its training data, uses a licence that lets others build, and does not train on private prompts without consent.

This repository tracks democratic AI models and discoveries. It helps you answer one question: **which AI is democratic enough for this context?**

> **Status:** the first catalogue is live. The site and the JSON API are available. Records are added after a source check, and builds attach to their base model.

## What this repository gives you

- A catalogue of models, organised by reciprocity tier and by tags.
- Tag pages for jobs, modalities, runtimes, languages, and contexts.
- Optional reports for specific jobs, with measured comparisons and a recommendation.
- Side-by-side model comparisons on a shareable page.
- A record of datasets, runtimes, evaluations, and tools that keep AI accountable.
- A JSON API and an RSS feed for your own projects.

## Start with the job

Models are tagged, not boxed into one category. A model can carry several jobs, modalities, and runtimes at once. Start with what you need to do.

- **Translate Indonesian and English** without losing names, terms, or formatting.
- **Transcribe a recording** offline, with timestamps, on a laptop.
- **Render speech on a device** for a local-first learning app.
- **Tag content in the browser** in Indonesian and English, without a server call.
- **Generate a report from notes** with a source link for every claim.
- **Write code with an agent** that calls tools reliably.

The tags record the constraints that matter: language, direction, runtime, memory, licence, cost, latency, privacy, and offline operation.

When someone has measured a job, an optional report adds a verdict. The report is an overlay on the index; it does not change the model record.

- **Recommended** — the evidence supports this model for the stated constraints.
- **Viable** — it works, with trade-offs.
- **Disqualified** — it does not fit, and the reason is recorded.
- **Unmeasured** — no report covers this job yet. The facts are still here.

The **Models** view filters tags and constraints. It shows a verdict only when a report exists.

## Syndication

A model page also shows a **syndication score**. It counts the independent registries and aggregators that list the model: models.dev, agent-detect, OpenRouter, LLM Stats, and Artificial Analysis, plus a research paper or code release.

The model's own Hugging Face page does not count. The score is not a quality score. It shows whether the model has been picked up beyond its own claims.

A build or probe inherits the base model's score. It is not scored as a separate model.

A model can release its weights and still keep its training data and recipe secret. Weights alone are not reciprocity. The catalogue records what each project gives back, and what you may do with the gift.

| Tier | What it means |
| --- | --- |
| **Commons** | Weights, training data, and training code are open. The licence permits reuse. |
| **Reciprocal** | Weights and training code are open. The training data is documented or open. The licence permits reuse. |
| **Shared** | Weights are available, but the training data is not open and the licence may restrict reuse. |
| **Closed** | The weights are not available. |
| **Unproven** | The evidence about the weights is not sufficient to make a determination. |

The tiers describe what you can reuse. They are not a judgement on the worth of a project. **Open-weight is a real contribution to the commons.** Open data and open code add to it. Most records are **shared**: the weights are open, the training data is unchecked, and the licence may add conditions. **Unproven** is reserved for records where the weights themselves are not evidenced. Each record shows the exact licence, the evidence, and the date of the last check.

## Scorecard

The catalogue carries its own current scorecard. It is not a frozen table from an earlier essay. Every value is recomputed from the evidence the record holds today:

- **Openness/Morality** — what the release gives back: weights, training data, training code, and reuse terms.
- **Performance/Intelligence** — how well the model does its job on a current primary benchmark. Coding models use agentic coding benchmarks. Speech models use average word error rate. Other models use the best current primary benchmark.
- **Citation/Research** — current research benchmarks where they exist. Citation accuracy is a separate question, and the record says when it is not measured.
- **Syndication** — independent listings, not quality.

The numbers are index scores, not percentages. They do not need to sum to 100. A missing score is not zero. A model-card figure, an aggregator figure, and a base-model match are labelled. A later update may inherit its base model's primary result when it has no comparable benchmark of its own, and the record says so.

The scorecard keeps the axes independent. A model can be open and a weak coder. A model can be a strong coder and a poor citizen. A model can cite well through a vendor interface while its open weights cannot cite at all.

The homepage uses an overall score: a weighted mean of the available axes, with syndication at 15%, performance at 40%, openness at 30%, and research at 15%. Missing axes are excluded, not treated as zero. Each card shows its coverage, so a sparse score is not mistaken for a complete one.

Tag pages sort by performance, openness, research, syndication, release date, or name. The button beside the sort control reverses the order. Missing scores always sort last.

When a release is the same model under a new name, or a later update of the same lineage, the older page folds into the canonical page. The old URL redirects, and the canonical page keeps the release history. The model is not listed twice.

The full argument is in [the thesis](https://democratic-ai.bevry.workers.dev/thesis/) and the method is in [the method page](https://democratic-ai.bevry.workers.dev/about/).

## Browse by tags

Tags let a model belong to several jobs at once.

- **Runs on your device** — small models, quantised builds, and local runtimes for phones, laptops, and single-board computers.
- **Speaks your language** — sovereign and multilingual models, with a focus on Indonesian and low-resource languages.
- **Works with speech** — open text-to-speech and speech-to-text models for local apps.
- **Writes code and drives agents** — tool-calling models that fit consumer hardware.
- **Builds on the commons** — datasets, evaluations, and runtimes that make openness auditable.

Each model record lists its tags, licence, lineage, and hardware needs. You can filter by tier, task, modality, runtime, language, licence class, and device. A model page also links to its models.dev entry and its agent-detect entry when one exists.

## Use the data

The catalogue publishes as JSON, with a stable schema and a versioned API.

```text
GET /api/v1/index.json
GET /api/v1/models/<id>.json
GET /api/v1/tags.json
GET /api/v1/syndication.json
GET /api/v1/links.json
GET /api/v1/meta.json
```

Every record links to its sources and the date of the last check. The data is free to use under the repository licence.

## How we judge

1. We start from the licence and the model card.
2. We record a claim as verified only when a primary source states it.
3. We record silence as unknown, never as open.
4. We show conflicts between sources.
5. We re-check a record when a release or licence changes, and at least every 90 days.

The full method is in [DESIGN.md](./DESIGN.md).

## Contribute a correction

Open an issue with a source. A correction with evidence is always welcome. If a model is missing, send its model card, its licence, and any statement about its training data.

<!-- LICENSE/ -->

## License

Unless stated otherwise all works are:

- Copyright &copy; [Benjamin Lupton](https://balupton.com)

and licensed under:

- [Reciprocal Public License 1.5](http://spdx.org/licenses/RPL-1.5.html)

<!-- /LICENSE -->
