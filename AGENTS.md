# AGENTS.md

This project conforms to Bevry's skills.
Reference their remote URLs only — do not pull their contents into this file.
When a referenced skill applies with this project's tweaks, the local `<name>.md` file at this repo root references the remote URL and lists the tweaks underneath;
this process is documented in the upstream repo's [local tweaks pattern](https://github.com/bevry-vibes/skills#local-tweaks-pattern).

- https://github.com/bevry-vibes/skills/blob/main/policy.md — **applies.** Reciprocal agents only. The CI research agent must pass `agent-detect check-reciprocal` before it runs.
- https://github.com/bevry-vibes/skills/blob/main/secrets.md — **applies.** Secrets come only from their documented locations; never probe for them, print them, or commit them.
- https://github.com/bevry-vibes/skills/blob/main/author.md — **applies.** System git identity for author and committer; the co-author trailer comes from `agent-detect trailer co-author`; agent commits are never signed.
- https://github.com/bevry-vibes/skills/blob/main/commits.md — **applies.** Conventional Commits, one logical change per commit, 50-character target.
- https://github.com/bevry-vibes/skills/blob/main/plans.md — **applies when a plan is warranted.** Plans live in `.plans/` with a provenance companion.
- https://github.com/bevry-vibes/skills/blob/main/license.md — **applied at scaffold time.** RPL-1.5; `LICENSE.md` and the README licence segment come from bevry/base.
- https://github.com/bevry-vibes/skills/blob/main/conventions.md — **applied at scaffold time.** bevry/base configuration files; ASD-STE100 prose; International English; no width-driven wrapping.
- [cloudflare.md](./cloudflare.md) — **applies**, with this project's tweaks (Astro static build, Workers static assets, the `democratic-ai` Worker).
- https://github.com/bevry-vibes/skills/blob/main/build.md — **not applied:** this is a web catalogue, not a desktop tray app.
- https://github.com/bevry-vibes/skills/blob/main/emdash.md — **not applied:** no CMS. The journal and data live in git.
- https://github.com/bevry-vibes/skills/blob/main/python.md — **not applied at scaffold time.** Apply if a Python fetcher is added.
- https://github.com/bevry-vibes/skills/blob/main/powershell.md — **not applied:** macOS and Linux automation only.
- https://github.com/bevry-vibes/skills/blob/main/zig.md — **not applied:** no Zig code in this repository.
- https://github.com/bevry-vibes/skills/blob/main/zcode.md — **applies when the running agent is ZCode.**
- https://github.com/bevry-vibes/skills/blob/main/minimax.md — **applies when the running agent is a MiniMax model.**

## Project notes for agents

- `README.md` is for end users and data consumers. Do not put maintainer runbooks, build steps, schema details, or CI notes in it. Those belong in `DESIGN.md` or `CONTRIBUTING.md`.
- `DESIGN.md` records the enduring discernments. Read it before changing the tier rules, the schema, the categories, or the site design.
- The catalogue is evidence-first. Never guess a licence, a training-data claim, or a lineage. Use `unknown` when the evidence is missing, and record the source.
- Fetch before tag. The fetch pipeline records source-native metadata only. Do not assign `task:`, `runtime:`, or `context:` tags during a pull. Tagging is a separate, human-gated pass after the pull.
- Evaluations are optional overlay reports, not core records. The index builds without them. Keep a report scoped to one use case and one date.
- Classification is tag-based. Do not create rigid categories. Add a tag value only with a definition in `data/tags.json`.
- The tagging pass is rules-first. Clef is a confirmation gate for models the rules mark `needs_review`; accept a task only at 0.8 or above, and cache every response. Gist's 36 topics describe subject matter, not the job a model performs, so do not use them as task tags.
- A build is not a model. A GGUF, MLX, CoreML, ONNX, or quantized release attaches to its base model as a build entry. Do not give it a separate model page.
- No card, no announcement, and no benchmark means no page. Do not mirror the Hugging Face firehose.
- Syndication is a count of independent listings, not quality. Never count the model's own host, and never score a build or probe separately; it inherits the base model's score.
- The release tier is not a grade. Open-weight is a real return. The scorecard axes are independent; a missing score is not zero; mark family matches as family matches.
- The X list and the Hugging Face following list need credentials. Treat them as optional sources. A missing credential must never block the deterministic build.
- The X API is metered. Cache every response under `data/raw/` and never refetch a same-day snapshot without an explicit refresh.
- `agent-detect` is the source of truth for harness, provider, model, and provider-training rules. This repository complements it with training-data openness, lineage, and reuse terms; it does not fork those rules.
- `tts-comparison` is a consumer and a seed source for speech models. Do not re-research a model that its `FINDINGS.md` already verifies.
