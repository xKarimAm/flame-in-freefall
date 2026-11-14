# Generated with Claude, SI-assisted
"""One parser per CSV family. Input rows are dicts keyed by exact header."""

from .normalize import parse_burn, parse_flow, parse_o2, parse_pressure
from .sources import FIELD_ORDER, PSI_URL, test_id

_NO_IGNITION = ("no ignition", "failed to ignite", "not ignited", "did not ignite")
# A comment that also says "abort" mixes several sub-runs: not a clear no-ignition.
_AMBIGUOUS = ("no hot ignition", "abort")


def _cell(row, header):
    if header is None:
        return ""
    return (row.get(header) or "").strip()


def flex_outcome(raw):
    text = (raw or "").strip()
    mapping = {"extinction": "extinction", "disruption": "disruption", "completion": "completion"}
    outcome = mapping.get(text.lower())
    if outcome is None:
        return ("unknown", None)
    return (outcome, text)


def cfig_outcome(hot_raw, self_raw, comments, outcome_header):
    hot = (hot_raw or "").strip()
    code = (self_raw or "").strip()
    raw = f"Hot ignition: {hot}; {outcome_header}: {code}"
    if hot.lower() == "no":
        text = (comments or "").lower()
        says_no_ignition = any(p in text for p in _NO_IGNITION) and not any(p in text for p in _AMBIGUOUS)
        return ("no-ignition", raw) if says_no_ignition else ("unknown", raw)
    if code.upper() == "SE":
        return ("self-extinguished", raw)
    if code.upper() == "FT":
        return ("flow-terminated", raw)
    return ("unknown", raw)


def saffire_outcome(burn):
    if burn is None:
        return ("unknown", None)
    return ("burned", f"Burn Time (s) = {burn:g}")


def _base(spec, row_number, fuel):
    return {
        "id": test_id(spec, row_number),
        "investigation": spec.investigation,
        "fuel": fuel if fuel else None,
        "fuel_class": spec.fuel_class,
        # Every mapped PSI file is a microgravity dataset; the '1-g Burn Length' column in csv_99_39.csv is a comparison measurement, not a 1-g test row.
        "gravity": "micro-g",
        "o2_pct": None,
        "o2_pct_min": None,
        "o2_pct_max": None,
        "o2_note": None,
        "pressure_kpa": None,
        "flow_cm_s": None,
        "outcome": "unknown",
        "outcome_raw": None,
        "burn_time_s": None,
        "source": {
            "file": spec.file,
            "row": row_number,
            "url": PSI_URL.format(investigation=spec.investigation),
            "fields": {
                name: spec.columns[name]
                for name in FIELD_ORDER
                if name in spec.columns
            },
        },
    }


def _fill_common(spec, row, out):
    cols = spec.columns
    if "o2_pct" in cols:
        value, lo, hi, note = parse_o2(_cell(row, cols["o2_pct"]), spec.o2_kind)
        out["o2_pct"], out["o2_pct_min"], out["o2_pct_max"], out["o2_note"] = value, lo, hi, note
    if "pressure_kpa" in cols:
        raw = _cell(row, cols["pressure_kpa"])
        out["pressure_kpa"] = parse_pressure(raw, spec.pressure_unit)
        if raw and out["pressure_kpa"] is None:
            out["pressure_note"] = raw  # key only present when a cell could not be parsed
    if "flow_cm_s" in cols:
        raw = _cell(row, cols["flow_cm_s"])
        out["flow_cm_s"] = parse_flow(raw)
        if raw and out["flow_cm_s"] is None:
            out["flow_note"] = raw
    if "burn_time_s" in cols:
        out["burn_time_s"] = parse_burn(_cell(row, cols["burn_time_s"]))
    return out


def _make(spec, row, number, outcome=("unknown", None)):
    out = _base(spec, number, _cell(row, spec.columns.get("fuel")))
    _fill_common(spec, row, out)
    out["outcome"], out["outcome_raw"] = outcome
    return out


def parse_flex(spec, row, number):
    return _make(spec, row, number, flex_outcome(_cell(row, spec.columns["outcome"])))


def parse_flex2(spec, row, number):
    return _make(spec, row, number)


def parse_cfi(spec, row, number):
    return _make(spec, row, number)


def parse_cfig(spec, row, number):
    cols = spec.columns
    outcome = cfig_outcome(
        _cell(row, cols["hot"]),
        _cell(row, cols["outcome"]),
        _cell(row, cols["comments"]),
        cols["outcome"],
    )
    return _make(spec, row, number, outcome)


def parse_flame_design(spec, row, number):
    return _make(spec, row, number)


def parse_spice(spec, row, number):
    return _make(spec, row, number)


def parse_saffire(spec, row, number):
    cols = spec.columns
    burn = parse_burn(_cell(row, cols["burn_time_s"])) if "burn_time_s" in cols else None
    return _make(spec, row, number, saffire_outcome(burn))


def parse_bass2(spec, row, number):
    return _make(spec, row, number)


def parse_bass(spec, row, number):
    return _make(spec, row, number)


def parse_same(spec, row, number):
    return _make(spec, row, number)


PARSERS = {
    "flex": parse_flex,
    "flex2": parse_flex2,
    "cfi": parse_cfi,
    "cfig": parse_cfig,
    "flame_design": parse_flame_design,
    "spice": parse_spice,
    "saffire": parse_saffire,
    "bass2": parse_bass2,
    "bass": parse_bass,
    "same": parse_same,
}
