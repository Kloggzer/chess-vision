"""Repair of a grid line found in the wrong place, which `mesh_from_lines` cannot see."""

import pytest

from chesslab.sessions import _repair_mesh_outliers

EIGHTHS = [round(i / 8, 5) for i in range(9)]


def _row(y=None, x=None, source="measured"):
    return {"corners": [[0, 0], [1, 0], [1, 1], [0, 1]], "grid_lines_source": source,
            "grid_lines": {"x": list(x or EIGHTHS), "y": list(y or EIGHTHS),
                           "tx": [0.0] * 9, "ty": [0.0] * 9}}


def test_a_line_that_locked_onto_a_piece_is_pulled_back():
    """One frame out of many disagrees — the session's median is the better witness."""
    off = list(EIGHTHS)
    off[1] -= 0.013                      # the 8/7 boundary, as measured on the turntable clip
    rows = [_row() for _ in range(9)] + [_row(off)]

    repaired, static = _repair_mesh_outliers(rows)

    assert (repaired, static) == (1, True)
    assert rows[-1]["grid_lines"]["y"] == EIGHTHS
    assert rows[-1]["grid_lines_source"] == "repaired"


def test_the_other_lines_of_a_repaired_frame_are_left_alone():
    """Only the line that is off gets replaced — the rest is that frame's own measurement."""
    off = list(EIGHTHS)
    off[1] -= 0.013
    off[5] += 0.002                      # inside tolerance: real, small, per-frame variation
    rows = [_row() for _ in range(9)] + [_row(off)]

    _repair_mesh_outliers(rows)

    assert rows[-1]["grid_lines"]["y"][5] == pytest.approx(EIGHTHS[5] + 0.002)


def test_a_moving_camera_keeps_its_own_lines():
    """A drifting rig makes the session median meaningless — repairing against it would be worse."""
    drift = [[v + i * 0.006 for v in EIGHTHS] for i in range(10)]
    rows = [_row(y=d, x=d) for d in drift]

    repaired, static = _repair_mesh_outliers(rows)

    assert (repaired, static) == (0, False)


def test_one_drifting_axis_does_not_veto_the_other():
    """Stability is judged per line: a board sliding along one axis still pins the other."""
    rows = [_row(y=[v + i * 0.006 for v in EIGHTHS]) for i in range(9)]
    off = list(EIGHTHS)
    off[3] += 0.02
    rows.append(_row(y=[v + 0.027 for v in EIGHTHS], x=off))

    repaired, _ = _repair_mesh_outliers(rows)

    assert repaired == 1
    assert rows[-1]["grid_lines"]["x"] == EIGHTHS, "x held still and is repaired"
    assert rows[-1]["grid_lines"]["y"][3] == pytest.approx(EIGHTHS[3] + 0.027), "y drifted, untouched"


def test_carried_and_missing_meshes_are_not_touched():
    """A carried mesh already IS the neighbours' median; repairing it would count it twice."""
    rows = [_row() for _ in range(9)] + [_row(source="carried"), {"corners": [[0, 0]]}]

    _repair_mesh_outliers(rows)

    assert rows[-2]["grid_lines_source"] == "carried"


def test_too_few_measurements_to_have_a_median():
    """Two frames cannot outvote a third — below that the median is not a witness."""
    assert _repair_mesh_outliers([_row(), _row()]) == (0, False)
