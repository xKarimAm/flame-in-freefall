from ffpipe.parsers import cfig_outcome, flex_outcome, saffire_outcome


def test_flex_outcomes():
    assert flex_outcome("Extinction") == ("extinction", "Extinction")
    assert flex_outcome("Disruption") == ("disruption", "Disruption")
    assert flex_outcome("Completion") == ("completion", "Completion")
    assert flex_outcome("") == ("unknown", None)


def test_cfig_se_ft():
    assert cfig_outcome("Yes", "SE", "", "Self-ext or flow term") == (
        "self-extinguished",
        "Hot ignition: Yes; Self-ext or flow term: SE",
    )
    assert cfig_outcome("yes", "FT", "", "Self -ext or flow term")[0] == (
        "flow-terminated"
    )
    assert cfig_outcome("flash", "SE", "", "Self -ext or flow term")[0] == (
        "self-extinguished"
    )
    assert cfig_outcome("Yes", "-", "", "Self-ext or flow term") == (
        "unknown",
        "Hot ignition: Yes; Self-ext or flow term: -",
    )


def test_cfig_hot_no_is_unknown():
    assert cfig_outcome("No", "-", "", "Self-ext or flow term")[0] == "unknown"
    assert cfig_outcome("No", "FT", "hot flame", "Self-ext or flow term")[0] == (
        "unknown"
    )
    # Cool flame: a hot-ignition failure is not a no-ignition.
    assert cfig_outcome(
        "No", "-", "direct cool - no hot ignition", "Self-ext or flow term"
    )[0] == "unknown"


def test_cfig_no_ignition_only_from_comments():
    assert cfig_outcome("No", "-", "No ignition", "Self-ext or flow term")[0] == (
        "no-ignition"
    )
    assert cfig_outcome(
        "no", "-", "Failed to ignite", "Self -ext or flow term"
    )[0] == "no-ignition"
    assert cfig_outcome("No", "-", "Not ignited", "Self -ext or flow term")[0] == (
        "no-ignition"
    )
    # A hot flame that flow-terminated stays flow-terminated.
    assert cfig_outcome(
        "Yes", "FT", "Igniter voltage. No ignition.", "Self-ext or flow term"
    )[0] == "flow-terminated"


def test_cfig_aborted_comment_is_not_a_clear_no_ignition():
    assert cfig_outcome(
        "No", "-", "F1 was aborted, and F2 did not ignite.", "Self -ext or flow term"
    )[0] == "unknown"


def test_saffire_outcome():
    assert saffire_outcome(420.0) == ("burned", "Burn Time (s) = 420")
    assert saffire_outcome(145.0) == ("burned", "Burn Time (s) = 145")
    assert saffire_outcome(None) == ("unknown", None)
