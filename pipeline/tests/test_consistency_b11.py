# Generated with Muse Spark, SI-assisted
"""B11: consistency. Every file web/scripts/copy-data.js copies must exist in
data/build/ or data/curated/ (or contracts/golden for the two fallbacks) and
be valid JSON; coverage.json totals must equal the "Plotted N of M" rule in
contracts/README.md (M = rows in tests.json, N = micro-g rows with both o2
and pressure recorded). Unconditional copies are required; conditional ones
(`if existsSync`) must be valid JSON when present."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "data" / "build"
CURATED = ROOT / "data" / "curated"
GOLDEN = ROOT / "contracts" / "golden"
COPY_DATA = ROOT / "web" / "scripts" / "copy-data.js"

# name -> directories that may hold it, in copy-data.js preference order.
# The "if existsSync" pair is conditional: required only when present.
UNCONDITIONAL = {
    "experiments.json": [BUILD, GOLDEN],
    "tests.json": [BUILD, GOLDEN],
    "moon.json": [CURATED],
    "incidents.json": [CURATED],
}
CONDITIONAL = {
    "psi-text.json": [BUILD],
    "summaries.json": [BUILD],
    "moments.json": [BUILD],
    "library.json": [BUILD],
    "search.json": [BUILD],
    "coverage.json": [BUILD],
    "provenance.json": [BUILD],
    "dictionary.json": [BUILD],
}


def _read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def test_copy_data_sources_exist_and_are_valid_json():
    script = COPY_DATA.read_text(encoding="utf-8")
    for name in list(UNCONDITIONAL) + list(CONDITIONAL):
        assert f'"{name}"' in script, f"copy-data.js no longer mentions {name}"
    for name, dirs in UNCONDITIONAL.items():
        found = [d / name for d in dirs if (d / name).is_file()]
        assert found, f"{name} missing from {[str(d) for d in dirs]}"
        _read_json(found[0])
    for name, dirs in CONDITIONAL.items():
        for path in [d / name for d in dirs if (d / name).is_file()]:
            _read_json(path)


def test_coverage_totals_equal_plotted_n_of_m_rule():
    tests = _read_json(BUILD / "tests.json")
    coverage = _read_json(BUILD / "coverage.json")
    plotted = sum(
        1
        for t in tests
        if t["gravity"] == "micro-g"
        and t["o2_pct"] is not None
        and t["pressure_kpa"] is not None
    )
    assert coverage["total"] == len(tests)
    assert coverage["plotted"] == plotted
    assert coverage["not_plotted"] == len(tests) - plotted
    assert sum(coverage["by_reason"].values()) == coverage["not_plotted"]
    assert sum(r["total"] for r in coverage["by_family"].values()) == len(tests)
    assert sum(r["plotted"] for r in coverage["by_family"].values()) == plotted
