# Generated with Muse Spark, SI-assisted
"""B4: data/build/coverage.json gives the UI its "Plotted N of M" numbers:
totals, plotted rows, and per-family and per-reason counts of the rows that
are not plotted, each recomputed here from tests.json."""
import json
from pathlib import Path

from ffpipe.coverage_json import build_coverage
from ffpipe.sources import FAMILIES

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "data" / "build"
REASONS = ("no pressure recorded", "no oxygen recorded",
           "no oxygen or pressure recorded", "not microgravity")


def _load(name):
    return json.loads((BUILD / name).read_text(encoding="utf-8"))


def _reason(t):
    if t["gravity"] != "micro-g":
        return "not microgravity"
    if t["o2_pct"] is None and t["pressure_kpa"] is None:
        return "no oxygen or pressure recorded"
    if t["pressure_kpa"] is None:
        return "no pressure recorded"
    if t["o2_pct"] is None:
        return "no oxygen recorded"
    return None


def test_coverage_recomputed_from_tests():
    tests, coverage = _load("tests.json"), _load("coverage.json")
    assert coverage["total"] == len(tests)
    assert coverage["plotted"] + coverage["not_plotted"] == len(tests)
    assert set(coverage["by_reason"]) == set(REASONS)
    assert sum(coverage["by_reason"].values()) == coverage["not_plotted"]
    assert set(coverage["by_family"]) == set(FAMILIES)
    for family, rows in coverage["by_family"].items():
        assert rows["plotted"] + rows["not_plotted"] == rows["total"], family
    assert sum(r["total"] for r in coverage["by_family"].values()) == len(tests)
    assert sum(r["plotted"] for r in coverage["by_family"].values()) == coverage["plotted"]
    expected_reasons = {r: 0 for r in REASONS}
    for t in tests:
        reason = _reason(t)
        if reason:
            expected_reasons[reason] += 1
    assert coverage["by_reason"] == expected_reasons


def test_committed_coverage_equals_fresh_build():
    assert build_coverage(_load("tests.json")) == _load("coverage.json")
