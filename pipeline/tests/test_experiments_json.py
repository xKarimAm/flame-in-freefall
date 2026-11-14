# Generated with Claude, SI-assisted
import json
from pathlib import Path

import jsonschema

from ffpipe.build import build_tests
from ffpipe.experiments import build_experiments, build_psi_text
from ffpipe.sources import FIRE_IDS

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "data" / "psi-snapshot"
EXPECTED_IDS = {
    "PSI-98", "PSI-99", "PSI-100", "PSI-26", "PSI-25", "PSI-69", "PSI-68", "PSI-39", "PSI-159", "PSI-10", "PSI-20",
    "PSI-21", "PSI-22", "PSI-23", "PSI-106", "PSI-107", "PSI-102", "PSI-101", "PSI-60", "PSI-62", "PSI-117", "PSI-142",
}


def _schema(name):
    return json.loads((ROOT / "contracts" / name).read_text(encoding="utf-8"))


def _experiments():
    return build_experiments(SNAPSHOT, build_tests(SNAPSHOT))


def test_experiments_schema_and_ids():
    experiments = _experiments()
    jsonschema.validate(experiments, _schema("experiments.schema.json"))
    ids = [e["id"] for e in experiments]
    assert len(ids) == 22 and set(ids) == EXPECTED_IDS and len(set(ids)) == 22
    assert FIRE_IDS == ids


def test_golden_psi98_matches_except_summary_tags_publications():
    got = {e["id"]: e for e in _experiments()}["PSI-98"]
    want = json.loads((ROOT / "contracts" / "golden" / "experiments.json").read_text(encoding="utf-8"))[0]
    for key in want:
        if key in ("summary", "tags", "publications"):
            continue
        assert got[key] == want[key], key
    titles = {p["title"] for p in got["publications"]}
    for pub in want["publications"]:
        assert pub["title"] in titles
    assert got["summary"] is None and got["tags"] == []


def test_counts_and_ranges_come_from_tests():
    tests = build_tests(SNAPSHOT)
    for e in build_experiments(SNAPSHOT, tests):
        rows = [t for t in tests if t["investigation"] == e["id"]]
        assert e["test_count"] == len(rows)
        assert e["has_outcomes"] == any(t["outcome"] != "unknown" for t in rows)
        pressures = [t["pressure_kpa"] for t in rows if t["pressure_kpa"] is not None]
        assert e["pressure_kpa_range"] == ([min(pressures), max(pressures)] if pressures else None)
    # unmapped investigations have no rows and no ranges
    by_id = {e["id"]: e for e in build_experiments(SNAPSHOT, tests)}
    assert by_id["PSI-20"]["test_count"] == 0 and by_id["PSI-20"]["o2_pct_range"] is None


def test_psi_text_schema_and_verbatim():
    texts = build_psi_text(SNAPSHOT)
    jsonschema.validate(texts, _schema("psi-text.schema.json"))
    assert [t["id"] for t in texts] == FIRE_IDS
    for t in texts:
        psi = json.loads((SNAPSHOT / f"psi{t['id'].split('-')[1]}.json").read_text(encoding="utf-8"))
        assert t["objective"] == psi["objective"]
        assert t["approach"] == (psi["approach"] or None)
        assert t["description"] == (psi["description"] or None)
        assert t["source_url"] == f"https://psi.nasa.gov/physci/repo/data/investigations/{t['id']}"
