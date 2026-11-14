# Generated with Claude, SI-assisted
import csv
import json
import re
from pathlib import Path

import jsonschema

from ffpipe.build import build_tests, is_footnote
from ffpipe.sources import SOURCES

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "data" / "psi-snapshot"


def data_rows(filename):
    """Independent count: non-blank rows below the header, minus footnote lines."""
    with open(SNAPSHOT / filename, encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))
    return [r for r in rows[1:] if any(c.strip() for c in r) and not is_footnote(r)]


def test_golden_rows_exact():
    tests = build_tests(SNAPSHOT)
    golden = json.loads((ROOT / "contracts" / "golden" / "tests.json").read_text(encoding="utf-8"))
    by_id = {row["id"]: row for row in tests}
    for want in golden:
        assert by_id[want["id"]] == want


def test_schema_and_bounds():
    tests = build_tests(SNAPSHOT)
    schema = json.loads((ROOT / "contracts" / "tests.schema.json").read_text(encoding="utf-8"))
    jsonschema.validate(tests, schema)
    counts = {spec.file: len(data_rows(spec.file)) for spec in SOURCES.values()}
    for row in tests:
        assert row["o2_pct"] is None or 0 <= row["o2_pct"] <= 100
        assert row["pressure_kpa"] is None or 0 <= row["pressure_kpa"] <= 400
        assert (SNAPSHOT / row["source"]["file"]).exists()
        assert 1 <= row["source"]["row"] <= counts[row["source"]["file"]]


def test_ids_unique_and_follow_rule():
    tests = build_tests(SNAPSHOT)
    ids = [row["id"] for row in tests]
    assert len(ids) == len(set(ids))
    by_id = {row["id"]: row for row in tests}
    assert by_id["PSI-159#1"]["source"]["file"] == "csv_159_50.csv"
    assert by_id["PSI-159#51-1"]["source"]["file"] == "csv_159_51.csv"
    assert by_id["PSI-10#1"]["source"]["file"] == "csv_10_55.csv"
    assert by_id["PSI-10#56-1"]["source"]["file"] == "csv_10_56.csv"
    for row in tests:
        assert re.fullmatch(r"PSI-\d+#(\d+-)?\d+", row["id"])
        assert row["id"].endswith(f"{row['source']['row']}")


def test_row_counts_match_data_rows():
    tests = build_tests(SNAPSHOT)
    by_file = {}
    for row in tests:
        by_file[row["source"]["file"]] = by_file.get(row["source"]["file"], 0) + 1
    for filename in SOURCES:
        assert by_file[filename] == len(data_rows(filename)), filename
    assert by_file["csv_69_34.csv"] == 274
    assert by_file["csv_159_50.csv"] == 179
    assert by_file["csv_159_51.csv"] == 154
    assert by_file["csv_98_39.csv"] == 4  # golden PSI-98 test_count
    assert by_file["csv_99_39.csv"] == 11  # 15 non-blank lines minus 4 footnotes


def test_notes_only_when_unparsed():
    for row in build_tests(SNAPSHOT):
        if row.get("pressure_note"):
            assert row["pressure_kpa"] is None
        if row.get("flow_note"):
            assert row["flow_cm_s"] is None
    by_id = {row["id"]: row for row in build_tests(SNAPSHOT)}
    five_atm = [r for r in by_id.values() if r["investigation"] == "PSI-39" and r.get("pressure_note") == "5 atm"]
    assert len(five_atm) == 3  # 506.6 kPa is above the contract's 0-400 range: null plus the raw cell


def test_no_outcome_guessed_for_files_without_outcome_column():
    for row in build_tests(SNAPSHOT):
        if row["investigation"] in {"PSI-25", "PSI-26", "PSI-68", "PSI-39", "PSI-10", "PSI-107", "PSI-100", "PSI-101", "PSI-102"}:
            assert row["outcome"] == "unknown" and row["outcome_raw"] is None
