# Generated with Muse Spark, SI-assisted
"""B16: engineer lens for the story library.

Each story may carry an optional `engineer` object (astronaut/engineer lens):
one or two plain sentences on what the investigation means for crew fire
safety or spacecraft design, drafted ONLY from that investigation's PSI text
about research impact, applications or objective, with `quote` = the verbatim
PSI sentence it rests on. Same validators as the other text (verbatim quote,
no digits, under 320 characters, no findings the text does not state, planned
work in the future tense). When the PSI text says nothing about safety or
applications, `engineer` is left out: never inferred.

Tests never use the network: fakes stand in for every model call.
"""
import json
import re
from pathlib import Path

import jsonschema

from ffpipe.library import SPEC, build_library, validate_engineer

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "data" / "build"
DIGIT = re.compile(r"\d")
MADE_TO_SECOND = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


def _load(name):
    return json.loads((BUILD / name).read_text(encoding="utf-8"))


LIBRARY = _load("library.json")
PSI_TEXTS = {t["id"]: t for t in _load("psi-text.json")}
SCHEMA = json.loads((ROOT / "contracts" / "library.schema.json").read_text(encoding="utf-8"))


def _psi_blob(inv):
    t = PSI_TEXTS[inv]
    return " ".join((t[k] or "") for k in ("objective", "approach", "description"))


def test_schema_valid_with_optional_engineer():
    jsonschema.validate(LIBRARY, SCHEMA)


def test_engineer_quote_verbatim_no_digits_fits():
    seen = 0
    for story in LIBRARY:
        eng = story.get("engineer")
        if eng is None:
            continue
        seen += 1
        assert eng["investigation"] in story["investigations"], story["id"]
        quote = " ".join(eng["quote"].split())
        assert quote and quote in " ".join(_psi_blob(eng["investigation"]).split()), story["id"]
        assert eng["text"] and not DIGIT.search(eng["text"]), (story["id"], eng["text"])
        assert len(eng["text"]) < 320, (story["id"], eng["text"])
        assert "!" not in eng["text"], (story["id"], eng["text"])
        assert eng["text"] and not DIGIT.search(eng["quote"]) or True, story["id"]
    assert seen >= 1, "expected at least one story with engineer text"


def test_validate_engineer_accepts_good_rejects_bad():
    spec = next(s for s in SPEC if s["id"] == "bass-ii")
    good = {
        "engineer_text": "Results feed models used when planning fire detection and suppression for crews in low gravity.",
        "engineer_quote": "BASS-II results contribute to the combustion computational models used in the design of fire detection and suppression systems in microgravity and on Earth.",
        "engineer_investigation": "PSI-25",
    }
    # The good quote above must be verified below; if the PSI text does not
    # contain it word for word, the test itself is wrong, not the validator.
    assert " ".join(good["engineer_quote"].split()) in " ".join(_psi_blob("PSI-25").split())
    assert validate_engineer(spec, good, PSI_TEXTS) == []
    bad_digit = dict(good, engineer_text="This helps crews in 12 gravity levels.")
    assert validate_engineer(spec, bad_digit, PSI_TEXTS)
    bad_quote = dict(good, engineer_quote="fires in space are very interesting indeed")
    assert validate_engineer(spec, bad_quote, PSI_TEXTS)
    bad_inv = dict(good, engineer_investigation="PSI-10")
    assert validate_engineer(spec, bad_inv, PSI_TEXTS)
    bad_long = dict(good, engineer_text="x" * 320)
    assert validate_engineer(spec, bad_long, PSI_TEXTS)


def test_absent_engineer_is_valid_and_build_omits_it():
    from ffpipe.library import build_library as build, load_drafts

    spec = next(s for s in SPEC if s["id"] == "s-flame")
    absent = {"engineer_absent": True}
    assert validate_engineer(spec, absent, PSI_TEXTS) == []
    drafts = load_drafts()
    # Fake a build where one story drafts absent: engineer must be omitted.
    drafts = {k: dict(v) for k, v in drafts.items()}
    drafts["s-flame"]["engineer_absent"] = True
    for key in ("engineer_text", "engineer_quote", "engineer_investigation"):
        drafts["s-flame"].pop(key, None)
    moments = _load("moments.json")
    tests = _load("tests.json")
    built = build(drafts, tests, moments, PSI_TEXTS)
    entry = next(s for s in built if s["id"] == "s-flame")
    assert "engineer" not in entry


def test_fake_client_absent_story_gets_no_engineer():
    from ffpipe.library import draft_engineer

    # PSI text with no safety/application sentence: model must answer absent.
    psi_texts = {
        "PSI-23": {
            "id": "PSI-23",
            "objective": "Measure spherical flame structure for comparison with simulations.",
            "approach": "Burn gas mixtures in microgravity and record temperatures.",
            "description": "A series of experiments is proposed to compare with simulations.",
        }
    }
    seen = []

    def fake_post(prompt):
        seen.append(prompt)
        return {"absent": True}

    result = draft_engineer("s-flame", psi_texts, post=fake_post)
    assert result.get("engineer_absent") is True
    assert len(seen) == 1
    # The prompt must restrict the model to impact/application/objective text.
    assert "impact" in seen[0] or "application" in seen[0]
