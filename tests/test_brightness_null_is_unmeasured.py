"""Ausgeschriebenes `brightness: null` heisst UNGEMESSEN, an allen Lesestellen."""

from __future__ import annotations

import numpy as np
import pytest

from chesslab.cell_rule import CELL_DARK_MIN, classification_eligible

torch = pytest.importorskip("torch")


def _row(**over) -> dict:
    return {"coverage": 0.0, "brightness": None, **over}


def test_the_rule_itself_says_unmeasured_is_bright():
    assert classification_eligible(_row()) is True
    assert classification_eligible(_row(brightness=CELL_DARK_MIN - 1)) is False


def test_the_loader_does_not_die_on_it():
    from chesslab.training.torch_data import _target

    got = _target(3, _row())

    assert float(got[2]) == 255.0, "null ist ungemessen, also hell — wie in occlusion.py"


def test_the_metric_does_not_turn_it_into_a_dark_cell():
    """`np.array([None], dtype=float)` ist `nan`, und `nan >= x` ist False — still zu dunkel."""
    from chesslab.cell_rule import brightness_of

    got = np.array([brightness_of(r) for r in
                    [_row(), _row(brightness=10.0), {"coverage": 0.0}]], dtype=float)

    assert np.array_equal(got, np.array([255.0, 10.0, 255.0]))
