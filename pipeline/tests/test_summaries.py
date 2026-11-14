# Generated with Claude, SI-assisted
import json
import re
from datetime import datetime
from pathlib import Path

import jsonschema

from ffpipe.build import SNAPSHOT, build_tests, load_summaries
from ffpipe.experiments import build_experiments, build_psi_text
from ffpipe.sources import FIRE_IDS

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "data" / "build"
TAGS = {"prevention", "detection", "suppression", "material flammability", "fire growth", "partial-gravity proxy"}
NUMBER = re.compile(r"\d+(?:\.\d+)?")


def _norm(text):
    return " ".join(text.split())


def _texts():
    return {t["id"]: t for t in build_psi_text(SNAPSHOT)}


def _all_text(t):
    return _norm(" ".join(t[k] or "" for k in ("objective", "approach", "description")))


def test_summaries_cover_all_ids():
    assert set(load_summaries()) == set(FIRE_IDS) and len(FIRE_IDS) == 22


def test_quotes_are_verbatim_psi_text():
    texts = _texts()
    for inv, s in load_summaries().items():
        t = texts[inv]
        fields = [_norm(t[k]) for k in ("objective", "approach", "description") if t[k]]
        for quote in s["quotes"]:
            assert quote == _norm(quote), (inv, quote)
            assert any(quote in f for f in fields), (inv, quote)


def test_summary_shape():
    for inv, s in load_summaries().items():
        assert s["model"].strip(), inv
        datetime.fromisoformat(s["made_at"])
        sentences = [x for x in re.split(r"(?<=[.!?])\s+", s["text"].strip()) if x]
        assert 2 <= len(sentences) <= 3 and len(s["text"]) < 500, inv
        assert 1 <= len(s["quotes"]) <= 3, inv
        assert set(s["tags"]) <= TAGS, inv


def test_numbers_in_summary_appear_in_psi_text():
    texts = _texts()
    for inv, s in load_summaries().items():
        allowed = set(NUMBER.findall(_all_text(texts[inv])))
        for number in NUMBER.findall(s["text"]):
            assert number in allowed, (inv, number)


def test_experiments_json_has_summaries_and_validates():
    experiments = json.loads((BUILD / "experiments.json").read_text(encoding="utf-8"))
    jsonschema.validate(experiments, json.loads((ROOT / "contracts" / "experiments.schema.json").read_text(encoding="utf-8")))
    assert len(experiments) == 22 and all(e["summary"] for e in experiments)
    golden = {e["id"]: e for e in experiments}["PSI-98"]
    assert golden["tags"] == ["fire growth", "material flammability"]


def test_committed_build_equals_fresh_build():
    tests = build_tests(SNAPSHOT)
    fresh = {
        "tests.json": tests,
        "experiments.json": build_experiments(SNAPSHOT, tests, load_summaries()),
        "psi-text.json": build_psi_text(SNAPSHOT),
    }
    for name, data in fresh.items():
        assert json.loads((BUILD / name).read_text(encoding="utf-8")) == data, name
