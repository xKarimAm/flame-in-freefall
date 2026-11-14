# Generated with Claude, SI-assisted
"""moments.json: one computed fact per entry, from the built test rows only (contracts/moments.schema.json).

A moment exists only when the fields it needs are recorded; nothing is estimated or typed.
"""

import re

BURNED = ("burned", "completion", "flow-terminated")  # = web/src/contract.ts OUTCOME_GROUP
WENT_OUT = ("extinction", "self-extinguished")

# kind -> (row field, unit, label subject)
RANGES = {
    "o2-range": ("o2_pct", "%", "oxygen concentration"),
    "pressure-range": ("pressure_kpa", "kPa", "ambient pressure"),
    "flow-range": ("flow_cm_s", "cm/s", "flow speed"),
}


def _order(row):
    """Natural id order (PSI-69#2 before PSI-69#10), so ties go to the lowest id deterministically."""
    return tuple(int(n) for n in re.findall(r"\d+", row["id"]))


def _extreme(rows, field, pick, get=None):
    """First row (lowest id) holding the min or max of field (or of get(row))."""
    get = get or (lambda r: r[field])
    rows = sorted(rows, key=_order)
    best = pick(get(r) for r in rows)
    return next(r for r in rows if get(r) == best)


def _first(*values):
    return next((v for v in values if v is not None), None)


def _o2_low(r):  # recorded lower bound: o2_pct_min of a source range, else the point value
    return _first(r.get("o2_pct_min"), r["o2_pct"])


def _o2_high(r):
    return _first(r.get("o2_pct_max"), r["o2_pct"])


def _moment(inv, kind, label, value, unit, rows, url, method, *, id_suffix="", value_max=None, fuel=None, n=None, outcome=None):
    moment = {"id": f"{inv}.{kind}{id_suffix}", "investigation": inv, "kind": kind, "label": label, "value": value}
    if value_max is not None:
        moment["value_max"] = value_max
    moment["unit"] = unit
    if outcome:
        moment["outcome"] = outcome
    if fuel is not None:
        moment["fuel"] = fuel
    if n is not None:
        moment["n"] = n
    moment.update({"test_ids": [r["id"] for r in rows], "url": url, "method": method})
    return moment


def build_moments(tests, experiments):
    acronyms = {e["id"]: e["acronym"] or e["id"] for e in experiments}
    by_inv = {}
    for row in tests:
        by_inv.setdefault(row["investigation"], []).append(row)
    out = []
    for inv, rows in by_inv.items():
        acr, url, total = acronyms[inv], rows[0]["source"]["url"], len(rows)
        out.append(_moment(inv, "tests-count", f"Number of tests recorded for {acr}", total, "tests", [], url,
                           f"count of rows in tests.json for {inv} ({total} rows)"))
        for kind, (field, unit, subject) in RANGES.items():
            low, high = (_o2_low, _o2_high) if field == "o2_pct" else (lambda r: r[field],) * 2
            have = [r for r in rows if low(r) is not None]
            if have:
                lo, hi = _extreme(have, field, min, low), _extreme(have, field, max, high)
                how = "min of o2_pct_min (else o2_pct) and max of o2_pct_max (else o2_pct)" if field == "o2_pct" else f"min and max of {field}"
                out.append(_moment(inv, kind, f"Range of {subject} across {acr} tests", low(lo), unit, list({r["id"]: r for r in (lo, hi)}.values()), url,
                                   f"{how}, rows where {'a bound or o2_pct' if field == 'o2_pct' else field} is recorded ({len(have)} of {total} rows)",
                                   value_max=high(hi), n=len(have)))
        have = [r for r in rows if r.get("burn_time_s") is not None]
        if have:
            top = _extreme(have, "burn_time_s", max)
            out.append(_moment(inv, "longest-burn", f"Longest recorded burn time in {acr}", top["burn_time_s"], "s", [top], url,
                               f"max of burn_time_s, rows where burn_time_s is recorded ({len(have)} of {total} rows)",
                               fuel=top["fuel"], n=len(have)))
        for kind, group, pick, label, how in (
            ("lowest-o2-burned", BURNED, min, f"Lowest oxygen at which {acr} recorded a sustained burn", "min"),
            ("highest-o2-went-out", WENT_OUT, max, f"Highest oxygen at which {acr} recorded a flame going out", "max"),
        ):
            have = [r for r in rows if r["outcome"] in group and r["o2_pct"] is not None]
            if have:
                top = _extreme(have, "o2_pct", pick)
                out.append(_moment(inv, kind, label, top["o2_pct"], "%", [top], url,
                                   f"{how} of o2_pct, rows with outcome {' / '.join(group)} and o2_pct recorded ({len(have)} of {total} rows)",
                                   fuel=top["fuel"], n=len(have)))
        for outcome in sorted({r["outcome"] for r in rows} - {"unknown"}):
            count = sum(r["outcome"] == outcome for r in rows)
            out.append(_moment(inv, "outcome-count", f"Number of {acr} tests that ended in {outcome}", count, "tests", [], url,
                               f"count of rows with outcome {outcome} ({count} of {total} rows)",
                               id_suffix=f"-{outcome}", outcome=outcome))
    return sorted(out, key=lambda m: m["id"])
