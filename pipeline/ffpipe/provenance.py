# Generated with Muse Spark, SI-assisted
"""provenance.json: what each source CSV contributed (queue B19).

One entry per source CSV in data/psi-snapshot/ that the pipeline reads or
deliberately skips: investigation, file name, rows read, rows mapped to
tests.json, and for oxygen, pressure, flow, outcome and burn time how many
cells were parsed, empty, or present but not parsable. Unit strings seen and
the conversion applied come from contracts/README.md; up to three raw cells
that could not be parsed are quoted exactly with their row number. Skipped
files carry the reason from the pipeline's UNMAPPED table (which encodes
contracts/COVERAGE.md). Everything is counted from the files, nothing typed.
"""

from .normalize import _PRESSURE_FACTORS, parse_burn, parse_flow, parse_o2, parse_pressure
from .parsers import PARSERS
from .sources import FIELD_ORDER, SOURCES, UNMAPPED

_UNIT_WORDS = ("mmhg", "atm", "bar", "kpa", "psi")

# Outcome inputs per parser: the cells the recorded outcome is read from.
_OUTCOME_INPUTS = {
    "flex": ("outcome",),
    "cfig": ("outcome", "hot", "comments"),
    "saffire": ("burn_time_s",),
}


def _cell(row, header):
    if header is None:
        return ""
    return (row.get(header) or "").strip()


def _classify_o2(raw, kind):
    if not raw:
        return "empty"
    value, lo, hi, _note = parse_o2(raw, kind)
    if value is not None or lo is not None:
        return "parsed"
    return "unparsable"


def _classify_single(raw, parse):
    if not raw:
        return "empty"
    return "parsed" if parse(raw) is not None else "unparsable"


def _entry_for_spec(spec, rows):
    cols = spec.columns
    counts = {name: {"parsed": 0, "empty": 0, "unparsable": 0} for name in FIELD_ORDER}
    bad = []

    def note(field, number, raw):
        if len(bad) < 3:
            bad.append({"field": field, "row": number, "raw": raw})

    for number, row in rows:
        o2_raw = _cell(row, cols.get("o2_pct"))
        if "o2_pct" in cols:
            cls = _classify_o2(o2_raw, spec.o2_kind)
            counts["o2_pct"][cls] += 1
            if cls == "unparsable":
                note("o2_pct", number, o2_raw)
        p_raw = _cell(row, cols.get("pressure_kpa"))
        if "pressure_kpa" in cols:
            cls = _classify_single(p_raw, lambda r: parse_pressure(r, spec.pressure_unit))
            counts["pressure_kpa"][cls] += 1
            if cls == "unparsable":
                note("pressure_kpa", number, p_raw)
        f_raw = _cell(row, cols.get("flow_cm_s"))
        if "flow_cm_s" in cols:
            cls = _classify_single(f_raw, parse_flow)
            counts["flow_cm_s"][cls] += 1
            if cls == "unparsable":
                note("flow_cm_s", number, f_raw)
        b_raw = _cell(row, cols.get("burn_time_s"))
        if "burn_time_s" in cols:
            cls = _classify_single(b_raw, parse_burn)
            counts["burn_time_s"][cls] += 1
            if cls == "unparsable":
                note("burn_time_s", number, b_raw)
        outcome, raw = _classify_outcome(spec, row, number)
        counts["outcome"][outcome] += 1
        if outcome == "unparsable":
            note("outcome", number, raw)

    units = {}
    if "o2_pct" in cols:
        units["o2_pct"] = {
            "column": cols["o2_pct"],
            "kind": spec.o2_kind,
            "conversion": "mole fraction x100 to percent"
            if spec.o2_kind == "fraction"
            else "percent as recorded",
        }
    if "pressure_kpa" in cols:
        units["pressure_kpa"] = {
            "column": cols["pressure_kpa"],
            "unit": spec.pressure_unit,
            "factor": _PRESSURE_FACTORS[spec.pressure_unit.lower()],
            "cell_overrides": sorted(
                {w for _, row in rows for w in _units_in(_cell(row, cols["pressure_kpa"]))
                 if w != spec.pressure_unit.lower()}
            ),
        }
    if "flow_cm_s" in cols:
        units["flow_cm_s"] = {"column": cols["flow_cm_s"], "unit": "cm/s"}
    if "burn_time_s" in cols:
        units["burn_time_s"] = {"column": cols["burn_time_s"], "unit": "s"}

    return {
        "file": spec.file,
        "investigation": spec.investigation,
        "mapped": True,
        "rows_read": len(rows),
        "rows_mapped": len(rows),
        "columns": {name: cols.get(name) for name in FIELD_ORDER},
        "units": units,
        "fields": counts,
        "unparsable_cells": bad,
    }


def _units_in(text):
    lowered = (text or "").lower()
    return [w for w in _UNIT_WORDS if w in lowered]


def _classify_outcome(spec, row, number):
    """(status, raw cell) for the outcome of one parsed row."""
    inputs = _OUTCOME_INPUTS.get(spec.parser, ())
    raws = {name: _cell(row, spec.columns.get(name)) for name in inputs}
    outcome = PARSERS[spec.parser](spec, row, number)["outcome"]
    if outcome != "unknown":
        return ("parsed", "")
    if not inputs or not any(raws.values()):
        return ("empty", "")
    first = next(raw for raw in (raws[n] for n in inputs) if raw)
    return ("unparsable", first)


def build_provenance(snapshot):
    """Count every source CSV in the snapshot: mapped specs then skipped files."""
    from .build import read_rows
    from pathlib import Path

    entries = []
    for spec in SOURCES.values():
        rows = list(enumerate(read_rows(Path(snapshot) / spec.file), start=1))
        entries.append(_entry_for_spec(spec, rows))
    for name, (investigation, reason) in UNMAPPED.items():
        rows = list(read_rows(Path(snapshot) / name))
        entries.append({
            "file": name,
            "investigation": investigation,
            "mapped": False,
            "rows_read": len(rows),
            "rows_mapped": 0,
            "reason": reason,
            "columns": {},
            "units": {},
            "fields": {},
            "unparsable_cells": [],
        })
    return entries
