# Generated with Claude, SI-assisted
from pathlib import Path

from ffpipe.build import build_tests
from ffpipe.coverage import MARKER, measure, render, split_doc

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "data" / "psi-snapshot"
DOC = ROOT / "contracts" / "COVERAGE.md"


def test_table_in_doc_matches_fresh_measurement():
    text = DOC.read_text(encoding="utf-8")
    head, section = split_doc(text)
    assert section is not None, f"{MARKER} line is missing from COVERAGE.md"
    body = section.split("\n", 1)[1].strip() if "\n" in section else ""
    assert body, "COVERAGE.md table section is empty"
    # Regenerate on purpose with: uv run python -m ffpipe.build
    assert section == render(SNAPSHOT, build_tests(SNAPSHOT))
    assert head.startswith("# Coverage")


def test_every_snapshot_csv_is_listed_and_totals_add_up():
    tests = build_tests(SNAPSHOT)
    rows = measure(SNAPSHOT, tests)
    listed = {r["file"].split(" ")[0] for r in rows}
    on_disk = {p.name for p in SNAPSHOT.glob("csv_*.csv")} | {"bre.csv"}
    assert listed == on_disk
    mapped = [r for r in rows if "(not test rows)" not in r["file"]]
    assert sum(r["rows"] for r in mapped) == len(tests)
    for r in rows:
        assert r["plottable"] <= min(r["o2"], r["pressure"]) if r["rows"] else True
    plotted = sum(r["plottable"] for r in rows)
    assert plotted == sum(t["o2_pct"] is not None and t["pressure_kpa"] is not None and t["gravity"] == "micro-g" for t in tests)
    assert f"Plotted {plotted} of {len(tests)} tests." in render(SNAPSHOT, tests)
