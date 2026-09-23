"""A library generator (`sensor_audit.audit`) must not write to stdout."""

import inspect

from chesslab import sensor_audit


def test_the_generator_does_not_print():
    src = inspect.getsource(sensor_audit.audit)

    assert "print(" not in src, (
        "sensor_audit.audit writes to stdout, so no caller can run a silent audit"
    )


def test_skipped_counts_are_still_reachable_for_the_cli():
    assert "skipped" in inspect.signature(sensor_audit.audit).parameters, (
        "dropping the print must not drop the information — the caller needs the counts"
    )
