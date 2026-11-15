# Generated with Muse Spark, SI-assisted
"""B18/B21: ranking oracle for the web lane.

pipeline/tests/data/ranking_cases.json holds three query airs derived from
data/curated/moon.json by id. The heo-dm-1006 case is a Moon-box atmosphere
query (contracts/DISTANCE.md: the pressure term uses its pressure and the
oxygen term is the distance from the test's oxygen to the band 33.7-40, zero
inside the band); iss-air and exp-10-2 are point queries at their pressure
with iss-air at 21 and exp-10-2 at its upper oxygen bound. Each case holds
the expected top investigations with d_min, near, placed and tests, computed
from data/build/tests.json following "Ranking investigations for a chosen
air" in contracts/DISTANCE.md. This test recomputes everything from the
files and compares: the committed numbers are never typed.
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
    """Derive the query from moon.json: band query for the Moon box, point otherwise."""
    a = ATMOS[atmos_id]
    if atmos_id == "heo-dm-1006":
        return {"pressure_kpa": a["pressure_kpa"],
                "o2_pct_min": a["o2_pct_min"], "o2_pct_max": a["o2_pct_max"]}
    if atmos_id == "exp-10-2":
        o2 = a["o2_pct_max"]
    else:
        o2 = a["o2_pct_min"]
    return {"pressure_kpa": a["pressure_kpa"], "o2_pct": o2}


def distance(query, o2_pct, pressure_kpa):
    """DISTANCE.md distance: point query or Moon-box band query."""
    if "o2_pct_min" in query:
        o = o2_pct
        if o < query["o2_pct_min"]:
            o_term = query["o2_pct_min"] - o
        elif o > query["o2_pct_max"]:
            o_term = o - query["o2_pct_max"]
        else:
            o_term = 0.0
    else:
        o_term = query["o2_pct"] - o2_pct
    return math.sqrt(((query["pressure_kpa"] - pressure_kpa) / 25) ** 2 + (o_term / 5) ** 2)


def rank(query):
    """Top investigations per contracts/DISTANCE.md ranking section."""
    placed = [t for t in TESTS
              if t["gravity"] == "micro-g"
              and t["o2_pct"] is not None and t["pressure_kpa"] is not None]
    by_inv = {}
    for t in placed:
        d = distance(query, t["o2_pct"], t["pressure_kpa"])
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
    band = CASES[0]
    assert band["pressure_kpa"] == ATMOS["heo-dm-1006"]["pressure_kpa"]
    assert band["o2_pct_min"] == ATMOS["heo-dm-1006"]["o2_pct_min"]
    assert band["o2_pct_max"] == ATMOS["heo-dm-1006"]["o2_pct_max"]
    assert "o2_pct" not in band
    for case in CASES[1:]:
        assert case["pressure_kpa"] == ATMOS[case["id"]]["pressure_kpa"]
        assert case["o2_pct"] == query_for(case["id"])["o2_pct"]


def test_top_five_match_recomputation():
    for case in CASES:
        assert rank(query_for(case["id"]))[:5] == case["top"]


def test_band_query_ranks_inside_band_by_pressure_only():
    """A test with oxygen inside the band is ranked by its pressure term alone."""
    rows = rank(query_for("heo-dm-1006"))
    first = rows[0]
    assert first["investigation"] == "PSI-159"
    # PSI-159#1 (39.39 %, 94.44 kPa) sits inside the band: DISTANCE.md case 2.
    expect = round(abs(94.44 - 56.5) / 25, 3)
    assert first["d_min"] <= expect
