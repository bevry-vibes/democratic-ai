---
title: "Catalogue refresh: Nex-N2.6, Recursive Flint, and LongCat-Video-Avatar-1.6"
date: 2026-11-17
kind: catalogue
order: 2
summary: "Three open-weight releases enter the catalogue: Nex-N2.6, Recursive Flint, and LongCat-Video-Avatar-1.6."
---

The 17 November index adds three open-weight releases.

- **[Nex-N2.6](/models/nex-n2-6/)** is Nex AGI's image-text-to-text model. The weights are Apache-2.0. The record carries `task:image-understanding`, `domain:multimodal`, and `domain:vision`.
- **[Recursive Flint](/models/flint/)** is Recursive's coding MoE with 39.8 billion total parameters and about 2.5 billion active per token. The weights are Apache-2.0. The `unsloth/flint-GGUF` build attaches to the base record.
- **[LongCat-Video-Avatar-1.6](/models/longcat-video-avatar-1-6/)** is Meituan LongCat's video avatar release. The weights are MIT.

Each record links to its Hugging Face source, licence, and lineage. A build is not a model; it attaches to its base record.

The index also refreshes every record against the 17 November Hugging Face pull. Provider links and summaries are current as of that pull.

**Edge0 builds.** Edge0's 120B and 145B Q3_K and NVFP4 releases are quantized builds of Qwen3.8-Flash-Next. They were previously unmatched because their repository names do not contain the base model name. The build matcher now follows the declared `base_model` tag, so all four attach to the [Qwen3.8-Flash-Next record](/models/qwen3-8-flash-next/). Edge0's Apache-2.0 Audio8 TTS and ASR models were already in the catalogue.
