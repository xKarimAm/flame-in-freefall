# Generated with Claude, SI-assisted
"""Build data/build/*.json from data/psi-snapshot. Entry: python -m ffpipe.build"""

import csv
import json
import re
from pathlib import Path

from .coverage import update_doc
from .coverage_json import build_coverage
from .experiments import build_experiments, build_psi_text
from .search import build_search
from .library import build_library, load_drafts
from .moments import build_moments
from .parsers import PARSERS
from .sources import SOURCES

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "data" / "psi-snapshot"
BUILD_DIR = ROOT / "data" / "build"
SUMMARIES = ROOT / "pipeline" / "summaries.json"
COVERAGE_MD = ROOT / "contracts" / "COVERAGE.md"

# csv_99_39.csv ends with "Note 1 ..." lines in the first cell only: footnotes, not test rows.
_FOOTNOTE = re.compile(r"^Note \d+\b")


def is_footnote(cells):
    cells = [(c or "").strip() for c in cells]
    return bool(cells) and bool(_FOOTNOTE.match(cells[0])) and not any(cells[1:])


def read_rows(path):
    """Non-blank, non-footnote data rows as dicts keyed by the exact header."""
    with open(path, encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            values = [value for value in row.values() if value is not None]
            if not any((value or "").strip() for value in values):
                continue
            if is_footnote(values):
                continue
            yield row


def build_tests(snapshot=SNAPSHOT):
    tests = []
    for spec in SOURCES.values():
        parser = PARSERS[spec.parser]
        for number, row in enumerate(read_rows(Path(snapshot) / spec.file), start=1):
            tests.append(parser(spec, row, number))
    return tests


def load_summaries(path=SUMMARIES):
    """Prepared AI summaries (written by the model, no API call). Missing file -> none."""
    path = Path(path)
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def write_json(path, data):
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main():
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    tests = build_tests()
    write_json(BUILD_DIR / "tests.json", tests)
    experiments = build_experiments(SNAPSHOT, tests, load_summaries())
    write_json(BUILD_DIR / "experiments.json", experiments)
    moments = build_moments(tests, experiments)
    write_json(BUILD_DIR / "moments.json", moments)
    texts = build_psi_text(SNAPSHOT)
    write_json(BUILD_DIR / "psi-text.json", texts)
    library = build_library(load_drafts(), tests, moments, {t["id"]: t for t in texts})
    write_json(BUILD_DIR / "library.json", library)
    write_json(BUILD_DIR / "coverage.json", build_coverage(tests))
    write_json(BUILD_DIR / "search.json", build_search(experiments, tests))
    update_doc(COVERAGE_MD, SNAPSHOT, tests)
    print(f"wrote tests.json ({len(tests)} rows), experiments.json ({len(experiments)}), moments.json ({len(moments)}), psi-text.json ({len(texts)}), library.json ({len(library)} stories), coverage.json, search.json, COVERAGE.md table")


if __name__ == "__main__":
    main()
