# Data sources
- `psi-snapshot/`: NASA Physical Sciences Informatics (https://psi.nasa.gov), public API, CC0-1.0. Pulled 2026-11-14 ~3 AM UTC+3 (`survey.json`, `psi<N>.json`, `csv_<N>_<k>.csv`, `pubs.json`). The live API returned HTTP 500 on 2026-11-14 8:30-9:15 PM UTC+3 and recovered; the app reads only this snapshot.
- `curated/`: hand-checked numbers from NASA papers (NTRS), each entry with its URL. Text of the papers: planning repo `research/sources/`.
