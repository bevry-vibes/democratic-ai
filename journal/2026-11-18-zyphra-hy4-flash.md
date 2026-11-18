---
title: "Zyphra joins the catalogue, and Hy4 Flash lands"
date: 2026-11-18
kind: catalogue
order: 3
summary: "Zyphra's open speech and alignment models were missing from the catalogue. Tencent published the Hy4 Flash weights, and Ant Ling's Ling 3.2 Flash still has none."
---

Three things moved this week. One lab was missing from the catalogue entirely, one promise turned into downloadable weights, and one model is still hosted-only.

## Zyphra

Zyphra was not on the watchlist, so its Hugging Face account was never pulled. Its open-weight models are now in the catalogue:

- **[ZONOS3-Mini](/models/zonos3-mini/)** — an Apache-2.0 text-to-speech model with zero-shot voice cloning and word-level control. Zyphra reports time to first audio under 800 ms on a Pixel 9 and under 450 ms in a browser on an M3 MacBook Air, which is what makes a 100M-parameter TTS model usable on a phone. The `-transformers` and `-hf` repositories attach to it as builds.
- **[ZAC-1](/models/zac-1/)** — the 44.1 kHz speech codec of ZONOS3-Mini, published as its own download. Zyphra says the tensors are byte-identical to the codec inside ZONOS3-Mini. It is a codec, so it carries the embedding task rather than a generation task.
- **[FuseAlign](/models/fusealign/)** — a multilingual word-level forced aligner for 73 languages: word start and end on a 1 ms grid, with a GGUF build. It answers a different job than transcription, so it carries the `word-timestamps` task.

Zyphra also published [ZHA](https://zyphra.com/our-work/scaling-zha), a subquadratic attention method. Zyphra reports 9–60× long-context speedups at 10M tokens on converted open models up to 2.4T parameters, with reasoning and agentic quality retained. The method, the paper, and the inference service are not model releases, so they have no catalogue record.

The `-transformers` repository suffix now counts as a build, and `-hf` format conversions attach to their base model instead of opening a second page.

## Tencent Hy4 Flash

Tencent published [Hy4 Flash](https://huggingface.co/tencent/Hy4-flash) on 17 November: 220B total parameters, 64B of them Engram, with 12B active per token, a 1M-token context, and text and image input. The licence is the Tencent Hy License, not an SPDX licence. The release includes an FP8 build and a base checkpoint.

- **[Hy4 Flash](/models/hy4-flash/)** — the instruct model, with the FP8 build attached.
- **[Hy4 Flash Base](/models/hy4-flash-base/)** — the pretrained checkpoint.
- **[Hy4 Preview](/models/hy4-preview/)** — the Apache-2.0 770B / 49B preview from August, which the catalogue had also missed.

Hy4, the full 770B model, is still promised and still has no public repository under its own name, so it stays on the watchlist.

Tencent's wider Hunyuan family is not catalogued yet. Its Hy-Memory, Hy-SimulMT, HunyuanOCR, and UI-Mate releases are open-weight and hosted, but the account also holds several dozen research repositories that are not models a reader can use. Those families wait for a curatorial pass.

## Ant Ling

- **[Ling 3.2 Flash](https://www.ant-ling.com/en/)** is still hosted-only. The Hugging Face organization carries Ling 3.1 and earlier; `inclusionAI/Ling-3.2-flash` does not resolve. The record stays closed until weights exist.
- **Ming 3.0 Audio Flash** now ranks first on the Artificial Analysis speech-reasoning set that Ant Ling cites. It is already in the catalogue, so this is a benchmark result, not a new release.
- **Code World Model / Invoker-Render** gained `video-generation` and `world-model` tasks from its model card.
