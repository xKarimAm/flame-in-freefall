# Firebreak

NASA Space Apps Challenge 2026, challenge #7 "Flame in Freefall". Team Firebreak.

Firebreak puts NASA's microgravity fire experiments on one comparable footing. Every number on screen links to the NASA record it came from, and the site shows where the evidence for a Moon base runs out: no fire test in NASA's PSI archive ran in Moon gravity.

The centre of the site is "Build your Moon-base air": two sliders (air pressure and oxygen) place a habitat's air among the real tests and list the nearest tested conditions. The list is labelled "not a prediction" on purpose. The site makes no forecast for Moon gravity.

## Run it

Needs Node 22 and, for the data pipeline only, Python 3.12 with [uv](https://docs.astral.sh/uv/).

```bash
cd web
npm ci
npm test
npm run build
npm run preview
```

`npm run dev` starts the development server. `npm test` runs the web tests (vitest). The built site in `web/dist/` is static: any static host can serve it.

Spanish and Hindi UI strings are generated, not hand-written:

```bash
python scripts/translate.py es hi
```

It needs `META_API_KEY` in the environment (or a `.env` file the script reads and never prints) and writes `web/src/i18n/<locale>.json` plus `<locale>.meta.json` with the model and time. English stays the source of truth.

Rebuild the data from the NASA snapshot (optional; the built files are committed in `data/build/`):

```bash
cd pipeline
uv run python -m ffpipe.build
```

New story-library text needs a draft run first (Meta API, committed in
`pipeline/library_drafts.json`): `uv run python -m ffpipe.library --draft`.
Translations: `python scripts/translate.py es hi` from the repo root.

Run every check (Windows PowerShell): `powershell -ExecutionPolicy Bypass -File scripts\check.ps1`. It runs the pipeline tests, the web tests and the web build.

## NASA data

| What | Where it comes from | Licence |
|---|---|---|
| Test tables, investigation records and publication lists (`data/psi-snapshot/`) | NASA Physical Sciences Informatics (PSI), https://psi.nasa.gov, public API snapshot kept in the repo | CC0-1.0 as stated on each PSI record (the PSI-10 record states no licence; the site shows that as "not stated") |
| Moon-base air, lunar-gravity margins, Saffire VI points, the gap note (`data/curated/moon.json`) | NASA technical papers on NTRS and the challenge brief; each entry carries its URL | NASA works; each entry links to its source |
| Incidents (`data/curated/incidents.json`) | NASA Safety and Mission Assurance, NASA History, NTRS; each entry carries its URL | NASA works; each entry links to its source |

The site reads only the snapshot and the curated files. It never calls a NASA service while you use it.

What the pipeline does with the PSI tables (`pipeline/`): it converts units to percent oxygen and kPa, keeps a pointer to the file and row of every test, and writes a value as "not recorded" (null plus the raw cell text) when a cell cannot be read. It never fills a gap with a guess. `contracts/COVERAGE.md` lists, per PSI file, how many rows have oxygen, pressure and an outcome. Only tests with both oxygen and pressure can be drawn on the chart, and the chart says "plotted N of M" (`data/build/coverage.json` holds the counts; `search.json` holds the analyst index). The story library (`data/build/library.json`) pairs each investigation with a computed signature view and moments plus short drafted text; every number on a library page comes from a moment. Audits check that story numbers trace to sources and that AI quotes are verbatim.

## How to trust it

- `contracts/` holds the data shapes (JSON Schema), the distance definition for "nearest tests" (`DISTANCE.md`) and real golden rows. The tests check the built data and the site against them.
- Each test row has `source.file`, `source.row` and `source.url`.
- No predictions: the nearest-tests list is a distance in pressure and oxygen between your air and real tests, with fixed weights stated on screen.

## Use of AI

This project was built with AI tools, and every AI-made part is labelled.

- **Code:** written with Claude Code (Anthropic) and Muse Spark (Meta). A Claude orchestrator planned, reviewed and merged; Claude Sonnet subagents wrote the day code and Muse Spark coded the unattended night lanes. Files carry the header "Generated with Claude, SI-assisted" or "Generated with Muse Spark, SI-assisted".
- **AI summaries of investigations:** short plain-language summaries written by a Claude model from the PSI text only. Each summary is tagged with the model and the time it was made, shown in the site as "AI summary", and comes with quotes that appear word for word in the PSI text. A test checks every quote.
- **Story library text:** hook, reveal and bridge lines drafted by Muse Spark from each story's PSI text only, with a verbatim quote from the objective. Tagged with model and time, labelled "AI summary" in the UI; they hold no digits, and numbers come only from computed moments. Drafts are committed in `pipeline/library_drafts.json`; tests re-validate them on every build.
- **Translations:** the Spanish and Hindi UI chrome and headlines were drafted by Meta Muse Spark (`muse-spark-1.3-contributor`) from `en.json`. English is the source of truth and the site falls back to it key by key. Each file's `.meta.json` records the model and the time.
- No NASA logo, Space Apps logo or mission patch is used in the site.

## What is not done

- The experiment library ("See every experiment") is in, but its eight new English strings have no Spanish or Hindi translations yet (they fall back to English until the backend lane re-runs `translate.py`).
- Arabic is not translated yet (`contracts/I18N.md` plans it last, with right-to-left layout).
- The site search still computes its index from the loaded data instead of reading `data/build/search.json`.
- Narrow screens were checked in headless Chrome only; real-device and full keyboard walkthroughs are still open.

## Repository map

| Folder | What it holds |
|---|---|
| `contracts/` | schemas, golden rows, distance and coverage rules |
| `data/psi-snapshot/` | the NASA PSI snapshot, unchanged |
| `data/curated/` | hand-checked facts from NASA papers, each with a URL |
| `data/build/` | pipeline output: `tests.json`, `experiments.json`, `moments.json`, `psi-text.json`, `library.json`, `coverage.json`, `search.json` |
| `pipeline/` | Python package `ffpipe` and its tests |
| `web/` | the site (Vite, TypeScript, SVG; no UI framework) |
| `stories/` | the story files the scroll engine plays |
| `docs/` | story, design and planning documents |
