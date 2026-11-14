# Generated with Claude, SI-assisted
"""Map: snapshot CSV file -> investigation, fuel_class, parser, column map.

Column values are the exact CSV headers (leading spaces included).
o2_kind is "percent" or "fraction"; pressure_unit is the column's unit.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class FileSpec:
    file: str
    investigation: str
    fuel_class: str
    parser: str
    columns: dict = field(default_factory=dict)
    o2_kind: str = "percent"
    pressure_unit: str = "atm"


def _spec(file, investigation, fuel_class, parser, columns, o2_kind="percent", pressure_unit="atm"):
    return FileSpec(file, investigation, fuel_class, parser, columns, o2_kind, pressure_unit)


SOURCES = {
    "csv_69_34.csv": _spec(
        "csv_69_34.csv", "PSI-69", "droplet", "flex",
        {
            "fuel": "Fuel",
            "o2_pct": "O initial ambient composition; mole fraction",
            "pressure_kpa": "Ambient pressure; mmHg",
            "burn_time_s": "Burn time; s",
            "outcome": "Test end",
        },
        o2_kind="fraction", pressure_unit="mmHg",
    ),
    "csv_68_35.csv": _spec(
        "csv_68_35.csv", "PSI-68", "droplet", "flex2",
        {
            "fuel": "Sample (Fuel Type)",
            "o2_pct": "Oxygen Mole Fraction",
            "pressure_kpa": "Ambient Pressure (atm)",
            "flow_cm_s": "Flow Velocity (cm/s)",
        },
        o2_kind="fraction", pressure_unit="atm",
    ),
    "csv_39_33.csv": _spec(
        "csv_39_33.csv", "PSI-39", "droplet", "cfi",
        {
            "fuel": "Fuel ",
            "o2_pct": "Oxygen",
            "pressure_kpa": "Pressure",
        },
        o2_kind="fraction", pressure_unit="atm",
    ),
    "csv_159_50.csv": _spec(
        "csv_159_50.csv", "PSI-159", "gas-jet", "cfig",
        {
            "fuel": "Fuel",
            "o2_pct": " XO2 before test",
            "pressure_kpa": "approx p (bar)",
            "burn_time_s": "burn time (sec)",
            "outcome": "Self-ext or flow term",
            "hot": "Hot ignition",
            "comments": "Comments",
        },
        o2_kind="fraction", pressure_unit="bar",
    ),
    "csv_159_51.csv": _spec(
        "csv_159_51.csv", "PSI-159", "gas-jet", "cfig",
        {
            "fuel": "Fuel",
            "o2_pct": "XO2",
            "pressure_kpa": "approx p (bar)",
            "burn_time_s": "burn time (sec)",
            "outcome": "Self -ext or flow term",
            "hot": "Hot ignition",
            "comments": "Comments",
        },
        o2_kind="fraction", pressure_unit="bar",
    ),
    "csv_10_55.csv": _spec(
        "csv_10_55.csv", "PSI-10", "gas-jet", "flame_design",
        {
            "fuel": "Fuel",
            "o2_pct": "XO2 (init)",
            "pressure_kpa": "pmean (atm)",
        },
        o2_kind="fraction", pressure_unit="atm",
    ),
    "csv_10_56.csv": _spec(
        "csv_10_56.csv", "PSI-10", "gas-jet", "flame_design",
        {
            "o2_pct": "XO2",
            "pressure_kpa": "pmean (atm)",
        },
        o2_kind="fraction", pressure_unit="atm",
    ),
    "csv_107_36.csv": _spec(
        "csv_107_36.csv", "PSI-107", "gas-jet", "spice",
        {
            "fuel": "Fuel",
            "flow_cm_s": "Air Rate (cm/s)",
        },
    ),
    "csv_98_39.csv": _spec(
        "csv_98_39.csv", "PSI-98", "solid", "saffire",
        {
            "fuel": "Material",
            "o2_pct": "Percent O2",
            "flow_cm_s": "Air Flow (cm/s)",
            "burn_time_s": "Burn Time (s)",
        },
    ),
    "csv_99_39.csv": _spec(
        "csv_99_39.csv", "PSI-99", "solid", "saffire",
        {
            "fuel": "Material",
            "o2_pct": "Percent O2 (Note 1)",
            "flow_cm_s": "Air Flow (cm/s)",
            "burn_time_s": "Burn Time (s)",
        },
    ),
    "csv_100_40.csv": _spec(
        "csv_100_40.csv", "PSI-100", "solid", "saffire",
        {
            "fuel": "Material",
            "flow_cm_s": "Air Flow ",
        },
    ),
    "csv_25_37.csv": _spec(
        "csv_25_37.csv", "PSI-25", "solid", "bass2",
        {
            "fuel": "Fuel Sample Material",
            "o2_pct": "Calibrated  initial O2 % by vol ",
        },
    ),
    "csv_26_34.csv": _spec(
        "csv_26_34.csv", "PSI-26", "solid", "bass",
        {
            "fuel": "Fuel Sample Material",
        },
    ),
    "csv_101_37.csv": _spec(
        "csv_101_37.csv", "PSI-101", "smoke", "same",
        {
            "fuel": "Sample Type",
            "flow_cm_s": "Inlet velocity (cm/s)",
        },
    ),
    "csv_102_35.csv": _spec(
        "csv_102_35.csv", "PSI-102", "smoke", "same",
        {
            "fuel": "Sample Material  ",
            "flow_cm_s": "Air Flow (cm/s)",
        },
    ),
}

PSI_URL = "https://psi.nasa.gov/physci/repo/data/investigations/{investigation}"
FIELD_ORDER = ("o2_pct", "pressure_kpa", "flow_cm_s", "outcome", "burn_time_s")


def file_k(file):
    """csv_<N>_<k>.csv -> k"""
    return int(file.split("_")[2].split(".")[0])


_LOWEST_K = {}
for _s in SOURCES.values():
    _LOWEST_K[_s.investigation] = min(_LOWEST_K.get(_s.investigation, 10**9), file_k(_s.file))


def test_id(spec, row):
    """Unique-id rule (contracts/README.md): lowest-k file keeps PSI-N#row, the others PSI-N#k-row."""
    if file_k(spec.file) == _LOWEST_K[spec.investigation]:
        return f"{spec.investigation}#{row}"
    return f"{spec.investigation}#{file_k(spec.file)}-{row}"


# Snapshot CSVs that are NOT mapped into tests.json: file -> (investigation, why).
UNMAPPED = {
    "csv_20_38.csv": ("PSI-20", "one row per test day with a list of O2 values and no pressure; not individual runs"),
    "bre.csv": ("PSI-20", "same table as csv_20_38.csv (copy); not individual runs"),
    "csv_21_39.csv": ("PSI-21", "one row per test day with a fuel-concentration range; not individual runs"),
    "csv_22_49.csv": ("PSI-22", "one row per test day, no O2 or pressure columns; not individual runs"),
    "csv_23_42.csv": ("PSI-23", "one row per test day with approximate atmosphere text; not individual runs"),
    "csv_106_36.csv": ("PSI-106", "one row per test day with fuel text only; not individual runs"),
    "csv_142_49.csv": ("PSI-142", "index of data sets and figures in a publication; not test runs"),
}

# The 22 fire investigations, in the order the experiments contract lists them.
FAMILIES = {
    "large-scale solids": ["PSI-98", "PSI-99", "PSI-100"],
    "solids in flow duct": ["PSI-26", "PSI-25"],
    "droplets": ["PSI-69", "PSI-68", "PSI-39"],
    "gas jets": ["PSI-159", "PSI-10", "PSI-20", "PSI-21", "PSI-22", "PSI-23", "PSI-107", "PSI-106"],
    "smoke detection": ["PSI-102", "PSI-101"],
    "ground/modeling": ["PSI-60", "PSI-62", "PSI-117", "PSI-142"],
}
FIRE_IDS = [
    "PSI-98", "PSI-99", "PSI-100", "PSI-26", "PSI-25", "PSI-69", "PSI-68", "PSI-39", "PSI-159", "PSI-10",
    "PSI-20", "PSI-21", "PSI-22", "PSI-23", "PSI-106", "PSI-107", "PSI-102", "PSI-101", "PSI-60", "PSI-62",
    "PSI-117", "PSI-142",
]
FAMILY_OF = {inv: fam for fam, invs in FAMILIES.items() for inv in invs}
