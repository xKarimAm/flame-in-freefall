# Contracts (orchestrator-owned, read-only for lanes)

Files W1 writes to `data/build/` and W2 reads. Units are fixed: **O2 in percent (0-100), pressure in kPa, flow in cm/s, time in s.**
- `experiments.schema.json` -> `data/build/experiments.json` (one object per investigation)
- `tests.schema.json` -> `data/build/tests.json` (one object per test run)
- `curated.schema.json` -> `data/curated/moon.json`, `data/curated/incidents.json` (orchestrator, hand-checked against sources)
- `golden/` -> real rows (not made up) in the final shape; W2 builds against these until W1 lands.

Conversions: 1 mmHg = 0.133322 kPa; 1 atm = 101.325 kPa; 1 bar = 100 kPa; 1 psi = 6.894757 kPa; mole fraction x -> percent 100x.
Ranges like "21.5 - 21.7" -> `o2_pct_min` 21.5, `o2_pct_max` 21.7, `o2_pct` = midpoint. "~ 21.5" -> 21.5 with `o2_note` "approximate". Unparseable -> null and a note.
