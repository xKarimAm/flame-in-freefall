# Generated with Muse Spark, SI-assisted
"""search.json: the analyst workspace index, from experiments.json + tests.json.

One entry per investigation (keywords from its tags and its recorded fuels),
one per recorded fuel and one per family with test counts. Matching runs on
the lower-case terms field. No AI text ships: titles and tags only."""

import json
from pathlib import Path

from .sources import FAMILIES

ROOT = Path(__file__).resolve().parents[2]
BUILD_DIR = ROOT / "data" / "build"


def _terms(*parts):
    return " | ".join(sorted({p.lower() for p in parts if p}))


def build_search(experiments, tests):
    fuels = {}
    for t in tests:
        if t["fuel"]:
            info = fuels.setdefault(t["fuel"], {"count": 0, "invs": set()})
            info["count"] += 1
            info["invs"].add(t["investigation"])
    inv_fuels = {}
    for t in tests:
        if t["fuel"]:
            inv_fuels.setdefault(t["investigation"], set()).add(t["fuel"])
    entries = []
    for e in experiments:
        keywords = list(e["tags"]) + sorted(inv_fuels.get(e["id"], ()))
        entries.append({
            "kind": "investigation",
            "id": e["id"],
            "acronym": e["acronym"],
            "title": e["title"],
            "family": e["family"],
            "test_count": e["test_count"],
            "keywords": keywords,
            "terms": _terms(e["acronym"], e["title"], e["family"], *keywords),
        })
    for fuel in sorted(fuels):
        info = fuels[fuel]
        entries.append({
            "kind": "fuel",
            "id": fuel,
            "test_count": info["count"],
            "investigations": sorted(info["invs"]),
            "terms": _terms(fuel, *[i for i in info["invs"]]),
        })
    for family in FAMILIES:
        entries.append({
            "kind": "family",
            "id": family,
            "test_count": sum(e["test_count"] for e in experiments if e["family"] == family),
            "terms": _terms(family),
        })
    return entries


def main():
    experiments = json.loads((BUILD_DIR / "experiments.json").read_text(encoding="utf-8"))
    tests = json.loads((BUILD_DIR / "tests.json").read_text(encoding="utf-8"))
    with open(BUILD_DIR / "search.json", "w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(build_search(experiments, tests), indent=2, ensure_ascii=False) + "\n")
    print("wrote search.json")


if __name__ == "__main__":
    main()
