# Generated with Muse Spark, SI-assisted
"""B18: ranking oracle for the web lane.

pipeline/tests/data/ranking_cases.json holds three query airs derived from
data/curated/moon.json by id (the heo-dm-1006 band mid-point at its pressure,
iss-air, exp-10-2 at its upper oxygen bound) and, for each, the expected top
five investigations with d_min, near, placed and tests, computed from
data/build/tests.json following "Ranking investigations for a chosen air" in
contracts/DISTANCE.md. This test recomputes everything from the files and
compares: the committed numbers are never typed.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
CASES = json.loads((ROOT / "pipeline" / "tests" / "data" / "ranking_cases.json").read_text(encoding="utf-8"))
MOON = json.loads((DATA / "curated" / "moon.json").read_text(encoding="utf-8"))
TESTS = json.loads((DATA / "build" / "tests.json").read_text(encoding="utf-8"))
EXPERIMENTS = json.loads((DATA / "build" / "experiments.json").read_text(encoding="utf-8"))

ATMOS = {a["id"]: a for a in MOON["atmospheres"]}
ACRONYM = {e["id"]: e["acronym"] for e in EXPERIMENTS}


def query_for(atmos_id):
    """Derive the point query from moon.json: mid-point / value / upper bound."""
    a = ATMOS[atmos_id]
    if atmos_id == "heo-dm-1006":
        o2 = (a["o2_pct_min"] + a["o2_pct_max"]) / 2
    elif atmos_id == "exp-10-2":
        o2 = a["o2_pct_max"]
    else:
        o2 = a["o2_pct_min"]
    return {"pressure_kpa": a["pressure_kpa"], "o2_pct": o2}


def rank(query):
    """Top investigations per contracts/DISTANCE.md ranking section."""
    placed = [t for t in TESTS
              if t["gravity"] == "micro-g"
              and t["o2_pct"] is not None and t["pressure_kpa"] is not None]
    by_inv = {}
    for t in placed:
        d = math.sqrt(((query["pressure_kpa"] - t["pressure_kpa"]) / 25) ** 2
                      + ((query["o2_pct"] - t["o2_pct"]) / 5) ** 2)
        by_inv.setdefault(t["investigation"], []).append(d)
    rows = []
    for inv, ds in by_inv.items():
        ds.sort()
        rows.append({
            "investigation": inv,
            "acronym": ACRONYM[inv],
            "d_min": round(ds[0], 3),
            "near": sum(1 for d in ds if d <= 1.0),
            "placed": len(ds),
            "tests": sum(1 for t in TESTS if t["investigation"] == inv),
        })
    rows.sort(key=lambda r: (r["d_min"], -r["near"], -r["placed"], r["acronym"]))
    return rows


def test_three_query_airs_come_from_moon_json():
    assert [c["id"] for c in CASES] == ["heo-dm-1006", "iss-air", "exp-10-2"]
    for case in CASES:
        assert case["pressure_kpa"] == ATMOS[case["id"]]["pressure_kpa"]
        assert case["o2_pct"] == query_for(case["id"])["o2_pct"]


def test_top_five_match_recomputation():
    for case in CASES:
        assert rank(query_for(case["id"]))[:5] == case["top"]
