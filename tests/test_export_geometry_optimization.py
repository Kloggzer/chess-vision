"""Optimizations must preserve sampled pixels and the groove detector's decisions."""

import cv2
import numpy as np
import pytest

from chesslab import calibration as cal
from chesslab.alignment import _notch_centre
from chesslab.realgames import _field_profile


def _polyfit_notch(win, csp, min_depth=6.0):
    """Pre-optimization reference, including the original connected-notch gate."""
    n = len(win)
    if n < 7:
        return None
    t = np.arange(n, dtype=np.float64)
    k = max(2, n // 4)
    a, b = np.polyfit(np.r_[t[:k], t[-k:]], np.r_[win[:k], win[-k:]], 1)
    resid = (a * t + b) - win
    j = int(np.argmax(resid))
    depth = float(resid[j])
    if depth < min_depth:
        return None
    above = resid > 0.5 * depth
    lo = hi = j
    while lo > max(0, j - csp) and above[lo - 1]:
        lo -= 1
    while hi < min(n - 1, j + csp) and above[hi + 1]:
        hi += 1
    if above[max(0, lo - 1)] and above[min(n - 1, hi + 1)]:
        return None
    seg = resid[lo:hi + 1] - 0.5 * depth
    total = float(seg.sum())
    if total <= 0.0 or len(seg) < 3:
        return None
    return lo + float((seg * np.arange(len(seg))).sum() / total), depth


def test_analytic_notch_matches_polyfit_on_slopes_noise_and_occlusion():
    rng = np.random.default_rng(42)
    accepted = 0
    for _ in range(3000):
        n = int(rng.integers(7, 130))
        x = np.arange(n, dtype=np.float64)
        win = rng.uniform(20, 230) + rng.uniform(-1, 1) * x
        win -= rng.uniform(0, 70) * np.exp(-0.5 * ((x - rng.uniform(0, n)) / rng.uniform(1, n / 3)) ** 2)
        win += rng.normal(0, 0.5, n)
        old, new = _polyfit_notch(win, 8), _notch_centre(win, 8)
        assert (old is None) == (new is None)
        if old is not None:
            accepted += 1
            np.testing.assert_allclose(new, old, rtol=0, atol=1e-10)
    assert accepted > 100


def test_notch_subtracts_unsigned_shoulders_without_wrapping():
    x = np.arange(65, dtype=np.float64)
    for slope in (-1, 1):
        win = (100 + slope * x - 40 * np.exp(-0.5 * ((x - 32) / 3) ** 2)).astype(np.uint8)
        expected = _polyfit_notch(win, 8)
        assert expected is not None
        np.testing.assert_allclose(_notch_centre(win, 8), expected, rtol=0, atol=1e-10)


@pytest.mark.parametrize("lens", [None, cal.LensModel(0.02, -0.001, 180, 110, 100)])
def test_cached_mesh_warp_preserves_pixels_with_changing_geometry(lens):
    rng = np.random.default_rng(42)
    frame = rng.integers(0, 256, (210, 230, 3), dtype=np.uint8)
    corners = [[20., 20.], [200., 25.], [195., 185.], [25., 190.]]
    profile = _field_profile(corners, (230, 210), 128)
    mesh = cal.GridMesh([i / 8 for i in range(9)], [i / 8 for i in range(9)],
                        [0.002] * 9, [-0.001] * 9, [0.003] * 9, [0.004] * 9)
    for pad, shift in [(3, 0), (3, 2), (8, -1), (3, 0)]:
        quad = (np.array(corners) + shift).tolist()
        bs = profile.board_size
        adjusted = quad if lens is None else cal.undistort_points(quad, lens)
        h = np.array(cal.compute_homography(adjusted, bs, profile.margin), dtype=np.float64)
        ys, xs = np.mgrid[0:bs + 2 * pad, 0:bs + 2 * pad].astype(np.float64)
        u, v = cal.mesh_point((xs - pad) / bs, (ys - pad) / bs, mesh)
        ix, iy = cal._board_to_image(u, v, np.linalg.inv(h), bs)
        if lens is not None:
            ix, iy = cal.distort_points(ix, iy, lens)
        expected = cv2.remap(frame, ix.astype(np.float32), iy.astype(np.float32),
                             cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT)
        np.testing.assert_array_equal(cal.warp_padded(frame, profile, quad, pad, mesh, lens), expected)
        # Lists inside a frozen GridMesh can still change: key by values, not identity.
        mesh.x[4] += 0.0005


@pytest.mark.parametrize("metadata", [0, 90, 180, 270])
@pytest.mark.parametrize("rotate", [None, cv2.ROTATE_90_CLOCKWISE, cv2.ROTATE_180,
                                    cv2.ROTATE_90_COUNTERCLOCKWISE])
def test_metadata_and_explicit_rotation_compose_exactly(metadata, rotate):
    from chesslab.recording import _combined_rotation

    class Capture:
        automatic = True

        def get(self, key):
            return self.automatic if key == cv2.CAP_PROP_ORIENTATION_AUTO else metadata

        def set(self, _key, value):
            self.automatic = bool(value)
            return True

    image = np.arange(7 * 11 * 3, dtype=np.uint8).reshape(7, 11, 3)
    rotations = {90: cv2.ROTATE_90_CLOCKWISE, 180: cv2.ROTATE_180,
                 270: cv2.ROTATE_90_COUNTERCLOCKWISE}
    automatic = image if metadata == 0 else cv2.rotate(image, rotations[metadata])
    expected = automatic if rotate is None else cv2.rotate(automatic, rotate)
    cap = Capture()
    combined = _combined_rotation(cap, rotate)
    source = automatic if cap.automatic else image
    actual = source if combined is None else cv2.rotate(source, combined)
    np.testing.assert_array_equal(actual, expected)


def test_selected_crops_are_the_same_training_crops_in_requested_order():
    from chesslab.labeling import all_squares, crops_for_frame

    image = np.random.default_rng(42).integers(0, 256, (128, 128, 3), dtype=np.uint8)
    corners = [[0., 0.], [128., 0.], [128., 128.], [0., 128.]]
    profile = _field_profile(corners, (128, 128), 128)
    full = crops_for_frame(image, corners, profile, out_size=(48, 48))
    wanted = ["h8", "a1", "e4", "a1"]
    selected = crops_for_frame(image, corners, profile, out_size=(48, 48), squares=wanted)
    for sq, crop in zip(wanted, selected, strict=True):
        np.testing.assert_array_equal(crop, full[all_squares().index(sq)])
    assert crops_for_frame(image, corners, profile, squares=[]) == []


def test_parallel_settle_matches_serial_across_segments_and_missing_anchors(tmp_path):
    from chesslab import realgames as rg

    corners = [[0., 0.], [64., 0.], [64., 64.], [0., 64.]]
    profile = _field_profile(corners, (64, 64), 64)
    for part in range(2):
        path = tmp_path / ("video.avi" if part == 0 else "video-001.avi")
        writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"MJPG"), 15, (64, 64))
        assert writer.isOpened()
        try:
            for frame in range(part * 150, (part + 1) * 150):
                value = 20 if frame < 60 or 130 <= frame < 180 else (120 if frame < 130 else 220)
                writer.write(np.full((64, 64, 3), value, np.uint8))
        finally:
            writer.release()
    jobs = [{"lo": lo, "hi": hi, "commit": commit, "touched": {"a1", "h8"},
             "move": {"ply": i + 1}}
            for i, (lo, hi, commit) in enumerate([(10, 120, 100), (80, 250, 230), (200, 350, 300)])]
    kw = {"video": tmp_path / "video.avi", "quad": corners, "profile": profile, "rotate": None}
    serial = rg.settle_cluster(jobs, **kw)
    parallel = rg._settle_parallel(jobs, workers=3, **kw)
    assert parallel == serial == {1: {"a1": 60, "h8": 60}, 2: {"a1": 180, "h8": 180}}


def test_grid_measurement_reuse_expires_at_the_next_frame(monkeypatch):
    from chesslab import alignment as align

    corners = [[0., 0.], [128., 0.], [128., 128.], [0., 128.]]
    profile = _field_profile(corners, (128, 128), 128)
    frame = np.random.default_rng(42).integers(0, 256, (128, 128, 3), dtype=np.uint8)
    original = align._line_band_samples
    calls = []

    def counted(*args, **kwargs):
        calls.append(1)
        return original(*args, **kwargs)

    monkeypatch.setattr(align, "_line_band_samples", counted)
    with align.reuse_grid_measurements():
        warped, pad = align.warp_for_grid(frame, profile, corners)
        expected = align.line_band_samples(warped, 128, pad=pad)
        again, _ = align.warp_for_grid(frame, profile, corners)
        assert again is warped
        assert align.line_band_samples(again, 128, pad=pad) == expected
    assert len(calls) == 1
    frame[:] = 0
    with align.reuse_grid_measurements():
        new, pad = align.warp_for_grid(frame, profile, corners)
        assert not np.array_equal(new, warped)
        assert align.line_band_samples(new, 128, pad=pad) == [[[] for _ in range(9)] for _ in range(2)]
    assert len(calls) == 2
