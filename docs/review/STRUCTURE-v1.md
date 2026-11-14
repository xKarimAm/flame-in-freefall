# Structure v1 (for review): Firebreak, NASA Space Apps 2026 #7 "Flame in Freefall"

Status: DRAFT, not approved by Karim. Diagram: `docs/structure.drawio` (page 1 backend, page 2 story).

## Time box
Now Sun 15 Nov ~00:40 local (UTC+3). Karim is away at work most of Sunday, steering by remote control. Feature freeze ~6:00 PM, submit by 8:00 PM, Boston judging 9:00 PM (5 min deck + 3 min Q&A). Global entry: 30 s video or 7-slide deck. The overnight build runs unattended (Fable orchestrator + Sonnet coder subagents), so the spec must be clear enough to need no human answers.

## Product
Story-scroll site over NASA PSI fire data, with three lenses (Astronaut / Analyst / Public), built with HTML + CSS + three.js (Vite + TS), as a static site. Every number links to its PSI row or NASA source. Goals: (1) the story, (2) "Build your Moon-base air" sliders, (3) the analyst comparison table.

## Backend and data flow (diagram page 1)
1. NASA sources: PSI snapshot `data/psi-snapshot/` (22 investigations, ~1,780 test rows, CSV + JSON, CC0); curated facts `data/curated/moon.json`, `incidents.json` (each with a NASA URL); investigation objectives and papers (source text for summaries).
2. Pipeline (Python, pytest): parse and normalise units (O2 %, kPa, cm/s, s; bad cells null with the raw value kept), validate against `contracts/*.schema.json` (golden rows exact, ranges, a source on every row), and write `data/build/tests.json` and `experiments.json`. Prepared AI summaries go to `summaries.json`; a test checks each quote verbatim against the source text.
3. Story content (JSON): `stories/*.json` (story → scenes → beats); a beat = stage state + text per lens + source links. i18n files: `en` now, `es` and `hi` next, `ar` last (RTL).
4. Web app: data layer (loader, `nearestTests()`, `moonBox`, `lunarMargins`), story engine (scroll position → active beat → stage state), stage (three.js evidence space x = kPa, y = O2 %, z = gravity planes micro-g / lunar / 1 g; flat SVG fallback), UI (story picker, lens and language switch, analyst table, 22 experiment pages).
5. Ship: static build → free host → public link; 30 s video, 5-min deck, submission form.
Rule: no number reaches the screen without a PSI row or NASA source link; tests guard every arrow.

## Story structure (diagram page 2)
- Home = story picker: 4 story cards (1 Why oxygen matters: Apollo 1 1967 → Mir 1997; 2 What NASA has tested: 6 family scenes; 3 Build your Moon-base air: sliders; 4 What nobody knows yet: the empty lunar-gravity plane) + Analyst table. Lens and language switch on top.
- Inside a story: pinned stage, text steps scroll past. Each scene = 5 beats: Hook (question, no data) → Reveal (data appears) → Focus (one group lit, labelled) → Compare (a reference joins: ISS air, Moon box) → Takeaway (one sentence per lens + source link → next story). A beat fires when it crosses the middle of the screen; scrolling back reverses it. The lens changes words, never data. Reduced motion: same beats, no camera moves.
- Act 2 = 6 family scenes (SAFFIRE I-III; BASS, BASS-II; ACME family, SPICE, SLICE; FLEX, FLEX-2, CFI; SAME, SAME-R; ground/modelling), each with the same 5 beats.

## Backend brief as sent to the overnight session (summary)
Scope: (1) pipeline per `pipeline/PLAN.md` with green pytest; (2) web data layer in `web/src/data/` (review/merge PR #1 scaffold; loader; `nearestTests`; Moon box; vitest); (3) prepared AI summaries with a verbatim-quote test; (4) static build + README (NASA data, licences, AI use). Workflow: Sonnet subagents on separate worktrees → PRs → Fable reviews, merges when green; `STATE.md` holds doubts and a 10-line morning summary; stuck rule = 3 failures then move on. Not yet in the brief: the story JSON contract, i18n files, story engine.

## Open question from Karim
Would a model trained on the PSI cases (e.g. a classifier of outcome from O2 / pressure / flow / fuel, or fine-tuning a model, locally or on Google Cloud / Claude) add value for NASA judges?
