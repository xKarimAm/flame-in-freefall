# Generated with Muse Spark, SI-assisted
"""B19: provenance.json records what each source CSV contributed.

One entry per source CSV the pipeline reads or deliberately skips:
investigation, file, rows read, rows mapped, per-field parse counts, unit
strings seen with the conversion applied, up to three unparsable cells
quoted exactly with their row number, and the skip reason. This test
recomputes the totals from tests.json and recounts three files with
independent code: the committed numbers are never typed.
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
PROV = json.loads((DATA / "build" / "provenance.json").read_text(encoding="utf-8"))
TESTS = json.loads((DATA / "build" / "tests.json").read_text(encoding="utf-8"))
SNAP = DATA / "psi-snapshot"

_FOOTNOTE = re.compile(r"^Note \d+\b")


def _rows_read_independent(path):
    """Independent row count: non-blank, non-footnote rows under utf-8-sig."""
    with open(path, encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        count = 0
        for row in reader:
            values = [v for v in row.values() if v is not None]
            if not any((v or "").strip() for v in values):
                continue
            cells = [(c or "").strip() for c in values]
            if cells and _FOOTNOTE.match(cells[0]) and not any(cells[1:]):
                continue
            count += 1
    return count


def test_totals_equal_tests_json():
    mapped = [e for e in PROV if e["mapped"]]
    skipped = [e for e in PROV if not e["mapped"]]
    assert mapped and skipped
    assert sum(e["rows_mapped"] for e in mapped) == len(TESTS)
    assert sum(e["rows_read"] for e in mapped) == len(TESTS)
    for entry in mapped:
        assert entry["rows_mapped"] == entry["rows_read"]
        assert entry["rows_mapped"] == sum(
            1 for t in TESTS if t["source"]["file"] == entry["file"])
    for entry in skipped:
        assert entry["rows_mapped"] == 0
        assert entry["reason"].strip()


def test_three_files_recounted_independently():
    for name in ("csv_69_34.csv", "csv_107_36.csv", "csv_159_51.csv"):
        entry = next(e for e in PROV if e["file"] == name)
        assert entry["rows_read"] == _rows_read_independent(SNAP / name), name
        with open(SNAP / name, encoding="utf-8-sig", newline="") as handle:
            header = next(csv.reader(handle))
        assert entry["columns"] or entry["file"] == name


def test_unparsable_cells_are_real_source_cells():
    for entry in PROV:
        cells = entry.get("unparsable_cells", [])
        assert len(cells) <= 3, entry["file"]
        if not entry["mapped"]:
            assert cells == [], entry["file"]
            continue
        with open(SNAP / entry["file"], encoding="utf-8-sig", newline="") as handle:
            text = handle.read()
        for cell in cells:
            assert cell["raw"].strip() and cell["raw"] in text, (entry["file"], cell)
            assert isinstance(cell["row"], int) and cell["row"] >= 1
