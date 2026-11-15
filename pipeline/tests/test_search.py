# Generated with Muse Spark, SI-assisted
"""B5: data/build/search.json is the analyst workspace index: one entry per
investigation (with keywords from its tags and fuels), one per fuel and one
per family with test counts, all recomputed here from experiments.json and
tests.json. Matching runs on the lower-case terms field; no AI text ships."""
import json
from pathlib import Path

from ffpipe.search import build_search

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "data" / "build"


def _load(name):
    return json.loads((BUILD / name).read_text(encoding="utf-8"))


def test_search_recomputed_from_experiments_and_tests():
    experiments, tests, search = _load("experiments.json"), _load("tests.json"), _load("search.json")
    by_id = {e["kind"] + ":" + e["id"]: e for e in search}
    counts, fuels = {}, {}
    for t in tests:
        counts[t["investigation"]] = counts.get(t["investigation"], 0) + 1
        if t["fuel"]:
            fuels.setdefault(t["fuel"], {"count": 0, "invs": set()})
            fuels[t["fuel"]]["count"] += 1
            fuels[t["fuel"]]["invs"].add(t["investigation"])
    for e in experiments:
        entry = by_id[f"investigation:{e['id']}"]
        assert entry["test_count"] == e["test_count"] == counts.get(e["id"], 0), e["id"]
        assert entry["acronym"] == e["acronym"] and entry["title"] == e["title"]
        assert entry["family"] == e["family"]
        keywords = {k.lower() for k in (e["tags"] + [t["fuel"] for t in tests
                                                     if t["investigation"] == e["id"] and t["fuel"]])}
        assert all(k in entry["terms"] for k in keywords), e["id"]
    for fuel, info in fuels.items():
        entry = by_id[f"fuel:{fuel}"]
        assert entry["test_count"] == info["count"], fuel
        assert set(entry["investigations"]) == info["invs"], fuel
    for family in {e["family"] for e in experiments}:
        entry = by_id[f"family:{family}"]
        assert entry["test_count"] == sum(e["test_count"] for e in experiments if e["family"] == family)
    for entry in search:
        assert entry["terms"] == entry["terms"].lower(), entry["id"]
    blob = json.dumps(search)
    for e in experiments:
        assert e["summary"]["text"] not in blob, e["id"]
        assert all(q not in blob for q in e["summary"]["quotes"]), e["id"]


def test_committed_search_equals_fresh_build():
    assert build_search(_load("experiments.json"), _load("tests.json")) == _load("search.json")
