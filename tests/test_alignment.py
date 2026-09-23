"""Alignment on a synthetic board with a border, projected through a known quad."""

import cv2
import numpy as np
import pytest

from chesslab.alignment import (
    GRID_PAD_CELLS,
    Alignment,
    alignment_of,
    correct_quad,
    frame_offsets,
    grid_lines,
    improve_quad,
    refine_quad,
    square_offsets,
    warp_for_grid,
    worst_offset,
)
from chesslab.calibration import CalibrationProfile, compute_homography
from conftest import make_profile

BS = 800
CELL = BS / 8
TRUTH = [[240.0, 180.0], [1180.0, 200.0], [1150.0, 1060.0], [210.0, 1020.0]]  # a8,h8,h1,a1

#: Cells of board rendered outside the playing field. Wider than `GRID_PAD_CELLS` so the warp the
#: measurement takes is filled with board rather than with whatever the canvas was cleared to.
BORDER_CELLS = 0.8
BORDER = int(round(BORDER_CELLS * CELL))


def _profile() -> CalibrationProfile:
    return make_profile(BS, corners=TRUTH, frame_size=(1400, 1200), profile="align-test")


def _board() -> np.ndarray:
    """A rectified board with a `BORDER` px surround: alternating squares, a dark groove on every
    cell boundary, and the same groove on the playing-field boundary itself."""
    n = BS + 2 * BORDER
    img = np.full((n, n, 3), 175, np.uint8)                       # the border strip
    img[BORDER:BORDER + BS, BORDER:BORDER + BS] = 205
    for f in range(8):
        for r in range(8):
            if (f + r) % 2 == 0:
                x, y = BORDER + int(f * CELL), BORDER + int(r * CELL)
                img[y:y + int(CELL), x:x + int(CELL)] = 70
    for k in range(9):
        p = BORDER + int(round(k * CELL))
        img[p - 2:p + 3, :] = 20
        img[:, p - 2:p + 3] = 20
    return cv2.GaussianBlur(img, (0, 0), 1.0)


def _pad_shift(px: int) -> np.ndarray:
    t = np.eye(3)
    t[:2, 2] = (px, px)
    return t


def _frame(quad=None) -> np.ndarray:
    """The synthetic board, border and all, seen through `quad` (the truth quad by default)."""
    h = np.array(compute_homography(quad or TRUTH, BS), np.float64)
    return cv2.warpPerspective(_board(), np.linalg.inv(h) @ _pad_shift(-BORDER), (1400, 1200))


def _bend(quad, m):
    """The quad whose warp shows the board displaced by the rectified-space transform `m`."""
    h = np.array(compute_homography(quad, BS), np.float64)
    t = np.linalg.inv(h) @ np.linalg.inv(m) @ h
    p = t @ np.hstack([np.asarray(quad, float), np.ones((4, 1))]).T
    return (p[:2] / p[2]).T.tolist()


def _displaced(m):
    """`(image, pad)` — the padded board displaced by the rectified-space transform `m`.

    The transform is conjugated by the pad shift so `m` keeps meaning what it means in rectified
    coordinates, which is what `_true_worst` computes against.
    """
    n = BS + 2 * BORDER
    img = cv2.warpPerspective(_board(), _pad_shift(BORDER) @ m @ _pad_shift(-BORDER), (n, n),
                              borderMode=cv2.BORDER_REPLICATE)
    return img, BORDER


def _shift(dx, dy):
    m = np.eye(3)
    m[:2, 2] = (dx, dy)
    return m


def _shear(deg):
    m = np.eye(3)
    m[0, 1] = np.tan(np.radians(deg))
    m[:2, 2] = np.array([BS / 2, BS / 2]) - m[:2, :2] @ np.array([BS / 2, BS / 2])
    return m


def _rot(deg):
    t = np.radians(deg)
    m = np.eye(3)
    m[:2, :2] = [[np.cos(t), -np.sin(t)], [np.sin(t), np.cos(t)]]
    m[:2, 2] = np.array([BS / 2, BS / 2]) - m[:2, :2] @ np.array([BS / 2, BS / 2])
    return m


def _scale(s):
    m = np.eye(3)
    m[0, 0] = m[1, 1] = s
    m[:2, 2] = np.array([BS / 2, BS / 2]) * (1 - s)
    return m


def _persp(kx, ky):
    """A pure PROJECTIVE displacement — the family an affine correction cannot remove.

    A three-marker quad is `cv2.getAffineTransform`'s parallelogram standing in for a perspective
    view of a plane, so this is the shape of its error and the reason `_fit_projective` replaced
    the affine fit.
    """
    m = np.eye(3)
    m[2, 0], m[2, 1] = kx / BS, ky / BS
    m[:2, 2] = np.array([BS / 2, BS / 2]) - (1.0 + (kx + ky) / 2.0) * np.array([BS / 2, BS / 2])
    return m / m[2, 2]


def test_grid_lines_measures_all_eighteen_including_the_outer_ones():
    """The whole point of the padded warp: index 0 and 8 are MEASURED, not put there."""
    lines = grid_lines(_board(), BS, pad=BORDER)
    assert all(f is not None for ax in lines for f in ax)
    for axis in (0, 1):
        got = np.array([lines[axis][k][1] for k in range(9)])
        assert np.allclose(got, BORDER + np.arange(9) * CELL, atol=0.6)
        assert np.abs([lines[axis][k][0] for k in range(9)]).max() < 0.004


def test_grid_lines_refuses_the_outer_ones_without_a_pad():
    """No surrounding board, no window to search in — reported missing, never assumed."""
    lines = grid_lines(_board()[BORDER:BORDER + BS, BORDER:BORDER + BS], BS)
    assert [lines[0][0], lines[0][8], lines[1][0], lines[1][8]] == [None] * 4
    assert all(lines[a][k] is not None for a in (0, 1) for k in range(1, 8))


def test_offsets_are_near_zero_on_the_truth_quad():
    off, unread = square_offsets(_board(), BS, BORDER)
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


def _line_at(h, k, axis, coord):
    """Where the image of nominal line `k` of `axis` under `h` crosses `coord` on the other axis."""
    a = [k * CELL, 0.0] if axis == 0 else [0.0, k * CELL]
    b = [k * CELL, float(BS)] if axis == 0 else [float(BS), k * CELL]
    p = h @ np.array([[a[0], b[0]], [a[1], b[1]], [1.0, 1.0]])
    (x0, y0), (x1, y1) = (p[:2] / p[2]).T
    if axis == 0:
        return x0 + (x1 - x0) * (coord - y0) / (y1 - y0) if abs(y1 - y0) > 1e-9 else x0
    return y0 + (y1 - y0) * (coord - x0) / (x1 - x0) if abs(x1 - x0) > 1e-9 else y0


def _true_worst(h):
    """What `square_offsets` owes for a board displaced by `h`, from geometry alone.

    Mirrors the metric's own definition — the largest displacement of any square edge, evaluated
    where that edge passes the square — so this is a calibration, not a restatement.
    """
    worst = 0.0
    for f in range(8):
        for r in range(8):
            cy, cx = (7.5 - r) * CELL, (f + 0.5) * CELL
            edges = (_line_at(h, f, 0, cy), _line_at(h, f + 1, 0, cy),
                     _line_at(h, 7 - r, 1, cx), _line_at(h, 8 - r, 1, cx))
            want = (f * CELL, (f + 1) * CELL, (7 - r) * CELL, (8 - r) * CELL)
            worst = max(worst, max(abs(e - w) for e, w in zip(edges, want, strict=True)))
    return worst


def _pieces(img):
    """Dark discs centred on cells. They overlap the grooves, which is the whole difficulty."""
    out = img.copy()
    for f, r in [(0, 0), (1, 0), (3, 1), (5, 0), (7, 1), (2, 6), (4, 7), (6, 6), (3, 3), (4, 4)]:
        cv2.circle(out, (BORDER + int((f + 0.5) * CELL), BORDER + int((r + 0.5) * CELL)),
                   int(CELL * 0.46), (35, 35, 35), -1)
    rng = np.random.default_rng(42)
    out = cv2.GaussianBlur(out, (0, 0), 1.2).astype(np.float32) + rng.normal(0, 4.0, out.shape)
    return np.clip(out, 0, 255).astype(np.uint8)


@pytest.mark.parametrize(("name", "m"), [
    ("shift", _shift(2.0, 0.0)),
    ("shift", _shift(10.0, 0.0)),
    ("rotation", _rot(0.10)),
    ("rotation", _rot(0.50)),
    ("rotation", _rot(1.00)),
    ("shear", _shear(0.25)),
    ("shear", _shear(0.50)),
    ("scale", _scale(1.005)),
    ("scale", _scale(0.990)),
    ("perspective", _persp(0.010, 0.0)),
    ("perspective", _persp(0.006, -0.008)),
])
def test_the_reported_number_is_the_true_number(name, m):
    """Calibration against analytic truth, on a bare board and one cluttered with pieces.

    Directional tests pass for a metric that reports a third of the error, so each family (shear,
    rotation, SCALE, PERSPECTIVE) is checked by value. Half a pixel bare; a piece on a groove
    gets one."""
    img, pad = _displaced(m)
    truth = _true_worst(m)
    assert abs(max(square_offsets(img, BS, pad)[0].values()) - truth) < 0.5, name
    assert abs(max(square_offsets(_pieces(img), BS, pad)[0].values()) - truth) < 1.0, name


def test_a_uniform_scale_is_reported_at_its_true_size():
    """The blind spot that used to be recorded here as structural, closed by measuring the edges.

    `line_positions` pinned index 0 and 8 at 0 and `board_size` because the warp puts them there by
    construction. A scale error is largest at exactly those outer edges, so the metric saw only
    what was left at the innermost measurable lines and reported 3/4 of it — this test asserted
    `0.75 * truth` and passed. `grid_lines` looks for those lines in a padded warp instead.
    """
    m = _scale(1.005)
    img, pad = _displaced(m)
    reported = max(square_offsets(img, BS, pad)[0].values())
    assert abs(reported - _true_worst(m)) < 0.5
    assert _true_worst(m) > 1.9                    # ... and it is a real error, not a rounding one


def test_grid_lines_reports_the_tilt():
    prof = _profile()
    bent = _bend(TRUTH, _shear(0.7))
    warped, pad = warp_for_grid(_frame(), prof, bent)
    lines = grid_lines(warped, BS, pad=pad)
    assert abs(lines[0][1][0]) == pytest.approx(np.tan(np.radians(0.7)), abs=0.004)


@pytest.mark.parametrize("m", [
    _shift(6.0, -4.0),
    _shear(0.6),
    _shift(5.0, 5.0) @ _shear(-0.5),
    _persp(0.012, 0.004),
    _persp(-0.010, 0.010) @ _shift(4.0, -3.0),
])
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


def test_the_verdict_passes_the_truth_and_fails_a_bent_quad():
    prof = _profile()
    frame = _frame()
    good = alignment_of(frame, TRUTH, prof)
    assert isinstance(good, Alignment)
    assert good.ok and good.unread == 0
    assert good.limit == pytest.approx(0.04 * CELL)
    bad = alignment_of(frame, _bend(TRUTH, _shift(9.0, 0.0)), prof)
    assert not bad.ok
    assert bad.worst > good.limit
    assert "off their grid" in bad.reason


def test_the_verdict_fails_when_a_line_could_not_be_found():
    """Unread lines are a FAILURE, not a footnote — the frame is unmeasured where they are."""
    prof = _profile()
    verdict = alignment_of(np.full((1200, 1400, 3), 128, np.uint8), TRUTH, prof)
    assert not verdict.ok
    assert "could not be located" in verdict.reason or "no square" in verdict.reason


def test_the_verdict_is_absolute_not_a_spread_about_its_own_median():
    """A CONSISTENTLY wrong quad must fail. `quad_spread` scored exactly this case at p90 0.93 px.

    Every frame here carries the same 9 px displacement, so any measure of agreement between them
    is perfect. The verdict is not a measure of agreement.
    """
    prof = _profile()
    bent = _bend(TRUTH, _shift(9.0, 0.0))
    for _ in range(3):
        assert not alignment_of(_frame(), bent, prof).ok


def test_refine_quad_takes_a_coarse_quad_to_a_passing_verdict():
    """The coarse-to-fine staging: a quad tens of pixels out goes in, a passing verdict comes out."""
    prof = _profile()
    frame = _frame()
    coarse = _bend(TRUTH, _shift(8.0, -6.0) @ _shear(0.5))
    assert not alignment_of(frame, coarse, prof).ok
    best, verdict = refine_quad(frame, coarse, prof)
    assert verdict.ok, str(verdict)
    assert np.abs(np.array(best) - np.array(TRUTH)).max() < 3.0


def test_refine_quad_hands_back_the_coarse_quad_when_the_fit_fails():
    """A caller must never have to guess which stage answered — the verdict describes what it got."""
    prof = _profile()
    blank = np.full((1200, 1400, 3), 128, np.uint8)
    best, verdict = refine_quad(blank, TRUTH, prof)
    assert best == TRUTH
    assert not verdict.ok


def test_the_pad_is_narrower_than_the_search_it_serves_is_wide():
    """`warp_for_grid`'s pad has to hold the outer search window and stay off the label border."""
    from chesslab.alignment import OUTER_SEARCH_FRAC

    assert OUTER_SEARCH_FRAC < GRID_PAD_CELLS < 0.33
    _warped, pad = warp_for_grid(_frame(), _profile(), TRUTH)
    assert pad == int(round(GRID_PAD_CELLS * CELL))
