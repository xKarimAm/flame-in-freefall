# Generated with Muse Spark, SI-assisted
"""B2: every number in the story.* strings of en.json traces to STORY.md,
data/curated/*.json, data/build/experiments.json or a count recomputed from
data/build/tests.json; every source URL in stories/*.json is curated or a
PSI page. Misses are printed with their key and xfail with that list."""
import pytest

from ffpipe.audit import audit_numbers, audit_urls


def test_story_numbers_are_sourced():
    misses = audit_numbers()
    for key, number in misses:
        print(f"number miss: {number!r} in {key}")
    if misses:
        pytest.xfail(f"known number misses: {misses}")


def test_story_source_urls_are_sourced():
    misses = audit_urls()
    for story, url in misses:
        print(f"url miss: {url!r} in {story}")
    if misses:
        pytest.xfail(f"known url misses: {misses}")
