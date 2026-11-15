# Generated with Muse Spark, SI-assisted
"""B14: re-drafting a story passes the reviewer's exact objection to the model.

Tests use a fake client, never the network: the fake captures the prompt so
the test can prove the objection text reached the model, and returns canned
drafts so validation and retry behave like the real run.
"""
import json
from pathlib import Path

import pytest

from ffpipe.library import SPEC, draft_prompt, redraft_story, validate_draft

ROOT = Path(__file__).resolve().parents[2]
PSI_TEXTS = {t["id"]: t for t in
             json.loads((ROOT / "data" / "build" / "psi-text.json").read_text(encoding="utf-8"))}
BASS_II = next(s for s in SPEC if s["id"] == "bass-ii")

GOOD_DRAFT = {
    "core_quote": "Study the ignition, flame growth, flame spread, and extinction limits for solid fuels burning in low-velocity forced flows in microgravity.",
    "core_investigation": "PSI-25",
    "hook": "A small wind tunnel in space was built to ask how soft flows change the way solid fuels catch fire and go out.",
    "reveal": "The crew set small fuel samples inside a wind tunnel on the station and watched flames in gentle flows of air with less oxygen.",
    "bridge": "This work is about how air and flow change burning, which matters when choosing air for a Moon base.",
}


def test_objection_is_passed_to_model_on_redraft():
    seen = []

    def fake_post(prompt):
        seen.append(prompt)
        return dict(GOOD_DRAFT)

    entry = redraft_story("bass-ii", "Say what the experiment set out to find, not what it found.",
                          PSI_TEXTS, post=fake_post)
    assert len(seen) == 1
    assert "Say what the experiment set out to find, not what it found." in seen[0]
    assert entry["hook"] == GOOD_DRAFT["hook"]
    assert entry["ai"]["model"]
    assert validate_draft(BASS_II, entry, PSI_TEXTS) == []


def test_redraft_retries_invalid_answer_then_returns_valid():
    calls = []
    bad = dict(GOOD_DRAFT, hook="They lit 12 samples and watched.")

    def fake_post(prompt):
        calls.append(prompt)
        return bad if len(calls) == 1 else dict(GOOD_DRAFT)

    entry = redraft_story("bass-ii", "some objection", PSI_TEXTS, post=fake_post)
    assert len(calls) == 2
    assert entry["hook"] == GOOD_DRAFT["hook"]


def test_redraft_rejects_unknown_story():
    with pytest.raises(KeyError):
        redraft_story("no-such-story", "objection", PSI_TEXTS,
                      post=lambda prompt: dict(GOOD_DRAFT))


def test_prompt_carries_standing_rules_and_objection():
    base = draft_prompt(BASS_II, PSI_TEXTS)
    assert "no finding" in base
    assert "future" in base
    assert "superlative" in base
    with_objection = draft_prompt(BASS_II, PSI_TEXTS, objection="fix the hook")
    assert "fix the hook" in with_objection
    assert "fix the hook" not in base
