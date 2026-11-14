# Generated with Claude, SI-assisted
"""experiments.json (one object per fire investigation) and psi-text.json, from psi<N>.json + pubs.json + tests."""

import json
from pathlib import Path

from .sources import FAMILY_OF, FIRE_IDS, PSI_URL


def load_psi(snapshot, inv):
    with open(Path(snapshot) / f"psi{inv.split('-')[1]}.json", encoding="utf-8") as handle:
        return json.load(handle)


def load_pubs(snapshot):
    with open(Path(snapshot) / "pubs.json", encoding="utf-8") as handle:
        return json.load(handle)


def _blank_to_none(value):
    return value if value and value.strip() else None


def _range(values):
    values = [v for v in values if v is not None]
    return [min(values), max(values)] if values else None


def build_experiments(snapshot, tests):
    pubs = load_pubs(snapshot)
    out = []
    for inv in FIRE_IDS:
        psi = load_psi(snapshot, inv)
        rows = [t for t in tests if t["investigation"] == inv]
        # O2 range uses the point value and the min/max of a source range ("21.5 - 21.7" counts as 21.5..21.7).
        o2 = [r.get(k) for r in rows for k in ("o2_pct", "o2_pct_min", "o2_pct_max")]
        out.append({
            "id": inv,
            "acronym": psi.get("investigationAcronym") or "",
            "title": psi["title"],
            "family": FAMILY_OF[inv],
            "hardware": _blank_to_none(psi.get("experimentHardware")),
            "platform": _blank_to_none(psi.get("flightProgram")),
            "doi": _blank_to_none(psi.get("doi")),
            "psi_url": PSI_URL.format(investigation=inv),
            "license": psi.get("licenseIdentifier") or "",
            "objective": psi["objective"],
            "summary": None,
            "tags": [],
            "test_count": len(rows),
            "o2_pct_range": _range(o2),
            "pressure_kpa_range": _range([r["pressure_kpa"] for r in rows]),
            "has_outcomes": any(r["outcome"] != "unknown" for r in rows),
            "publications": [
                {
                    "title": p["title"],
                    "authors": _blank_to_none(p.get("authors")),
                    "doi": _blank_to_none(p.get("doi")),
                    "year": _blank_to_none(p.get("year")),
                }
                for p in pubs
                if p["inv"] == inv
            ],
        })
    return out


def build_psi_text(snapshot):
    out = []
    for inv in FIRE_IDS:
        psi = load_psi(snapshot, inv)
        out.append({
            "id": inv,
            "objective": psi["objective"],
            "approach": _blank_to_none(psi.get("approach")),
            "description": _blank_to_none(psi.get("description")),
            "source_url": PSI_URL.format(investigation=inv),
        })
    return out
