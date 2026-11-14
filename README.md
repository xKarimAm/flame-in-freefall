# Firebreak

NASA Space Apps Challenge 2026, challenge #7 "Flame in Freefall". Team Firebreak.

Firebreak puts NASA's microgravity fire experiments on one comparable footing. Every number on screen links to the NASA record it came from, and the site shows where the evidence for a Moon base runs out: no fire test in NASA's PSI archive ran in Moon gravity.

The centre of the site is "Build your Moon-base air": two sliders (air pressure and oxygen) place a habitat's air among the real tests and list the nearest tested conditions. The list is labelled "not a prediction" on purpose. The site makes no forecast for Moon gravity.

## Run it

Needs Node 22 and, for the data pipeline only, Python 3.12 with [uv](https://docs.astral.sh/uv/).

```bash
cd web
npm ci
npm run build
npm run preview
```

`npm run dev` starts the development server. The built site in `web/dist/` is static: any static host can serve it.

Rebuild the data from the NASA snapshot (optional; the built files are committed in `data/build/`):

```bash
cd pipeline
uv run python -m ffpipe.build
```

Run every check (Windows PowerShell): `powershell -ExecutionPolicy Bypass -File scripts\check.ps1`. It runs the pipeline tests, the web tests and the web build.

## NASA data

| What | Where it comes from | Licence |
|---|---|---|
| Test tables, investigation records and publication lists (`data/psi-snapshot/`) | NASA Physical Sciences Informatics (PSI), https://psi.nasa.gov, public API, snapshot pulled 2026-11-14 | CC0-1.0 as stated on each PSI record (the PSI-10 record states no licence; the site shows that as "not stated") |
| Moon-base air, lunar-gravity margins, Saffire VI points, the gap note (`data/curated/moon.json`) | NASA technical papers on NTRS and the challenge brief; each entry carries its URL | NASA works; each entry links to its source |
| Incidents (`data/curated/incidents.json`) | NASA Safety and Mission Assurance, NASA History, NTRS; each entry carries its URL | NASA works; each entry links to its source |

The site reads only the snapshot and the curated files. It never calls a NASA service while you use it.

What the pipeline does with the PSI tables (`pipeline/`): it converts units to percent oxygen and kPa, keeps a pointer to the file and row of every test, and writes a value as "not recorded" (null plus the raw cell text) when a cell cannot be read. It never fills a gap with a guess. `contracts/COVERAGE.md` lists, per PSI file, how many rows have oxygen, pressure and an outcome. Only tests with both oxygen and pressure can be drawn on the chart, and the chart says "plotted N of M".

## How to trust it

- `contracts/` holds the data shapes (JSON Schema), the distance definition for "nearest tests" (`DISTANCE.md`) and real golden rows. The tests check the built data and the site against them.
- Each test row has `source.file`, `source.row` and `source.url`.
- No predictions: the nearest-tests list is a distance in pressure and oxygen between your air and real tests, with fixed weights stated on screen.

## Use of AI

This project was built with AI tools, and every AI-made part is labelled.

- **Code:** written with Claude Code (Anthropic). A Claude orchestrator planned, reviewed and merged; Claude Sonnet subagents wrote the code. Files written this way carry the header "Generated with Claude, SI-assisted".
- **AI summaries of investigations:** short plain-language summaries written by a Claude model from the PSI text only. Each summary is tagged with the model and the time it was made, shown in the site as "AI summary", and comes with quotes that appear word for word in the PSI text. A test checks every quote.
- **Translations** (if present): drafted by AI. English is the source of truth.
- No NASA logo, Space Apps logo or mission patch is used in the site.

## Repository map

| Folder | What it holds |
|---|---|
| `contracts/` | schemas, golden rows, distance and coverage rules |
| `data/psi-snapshot/` | the NASA PSI snapshot, unchanged |
| `data/curated/` | hand-checked facts from NASA papers, each with a URL |
| `data/build/` | pipeline output: `tests.json`, `experiments.json`, `psi-text.json` |
| `pipeline/` | Python package `ffpipe` and its tests |
| `web/` | the site (Vite, TypeScript, SVG; no UI framework) |
| `stories/` | the story files the scroll engine plays |
| `docs/` | story, design and planning documents |
