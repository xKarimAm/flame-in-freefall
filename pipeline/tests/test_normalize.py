from ffpipe.normalize import parse_burn, parse_flow, parse_o2, parse_pressure


def test_o2_fraction_to_percent():
    assert parse_o2("0.21", "fraction") == (21.0, None, None, None)
    assert parse_o2("0.3939", "fraction") == (39.39, None, None, None)


def test_o2_percent_plain():
    assert parse_o2("21", "percent") == (21.0, None, None, None)
    assert parse_o2("21.5", "percent") == (21.5, None, None, None)


def test_o2_range_midpoint():
    assert parse_o2("21.5 - 21.7", "percent") == (
        21.6,
        21.5,
        21.7,
        "range in source: 21.5 - 21.7",
    )


def test_o2_range_to_word_sorted():
    value, lo, hi, note = parse_o2("22.1 to 22.0", "percent")
    assert (value, lo, hi) == (22.05, 22.0, 22.1)
    assert note == "range in source: 22.1 to 22.0"


def test_o2_approximate():
    assert parse_o2("~ 21.5", "percent") == (21.5, None, None, "approximate")
    assert parse_o2("~21.5", "percent") == (21.5, None, None, "approximate")


def test_o2_bad_cells_become_null_with_note():
    for raw in ("3400%", "2100%"):
        value, lo, hi, note = parse_o2(raw, "percent")
        assert value is None and lo is None and hi is None
        assert raw in note


def test_o2_list_sets_bounds_only():
    value, lo, hi, note = parse_o2("0.17; 0.21;0.25; 0.3", "fraction")
    assert value is None
    assert (lo, hi) == (17.0, 30.0)
    assert "0.17; 0.21;0.25; 0.3" in note


def test_o2_empty_and_junk():
    assert parse_o2("", "percent") == (None, None, None, None)
    assert parse_o2("RAMPED", "percent") == (
        None,
        None,
        None,
        "unparseable in source: RAMPED",
    )


def test_o2_fraction_above_one_is_bad():
    value, lo, hi, note = parse_o2("21", "fraction")
    assert value is None and note == "unparseable in source: 21"


def test_pressure_units():
    assert parse_pressure("762", "mmHg") == 101.59
    assert parse_pressure("757.7", "mmHg") == 101.02
    assert parse_pressure("0.9443956", "bar") == 94.44
    assert parse_pressure("1 atm", "atm") == 101.33
    assert parse_pressure("1.01796816", "atm") == 103.15  # 1.01796816 * 101.325 = 103.1456


def test_pressure_embedded_unit_and_bad():
    assert parse_pressure("1 atm ", "atm") == 101.33
    assert parse_pressure("", "atm") is None
    assert parse_pressure("0.5; 1.0; 1.5", "atm") is None
    assert parse_pressure("RAMPED", "atm") is None
    assert parse_pressure("0", "mmHg") is None  # PSI-69#114: zero pressure is a data glitch
    assert parse_pressure("5", "atm") is None  # 506.6 kPa, above the contract range


def test_flow_and_burn():
    assert parse_flow("20") == 20.0
    assert parse_flow("20 cm/s") == 20.0
    assert parse_flow("0.1 - 5") is None
    assert parse_burn("420") == 420.0
    assert parse_burn("145 s") == 145.0
    assert parse_burn("Insignificant") is None
    assert parse_burn("-") is None
    assert parse_burn("") is None
