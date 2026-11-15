# Lane W1: data pipeline (`pipeline/`)

## Job

Turn `data/psi-snapshot/` into the JSON files in `data/build/` that validate
against `contracts/`. Then add prepared text (summaries, story library) and
audit it.

## Stack

Python 3.12, uv, pytest, jsonschema. Package `ffpipe` in `pipeline/ffpipe/`.
Entry: `uv run python -m ffpipe.build`.

## Outputs (every file in `data/build/`)

| File | What it is | Built by |
|---|---|---|
| `tests.json` | one object per test run (1883 rows) | `ffpipe/build.py` from the snapshot CSVs via `sources.py` + `parsers.py`, units per `contracts/README.md` |
| `experiments.json` | one object per investigation (22), with prepared AI summary | `experiments.py` from `psi<N>.json` + `pubs.json` + ranges from `tests.json` + `summaries.json` |
| `moments.json` | one computed fact per entry (49), never typed by hand | `moments.py` from `tests.json` |
| `psi-text.json` | the only text AI quotes may come from | `experiments.build_psi_text` from the snapshot |
| `library.json` | 19 story-library entries (schema `library.schema.json`) | `library.py` from `library_drafts.json` + `tests.json` + `moments.json` |
| `coverage.json` | total / plotted / per-family / per-reason counts | `coverage_json.py` from `tests.json` |
| `search.json` | analyst index: investigations, fuels, families | `search.py` from `experiments.json` + `tests.json` |

`contracts/COVERAGE.md`'s table is rewritten by the same build (`coverage.py`).
Investigations with per-test rows: PSI-69 FLEX, PSI-68 FLEX-2, PSI-39 CFI,
PSI-159 CFI-G (both files), PSI-10 Flame Design (both files), PSI-107 SPICE,
PSI-98/99/100 SAFFIRE, PSI-25 BASS-II, PSI-26 BASS, PSI-101 SAME-R, PSI-102
SAME. The rest are unmapped (see `contracts/COVERAGE.md`).

## How to rebuild

```bash
cd pipeline
uv run python -m ffpipe.build
```

The build reads `pipeline/library_drafts.json` (committed). New story text
needs a draft run first (Meta API, one request per story):

```bash
uv run python -m ffpipe.library --draft
```

Translations live outside the build: `python scripts/translate.py es hi`
from the repo root (Meta API, `META_API_KEY` from the environment).

## What the API was used for

- **Story library drafts** (B1): 19 requests to
  `https://api.meta.ai/v1/chat/completions`, model
  `muse-spark-1.3-contributor`, `max_tokens` 8000 (4000 cuts answers off
  mid-reasoning), prompt holding only that story's PSI text, title and voice.
  Every answer is validated in code (verbatim quote, no digits, under 320
  characters) with two retries, then committed in
  `pipeline/library_drafts.json`. Tests never use the network.
- **Translations** (B6): `scripts/translate.py`, same model, UI chrome plus
  story titles/questions only.
- **Investigation summaries** (T12, earlier session): written by a Claude
  model from the PSI text, no API call; cached in `pipeline/summaries.json`.

## Done = tests (`cd pipeline && uv run pytest`)

- All outputs validate against the schemas; committed files equal a fresh build.
- Golden rows, row counts, ranges, quote-verbatim and `made_at`-to-the-second checks.
- The audit tests re-derive signatures, coverage, search counts, story numbers
  and source URLs from the inputs.

## Not done

- `--draft` must be re-run (and committed) whenever PSI text or the
  STORY-LIBRARY table changes; the normal build fails loudly without the file.
- Story signatures follow the B1 data rule, which differs from the
  STORY-LIBRARY table for FLEX-2, SPICE, SAME and the five unmapped flight
  studies (recorded in `docs/NIGHT-QUEUE-BACKEND.md`, B1).
- Translations cover `es` and `hi` only; re-run `translate.py` whenever
  `en.json` gains keys.
