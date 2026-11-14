# Lane W2: web (`web/`)

## Job
A static site (no server) that reads `data/build/*.json` and `data/curated/*.json`. Until W1 lands, use `contracts/golden/`. Data path is one constant in `web/src/data.ts`.

## Stack
Vite + TypeScript, Observable Plot (`@observablehq/plot`) for charts, vitest. No UI framework. `npm run build` -> `web/dist/`. A `predev`/`prebuild` script copies `../data/build`, `../data/curated` (and golden fallback) into `web/public/data/`.

## Screens (order = build order; layout follows the wireframe Karim picks in `docs/wireframes/`)
1. **Opener** (goal 3): first incident from `incidents.json`, its oxygen line, the pattern quote, source links; one button into the data.
2. **Compare** (goal 1): table of investigations (family, O2 range, pressure range, tests, outcomes yes/no, papers count). Filter by family; "rank for" selector = crew environment from `moon.json` atmospheres; rank by distance of tested conditions to that environment, criteria shown next to the ranking. Click -> experiment page.
3. **Moon chart** (goal 2): scatter O2 % (y) vs pressure kPa (x) of every test with both values, colour by family; Moon box(es) from `moon.json`; Saffire VI paper points marked "paper, not PSI"; a labelled band "no partial-gravity data"; lunar margin table; list of the 10 nearest real tests to the selected atmosphere with outcome and source link.
4. **Experiment page**: objective (verbatim), AI summary with an "AI summary" tag and its quotes, tags, test table, papers with DOI links, PSI link.

## Done = tests (`cd web && npm test && npm run build`)
- `nearestTests(tests, atmosphere, n)` returns rows sorted by normalized distance; rows with null O2 or pressure are excluded (unit test on golden data).
- `rankExperiments()` is deterministic and returns the criteria it used.
- Every rendered number has a source link (test on the experiment page and the nearest-tests list).
- Moon box drawn at 56.5 kPa, 33.7-40 % (test the chart spec, not pixels).
- Build succeeds with only golden data present.

## Doubts -> GitHub issue with label `lane:orchestrator`.
