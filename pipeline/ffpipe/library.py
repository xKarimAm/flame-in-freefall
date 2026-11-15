# Generated with Muse Spark, SI-assisted
"""library.json: one short story per investigation (docs/STORY-LIBRARY.md, queue B1).

Static spec (id, investigations, title, voice) comes from the table in
docs/STORY-LIBRARY.md. Everything else is computed: the signature from the
test rows in tests.json, the moments from moments.json.

Text (core.quote, hook, reveal, bridge) is drafted by the Meta API from that
story's PSI text only and committed in pipeline/library_drafts.json:
  uv run python -m ffpipe.library --draft
The normal build reads that file, validates every draft again and writes
data/build/library.json. Tests never use the network.
"""

import json
import os
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DRAFTS_PATH = ROOT / "pipeline" / "library_drafts.json"
MODEL = "muse-spark-1.3-contributor"
URL = "https://api.meta.ai/v1/chat/completions"
DIGIT = re.compile(r"\d")

# Static spec from the table in docs/STORY-LIBRARY.md (B1: 18 stories; the
# table lists 19 rows, 22 investigations: SAFFIRE I-III shares one story for
# PSI-98/99/100 and SAME / SAME-R shares one for PSI-102/101).
SPEC = [
    {"id": "saffire", "investigations": ["PSI-98", "PSI-99", "PSI-100"],
     "title": "SAFFIRE I-III: the fire they let grow", "voice": "the brave test: it burned on purpose"},
    {"id": "bass", "investigations": ["PSI-26"],
     "title": "BASS: does Earth's test tell the truth?", "voice": "the skeptic"},
    {"id": "bass-ii", "investigations": ["PSI-25"],
     "title": "BASS-II: a gentle breeze is enough", "voice": "the surprise"},
    {"id": "flex", "investigations": ["PSI-69"],
     "title": "FLEX: putting fire out in space", "voice": "the firefighter"},
    {"id": "flex-2", "investigations": ["PSI-68"],
     "title": "FLEX-2: fuels like the real thing", "voice": "the engineer"},
    {"id": "cfi", "investigations": ["PSI-39"],
     "title": "CFI: flames that burn cold", "voice": "the mystery"},
    {"id": "cfi-g", "investigations": ["PSI-159"],
     "title": "CFI-G: cool flames on demand", "voice": "the recipe book"},
    {"id": "flame-design", "investigations": ["PSI-10"],
     "title": "Flame Design: a flame without soot", "voice": "the designer"},
    {"id": "bre", "investigations": ["PSI-20"],
     "title": "BRE: a burner that acts like a solid", "voice": "the stand-in"},
    {"id": "cld", "investigations": ["PSI-21"],
     "title": "CLD: the faintest flames", "voice": "the whisper"},
    {"id": "e-field", "investigations": ["PSI-22"],
     "title": "E-FIELD: steering a flame with electricity", "voice": "the rebel"},
    {"id": "s-flame", "investigations": ["PSI-23"],
     "title": "s-Flame: the perfect sphere", "voice": "the benchmark"},
    {"id": "slice", "investigations": ["PSI-106"],
     "title": "SLICE: where a flame holds on", "voice": "the climber"},
    {"id": "spice", "investigations": ["PSI-107"],
     "title": "SPICE: when a flame starts to smoke", "voice": "the chemist"},
    {"id": "same", "investigations": ["PSI-102", "PSI-101"],
     "title": "SAME / SAME-R: smoke that grows differently", "voice": "the detective"},
    {"id": "ground-soot", "investigations": ["PSI-60"],
     "title": "Ground: why space soot is different", "voice": "the explainer"},
    {"id": "ground-models", "investigations": ["PSI-62"],
     "title": "Ground: modelling flame spread", "voice": "the model-maker"},
    {"id": "ground-cool-flames", "investigations": ["PSI-117"],
     "title": "Ground: what tipped FLEX's cool flames", "voice": "the investigator"},
    {"id": "ground-flammability", "investigations": ["PSI-142"],
     "title": "Ground: a new map of flammability", "voice": "the cartographer"},
]

# B1 signature rule: sample-wall for the SAFFIRE and BASS stories (large
# samples / fabric samples; the BASS family also covers BASS-II). Everything
# else follows the data: condition-map when a row holds both oxygen and
# pressure, outcome-strip when rows hold only one recorded variable,
# paper-trail when the story has no rows in tests.json.
SAMPLE_WALL_IDS = {"saffire", "bass", "bass-ii"}
_SAMPLE_WALL_INVS = {
    frozenset({"PSI-98", "PSI-99", "PSI-100"}),
    frozenset({"PSI-26"}),
    frozenset({"PSI-25"}),
}

# B1 moment order; outcome-count moments are never shown in a story.
_KIND_RANK = {
    "lowest-o2-burned": 0,
    "highest-o2-went-out": 1,
    "longest-burn": 2,
    "o2-range": 3,
    "pressure-range": 4,
    "flow-range": 5,
    "tests-count": 6,
}


def _norm(text):
    return " ".join((text or "").split())


def signature_for(investigations, tests_by_inv):
    """Data-driven signature (B1 rule); tests_by_inv maps id -> test rows."""
    rows = [t for inv in investigations for t in tests_by_inv.get(inv, [])]
    if not rows:
        return "paper-trail"
    if frozenset(investigations) in _SAMPLE_WALL_INVS:
        return "sample-wall"
    if any(t["o2_pct"] is not None and t["pressure_kpa"] is not None for t in rows):
        return "condition-map"
    return "outcome-strip"


def moments_for(investigations, moments):
    """Moment ids for the story's investigations, B1 preference order first."""
    wanted = set(investigations)
    ids = [m["id"] for m in moments
           if m["investigation"] in wanted and m["kind"] in _KIND_RANK]
    return sorted(ids, key=lambda i: (_KIND_RANK[i.rsplit(".", 1)[1]], i))


def validate_draft(spec, draft, psi_texts):
    """Error strings for a draft answer; [] means it can be committed.

    Code-checked here: verbatim quote, no digits, under 320 characters, no
    exclamation marks. Prompt-level rules (B14, checked by the prompt text in
    draft_prompt plus a human reviewer reading the answer against the PSI
    text, not by code): state no finding the source text does not state;
    planned work in the future tense; no superlatives the source text does
    not make. A regex cannot judge tense or whether a claim is stated, so a
    code check would either miss real violations or flag honest wording.
    """
    errors = []
    inv = draft.get("core_investigation")
    if inv not in spec["investigations"]:
        errors.append(f"core_investigation {inv!r} is not one of {spec['investigations']}")
    else:
        t = psi_texts[inv]
        psi = _norm(" ".join((t[k] or "") for k in ("objective", "approach", "description")))
        if not draft.get("core_quote") or _norm(draft["core_quote"]) not in psi:
            errors.append("core_quote is not a word-for-word substring of that investigation's PSI text")
    for key in ("hook", "reveal", "bridge"):
        text = draft.get(key)
        if not isinstance(text, str) or not text.strip():
            errors.append(f"{key} is missing")
        elif DIGIT.search(text):
            errors.append(f"{key} holds a digit: {text!r}")
        elif len(text) >= 320:
            errors.append(f"{key} is {len(text)} characters (under 320 required)")
        elif "!" in text:
            errors.append(f"{key} holds an exclamation mark")
    return errors


def draft_prompt(spec, psi_texts, objection=None):
    """The prompt holds ONLY this story's PSI text, its title and its voice.

    Standing rules (B14): state no finding the source text does not state
    (describe what the experiment set out to test or measure, not what it
    found, unless the source states the result); planned work in the future
    tense (when the source says "proposed", "will be" or "we plan", write
    hook and reveal as plans, never as done); no superlatives the source
    text does not make (never call an experiment a benchmark, perfect, best,
    first, only or the truth unless the source makes that exact claim).
    `objection` is a reviewer's exact complaint about a previous draft; it
    is passed to the model word for word on a re-draft.
    """
    parts = []
    for inv in spec["investigations"]:
        t = psi_texts[inv]
        block = f"[investigation {inv}]\nObjective: {t['objective'] or ''}\nApproach: {t['approach'] or ''}"
        if t.get("description"):
            block += f"\nDescription: {t['description']}"
        parts.append(block)
    invs = ", ".join(spec["investigations"])
    prompt = (
        "You are writing one short library story for Firebreak, a public web page about NASA fire experiments in space.\n"
        f"Story title: {spec['title']}\n"
        f"Voice (a tone, never invented facts): {spec['voice']}\n"
        f"This is the ONLY source text you may use (the PSI record for {invs}):\n\n"
        + "\n\n".join(parts)
        + "\n\nReturn ONLY a JSON object with exactly these keys: "
        '"core_quote", "core_investigation", "hook", "reveal", "bridge".\n'
        '- "core_quote": copy ONE sentence or fragment word for word from the Objective above (exact words, no changes).\n'
        f'- "core_investigation": the PSI id the quote comes from (exactly one of: {invs}).\n'
        f'- "hook": one or two plain sentences for a curious 12-year-old, in the voice "{spec["voice"]}". '
        "No new science beyond the source text.\n"
        '- "reveal": what the tests did, in plain words a 12-year-old understands. No new science beyond the source text.\n'
        '- "bridge": one line linking this experiment to the question of fire in Moon-base air, or '
        "\u2014 if it is not about habitat air \u2014 saying honestly in plain words that this experiment is about something else.\n"
        "Rules for hook, reveal and bridge: no digit characters 0-9 anywhere (not even in experiment names: "
        'write "Saffire", "Flex" or "Bass" without their numbers), under 320 characters each, no exclamation marks.\n'
        "State no finding the source text does not state: describe what the experiment set out to test or "
        "measure, not what it found, unless the source text states the result.\n"
        "When the source text describes proposed or planned work (\"proposed\", \"will be\", \"we plan\"), "
        "write hook and reveal in the future or planned tense; never narrate planned work as already done.\n"
        "No superlatives in hook, reveal or bridge unless the source text makes that exact claim: never call "
        "an experiment a benchmark, perfect, the best, the first, the only one, or the truth.\n"
        "Return ONLY the JSON object, no other text."
    )
    if objection:
        prompt += (
            "\nThe previous draft was rejected for this exact reason "
            "— fix exactly this while keeping every other rule above:\n"
            + objection
            + "\nReturn ONLY the JSON object, no other text."
        )
    return prompt


def _post(prompt):
    key = os.environ.get("META_API_KEY", "")
    if not key:
        raise RuntimeError("META_API_KEY is not in the environment")
    # 8000: the model spends thousands of reasoning tokens before answering;
    # 4000 cuts the answer off mid-reasoning (finish "length", empty content).
    body = json.dumps({"model": MODEL, "max_tokens": 8000,
                       "messages": [{"role": "user", "content": prompt}]}).encode()
    req = urllib.request.Request(URL, body,
                                 {"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as response:
        text = json.load(response)["choices"][0]["message"]["content"] or ""
    return _parse_reply(text)


# The model is asked for at most 8000 tokens (~32k characters); anything far
# beyond that is not a draft answer and is rejected before parsing.
MAX_REPLY_CHARS = 200_000


def _parse_reply(text):
    """Strict JSON parse of a chat reply: the first {...} block, length-bounded."""
    if len(text) > MAX_REPLY_CHARS:
        raise ValueError(f"API reply too long: {len(text)} characters")
    try:
        return json.loads(text[text.index("{"):text.rindex("}") + 1])
    except (ValueError, IndexError) as exc:
        raise ValueError(f"API reply is not a JSON object: {exc}") from exc


def _finish(draft):
    """Validated raw draft -> committed draft entry (fresh AI tag)."""
    return {
        "core_quote": _norm(draft["core_quote"]),
        "core_investigation": draft["core_investigation"],
        "hook": draft["hook"].strip(),
        "reveal": draft["reveal"].strip(),
        "bridge": draft["bridge"].strip(),
        "ai": {"model": MODEL,
               "made_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
    }


def draft_all(psi_texts):
    """One API request per story, each answer validated, two retries per story."""
    drafts = {}
    for spec in SPEC:
        prompt = draft_prompt(spec, psi_texts)
        errors, draft = ["not attempted"], None
        for _ in range(3):
            try:
                draft = _post(prompt)
            except Exception as exc:  # transient network or empty reply: retry
                errors = [f"request failed: {type(exc).__name__}"]
                continue
            errors = validate_draft(spec, draft, psi_texts)
            if not errors:
                break
        if errors:
            raise RuntimeError(f"draft for {spec['id']} failed validation after 3 attempts: {errors}")
        drafts[spec["id"]] = _finish(draft)
    return drafts


def redraft_story(story_id, objection, psi_texts, post=None):
    """Re-draft one story through the model, passing the exact objection.

    Same validators and two retries as draft_all; `post` defaults to the
    real API call and is a fake client in tests. Raises KeyError for an
    unknown story id, RuntimeError when every attempt fails validation.
    """
    matches = [s for s in SPEC if s["id"] == story_id]
    if not matches:
        raise KeyError(f"no story {story_id!r} in SPEC")
    spec = matches[0]
    prompt = draft_prompt(spec, psi_texts, objection=objection)
    post = post or _post
    errors, draft = ["not attempted"], None
    for _ in range(3):
        try:
            draft = post(prompt)
        except Exception as exc:  # transient network or empty reply: retry
            errors = [f"request failed: {type(exc).__name__}"]
            continue
        errors = validate_draft(spec, draft, psi_texts)
        if not errors:
            break
    if errors:
        raise RuntimeError(f"redraft for {story_id!r} failed validation after 3 attempts: {errors}")
    return _finish(draft)


def load_drafts(path=DRAFTS_PATH):
    """Committed drafts; missing file means --draft has not been run yet."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"{path} is missing: run `uv run python -m ffpipe.library --draft` first")
    return json.loads(path.read_text(encoding="utf-8"))


def build_library(drafts, tests, moments, psi_texts):
    """Drafts + tests.json + moments.json + psi-text.json -> library.json entries."""
    by_inv = {}
    for t in tests:
        by_inv.setdefault(t["investigation"], []).append(t)
    library = []
    for spec in SPEC:
        if spec["id"] not in drafts:
            raise KeyError(f"no draft for story {spec['id']!r} in {DRAFTS_PATH}")
        draft = drafts[spec["id"]]
        errors = validate_draft(spec, draft, psi_texts)
        if errors:
            raise ValueError(f"draft for {spec['id']} is invalid: {errors}")
        library.append({
            "id": spec["id"],
            "investigations": list(spec["investigations"]),
            "title": spec["title"],
            "voice": spec["voice"],
            "core": {"quote": _norm(draft["core_quote"]),
                     "investigation": draft["core_investigation"]},
            "signature": signature_for(spec["investigations"], by_inv),
            "hook": draft["hook"].strip(),
            "reveal": draft["reveal"].strip(),
            "bridge": draft["bridge"].strip(),
            "moments": moments_for(spec["investigations"], moments),
            "ai": {"model": draft["ai"]["model"], "made_at": draft["ai"]["made_at"]},
        })
    return library


def _write_json(path, data):
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main(argv):
    from .build import BUILD_DIR, build_tests
    from .experiments import build_experiments, build_psi_text
    from .moments import build_moments

    if "--draft" in argv:
        psi_texts = {t["id"]: t for t in json.loads((BUILD_DIR / "psi-text.json").read_text(encoding="utf-8"))}
        drafts = draft_all(psi_texts)
        _write_json(DRAFTS_PATH, drafts)
        print(f"wrote {DRAFTS_PATH} ({len(drafts)} stories)")
        return
    if "--redraft" in argv:
        # B14: uv run python -m ffpipe.library --redraft pipeline/redraft_objections.json
        # The JSON file maps story id -> reviewer objection; each story is
        # re-drafted through the API with the exact objection in the prompt.
        path = Path(argv[argv.index("--redraft") + 1])
        objections = json.loads(path.read_text(encoding="utf-8"))
        psi_texts = {t["id"]: t for t in json.loads((BUILD_DIR / "psi-text.json").read_text(encoding="utf-8"))}
        drafts = load_drafts()
        for story_id, objection in objections.items():
            drafts[story_id] = redraft_story(story_id, objection, psi_texts)
            print(f"redrafted {story_id}")
        _write_json(DRAFTS_PATH, drafts)
        print(f"wrote {DRAFTS_PATH} ({len(objections)} stories redrafted)")
        return
    from .build import SNAPSHOT, load_summaries

    tests = build_tests(SNAPSHOT)
    experiments = build_experiments(SNAPSHOT, tests, load_summaries())
    moments = build_moments(tests, experiments)
    psi_texts = {t["id"]: t for t in build_psi_text(SNAPSHOT)}
    library = build_library(load_drafts(), tests, moments, psi_texts)
    _write_json(BUILD_DIR / "library.json", library)
    print(f"wrote library.json ({len(library)} stories)")


if __name__ == "__main__":
    import sys

    main(sys.argv[1:])
