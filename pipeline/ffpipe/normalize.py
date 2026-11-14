# Generated with Claude, SI-assisted
"""Cell normalization. Never invent a value: unparseable -> None + note."""

import re

_NUMBER = re.compile(r"[-+]?\d+(?:\.\d+)?")
_PRESSURE_FACTORS = {"mmhg": 0.133322, "atm": 101.325, "bar": 100.0, "kpa": 1.0, "psi": 6.894757}
_UNIT_WORDS = ("mmhg", "atm", "bar", "kpa", "psi")


def _num(text):
    match = _NUMBER.search(text)
    return float(match.group(0)) if match else None


def _convert(value, kind):
    return value * 100.0 if kind == "fraction" else value


def _valid(value, kind):
    if kind == "fraction":
        return 0.0 <= value <= 1.0
    return 0.0 <= value <= 100.0


def _single(text, kind):
    value = _num(text)
    if value is None or not _valid(value, kind):
        return None
    return round(_convert(value, kind), 2)


def parse_o2(raw, kind):
    """Return (o2_pct, o2_pct_min, o2_pct_max, o2_note).

    kind is "percent" (cell already 0-100) or "fraction" (mole fraction 0-1).
    """
    text = (raw or "").strip()
    if not text:
        return (None, None, None, None)
    if text.startswith("~"):
        value = _single(text[1:], kind)
        if value is None:
            return (None, None, None, f"unparseable in source: {text}")
        return (value, None, None, "approximate")
    if ";" in text:
        parts = [part.strip() for part in text.split(";") if part.strip()]
        values = []
        for part in parts:
            value = _num(part)
            if value is None or not _valid(value, kind):
                return (None, None, None, f"unparseable in source: {text}")
            values.append(round(_convert(value, kind), 2))
        if not values:
            return (None, None, None, f"unparseable in source: {text}")
        return (None, min(values), max(values), f"list in source: {text}")
    lowered = text.lower()
    sep = None
    if " - " in text:
        sep = " - "
    elif " to " in lowered:
        sep = " to "
    if sep is not None:
        left, _, right = lowered.partition(sep)
        lo_raw, hi_raw = _num(left), _num(right)
        if lo_raw is None or hi_raw is None or not _valid(lo_raw, kind) or not _valid(hi_raw, kind):
            return (None, None, None, f"unparseable in source: {text}")
        lo = round(_convert(min(lo_raw, hi_raw), kind), 2)
        hi = round(_convert(max(lo_raw, hi_raw), kind), 2)
        return (round((lo + hi) / 2.0, 2), lo, hi, f"range in source: {text}")
    value = _single(text, kind)
    if value is None:
        return (None, None, None, f"unparseable in source: {text}")
    return (value, None, None, None)


def parse_pressure(raw, unit):
    """Pressure cell -> kPa (column unit unless the cell names its own)."""
    text = (raw or "").strip()
    if not text or ";" in text:
        return None
    lowered = text.lower()
    factor = _PRESSURE_FACTORS[unit.lower()]
    for word in _UNIT_WORDS:
        if word in lowered:
            factor = _PRESSURE_FACTORS[word]
            break
    value = _num(text)
    if value is None:
        return None
    result = round(value * factor, 2)
    # 0 kPa is not a physical test pressure (csv_69_34.csv row 114 says 0 mmHg): treat as unparseable.
    if result <= 0 or result > 400:
        return None
    return result


def _is_range(text):
    lowered = text.lower()
    return " - " in text or " to " in lowered or ";" in text


def parse_flow(raw):
    text = (raw or "").strip()
    if not text or _is_range(text):
        return None
    value = _num(text)
    return round(value, 2) if value is not None else None


def parse_burn(raw):
    text = (raw or "").strip()
    if not text or _is_range(text):
        return None
    value = _num(text)
    if value is None or value < 0:
        return None
    return round(value, 2)
