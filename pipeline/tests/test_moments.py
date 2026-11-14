# Generated with Claude, SI-assisted
import json
from pathlib import Path

import jsonschema

from ffpipe.build import build_tests
from ffpipe.moments import build_moments

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "data" / "build"


def _load(name):
    return json.loads((BUILD / name).read_text(encoding="utf-8"))


MOMENTS, TESTS, EXPERIMENTS = _load("moments.json"), _load("tests.json"), _load("experiments.json")
BY_ID = {m["id"]: m for m in MOMENTS}


def test_validates_ids_unique_and_test_ids_exist():
    jsonschema.validate(MOMENTS, json.loads((ROOT / "contracts" / "moments.schema.json").read_text(encoding="utf-8")))
    ids = [m["id"] for m in MOMENTS]
    assert len(ids) == len(set(ids)) and ids == sorted(ids)
    known = {t["id"] for t in TESTS}
    assert all(set(m["test_ids"]) <= known for m in MOMENTS)


def test_committed_moments_equal_fresh_build():
    assert build_moments(build_tests(), EXPERIMENTS) == MOMENTS


def test_flex_lowest_o2_burned_recomputed_from_tests():
    rows = [t for t in TESTS if t["investigation"] == "PSI-69" and t["outcome"] in ("burned", "completion", "flow-terminated") and t["o2_pct"] is not None]
    low = min(t["o2_pct"] for t in rows)
    m = BY_ID["PSI-69.lowest-o2-burned"]
    assert m["value"] == low and m["n"] == len(rows)
    assert all(next(t for t in TESTS if t["id"] == i)["o2_pct"] == low for i in m["test_ids"])
    assert "FLEX" in m["label"] and str(low) not in m["label"]


def test_saffire_longest_burn_recomputed_from_tests():
    rows = [t for t in TESTS if t["investigation"] == "PSI-98" and t["burn_time_s"] is not None]
    top = max(rows, key=lambda t: t["burn_time_s"])
    m = BY_ID["PSI-98.longest-burn"]
    assert (m["value"], m["fuel"], m["unit"]) == (top["burn_time_s"], top["fuel"], "s")
    assert m["test_ids"] == [top["id"]] and m["url"] == top["source"]["url"]


def test_bass_ii_o2_range_recomputed_and_no_flow_moment():
    rows = [t for t in TESTS if t["investigation"] == "PSI-25" and t["o2_pct"] is not None]
    o2 = [t["o2_pct"] for t in rows]
    m = BY_ID["PSI-25.o2-range"]
    assert (m["value"], m["value_max"], m["n"], m["unit"]) == (min(o2), max(o2), len(o2), "%")
    assert m["test_ids"] == [min(rows, key=lambda t: (t["o2_pct"], _key(t)))["id"], min([t for t in rows if t["o2_pct"] == max(o2)], key=_key)["id"]]
    assert all(t["flow_cm_s"] is None for t in TESTS if t["investigation"] == "PSI-25")  # no flow recorded, so no flow moment
    assert "PSI-25.flow-range" not in BY_ID


def _key(t):
    return int(t["id"].split("#")[1])


def test_no_outcome_rows_means_no_outcome_moments():
    unknown_only = {i for i in {t["investigation"] for t in TESTS} if all(t["outcome"] == "unknown" for t in TESTS if t["investigation"] == i)}
    assert "PSI-25" in unknown_only
    for inv in unknown_only:
        kinds = {m["kind"] for m in MOMENTS if m["investigation"] == inv}
        assert not kinds & {"outcome-count", "lowest-o2-burned", "highest-o2-went-out"}, inv
    assert not any(m["id"].endswith("-unknown") for m in MOMENTS)


def test_ranges_match_experiments_json():
    for e in EXPERIMENTS:
        for kind, key in (("o2-range", "o2_pct_range"), ("pressure-range", "pressure_kpa_range")):
            m = BY_ID.get(f"{e['id']}.{kind}")
            assert (m and [m["value"], m["value_max"]]) == e[key], (e["id"], kind)


def _row(n, **kw):
    row = {"id": f"PSI-1#{n}", "investigation": "PSI-1", "fuel": f"f{n}", "o2_pct": None, "pressure_kpa": None, "flow_cm_s": None,
           "outcome": "unknown", "burn_time_s": None, "source": {"url": "https://psi.example/PSI-1"}}
    return {**row, **kw}


def test_synthetic_min_max_and_tie_rules():
    tests = [
        _row(10, o2_pct=30.0, outcome="burned", burn_time_s=5.0),
        _row(2, o2_pct=30.0, outcome="completion", burn_time_s=9.0),  # ties row 10 on min and max o2: lowest id (natural order) wins
        _row(3, o2_pct=40.0, outcome="extinction", burn_time_s=9.0),
        _row(4, o2_pct=25.0, outcome="self-extinguished"),
        _row(5, pressure_kpa=70.0),
        _row(6, o2_pct=45.0, o2_pct_min=44.0, o2_pct_max=46.0),  # a source range: bounds win over the midpoint
    ]
    m = {x["id"]: x for x in build_moments(tests, [{"id": "PSI-1", "acronym": "TST"}])}
    assert m["PSI-1.tests-count"]["value"] == 6 and m["PSI-1.tests-count"]["test_ids"] == []
    assert (m["PSI-1.o2-range"]["value"], m["PSI-1.o2-range"]["value_max"], m["PSI-1.o2-range"]["test_ids"]) == (25.0, 46.0, ["PSI-1#4", "PSI-1#6"])
    assert m["PSI-1.lowest-o2-burned"]["test_ids"] == ["PSI-1#2"] and m["PSI-1.lowest-o2-burned"]["fuel"] == "f2"
    assert m["PSI-1.highest-o2-went-out"]["value"] == 40.0 and m["PSI-1.highest-o2-went-out"]["test_ids"] == ["PSI-1#3"]
    assert m["PSI-1.longest-burn"]["test_ids"] == ["PSI-1#2"]
    assert m["PSI-1.pressure-range"]["value"] == m["PSI-1.pressure-range"]["value_max"] == 70.0
    assert "PSI-1.flow-range" not in m and m["PSI-1.outcome-count-burned"]["value"] == 1
