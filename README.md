# Firebreak

NASA Space Apps Challenge 2026, challenge #7 "Flame in Freefall". Team Firebreak.

Firebreak puts NASA's microgravity fire experiments on one comparable footing. Every number links to the NASA record it came from, and the site shows where the evidence for a Moon base runs out: no fire test in NASA's PSI archive ran in Moon gravity.

It is a static site (Vite, TypeScript, SVG and three.js, no UI framework). Nothing is deployed: this repository is private and the site runs locally.

## What is in it

- **Three lenses**, chosen under "View as" in the header: Student (a short picture-book story), Astronaut (the same story as a denser briefing) and Analyst (a workspace for the data).
- **Four story chapters:** 1 Why oxygen matters, 2 What NASA has tested, 3 Build your Moon-base air, 4 What nobody knows yet. A cover page comes first and an ending card ("What you just saw") closes it.
- **Build your Moon-base air** (chapter 3, also the "Skip to Moon air" button): two sliders, air pressure and oxygen. The panel lists the 10 nearest real tests, labelled "Nearest tested conditions, not a prediction". Distance counts 5 oxygen points the same as 25 kPa of pressure (`contracts/DISTANCE.md`). The site makes no forecast for Moon gravity.
- **Experiment stories:** "See every experiment" opens a library of one story per investigation group (`data/build/library.json`), 19 stories covering all 22 investigations. Each has a computed picture of the tests, the numbers behind it (`moments.json`) and short AI-drafted text.
- **Analyst dashboard,** seven tabs: Dashboard (five headline numbers and "Ranked for this air"), Compare, Method ("How the data was made"), Evidence map, All investigations, Moon-gravity margins, Test rows. The chart says "Plotted N of M tests"; the rest are listed with the reason.
- **Languages:** English, Spanish and Hindi, picked in the header. Spanish and Hindi translate the interface and headlines (207 of the 326 English strings); the rest falls back to English key by key.
- A search box over investigations, plus data files that can be downloaded from the Method tab.

## Run it

Needs Node 22 (the CI version). The data pipeline also needs Python 3.12 or newer with uv.

```bash
cd web
npm ci
npm test
npm run build
npm run preview
```

`npm run dev` starts the development server. `npm test` runs vitest. `dev` and `build` first copy the built data into the site (`web/scripts/copy-data.js`). The result in `web/dist/` is static: any static host can serve it.

Run every check (Windows PowerShell, from anywhere): `powershell -ExecutionPolicy Bypass -File scripts\check.ps1`. It runs the pipeline tests (pytest), the web tests and the web build, and exits non-zero on any failure. CI (`.github/workflows/`) runs the same steps.

Rebuild the data from the NASA snapshot (optional, the built files are committed in `data/build/`):

```bash
cd pipeline
uv run python -m ffpipe.build
```

New story-library text needs a draft run first (Meta API, results committed in `pipeline/library_drafts.json`): `uv run python -m ffpipe.library --draft`. Spanish and Hindi strings are regenerated with `python scripts/translate.py es hi` from the repo root. Both calls read `META_API_KEY` from the environment or a git-ignored `.env` (see `.env.example`) and never print it.

## NASA data

| What | Where it comes from | Licence |
|---|---|---|
| Test tables, investigation records, publication lists (`data/psi-snapshot/`) | NASA Physical Sciences Informatics (PSI), https://psi.nasa.gov, public API snapshot pulled 2026-11-14 and kept in the repo | CC0-1.0 on 21 of the 22 investigation records; the PSI-10 record states no licence and the site shows "not stated" |
| Moon-base air, lunar-gravity margins, Saffire VI points, the gap note (`data/curated/moon.json`) | NASA technical papers on NTRS and the challenge brief; each entry carries its URL | NASA works; each entry links to its source |
| Incidents (`data/curated/incidents.json`) | NASA Safety and Mission Assurance, NASA History, NTRS; each entry carries its URL | NASA works; each entry links to its source |
| Three photographs (`data/curated/pictures.json`) | NASA Image and Video Library, credit NASA; one is cropped to remove the NASA insignia | each entry links to its page |

The site reads only the snapshot and the curated files. It never calls a NASA service while you use it. `data/SOURCES.md` has the pull notes.

The pipeline (`pipeline/`) converts units to percent oxygen and kPa, keeps the file and row of every test, and writes a value as "not recorded" (null plus the raw cell text) when a cell cannot be read. It never fills a gap with a guess. `contracts/COVERAGE.md` lists, per PSI file, how many rows have oxygen, pressure and an outcome. Only tests with both oxygen and pressure can be drawn, so the chart shows "plotted N of M" (`data/build/coverage.json`).

## How to trust it

- `contracts/` holds the data shapes (JSON Schema), the distance definition and real golden rows. The tests check the built data and the site against them.
- Each test row has `source.file`, `source.row` and `source.url`. Curated entries each carry a URL. The Method tab shows the source files, the files the pipeline skips and why, the automated checks and a data dictionary.
- No predictions, and no ranking of any investigation as safer or more dangerous: the lists show nearest tested conditions only.

## Use of AI

This project was built with AI tools, and every AI-made part is labelled.

- **Code:** written with Claude Code (Anthropic) and Muse Spark (Meta). A Claude orchestrator planned and reviewed; Claude Sonnet subagents wrote the day-lane code; Muse Spark coded the unattended night lanes. Files carry the header "Generated with Claude, SI-assisted" or "Generated with Muse Spark, SI-assisted".
- **AI summaries of the 22 investigations:** written by `claude-sonnet-5-5` from the PSI text only (`pipeline/summaries.json`). Each carries its model and time, shows as "AI summary", and comes with quotes (60 in total) that appear word for word in the PSI text. Tests check every quote.
- **Story library text:** hook, reveal and bridge lines for the 19 stories, drafted by `muse-spark-1.3-contributor` from each story's PSI text, with a verbatim quote. Tagged with model and time; they hold no digits, and numbers come only from computed moments. Drafts are in `pipeline/library_drafts.json`; tests re-validate them on every build.
- **Translations:** Spanish and Hindi drafted by `muse-spark-1.3-contributor` from `en.json`; each `.meta.json` records model and time. English is the source of truth.
- No NASA logo, Space Apps logo or mission patch is used in the site.

## What is not done

- No public deployment and no public URL.
- 119 of the 326 English strings (story text and library pages among them) have no Spanish or Hindi version yet and show in English. Arabic is not translated (`contracts/I18N.md` plans it last, with right-to-left layout).
- The site search computes its index from the loaded data instead of reading `data/build/search.json`.
- Narrow screens were checked in headless Chrome only; real-device and full keyboard walkthroughs are open.
- 897 of the 1,883 test rows are listed, not plotted, because oxygen or pressure was not recorded.

## Repository map

| Path | What it holds |
|---|---|
| `ACTIONS.md`, `HANDOVER.md`, `AGENTS.md`, `STATE.md` | read these first when you pick the work up: last action, handover, rules, open questions |
| `contracts/` | schemas, golden rows, distance, coverage and language rules |
| `data/psi-snapshot/` | the NASA PSI snapshot, unchanged |
| `data/curated/` | hand-checked facts from NASA papers and pages, each with a URL |
| `data/build/` | pipeline output: `tests`, `experiments`, `moments`, `psi-text`, `library`, `coverage`, `search`, `provenance`, `dictionary` |
| `pipeline/` | Python package `ffpipe` and its tests |
| `web/` | the site (Vite, TypeScript, SVG, three.js) |
| `stories/` | the four chapter files the scroll engine plays |
| `scripts/` | `check.ps1` (all checks), `translate.py` |
| `docs/` | story, UX brief, design, presentation (deck, demo script, 30-second video), submission text |
