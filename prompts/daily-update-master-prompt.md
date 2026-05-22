# Daily Update Master Prompt

Use this prompt when launching the daily update agent for the flow-matching / diffusion-family generative model tracker.

```markdown
You are updating my GitHub tracker for flow-matching / diffusion-family generative models.

Goal: run the daily arXiv update for ImageNet-256 generation progress, classify new papers, extract leaderboard rows when justified, update local data files, and write a daily report.

First read:
- `README.md`
- `key-word-list.md`
- `docs/roadmap.md`
- `prompts/classify-paper-from-abstract.md`
- `prompts/extract-paper-information.md`
- `prompts/daily-update-agent.md`
- `data/imagenet-256-leaderboard.csv`
- latest file in `reports/daily/`

Search window:
- Determine the last covered search date from the latest daily report.
- Search from that date minus 7 days through today, so updated arXiv versions are not missed.
- Search both:
  - newly submitted papers in the window,
  - older papers with updated/revised versions in the window.
- Main automated scope starts from `2026-01-01` for newly submitted papers.
- Important pre-2026 papers must still be included when they satisfy any of:
  - updated/revised on or after `2026-01-01`,
  - accepted to a 2026 venue,
  - appears as a strong ImageNet-256 method in a newer paper's comparison table,
  - user explicitly provides the paper,
  - reports ImageNet-256 FID/gFID/FID-50k and is directly relevant to flow/diffusion/DiT/SiT/pixel/latent/RAE/VAE generation.
- Do not treat pre-2026 as seed-only. Treat it as:
  - seed baseline if copied from the RAE-DiT table,
  - manual/backfill candidate if newly discovered or revised after `2026-01-01`.
- Only add genuinely new records or changed versions.

Search source:
- Use arXiv as the primary source.
- Use `key-word-list.md` for queries.
- Search multiple groups: flow matching, rectified flow, diffusion transformer, DiT, SiT, ImageNet, ImageNet-256, FID, one-step, few-step, distillation, sampler, RAE, VAE, pixel diffusion, latent diffusion.
- If arXiv API is rate-limited, use arXiv web pages and PDFs directly.

For every candidate paper:
1. Collect metadata: arXiv id, title, authors, submitted date, updated date, categories, abstract, PDF URL, source query, retrieved date.
2. Deduplicate by arXiv id, version-stripped id, then normalized title.
3. Append/update `data/papers-index.jsonl` without destroying existing data.
4. Classify using `prompts/classify-paper-from-abstract.md`.
5. Append classification to `data/classifications.jsonl`.
6. If `submitted_date < 2026-01-01` but `updated_date >= 2026-01-01`, keep it in the pool and mark `search_window` as `updated_after_2026_backfill`.

Promotion rule:
Promote to full-paper extraction if:
- relevance is high or medium,
- or leaderboard relevance is yes/unknown,
- or the paper mentions ImageNet, ImageNet-256, FID, DiT, SiT, XL, one-step, few-step, flow matching, rectified flow, diffusion transformer, RAE, or VAE.

Full-paper extraction:
- Fetch/read the full paper PDF or HTML.
- Use `prompts/extract-paper-information.md`.
- Do not extract leaderboard rows from abstract claims alone.
- Only trust explicit table/text evidence.
- Record source table/figure/section.
- If the exact row is ambiguous, do not append it; put it under pending checks.

Leaderboard rule:
Only append to `data/imagenet-256-leaderboard.csv` when:
- dataset is ImageNet/ImageNet-1k,
- resolution is 256x256,
- metric is FID/gFID/FID-50k,
- result is conditional or clearly comparable to current ImageNet-256 reporting,
- source location is known.

Create separate rows for:
- DiT vs SiT,
- XL vs non-XL,
- conditional vs unconditional,
- different guidance settings,
- different NFE/steps,
- sampler-only vs distillation vs finetune vs from-scratch,
- VAE latent vs RAE latent vs pixel-space.

Do not duplicate rows. Check duplicate key:
`arxiv_id + method + method_variant + guidance + fid + nfe_or_steps`.

Use `unknown` for missing fields. Do not guess.

Write `reports/daily/YYYY-MM-DD.md` with:
- summary counts,
- high-relevance papers,
- leaderboard updates,
- pending checks,
- medium watch list,
- off-scope papers,
- suggested keyword/category/schema changes.

Quality gates before final response:
- Validate JSONL files parse line by line.
- Validate CSV parses and row count is correct.
- Check no blank TL;DR values in accepted leaderboard rows.
- Reload `http://localhost:8000/` and verify the table/chart reflects new rows.
- Report any important paper excluded only because of submitted-date filtering.
- Report blockers, rate limits, ambiguous papers, and policy decisions.

Final response:
Summarize:
- papers searched,
- high/medium count,
- extractions completed,
- leaderboard rows added,
- report path,
- pending manual decisions.
```
