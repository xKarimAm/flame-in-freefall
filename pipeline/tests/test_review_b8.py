# Generated with Muse Spark, SI-assisted
"""B8: strict review of the night-backend branch, test-first.

Each test below recomputes from the committed data with plain code written
for this review, never through the module under test (except the small
branch-exercise tests, which call the module with fake rows on purpose).

Untested branches named by this review:
- library.signature_for: empty rows, one-variable rows, sample-wall override
  (only multi-row paths were covered via the committed build).
- library.moments_for: full kind-rank order (only tests-count-last was pinned).
- library.validate_draft: 319/320 length boundary, "!" rule, wrong
  core_investigation (only digit and non-verbatim quote were pinned).
- coverage.reason: the "not microgravity" branch has zero real rows, so no
  committed-data test can reach it; priority between the three null branches
  was mirrored, not independently pinned.
- search: the ground/modeling family entry (0 tests) and fuel-entry
  investigations lists were not pinned.
- audit.allowed_numbers: numbers were harvested from the raw JSON dump of
  experiments.json, so digits inside ids (PSI-159 -> "159"), DOIs and
  timestamps counted as allowed facts. A story claiming "159 tests" passed
  the audit. That is the one real gap found; the audit test below failed
  first and the fix narrowed the source to numeric JSON leaves.
"""
import json
from pathlib import Path

import ffpipe.audit as audit_mod
from ffpipe.coverage_json import reason
from ffpipe.library import (
    _KIND_RANK,
    _SAMPLE_WALL_INVS,
    SAMPLE_WALL_IDS,
    SPEC,
    moments_for,
    signature_for,
    validate_draft,
)
from ffpipe.sources import FAMILIES

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "data" / "build"

# Hand-recomputed from data/build/tests.json on 2026-11-15; pinned as
# literals so a wrong number in coverage.json fails loudly.
TOTAL_ROWS = 1883
PLOTTED_ROWS = 986
BY_REASON = {
    "no pressure recorded": 164,
    "no oxygen recorded": 11,
    "no oxygen or pressure recorded": 722,
    "not microgravity": 0,
}


def _load(name):
    return json.loads((BUILD / name).read_text(encoding="utf-8"))


def _plotted(row):
    return (
        row["gravity"] == "micro-g"
        and row["o2_pct"] is not None
        and row["pressure_kpa"] is not None
    )


def test_coverage_counts_recomputed_by_hand():
    tests = _load("tests.json")
    coverage = _load("coverage.json")
    assert len(tests) == TOTAL_ROWS
    assert coverage["total"] == TOTAL_ROWS
    plotted = sum(1 for t in tests if _plotted(t))
    assert plotted == PLOTTED_ROWS == coverage["plotted"]
    assert coverage["not_plotted"] == TOTAL_ROWS - PLOTTED_ROWS
    reasons = {r: 0 for r in BY_REASON}
    for t in tests:
        if _plotted(t):
            continue
        if t["gravity"] != "micro-g":
            reasons["not microgravity"] += 1
        elif t["o2_pct"] is None and t["pressure_kpa"] is None:
            reasons["no oxygen or pressure recorded"] += 1
        elif t["pressure_kpa"] is None:
            reasons["no pressure recorded"] += 1
        else:
            reasons["no oxygen recorded"] += 1
    assert reasons == BY_REASON == coverage["by_reason"]
    assert sum(reasons.values()) == coverage["not_plotted"]


def test_coverage_family_plotted_recomputed_by_hand():
    tests = _load("tests.json")
    coverage = _load("coverage.json")
    plotted_by_family = {}
    for t in tests:
        inv = t["investigation"]
        family = next(f for f, invs in FAMILIES.items() if inv in invs)
        entry = plotted_by_family.setdefault(family, [0, 0])
        entry[0] += 1
        if _plotted(t):
            entry[1] += 1
    assert set(coverage["by_family"]) == set(FAMILIES)
    for family, (total, plotted) in plotted_by_family.items():
        assert coverage["by_family"][family]["total"] == total, family
        assert coverage["by_family"][family]["plotted"] == plotted, family
    # Three hand-checked family totals: droplets mostly plot, solids never do.
    assert coverage["by_family"]["droplets"]["plotted"] == 357
    assert coverage["by_family"]["large-scale solids"]["plotted"] == 0
    assert coverage["by_family"]["smoke detection"]["plotted"] == 0


def test_reason_branches_with_fake_rows():
    both = {"gravity": "micro-g", "o2_pct": 21.0, "pressure_kpa": 101.0}
    assert reason(both) is None
    assert reason({**both, "gravity": "1-g"}) == "not microgravity"
    assert reason({**both, "o2_pct": None, "pressure_kpa": None}) == (
        "no oxygen or pressure recorded"
    )
    assert reason({**both, "pressure_kpa": None}) == "no pressure recorded"
    assert reason({**both, "o2_pct": None}) == "no oxygen recorded"
    # Priority: gravity first, then both-null before either single null.
    assert reason({"gravity": "1-g", "o2_pct": None, "pressure_kpa": None}) == (
        "not microgravity"
    )


def test_search_counts_recomputed_by_hand():
    experiments = _load("experiments.json")
    tests = _load("tests.json")
    search = _load("search.json")
    by_kind_id = {(e["kind"], e["id"]): e for e in search}
    inv_entries = [e for e in search if e["kind"] == "investigation"]
    assert len(inv_entries) == 22 == len(experiments)
    assert {e["id"] for e in inv_entries} == {e["id"] for e in experiments}
    fam_entries = [e for e in search if e["kind"] == "family"]
    assert len(fam_entries) == 6
    assert {e["id"] for e in fam_entries} == set(FAMILIES)
    # Three hand-recomputed search counts, plain loops only.
    counts = {}
    for t in tests:
        counts[t["investigation"]] = counts.get(t["investigation"], 0) + 1
    flex = by_kind_id[("investigation", "PSI-69")]
    assert flex["test_count"] == counts["PSI-69"] == 274
    cfig = by_kind_id[("investigation", "PSI-159")]
    assert cfig["test_count"] == counts["PSI-159"] == 333
    ground = by_kind_id[("family", "ground/modeling")]
    assert ground["test_count"] == 0
    assert ground["test_count"] == sum(
        e["test_count"] for e in experiments if e["family"] == "ground/modeling"
    )
    fuels = {}
    for t in tests:
        if t["fuel"]:
            fuels.setdefault(t["fuel"], {"count": 0, "invs": set()})
            fuels[t["fuel"]]["count"] += 1
            fuels[t["fuel"]]["invs"].add(t["investigation"])
    fuel_entries = [e for e in search if e["kind"] == "fuel"]
    assert len(fuel_entries) == len(fuels)
    assert len(search) == 22 + 6 + len(fuels)
    for e in fuel_entries:
        assert e["test_count"] == fuels[e["id"]]["count"], e["id"]
        assert set(e["investigations"]) == fuels[e["id"]]["invs"], e["id"]
    for e in search:
        assert e["terms"] == e["terms"].lower(), e["id"]


def test_signature_branches_with_fake_rows():
    assert signature_for(["PSI-68"], {}) == "paper-trail"
    both = [{"o2_pct": 21.0, "pressure_kpa": 101.0}]
    assert signature_for(["PSI-69"], {"PSI-69": both}) == "condition-map"
    o2_only = [{"o2_pct": 30.0, "pressure_kpa": None}]
    assert signature_for(["PSI-25"], {"PSI-25": o2_only}) == "sample-wall"
    assert signature_for(["PSI-68"], {"PSI-68": o2_only}) == "outcome-strip"
    neither = [{"o2_pct": None, "pressure_kpa": None}]
    assert signature_for(["PSI-68"], {"PSI-68": neither}) == "outcome-strip"
    # Sample-wall ids override the data rule even when rows hold both values.
    assert signature_for(["PSI-26"], {"PSI-26": both}) == "sample-wall"


def test_sample_wall_ids_match_sample_wall_sets():
    by_id = {s["id"]: s for s in SPEC}
    assert {frozenset(by_id[i]["investigations"]) for i in SAMPLE_WALL_IDS} == (
        _SAMPLE_WALL_INVS
    )


def test_moments_follow_kind_rank():
    moments = _load("moments.json")
    library = _load("library.json")
    by_id = {s["id"]: s for s in library}
    flex = by_id["flex"]["moments"]
    kinds = [m.rsplit(".", 1)[1] for m in flex]
    assert [kinds.index(k) for k in kinds] == sorted(
        range(len(kinds)), key=lambda i: _KIND_RANK[kinds[i]]
    )
    assert moments_for(["PSI-26"], moments) == ["PSI-26.tests-count"]
    assert moments_for(["PSI-20"], moments) == []


def test_validator_boundaries_with_fakes():
    psi = {
        "PSI-69": {
            "objective": "map the flammability limits of liquid fuels",
            "approach": "burn droplets in a chamber",
            "description": "",
        }
    }
    good = {
        "core_quote": "map the flammability limits of liquid fuels",
        "core_investigation": "PSI-69",
        "hook": "Some fires can burn without any flame you can see.",
        "reveal": "The crew lit drops of fuel and watched how they burned.",
        "bridge": "Moon air holds more oxygen, so these limits matter there too.",
    }
    assert validate_draft(SPEC[3], good, psi) == []
    assert validate_draft(SPEC[3], {**good, "hook": "x" * 319}, psi) == []
    assert validate_draft(SPEC[3], {**good, "hook": "x" * 320}, psi)
    assert validate_draft(SPEC[3], {**good, "reveal": "Look at this!"}, psi)
    assert validate_draft(
        SPEC[3], {**good, "core_investigation": "PSI-10"}, psi
    )
    assert validate_draft(
        SPEC[3], {**good, "core_quote": "burn droplets in a chamber"}, psi
    ) == []


def test_audit_flags_number_that_only_appears_in_an_id():
    # "159" is the PSI number of CFI-G: it appears in experiment ids, never
    # as a fact in STORY.md, the curated files, a numeric JSON value or a
    # recomputed count. The loose dump-based audit let it through.
    assert "159" not in audit_mod.allowed_numbers()
    real_story_strings = audit_mod.story_strings
    audit_mod.story_strings = lambda: {
        "story.probe": "it ran 159 tests at high pressure"
    }
    try:
        assert ("story.probe", "159") in audit_mod.audit_numbers()
    finally:
        audit_mod.story_strings = real_story_strings
