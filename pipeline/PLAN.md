# Lane W1: data pipeline (`pipeline/`)

## Job
Turn `data/psi-snapshot/` into `data/build/experiments.json` and `data/build/tests.json` that validate against `contracts/`. Then add AI summaries prepared ahead.

## Stack
Python 3.12, uv, pytest, jsonschema. Package `ffpipe` in `pipeline/ffpipe/`. Entry: `uv run python -m ffpipe.build`.

## Tasks (in order, one PR each)
1. **tests.json**: one parser per CSV family (map in `ffpipe/sources.py`: file -> investigation, fuel_class, column map). Investigations with per-test rows: PSI-69 FLEX, PSI-68 FLEX-2, PSI-39 CFI, PSI-159 ACME CFI-G (both files), PSI-10 Flame Design (both files), PSI-107 SPICE, PSI-98/99/100 SAFFIRE, PSI-25 BASS-II, PSI-26 BASS, PSI-101 SAME-R, PSI-102 SAME. Skip blank rows. Normalize units per `contracts/README.md`.
   - Outcomes: FLEX `Test end` -> extinction/disruption/completion. CFI-G: `Self-ext or flow term` SE -> self-extinguished, FT -> flow-terminated; **`Hot ignition` = No -> `unknown`** (the column mixes igniter failures and cool flames; never `no-ignition` unless the Comments text says no ignition). SAFFIRE with a burn time -> burned. Otherwise unknown.
   - Bad cells ("3400%", "2100%") -> null with `o2_note` quoting the raw cell.
2. **experiments.json**: from `psi<N>.json` + `pubs.json` + `survey.json`; ranges computed from tests.json; `family` from the table in the planning notes (SAFFIRE=large-scale solids; BASS/BASS-II=solids in flow duct; SPICE/SLICE/ACME=gas jets; FLEX/FLEX-2/CFI=droplets; SAME/SAME-R=smoke detection; PSI-117/62/60/142/115=ground/modeling). Exclude PSI-181 (solder) and non-combustion items.
3. **AI summaries (prepared ahead)**: `ffpipe/summarize.py` calls Meta `muse-spark-1.3` at `https://api.meta.ai/v1/chat/completions` with `META_API_KEY` from the repo-root `.env`. Output: 2-3 plain sentences for a student or engineer + 1-3 quotes copied from the objective/approach/description + tags from the schema enum. Cache in `data/build/summaries.json`; never call the API in tests (use a fake).

## Done = tests (`cd pipeline && uv run pytest`)
- Both outputs validate against the schemas.
- The three rows in `contracts/golden/tests.json` come out exactly as written there.
- No `o2_pct` outside 0-100; no `pressure_kpa` outside 0-400; every test row has `source.file` that exists and `source.row` within that file.
- Row counts per investigation match the non-blank CSV rows (FLEX 274, CFI-G normal 179).
- Every summary quote is a verbatim substring of that investigation's PSI text; every summary has `model` and `made_at`.

## Doubts -> GitHub issue with label `lane:orchestrator`.
