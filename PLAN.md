# Master plan (orchestrator owns this file)

Times are Karim's local time (UTC+3). Boston = local - 8 h.

## The problem (NASA's brief, challenge #7 "Flame in Freefall")
NASA has run about 25 microgravity combustion investigations (PSI), ~1,780 test runs. Each records conditions differently (oxygen as %, as a mole fraction, as "21; 26.5; 34"; pressure in mmHg, atm, bar), so nobody can compare them. The brief asks for an SI-powered dashboard that summarizes, ranks and interprets them for fire safety in spacecraft and Moon/Mars bases.
Sharpest point: NASA's planned Moon-base air is 8.2 psia with 33.7-40% O2 (ICES-2022-45); PSI has no partial-gravity tests; NASA's own lunar-g margins say some materials burn at up to 2.3 points less O2 in lunar gravity (ICES-2025-392).

## Goals (Karim agreed 2026-11-14 10:22 PM; details in HANDOVER.md §2, docs/STORY.md)
1. **The story**: 4 acts (act 2 = 6 family scenes covering all 22 investigations), 3 lenses each (Astronaut / Analyst / Public), every claim with a source link.
2. **Build your Moon-base air**: sliders over real PSI tests; nearest tests, failing materials, lunar margins; the lunar-gravity gap shown, never predicted.
3. **The comparison table** for analysts: every investigation unit-clean, every number traced to its PSI row.

Out of scope: fine-tuning, prediction models, raw sensor/video data, voice, non-NASA agencies.

## Lanes
| Lane | Window | Folder | Builds |
|---|---|---|---|
| W1 data | Sonnet subagent (or Muse Spark) | `pipeline/` | PSI snapshot -> `data/build/experiments.json`, `tests.json` (+ AI summaries via Meta key, prepared ahead) |
| W2 web | Sonnet subagent (or Muse Spark) | `web/` | Static story-scroll site (HTML + CSS + three.js): acts, lenses, Moon-air sliders, experiment pages. Reads `data/build/` (golden samples until W1 lands) |
| Orchestrator | Claude | `contracts/`, `data/curated/`, `PLAN.md` | Contracts, curated facts, reviews every PR |

## Checkpoints
- **Sun 1:00 AM: Checkpoint A** - site runs end to end on real data (goals 1-3 at basic level); rough 30 s video possible.
- Sun 2:30 AM: Karim sleeps; lanes continue on isolated tasks.
- Sun freeze (TBD by Karim's work hours, <= 5:30 PM); submit 6:30 PM; deadline 8:00 PM; judging 9:00 PM (5 min + 3 min Q&A).

## Cut line (drop from the bottom first)
1. Live "ask the evidence" box (only if prepared summaries are done and time remains)
2. Ranking weights UI (keep fixed, shown criteria)
3. Papers search (keep the per-experiment list)

## How to run
- Data: `cd pipeline && uv run pytest && uv run python -m ffpipe.build`
- Web: `cd web && npm install && npm test && npm run build`
