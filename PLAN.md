# Master plan (orchestrator owns this file)

Times are Karim's local time (UTC+3). Boston = local - 8 h.

## The problem (NASA's brief, challenge #7 "Flame in Freefall")
NASA has run about 25 microgravity combustion investigations (PSI), ~1,780 test runs. Each records conditions differently (oxygen as %, as a mole fraction, as "21; 26.5; 34"; pressure in mmHg, atm, bar), so nobody can compare them. The brief asks for an SI-powered dashboard that summarizes, ranks and interprets them for fire safety in spacecraft and Moon/Mars bases.
Sharpest point: NASA's planned Moon-base air is 8.2 psia with 33.7-40% O2 (ICES-2022-45); PSI has no partial-gravity tests; NASA's own lunar-g margins say some materials burn at up to 2.3 points less O2 in lunar gravity (ICES-2025-392).

## Goals (Karim's picks; at most 3)
| # | True when we submit | Test that proves it (no Karim needed) | Approach |
|---|---|---|---|
| 1 | **Compare all experiments**: every PSI fire investigation in one unit-clean table with summaries and linked papers; every number links to its PSI row | `pipeline` tests: no O2 outside 0-100%, pressure in kPa, every test row has `source.file`+`source.row`; schema validation of `experiments.json` and `tests.json`; `web` test: table renders N rows from golden data | Partly existing: PSI data + our normalization |
| 2 | **Moon evidence chart**: O2 vs pressure plot of where NASA tested, the Moon-base box, nearest real tests and outcomes, lunar-g margins, a labelled no-partial-gravity-data band | `web` unit tests for `nearestTests()` and the chart spec (Moon box at 56.5 kPa / 33.7-40%); every plotted point has a source | Invented: the combination |
| 3 | **One-incident opening**: one real fire (enriched oxygen) that hands off to goals 1 and 2 | `web` test: opener renders the incident from `data/curated/incidents.json` with its source link | Existing: NASA accident records |

Out of scope: prediction models, raw sensor/video data, voice, non-NASA agencies, fine-tuning.

## Lanes
| Lane | Window | Folder | Builds |
|---|---|---|---|
| W1 data | Muse | `pipeline/` | PSI snapshot -> `data/build/experiments.json`, `tests.json` (+ AI summaries via Meta key, prepared ahead) |
| W2 web | Muse | `web/` | Static site: opener, compare table, Moon chart, experiment page. Reads `data/build/` (golden samples until W1 lands) |
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
