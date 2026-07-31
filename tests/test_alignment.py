"""Alignment on a synthetic board whose true geometry is known exactly.

The board is rendered rectified and then projected through a chosen quad, so "where the grid
really is" is not an estimate here — it is the quad the frame was built from.
"""

import cv2
import numpy as np
import pytest

from chesslab.alignment import (
    board_lattice,
    correct_quad,
    frame_offsets,
    improve_quad,
    line_geometry,
    line_positions,
    square_offsets,
    worst_offset,
)
from chesslab.calibration import CalibrationProfile, CropParams, compute_homography

BS = 800
CELL = BS / 8
TRUTH = [[240.0, 180.0], [1180.0, 200.0], [1150.0, 1060.0], [210.0, 1020.0]]  # a8,h8,h1,a1


def _profile() -> CalibrationProfile:
    return CalibrationProfile(
        profile="align-test",
        camera_index=0,
        frame_size=(1400, 1200),
        board_size=BS,
        image_corners=TRUTH,
        homography=compute_homography(TRUTH, BS),
        white_pov=True,
        crop=CropParams.default(BS),
        margin=0.0,
    )


def _board() -> np.ndarray:
    """A rectified board: alternating squares with a dark groove on every cell boundary."""
    img = np.full((BS, BS, 3), 205, np.uint8)
    for f in range(8):
        for r in range(8):
            if (f + r) % 2 == 0:
                x, y = int(f * CELL), int(r * CELL)
                img[y:y + int(CELL), x:x + int(CELL)] = 70
    for k in range(9):
        p = int(round(k * CELL))
        img[max(0, p - 2):p + 3, :] = 20
        img[:, max(0, p - 2):p + 3] = 20
    return cv2.GaussianBlur(img, (0, 0), 1.0)


def _frame(quad=None) -> np.ndarray:
    """The synthetic board seen through `quad` (the truth quad by default)."""
    h = np.array(compute_homography(quad or TRUTH, BS), np.float64)
    return cv2.warpPerspective(_board(), np.linalg.inv(h), (1400, 1200))


def _bend(quad, m):
    """The quad whose warp shows the board displaced by the rectified-space transform `m`."""
    h = np.array(compute_homography(quad, BS), np.float64)
    t = np.linalg.inv(h) @ np.linalg.inv(m) @ h
    p = t @ np.hstack([np.asarray(quad, float), np.ones((4, 1))]).T
    return (p[:2] / p[2]).T.tolist()


def _shift(dx, dy):
    m = np.eye(3)
    m[:2, 2] = (dx, dy)
    return m


def _shear(deg):
    m = np.eye(3)
    m[0, 1] = np.tan(np.radians(deg))
    m[:2, 2] = np.array([BS / 2, BS / 2]) - m[:2, :2] @ np.array([BS / 2, BS / 2])
    return m


def test_line_positions_pins_the_edges_and_finds_the_grooves():
    xs, ys = line_positions(_board(), BS)
    assert (xs[0], xs[8], ys[0], ys[8]) == (0.0, float(BS), 0.0, float(BS))
    assert np.allclose(xs[1:8], np.arange(1, 8) * CELL, atol=0.6)
    assert np.allclose(ys[1:8], np.arange(1, 8) * CELL, atol=0.6)


def test_lattice_has_a_sample_per_line_and_band():
    src, dst, ax = board_lattice(_board(), BS, bands=4)
    assert len(src) == len(dst) == len(ax) == 2 * 4 * 7
    assert np.abs(src - dst).max() < 1.0


def test_offsets_are_near_zero_on_the_truth_quad():
    off, unread = square_offsets(_board(), BS)
    assert unread == 0
    assert len(off) == 64
    assert max(off.values()) < 1.5


def test_a_shift_is_reported_at_its_true_size():
    prof = _profile()
    frame = _frame()
    assert worst_offset(frame, TRUTH, prof) < 1.5
    off, _ = frame_offsets(frame, _bend(TRUTH, _shift(7.0, 0.0)), prof)
    assert 5.5 < max(off.values()) < 8.5


def test_a_shear_is_visible_at_all():
    """The whole point of measuring band by band: a collapsed profile cannot see this."""
    prof = _profile()
    frame = _frame()
    quiet = worst_offset(frame, TRUTH, prof)
    loud = worst_offset(frame, _bend(TRUTH, _shear(0.7)), prof)
    assert loud - quiet > 2.5


def test_line_geometry_reports_the_tilt():
    prof = _profile()
    bent = _bend(TRUTH, _shear(0.7))
    from chesslab.calibration import warp_from_corners

    _xs, _ys, sx, _sy = line_geometry(warp_from_corners(_frame(), prof, bent), BS)
    assert abs(sx[1]) == pytest.approx(np.tan(np.radians(0.7)), abs=0.004)


@pytest.mark.parametrize("m", [_shift(6.0, -4.0), _shear(0.6), _shift(5.0, 5.0) @ _shear(-0.5)])
def test_correct_quad_walks_a_bent_quad_back(m):
    prof = _profile()
    frame = _frame()
    bent = _bend(TRUTH, m)
    assert worst_offset(frame, bent, prof) > 3.0
    fixed = correct_quad(frame, bent, prof)
    assert fixed is not None
    assert worst_offset(frame, fixed, prof) < 1.5
    assert np.abs(np.array(fixed) - np.array(TRUTH)).max() < 3.0


def test_improve_quad_never_hands_back_a_worse_quad():
    """The contract the callers rely on: write the result unconditionally, stay safe."""
    prof = _profile()
    quad, before, after = improve_quad(_frame(), TRUTH, prof)
    assert before < 1.5
    if quad is None:
        return
    assert after < before
    assert np.abs(np.array(quad) - np.array(TRUTH)).max() < 1.0


def test_correct_quad_gives_up_on_a_blank_frame():
    prof = _profile()
    blank = np.full((1200, 1400, 3), 128, np.uint8)
    assert correct_quad(blank, TRUTH, prof) is None
    quad, _before, _after = improve_quad(blank, TRUTH, prof)
    assert quad is None
