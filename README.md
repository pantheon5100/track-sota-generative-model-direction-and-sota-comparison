# FlowBoard — Flow/Diffusion ImageNet Generation Tracker

A research tracker and interactive leaderboard for flow-matching and diffusion-family generative models, focused on class-conditional ImageNet 256x256 generation.

## What This Does

FlowBoard answers two questions for researchers working on image generation:

1. **What important papers appeared recently?** — An agent-driven pipeline searches arXiv daily, classifies papers by relevance, and extracts benchmark results.
2. **Did any of them change the ImageNet-256 leaderboard?** — FID, IS, precision, and recall are tracked across methods, backbones, and guidance settings in a sortable, filterable dashboard.

## Live Dashboard

The dashboard is a zero-build static site served via GitHub Pages. It reads `data/imagenet-256-leaderboard.csv` directly and renders:

- An FID timeline chart with milestone markers and zoom controls.
- A filterable leaderboard table with column sorting and URL-persistent state.
- Summary statistics (unique methods, best FID unconditional/conditional, date range).
- Click any timeline point to scroll to and highlight the matching table row.
- Method names link directly to their arXiv papers.
- Dark mode follows system preference automatically.

## Repository Structure

| Path | Purpose |
|---|---|
| `index.html` | Static dashboard (GitHub Pages entry point) |
| `assets/app.js` | Dashboard logic: CSV parsing, filtering, sorting, timeline, URL state |
| `assets/styles.css` | Styles with light/dark mode and responsive breakpoints |
| `data/imagenet-256-leaderboard.csv` | Leaderboard data (seed + discovered rows) |
| `key-word-list.md` | Search terms, benchmark anchors, query templates |
| `prompts/daily-update-agent.md` | Master prompt for the daily arXiv discovery agent |
| `prompts/classify-paper-from-abstract.md` | Abstract-level paper triage prompt |
| `prompts/extract-paper-information.md` | Full-paper structured extraction prompt |
| `docs/roadmap.md` | Phased task breakdown |
| `docs/seed-source-map.md` | Original-paper mapping for seed leaderboard methods |

## Data Policy

- Pre-2026 benchmark data is seeded from the RAE-DiT paper and its ImageNet 256x256 comparison table.
- Automated arXiv discovery searches papers submitted on or after 2026-01-01.
- DiT-XL and SiT-XL results are preserved as separate records when both are reported.

## Agent Pipeline

The tracker is designed around an LLM agent workflow:

1. **Discovery** — Search arXiv using keyword groups from `key-word-list.md`.
2. **Classification** — Triage each paper's abstract for scope relevance and leaderboard potential.
3. **Extraction** — Pull structured benchmark rows from promoted papers.
4. **Leaderboard update** — Append validated rows to the CSV.
5. **Reporting** — Generate a daily Markdown summary of changes.

See `prompts/daily-update-agent.md` for the full orchestration prompt.

## Note: This Project Is Entirely Agent-Created

Every file in this repository — the dashboard, the CSS, the JavaScript, the prompts, the data pipeline design, and this README — was authored by AI agents (Claude and Codex). No hand-written code. The project serves as both a functional research tool and a demonstration of agent-driven software development.
