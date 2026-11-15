# Generated with Muse Spark, SI-assisted
"""dictionary.json: every field of every data/build file (queue B20).

For each field: name, type, unit, meaning in one plain sentence, and how
many records have it non-null. Meanings come from the `description` in
contracts/*.schema.json where one exists; the rest are hand-written plain
sentences (prose, not data). Counts are computed from the files, nothing
typed.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILD_DIR = ROOT / "data" / "build"
FILES = ("tests.json", "experiments.json", "moments.json", "library.json",
         "coverage.json", "search.json", "provenance.json")

UNITS = {
    ("tests.json", "o2_pct"): "percent",
    ("tests.json", "o2_pct_min"): "percent",
    ("tests.json", "o2_pct_max"): "percent",
    ("tests.json", "pressure_kpa"): "kPa",
    ("tests.json", "flow_cm_s"): "cm/s",
    ("tests.json", "burn_time_s"): "s",
    ("experiments.json", "o2_pct_range"): "percent",
    ("experiments.json", "pressure_kpa_range"): "kPa",
    ("moments.json", "unit"): "unit symbol",
    ("coverage.json", "total"): "count",
    ("coverage.json", "plotted"): "count",
    ("coverage.json", "not_plotted"): "count",
    ("search.json", "test_count"): "count",
    ("experiments.json", "test_count"): "count",
    ("moments.json", "n"): "count",
    ("provenance.json", "rows_read"): "count",
    ("provenance.json", "rows_mapped"): "count",
    ("provenance.json", "units.pressure_kpa.factor"): "kPa per unit",
}

# Hand-written meanings: one plain sentence each (prose, not data).
MEANINGS = {
    ("tests.json", "id"): "Test id, investigation plus source row.",
    ("tests.json", "investigation"): "PSI investigation this test row belongs to.",
    ("tests.json", "fuel"): "Fuel or sample material burned, as recorded.",
    ("tests.json", "fuel_class"): "Kind of fuel: droplet, gas jet, solid or smoke.",
    ("tests.json", "gravity"): "Gravity of the test, always microgravity here.",
    ("tests.json", "o2_pct"): "Oxygen concentration of the test air.",
    ("tests.json", "o2_pct_min"): "Lower end of a recorded oxygen range.",
    ("tests.json", "o2_pct_max"): "Upper end of a recorded oxygen range.",
    ("tests.json", "o2_note"): "Raw cell text when the oxygen cell needed a note.",
    ("tests.json", "pressure_kpa"): "Chamber pressure of the test.",
    ("tests.json", "outcome"): "Recorded outcome, normalised to one word.",
    ("tests.json", "outcome_raw"): "Outcome cell as written in the source.",
    ("tests.json", "burn_time_s"): "Recorded burn time.",
    ("tests.json", "flow_cm_s"): "Forced flow speed past the sample.",
    ("tests.json", "source"): "Where this row comes from in the PSI snapshot.",
    ("tests.json", "source.fields"): "Which CSV header each field was read from.",
    ("experiments.json", "id"): "PSI investigation id.",
    ("experiments.json", "acronym"): "Short investigation name.",
    ("experiments.json", "title"): "Full investigation title.",
    ("experiments.json", "family"): "Which hardware family it belongs to.",
    ("experiments.json", "hardware"): "Apparatus the tests ran in.",
    ("experiments.json", "platform"): "Where the tests ran.",
    ("experiments.json", "doi"): "DOI of the linked publication, when recorded.",
    ("experiments.json", "psi_url"): "PSI page of the investigation.",
    ("experiments.json", "license"): "License of the source data.",
    ("experiments.json", "summary"): "AI summary of the PSI text, labelled in the UI.",
    ("experiments.json", "summary.text"): "AI-written summary sentences.",
    ("experiments.json", "summary.model"): "Model that wrote the summary.",
    ("experiments.json", "summary.made_at"): "UTC time the summary was written.",
    ("experiments.json", "tags"): "Topic tags for search.",
    ("experiments.json", "test_count"): "Rows in tests.json for this investigation.",
    ("experiments.json", "o2_pct_range"): "Lowest and highest recorded oxygen.",
    ("experiments.json", "pressure_kpa_range"): "Lowest and highest recorded pressure.",
    ("experiments.json", "has_outcomes"): "Whether any test row records a clear outcome.",
    ("experiments.json", "publications"): "Papers linked to this investigation.",
    ("experiments.json", "publications.title"): "Paper title.",
    ("experiments.json", "publications.authors"): "Paper authors, when recorded.",
    ("experiments.json", "publications.doi"): "Paper DOI, when recorded.",
    ("experiments.json", "publications.year"): "Publication year, when recorded.",
    ("moments.json", "fuel"): "Fuel of the row that holds the value, when it is one row.",
    ("moments.json", "n"): "Rows the moment was computed from.",
    ("moments.json", "test_ids"): "Test rows that hold the value.",
    ("moments.json", "unit"): "Unit of the value field.",
    ("moments.json", "url"): "PSI page of the investigation.",
    ("moments.json", "value"): "The computed fact, a single number.",
    ("moments.json", "value_max"): "Upper end, for range moments.",
    ("library.json", "id"): "Story slug from the library table.",
    ("library.json", "investigations"): "PSI investigations this story covers.",
    ("library.json", "core"): "Verbatim PSI quote the story rests on.",
    ("library.json", "core.quote"): "Sentence copied word for word from the PSI text.",
    ("library.json", "core.investigation"): "PSI text the quote comes from.",
    ("library.json", "ai"): "Tag naming the model and time that drafted the text.",
    ("library.json", "ai.model"): "Model that drafted the story text.",
    ("library.json", "ai.made_at"): "UTC time the draft was written.",
    ("library.json", "engineer.investigation"): "PSI text the engineer quote comes from.",
    ("library.json", "engineer.quote"): "Verbatim PSI sentence the engineer text rests on.",
    ("library.json", "engineer.text"): "What the investigation means for crew fire safety.",
    ("coverage.json", "total"): "Every row in tests.json.",
    ("coverage.json", "plotted"): "Rows drawable on the stage.",
    ("coverage.json", "not_plotted"): "Rows listed but not drawn.",
    ("coverage.json", "by_family"): "Plotted counts per hardware family.",
    ("coverage.json", "by_reason"): "Unplotted counts per reason in words.",
    ("search.json", "acronym"): "Short investigation name, when the entry has one.",
    ("search.json", "family"): "Hardware family, when the entry has one.",
    ("search.json", "id"): "Investigation, fuel or family id.",
    ("search.json", "investigations"): "Investigations using this fuel or family.",
    ("search.json", "keywords"): "Search words from tags and fuels.",
    ("search.json", "kind"): "Whether the entry is an investigation, fuel or family.",
    ("search.json", "terms"): "Lower-case text the search matches against.",
    ("search.json", "test_count"): "Test rows counted for this entry.",
    ("search.json", "title"): "Investigation title, when the entry has one.",
    ("provenance.json", "file"): "CSV file name under data/psi-snapshot/.",
    ("provenance.json", "investigation"): "PSI investigation the file belongs to.",
    ("provenance.json", "mapped"): "Whether the pipeline maps this file to test rows.",
    ("provenance.json", "rows_read"): "Data rows read from the file.",
    ("provenance.json", "rows_mapped"): "Rows that became tests.json entries.",
    ("provenance.json", "reason"): "Why a skipped file is not mapped.",
    ("provenance.json", "columns"): "CSV header each field was read from.",
    ("provenance.json", "units"): "Units seen and conversions applied.",
    ("provenance.json", "units.o2_pct.kind"): "Whether oxygen was a fraction or a percent.",
    ("provenance.json", "units.o2_pct.column"): "Header the oxygen cells were read from.",
    ("provenance.json", "units.o2_pct.conversion"): "Conversion applied to oxygen cells.",
    ("provenance.json", "units.pressure_kpa.column"): "Header the pressure cells were read from.",
    ("provenance.json", "units.pressure_kpa.unit"): "Unit the pressure column is recorded in.",
    ("provenance.json", "units.pressure_kpa.factor"): "Multiplier to kPa for that unit.",
    ("provenance.json", "units.pressure_kpa.cell_overrides"): "Unit words seen inside cells.",
    ("provenance.json", "units.flow_cm_s.column"): "Header the flow cells were read from.",
    ("provenance.json", "units.flow_cm_s.unit"): "Unit the flow column is recorded in.",
    ("provenance.json", "units.burn_time_s.column"): "Header the burn time cells were read from.",
    ("provenance.json", "units.burn_time_s.unit"): "Unit the burn time column is recorded in.",
    ("provenance.json", "fields"): "Per-field parse counts.",
    ("provenance.json", "unparsable_cells"): "Raw cells that could not be parsed, at most three.",
    ("provenance.json", "unparsable_cells.field"): "Field the raw cell was read for.",
    ("provenance.json", "unparsable_cells.row"): "One-based data row of the raw cell.",
    ("provenance.json", "unparsable_cells.raw"): "Cell text exactly as in the source file.",
}

# Generic leaf meanings for repeated structural paths.
LEAF_MEANINGS = {
    "plotted": "Rows of this group with oxygen and pressure recorded.",
    "not_plotted": "Rows of this group without both recorded.",
    "total": "All rows of this group.",
    "parsed": "Cells that yielded a recorded value.",
    "empty": "Cells left blank in the source.",
    "unparsable": "Cells present but yielding no value.",
    "column": "CSV header the cells were read from.",
    "kind": "Which kind of moment or entry this is.",
    "label": "What was computed, in plain words.",
    "method": "How it was computed, in plain words.",
    "title": "Title.",
    "family": "Hardware family.",
    "voice": "Storytelling voice from the library table.",
    "hook": "Opening lines for a young reader, no digits.",
    "reveal": "What the tests did, in plain words.",
    "bridge": "Link to Moon-base air, or an honest disclaimer.",
    "signature": "Which view the data can support.",
    "moments": "Moment ids shown on the story page.",
    "investigations": "PSI investigations covered.",
    "fuel_class": "Kind of fuel burned.",
    "gravity": "Gravity the test ran in.",
    "fuel": "Fuel or sample burned.",
    "outcome": "Recorded outcome.",
    "tags": "Topic tags.",
    "terms": "Lower-case match text.",
    "keywords": "Search words.",
    "test_ids": "Test rows holding the value.",
    "test_count": "Rows counted for this entry.",
    "id": "Identifier.",
    "url": "PSI page of the investigation.",
    "file": "File name.",
    "row": "One-based data row.",
    "raw": "Cell text exactly as in the source.",
    "field": "Pipeline field.",
    "reason": "Why the file was skipped.",
    "mapped": "Whether the file maps to test rows.",
    "rows_read": "Data rows read.",
    "rows_mapped": "Rows mapped to test rows.",
    "unit": "Unit of the value.",
    "units": "Units seen and conversions applied.",
    "fields": "Per-field parse counts.",
    "columns": "Source headers per field.",
    "factor": "Multiplier to kPa.",
    "conversion": "Conversion applied to the cells.",
    "cell_overrides": "Unit words seen inside cells.",
    "quote": "Verbatim PSI sentence.",
    "text": "AI-drafted sentences.",
    "model": "Model that wrote the text.",
    "made_at": "UTC time the text was written.",
    "objective": "Objective word for word from PSI.",
    "o2_note": "Note on the recorded oxygen cell.",
    "o2_pct": "Recorded oxygen, in percent.",
    "o2_pct_min": "Lower end of a recorded oxygen range.",
    "o2_pct_max": "Upper end of a recorded oxygen range.",
    "pressure_kpa": "Recorded pressure, in kPa.",
    "flow_cm_s": "Recorded flow speed.",
    "burn_time_s": "Recorded burn time.",
    "outcome_raw": "Outcome cell as written.",
    "source": "Source row reference.",
    "by_family": "Counts per hardware family.",
    "by_reason": "Counts per reason in words.",
    "summary": "AI summary with quotes, model and time.",
    "quotes": "Verbatim PSI sentences.",
    "publications": "Linked papers.",
    "authors": "Paper authors.",
    "doi": "Digital object identifier.",
    "year": "Publication year.",
    "hardware": "Test apparatus.",
    "platform": "Where the tests ran.",
    "psi_url": "PSI page.",
    "license": "Source data license.",
    "acronym": "Short name.",
    "has_outcomes": "Whether clear outcomes are recorded.",
    "ai": "Model and time tag.",
    "core": "Verbatim PSI quote.",
    "investigation": "PSI investigation.",
    "engineer": "Astronaut and engineer lens text.",
    "n": "Rows computed from.",
}


def _schema_descriptions():
    """(file, path) -> description from contracts/*.schema.json."""
    out = {}
    for name in ("tests", "experiments", "moments", "library"):
        schema = json.loads((ROOT / "contracts" / f"{name}.schema.json").read_text(encoding="utf-8"))
        props = schema.get("properties") or (schema.get("items") or {}).get("properties") or {}

        def walk(properties, prefix=""):
            for key, spec in (properties or {}).items():
                path = f"{prefix}.{key}" if prefix else key
                if spec.get("description"):
                    out[(f"{name}.json", path)] = spec["description"].strip()
                walk(spec.get("properties"), path)

        walk(props)
    return out


def _json_type(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "integer"
    if isinstance(value, float):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    return "object"


def _walk(obj, prefix=""):
    if isinstance(obj, dict):
        for key, value in obj.items():
            path = f"{prefix}.{key}" if prefix else key
            yield path, value
            yield from _walk(value, path)
    elif isinstance(obj, list):
        for item in obj:
            if isinstance(item, (dict, list)):
                yield from _walk(item, prefix)


def _get(node, parts):
    if not parts:
        return node
    if isinstance(node, dict):
        return _get(node.get(parts[0]), parts[1:])
    if isinstance(node, list):
        vals = [_get(item, parts) for item in node if _get(item, parts) is not None]
        return vals or None
    return None


def _meaning(schema_desc, name, path):
    key = (name, path)
    if key in MEANINGS:
        return MEANINGS[key]
    if key in schema_desc:
        return schema_desc[key]
    if name == "coverage.json" and path.startswith("by_family.") and path.count(".") == 1:
        return f"Counts for the {path.split('.', 1)[1]} family."
    if name == "coverage.json" and path.startswith("by_reason."):
        return "Tests not plotted for this reason."
    if name == "provenance.json" and path.startswith("columns.") and path.count(".") == 1:
        return "CSV header this field was read from, when mapped."
    leaf = path.rsplit(".", 1)[-1]
    if leaf in LEAF_MEANINGS:
        return LEAF_MEANINGS[leaf]
    raise KeyError(f"no meaning for {(name, path)}")


def build_dictionary():
    """Walk every data/build file: union of paths with types and counts."""
    schema_desc = _schema_descriptions()
    entries = []
    for name in FILES:
        data = json.loads((BUILD_DIR / name).read_text(encoding="utf-8"))
        records = data if isinstance(data, list) else [data]
        paths = {}
        for record in records:
            for path, value in _walk(record):
                paths.setdefault(path, []).append(value)
        for path in sorted(paths):
            values = paths[path]
            non_null = sum(1 for r in records if _get(r, path.split(".")) is not None)
            types = sorted({_json_type(v) for v in values})
            meaning = _meaning(schema_desc, name, path)
            if not meaning.endswith("."):
                meaning += "."
            entries.append({
                "file": name,
                "field": path,
                "type": "|".join(types),
                "unit": UNITS.get((name, path)),
                "meaning": meaning,
                "records": len(records),
                "non_null": non_null,
            })
    return entries
