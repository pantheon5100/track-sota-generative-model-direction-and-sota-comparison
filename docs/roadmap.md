# Roadmap

## Goal

Build a GitHub-based research tracker for flow-matching and diffusion-family generative models. The tracker should answer two questions:

1. What important papers appeared recently?
2. Did any of them change the ImageNet 256x256 generation leaderboard?

## Phase 0: Initial Assets

Status: started.

Deliverables:

- `key-word-list.md`: query terms, benchmark anchors, and exclusion hints.
- `prompts/daily-update-agent.md`: master prompt for daily search, classification, extraction, leaderboard updates, and progress reporting.
- `prompts/classify-paper-from-abstract.md`: abstract-level triage prompt.
- `prompts/extract-paper-information.md`: full-paper extraction prompt.
- `data/imagenet-256-leaderboard.csv`: seed leaderboard from the RAE-DiT paper.

Rules:

- Use the RAE-DiT paper as the pre-2026 benchmark seed.
- Automated discovery starts from papers submitted on or after 2026-01-01.
- Keep DiT-XL and SiT-XL results as separate comparable records.

## Phase 1: arXiv Discovery

Use `prompts/daily-update-agent.md` as the orchestration prompt for the full daily workflow.

Inputs:

- keyword groups from `key-word-list.md`
- date lower bound: `2026-01-01`
- arXiv categories: primarily `cs.CV`, `cs.LG`, `stat.ML`

Outputs:

- raw arXiv paper metadata
- deduplicated paper list by arXiv ID
- abstract text for classification

Important implementation details:

- Query broad enough to catch new names such as MeanFlow or velocity matching.
- Do not filter out application papers before LLM classification.
- Store query string and retrieval date for reproducibility.

## Phase 2: Abstract Classification

Use `prompts/classify-paper-from-abstract.md`.

Outputs:

- relevance label
- primary category
- tags
- short TL;DR
- whether full-paper extraction is needed
- whether ImageNet 256x256 evidence is visible from the abstract

Promotion rule:

- Extract the full paper when relevance is high or medium.
- Extract the full paper when leaderboard relevance is yes or unknown.

## Phase 3: Full-Paper Extraction

Use `prompts/extract-paper-information.md`.

Outputs:

- structured paper metadata
- contribution summary
- leaderboard candidate rows
- protocol warnings
- open questions

Extraction priorities:

- ImageNet 256x256 class-conditional generation
- FID/gFID/FID-50k
- guidance setting
- NFE or sampling steps
- training type: from scratch, distillation, sampler-only, finetune
- DiT-XL and SiT-XL rows when both are reported

## Phase 4: Leaderboard Update

Inputs:

- existing `data/imagenet-256-leaderboard.csv`
- extracted leaderboard candidates

Validation checks:

- dataset is ImageNet or ImageNet-1k
- resolution is 256x256
- metric is FID-like
- condition setting is explicit or marked unknown
- model family and backbone size are preserved
- source table/section is recorded

Recommended views:

- all ImageNet 256x256 rows
- unconditional only
- conditional only
- from-scratch only
- distillation only
- sampler-only only
- one-step/few-step only
- DiT-XL and SiT-XL comparison

## Phase 5: Progress Report

Generate a periodic Markdown report:

- important new papers
- categorized papers with TL;DR
- new leaderboard rows
- leaderboard changes since last report
- unresolved extraction issues
- papers to watch because they are relevant but lack ImageNet 256x256 results
