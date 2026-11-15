# Generated with Muse Spark, SI-assisted
"""coverage.json: "Plotted N of M" for the UI, from the built test rows only.

The plotted rule is contracts/README.md: gravity micro-g with both o2_pct
and pressure_kpa recorded. A row that is not plotted carries exactly one
reason, in this priority: not microgravity, then no oxygen or pressure
recorded, then no pressure recorded, then no oxygen recorded."""

import json
from pathlib import Path

from .sources import FAMILIES, FAMILY_OF

ROOT = Path(__file__).resolve().parents[2]
BUILD_DIR = ROOT / "data" / "build"

REASONS = ("no pressure recorded", "no oxygen recorded",
           "no oxygen or pressure recorded", "not microgravity")


def reason(t):
    """Why a test row is not on the chart; None when it is plotted."""
    if t["gravity"] != "micro-g":
        return "not microgravity"
    if t["o2_pct"] is None and t["pressure_kpa"] is None:
        return "no oxygen or pressure recorded"
    if t["pressure_kpa"] is None:
        return "no pressure recorded"
    if t["o2_pct"] is None:
        return "no oxygen recorded"
    return None


def build_coverage(tests):
    by_family = {family: {"total": 0, "plotted": 0, "not_plotted": 0} for family in FAMILIES}
    by_reason = {r: 0 for r in REASONS}
    plotted = 0
    for t in tests:
        family = FAMILY_OF[t["investigation"]]
        by_family[family]["total"] += 1
        why = reason(t)
        if why is None:
            plotted += 1
            by_family[family]["plotted"] += 1
        else:
            by_reason[why] += 1
            by_family[family]["not_plotted"] += 1
    return {
        "total": len(tests),
        "plotted": plotted,
        "not_plotted": len(tests) - plotted,
        "by_family": by_family,
        "by_reason": by_reason,
    }


def main():
    tests = json.loads((BUILD_DIR / "tests.json").read_text(encoding="utf-8"))
    with open(BUILD_DIR / "coverage.json", "w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(build_coverage(tests), indent=2, ensure_ascii=False) + "\n")
    print("wrote coverage.json")


if __name__ == "__main__":
    main()
