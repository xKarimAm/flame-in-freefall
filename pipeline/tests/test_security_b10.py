# Generated with Muse Spark, SI-assisted
"""B10: security pass. No tracked file may carry a secret-looking token next
to the word key or token, and the Meta API reply parser must bound reply
length and parse strictly as JSON. The test never prints a secret: failures
name the file and the match length only."""
import re
from pathlib import Path

import pytest

from ffpipe.library import _parse_reply

ROOT = Path(__file__).resolve().parents[2]
SKIP_DIRS = {
    ".git",
    "node_modules",
    "dist",
    ".tmp",
    "uv-cache",
    "node-compile-cache",
    "npm-cache",
    "__pycache__",
    ".venv",
}
SECRET_NEAR_KEY = re.compile(
    r"(?i)\b(api[_-]?key|token|secret|bearer)\b.{0,60}?[=:]\s*[\"']?([A-Za-z0-9_\-+/=]{40,})"
)
BEARER_VALUE = re.compile(r"Bearer\s+[A-Za-z0-9_\-]{20,}")


def _text_files():
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.stat().st_size > 2_000_000:
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(ROOT).parts):
            continue
        try:
            yield path, path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue


def test_no_secret_looking_tokens_in_repo():
    hits = []
    for path, text in _text_files():
        for match in SECRET_NEAR_KEY.finditer(text):
            hits.append(f"{path.relative_to(ROOT)}:{match.group(1)}:{len(match.group(2))}")
        for match in BEARER_VALUE.finditer(text):
            hits.append(f"{path.relative_to(ROOT)}:bearer:{len(match.group(0))}")
    assert hits == [], f"secret-looking tokens: {hits}"


def test_env_file_is_git_ignored():
    import subprocess

    out = subprocess.check_output(
        ["git", "-c", "safe.directory=*", "check-ignore", "-v", ".env"],
        text=True,
        cwd=ROOT,
    )
    assert ".gitignore" in out and ".env" in out


def test_parse_reply_rejects_overlong_and_non_json():
    assert _parse_reply('ok {"a": 1} tail') == {"a": 1}
    with pytest.raises(ValueError):
        _parse_reply("x" * 200_001)
    with pytest.raises(ValueError):
        _parse_reply("the model answered in plain words, no object")
    with pytest.raises(ValueError):
        _parse_reply('{"a": }')
