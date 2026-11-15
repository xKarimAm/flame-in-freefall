# Generated with Muse Spark, SI-assisted
"""B1: data/build/library.json (story library) is built by ffpipe.library.

Tests never use the network: they read the committed drafts file, the
committed library.json and the pipeline inputs, and check the validator
with fakes.
"""
import json
import re
from pathlib import Path

import jsonschema
import pytest

from ffpipe.library import (
    SPEC,
    SAMPLE_WALL_IDS,
    build_library,
    load_drafts,
    signature_for,
    validate_draft,
)

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "data" / "build"
DIGIT = re.compile(r"\d")
MADE_TO_SECOND = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


def _load(name):
    return json.loads((BUILD / name).read_text(encoding="utf-8"))


LIBRARY = _load("library.json")
MOMENTS = _load("moments.json")
TESTS = _load("tests.json")
PSI_TEXTS = {t["id"]: t for t in _load("psi-text.json")}
MOMENT_IDS = {m["id"] for m in MOMENTS}
SCHEMA = json.loads((ROOT / "contracts" / "library.schema.json").read_text(encoding="utf-8"))


def _psi_text(inv):
    t = PSI_TEXTS[inv]
    return " ".join((t[k] or "") for k in ("objective", "approach", "description"))


def test_validates_and_ids_unique():
    jsonschema.validate(LIBRARY, SCHEMA)
    ids = [s["id"] for s in LIBRARY]
    assert len(ids) == len(set(ids))


def test_spec_covers_22_investigations_once():
    covered = [inv for s in SPEC for inv in s["investigations"]]
    assert len(covered) == 22 == len(set(covered))
    from ffpipe.sources import FIRE_IDS

    assert set(covered) == set(FIRE_IDS)
    assert [s["id"] for s in LIBRARY] == [s["id"] for s in SPEC]


def test_signature_rule_recomputed_from_tests():
    by_inv = {}
    for t in TESTS:
        by_inv.setdefault(t["investigation"], []).append(t)
    for story in LIBRARY:
        rows = [t for inv in story["investigations"] for t in by_inv.get(inv, [])]
        if not rows:
            expected = "paper-trail"
        elif story["id"] in SAMPLE_WALL_IDS:
            expected = "sample-wall"
        elif any(t["o2_pct"] is not None and t["pressure_kpa"] is not None for t in rows):
            expected = "condition-map"
        else:
            expected = "outcome-strip"
        assert story["signature"] == expected == signature_for(story["investigations"], by_inv), story["id"]


def test_core_quote_is_verbatim_psi_text():
    for story in LIBRARY:
        quote = " ".join(story["core"]["quote"].split())
        inv = story["core"]["investigation"]
        assert inv in story["investigations"], story["id"]
        assert quote and quote in " ".join(_psi_text(inv).split()), story["id"]


def test_text_has_no_digits_and_fits():
    for story in LIBRARY:
        for key in ("hook", "reveal", "bridge"):
            text = story[key]
            assert text and not DIGIT.search(text), (story["id"], key, text)
            assert len(text) < 320, (story["id"], key)
            assert "!" not in text, (story["id"], key)


def test_moments_exist_and_tests_count_is_last():
    for story in LIBRARY:
        assert all(m in MOMENT_IDS for m in story["moments"]), story["id"]
        if story["moments"]:
            kinds = [m.rsplit(".", 1)[1] for m in story["moments"]]
            assert "tests-count" in kinds, story["id"]
            assert kinds[-1] == "tests-count", story["id"]
        else:
            assert not any(t["investigation"] in story["investigations"] for t in TESTS), story["id"]


def test_ai_tag_is_model_and_utc_second():
    for story in LIBRARY:
        assert story["ai"]["model"].strip(), story["id"]
        assert MADE_TO_SECOND.match(story["ai"]["made_at"]), (story["id"], story["ai"]["made_at"])


def test_validator_rejects_digit_and_nonverbatim_quote():
    inv = "PSI-69"
    good = {
        "core_quote": "map the flammability limits of liquid fuels in microgravity environments",
        "core_investigation": inv,
        "hook": "Some fires can burn without any flame you can see.",
        "reveal": "The crew lit drops of fuel and watched how they burned.",
        "bridge": "Moon air holds more oxygen, so these limits matter there too.",
    }
    assert validate_draft(SPEC[3], good, PSI_TEXTS) == []
    bad_digit = dict(good, hook="They lit 12 drops and watched.")
    assert validate_draft(SPEC[3], bad_digit, PSI_TEXTS)
    bad_quote = dict(good, core_quote="fires in space are very interesting indeed")
    assert validate_draft(SPEC[3], bad_quote, PSI_TEXTS)
    bad_inv = dict(good, core_investigation="PSI-10")
    assert validate_draft(SPEC[3], bad_inv, PSI_TEXTS)


def test_committed_library_equals_fresh_build():
    assert build_library(load_drafts(), TESTS, MOMENTS, PSI_TEXTS) == LIBRARY
