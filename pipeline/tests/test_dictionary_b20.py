# Generated with Muse Spark, SI-assisted
"""B20: dictionary.json documents every field of every data/build file.

For each field: name, type, unit, meaning in one plain sentence, and how
many records have it non-null. This test walks the built files with
independent code and requires every field to be documented, with matching
record counts and non-null counts: the committed numbers are never typed.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
BUILD = DATA / "build"
FILES = ("tests.json", "experiments.json", "moments.json", "library.json",
         "coverage.json", "search.json", "provenance.json")

DICT = json.loads((BUILD / "dictionary.json").read_text(encoding="utf-8"))
BY_KEY = {(e["file"], e["field"]): e for e in DICT}


def _walk(obj, prefix=""):
    """Independent walker: dotted paths of every value in the file."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            path = f"{prefix}.{key}" if prefix else key
            yield path, value
            yield from _walk(value, path)
    elif isinstance(obj, list):
        for item in obj:
            if isinstance(item, (dict, list)):
                yield from _walk(item, prefix)


def _records(name):
    data = json.loads((BUILD / name).read_text(encoding="utf-8"))
    return data if isinstance(data, list) else [data]


def test_every_field_is_documented():
    for name in FILES:
        seen = set()
        for record in _records(name):
            for path, _value in _walk(record):
                seen.add(path)
        missing = [p for p in sorted(seen) if (name, p) not in BY_KEY]
        assert not missing, (name, missing)


def _get(node, parts):
    if not parts:
        return node
    if isinstance(node, dict):
        return _get(node.get(parts[0]), parts[1:])
    if isinstance(node, list):
        vals = [_get(item, parts) for item in node if _get(item, parts) is not None]
        return vals or None
    return None


def test_counts_match_recomputation():
    for name in FILES:
        records = _records(name)
        for entry in [e for e in DICT if e["file"] == name]:
            assert entry["records"] == len(records), (name, entry["field"])
            path = entry["field"].split(".")
            non_null = sum(1 for record in records if _get(record, path) is not None)
            assert entry["non_null"] == non_null, (name, entry["field"])


def test_units_and_meanings_spot_check():
    assert BY_KEY[("tests.json", "o2_pct")]["unit"] == "percent"
    assert BY_KEY[("tests.json", "pressure_kpa")]["unit"] == "kPa"
    assert "oxygen" in BY_KEY[("tests.json", "o2_pct")]["meaning"].lower()
    assert all(e["meaning"].strip().endswith(".") for e in DICT)
    assert len(DICT) > 50
