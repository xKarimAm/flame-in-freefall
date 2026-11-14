# Contracts (orchestrator-owned, read-only for lanes)

Files W1 writes to `data/build/` and W2 reads. Units are fixed: **O2 in percent (0-100), pressure in kPa, flow in cm/s, time in s.**
- `experiments.schema.json` -> `data/build/experiments.json` (one object per investigation)
- `tests.schema.json` -> `data/build/tests.json` (one object per test run)
- `curated.schema.json` -> `data/curated/moon.json`, `data/curated/incidents.json` (orchestrator, hand-checked against sources)
- `golden/` -> real rows (not made up) in the final shape; W2 builds against these until W1 lands.

- `psi-text.schema.json` -> `data/build/psi-text.json` (the only text AI-summary quotes may come from)
- `story.schema.json` -> `stories/*.json`
- `library.schema.json` -> `data/build/library.json` (the story library, T11: AI-drafted text from the PSI text, no digits in the text, numbers only through moments)
- `moments.schema.json` -> `data/build/moments.json` (facts computed from `tests.json` for the story library, T11; story text fills them in by id and never holds a typed number)

**Test ids are unique** (decided 2026-11-15, build session). `id` = `<investigation>#<row>`, where `row` is `source.row`. When one investigation has several CSV files (PSI-10, PSI-159), the file with the lowest `k` in `csv_<N>_<k>.csv` keeps that form and every other file uses `<investigation>#<k>-<row>`, e.g. `PSI-159#51-1` for row 1 of `csv_159_51.csv`. The golden ids are unchanged.

**Notes on unparsed cells:** `o2_note`, `pressure_note` and `flow_note` hold the raw cell text when a value could not be parsed. They are optional; absent means null.

**"Plotted N of M":** M = every row in `tests.json`. N = rows with `gravity == "micro-g"` and both `o2_pct` and `pressure_kpa` non-null. CSV files the pipeline does not map to test rows are listed in `COVERAGE.md` with their row count and `plottable` 0, and are not part of M.

**Golden `experiments.json`:** the pipeline must reproduce every field except `summary` and `tags` (filled by task T12) and `publications` (the pipeline keeps every `pubs.json` entry for the investigation).

Conversions: 1 mmHg = 0.133322 kPa; 1 atm = 101.325 kPa; 1 bar = 100 kPa; 1 psi = 6.894757 kPa; mole fraction x -> percent 100x.
Ranges like "21.5 - 21.7" -> `o2_pct_min` 21.5, `o2_pct_max` 21.7, `o2_pct` = midpoint. "~ 21.5" -> 21.5 with `o2_note` "approximate". Unparseable -> null and a note.
