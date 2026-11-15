# Generated with Muse Spark, SI-assisted
"""B2 numbers/URL audit: every number shown in a story string must already
exist in STORY.md, data/curated/*.json, data/build/experiments.json, or be a
count recomputed from data/build/tests.json. Never invent data."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NUMBER = re.compile(r"\d+(?:\.\d+)?")
PSI_URL = "https://psi.nasa.gov/physci/repo/data/investigations/"


def _read_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def story_strings():
    en = _read_json(ROOT / "web" / "src" / "i18n" / "en.json")
    return {k: v for k, v in en.items() if k.startswith("story.") and isinstance(v, str)}


def allowed_numbers():
    """Every number token the story strings may use, from the named sources."""
    texts = [
        (ROOT / "docs" / "STORY.md").read_text(encoding="utf-8"),
        (ROOT / "data" / "curated" / "moon.json").read_text(encoding="utf-8"),
        (ROOT / "data" / "curated" / "incidents.json").read_text(encoding="utf-8"),
        json.dumps(_read_json(ROOT / "data" / "build" / "experiments.json")),
    ]
    allowed = set()
    for text in texts:
        allowed.update(NUMBER.findall(text))
    tests = _read_json(ROOT / "data" / "build" / "tests.json")
    counts = [len(tests)]
    by_inv, by_family = {}, {}
    for t in tests:
        by_inv[t["investigation"]] = by_inv.get(t["investigation"], 0) + 1
    for e in _read_json(ROOT / "data" / "build" / "experiments.json"):
        by_family[e["family"]] = by_family.get(e["family"], 0) + e["test_count"]
    counts += list(by_inv.values()) + list(by_family.values())
    allowed.update(str(c) for c in counts)
    return allowed


def audit_numbers():
    """[(key, number)] for story.* numbers with no allowed source. Prints each."""
    allowed = allowed_numbers()
    misses = []
    for key, text in sorted(story_strings().items()):
        for number in NUMBER.findall(text):
            if number not in allowed:
                print(f"{key}: {number}")
                misses.append((key, number))
    return misses


def curated_urls():
    urls = set()
    for name in ("moon.json", "incidents.json"):
        urls.update(re.findall(r"https?://[^\"\s]+", json.dumps(_read_json(ROOT / "data" / "curated" / name))))
    return urls


def audit_urls():
    """[(story file, url)] for story source URLs that are neither curated nor PSI."""
    allowed = curated_urls()
    misses = []
    for path in sorted((ROOT / "stories").glob("*.json")):
        story = _read_json(path)
        nested = [s for scene in story.get("scenes", [])
                  for beat in scene.get("beats", []) for s in beat.get("sources", [])]
        for source in story.get("sources", []) + nested:
            url = source.get("url", "")
            if url and url not in allowed and not url.startswith(PSI_URL):
                print(f"{path.name}: {url}")
                misses.append((path.name, url))
    return misses
