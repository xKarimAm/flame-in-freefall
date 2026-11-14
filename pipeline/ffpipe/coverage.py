# Generated with Claude, SI-assisted
"""Measure what each snapshot CSV can plot and keep the table in contracts/COVERAGE.md in sync."""

import csv
from pathlib import Path

from .sources import UNMAPPED

MARKER = "## Table (filled by the pipeline)"
HEADER = [
    "| file | investigation | rows | o2 non-null | pressure non-null | outcome non-null | plottable |",
    "|---|---|---|---|---|---|---|",
]


def _plottable(t):
    return t["gravity"] == "micro-g" and t["o2_pct"] is not None and t["pressure_kpa"] is not None


def _nonblank_rows(path):
    with open(path, encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))
    return sum(1 for r in rows[1:] if any(c.strip() for c in r))


def measure(snapshot, tests):
    """One dict per CSV file in the snapshot (mapped or not), sorted by investigation number then file name."""
    snapshot = Path(snapshot)
    out = []
    by_file = {}
    for t in tests:
        by_file.setdefault(t["source"]["file"], []).append(t)
    for file, rows in by_file.items():
        out.append({
            "file": file,
            "investigation": rows[0]["investigation"],
            "rows": len(rows),
            "o2": sum(t["o2_pct"] is not None for t in rows),
            "pressure": sum(t["pressure_kpa"] is not None for t in rows),
            "outcome": sum(t["outcome"] != "unknown" for t in rows),
            "plottable": sum(_plottable(t) for t in rows),
        })
    for path in sorted(snapshot.glob("csv_*.csv")) + [snapshot / "bre.csv"]:
        if path.name in by_file:
            continue
        if path.name not in UNMAPPED:
            raise ValueError(f"{path.name} is neither mapped in SOURCES nor listed in UNMAPPED")
        out.append({
            "file": f"{path.name} (not test rows)",
            "investigation": UNMAPPED[path.name][0],
            "rows": _nonblank_rows(path),
            "o2": 0, "pressure": 0, "outcome": 0, "plottable": 0,
        })
    out.sort(key=lambda r: (int(r["investigation"].split("-")[1]), r["file"]))
    return out


def render(snapshot, tests):
    rows = measure(snapshot, tests)
    keys = ("rows", "o2", "pressure", "outcome", "plottable")
    lines = [MARKER] + HEADER
    for r in rows:
        lines.append(f"| {r['file']} | {r['investigation']} | " + " | ".join(str(r[k]) for k in keys) + " |")
    lines.append("| TOTAL | | " + " | ".join(str(sum(r[k] for r in rows)) for k in keys) + " |")
    n = sum(r["plottable"] for r in rows)
    lines += ["", f"Plotted {n} of {len(tests)} tests."]
    return "\n".join(lines) + "\n"


def split_doc(text):
    """(everything before the marker line, the table section from the marker to the end); (text, None) if no marker."""
    lines = text.splitlines(keepends=True)
    for i, line in enumerate(lines):
        if line.rstrip("\r\n") == MARKER:
            return "".join(lines[:i]), "".join(lines[i:])
    return text, None


def update_doc(path, snapshot, tests):
    path = Path(path)
    with open(path, encoding="utf-8", newline="") as handle:
        head, section = split_doc(handle.read())
    if section is None:
        raise ValueError(f"{path} has no '{MARKER}' line")
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(head + render(snapshot, tests))
