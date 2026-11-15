# Generated with Muse Spark, SI-assisted
"""B3: every AI-written quote is a verbatim substring of psi-text.json and
every AI tag carries a model and a made_at that is precise to the second."""
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "data" / "build"


def _load(name):
    return json.loads((BUILD / name).read_text(encoding="utf-8"))


def _norm(text):
    return " ".join((text or "").split())


def _psi_texts():
    out = {}
    for t in _load("psi-text.json"):
        out[t["id"]] = _norm(" ".join((t[k] or "") for k in ("objective", "approach", "description")))
    return out


def _check_made_at(made_at):
    datetime.fromisoformat(made_at.replace("Z", "+00:00"))
    assert "." not in made_at, made_at  # to the second: no fractional part


def test_experiment_quotes_are_verbatim_and_tagged():
    psi = _psi_texts()
    for e in _load("experiments.json"):
        summary = e["summary"]
        assert summary and summary["model"].strip(), e["id"]
        _check_made_at(summary["made_at"])
        for quote in summary["quotes"]:
            assert quote == _norm(quote) and quote in psi[e["id"]], (e["id"], quote)


def test_library_quotes_are_verbatim_and_tagged():
    psi = _psi_texts()
    for s in _load("library.json"):
        assert s["ai"]["model"].strip(), s["id"]
        _check_made_at(s["ai"]["made_at"])
        quote = _norm(s["core"]["quote"])
        assert quote and quote in psi[s["core"]["investigation"]], s["id"]
