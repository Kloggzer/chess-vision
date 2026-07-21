"""Tests for `chesslab lens calibrate-board` — calibration from recorded board sessions.

Hardware-free: the MATH path (harvest -> gate -> solve -> validate) is exercised with
synthetically projected grids (known K/D through `cv2.projectPoints`) and with a rendered
checkerboard image on disk for the detection/harvest path. No camera, no real data/.
"""

from __future__ import annotations

import json

import cv2
import numpy as np
import pytest
from typer.testing import CliRunner

from chesslab import lens
from chesslab.cli import app

# --- synthetic geometry ----------------------------------------------------------------

W, H = 1280, 960
K_TRUE = np.array([[1100.0, 0.0, 640.0], [0.0, 1100.0, 480.0], [0.0, 0.0, 1.0]])
D_TRUE = np.array([-0.12, 0.02, 0.0, 0.0, 0.0])
MARGIN = 0.06

OBJ_GRID = lens.object_points(7, 7, 1.0) + np.array([1.0, 1.0, 0.0], dtype=np.float32)
GRID_IDX = np.array([(i, j) for j in range(1, 8) for i in range(1, 8)], dtype=np.int32)
_M = MARGIN * 8.0
QUAD_OBJ = np.array([[-_M, -_M, 0.0], [8 + _M, -_M, 0.0],
                     [8 + _M, 8 + _M, 0.0], [-_M, 8 + _M, 0.0]], dtype=np.float32)


def _project_view(rvec, tvec, k=K_TRUE, d=D_TRUE, name="synthetic") -> lens.BoardGridView:
    """One BoardGridView with EXACT projections of the full 7x7 grid through k/d."""
    rv = np.asarray(rvec, dtype=np.float64).reshape(3, 1)
    tv = np.asarray(tvec, dtype=np.float64).reshape(3, 1)
    img, _ = cv2.projectPoints(OBJ_GRID, rv, tv, k, d)
    quad, _ = cv2.projectPoints(QUAD_OBJ, rv, tv, k, d)
    pts = img.reshape(-1, 2)
    assert pts.min() >= 0 and pts[:, 0].max() < W and pts[:, 1].max() < H, \
        f"test pose projects outside the image: {pts.min(0)}..{pts.max(0)}"
    return lens.BoardGridView(
        session_id=name, frame="frames/0000.png", image_size=(W, H),
        quad=quad.reshape(-1, 2), img_points=img.astype(np.float32),
        obj_points=OBJ_GRID.copy(), grid_idx=GRID_IDX.copy())


def _diverse_views(k=K_TRUE, d=D_TRUE) -> list[lens.BoardGridView]:
    """12 poses: board moved across the frame plus real tilt — a healthy dataset."""
    poses = [
        ((0.30, 0.10, 0.02), (-4.0, -4.2, 22.0)),
        ((-0.25, 0.20, 0.00), (-8.6, -4.0, 22.0)),
        ((0.20, -0.30, 0.05), (0.4, -4.0, 22.0)),
        ((0.35, 0.00, -0.03), (-4.0, -8.2, 22.0)),
        ((-0.30, -0.15, 0.00), (-4.0, 0.2, 22.0)),
        ((0.15, 0.35, 0.04), (-8.4, -8.0, 23.0)),
        ((-0.20, 0.30, 0.00), (0.2, -8.0, 23.0)),
        ((0.30, -0.20, -0.05), (-8.4, 0.0, 23.0)),
        ((-0.35, -0.25, 0.02), (0.2, 0.0, 23.0)),
        ((0.10, 0.10, 0.30), (-4.0, -4.0, 18.0)),
        ((0.40, 0.25, 0.00), (-5.5, -3.0, 20.0)),
        ((-0.15, -0.35, 0.10), (-2.5, -5.0, 20.0)),
    ]
    return [_project_view(rv, tv, k, d, name=f"pose{i:02d}")
            for i, (rv, tv) in enumerate(poses)]


# --- solve: recovers a known distortion ------------------------------------------------

def test_solve_recovers_known_distortion():
    views = _diverse_views()
    res = lens.solve_board_views(views, (W, H))
    assert res.rms < 0.5                                   # exact points -> near-exact fit
    assert res.dist_coeffs[0] == pytest.approx(D_TRUE[0], abs=0.03)
    assert res.dist_coeffs[2] == 0.0 and res.dist_coeffs[3] == 0.0   # tangential fixed
    assert res.dist_coeffs[4] == 0.0                                  # k3 fixed
    # The held-out view's grid lines must get much straighter under the solved model.
    assert res.bow_before > 2e-4
    assert res.bow_after < res.bow_before * 0.2
    ok, reason = lens.board_solve_acceptable(res)
    assert ok, reason


def test_solve_with_zero_distortion_is_refused_as_nothing_to_fix():
    views = _diverse_views(d=np.zeros(5))
    res = lens.solve_board_views(views, (W, H))
    ok, reason = lens.board_solve_acceptable(res)
    assert not ok
    assert "already straight" in reason


def test_acceptable_refuses_poor_rms_and_non_improving_bow():
    base = {"camera_matrix": K_TRUE, "dist_coeffs": D_TRUE, "image_size": (W, H),
            "n_views": 8, "tilt": 0.2, "holdout": "s/f"}
    bad_rms = lens.BoardSolveResult(rms=5.0, bow_before=0.01, bow_after=0.001, **base)
    ok, reason = lens.board_solve_acceptable(bad_rms)
    assert not ok and "RMS" in reason
    no_gain = lens.BoardSolveResult(rms=0.3, bow_before=0.01, bow_after=0.009, **base)
    ok, reason = lens.board_solve_acceptable(no_gain)
    assert not ok and "refusing to save" in reason
    good = lens.BoardSolveResult(rms=0.3, bow_before=0.01, bow_after=0.002, **base)
    ok, reason = lens.board_solve_acceptable(good)
    assert ok and "straighter" in reason


def test_view_line_bows_straighten_under_the_true_model():
    v = _project_view((0.3, 0.1, 0.0), (-4.0, -4.0, 20.0))
    before = np.median(lens.view_line_bows(v.img_points, v.grid_idx))
    after = np.median(lens.view_line_bows(v.img_points, v.grid_idx, K_TRUE, D_TRUE))
    assert before > 2e-4
    assert after < before * 0.05


# --- gate: pose diversity refusals -----------------------------------------------------

def test_gate_refuses_near_identical_poses():
    v = _project_view((0.3, 0.1, 0.0), (-4.0, -4.0, 22.0))
    jittered = []
    for i in range(10):                                    # same mount, ~2 px of noise
        c = lens.BoardGridView(
            session_id=f"s{i}", frame="f", image_size=(W, H),
            quad=v.quad + np.random.default_rng(i).normal(0, 2.0, v.quad.shape),
            img_points=v.img_points, obj_points=v.obj_points, grid_idx=v.grid_idx)
        jittered.append(c)
    accepted, _cov, _tilt, refusal = lens.gate_board_views(jittered, (W, H), min_views=8)
    assert len(accepted) == 1
    assert refusal is not None
    assert "distinct" in refusal
    assert "lens calibrate" in refusal                     # tells the user the way out


def test_gate_refuses_centre_only_coverage():
    centre = _project_view((0.05, 0.02, 0.0), (-4.0, -4.0, 60.0))   # tiny board, mid-frame
    views = []
    for i in range(6):                                     # novel quads, same tiny region
        views.append(lens.BoardGridView(
            session_id=f"s{i}", frame="f", image_size=(W, H),
            quad=centre.quad + i * 40.0, img_points=centre.img_points,
            obj_points=centre.obj_points, grid_idx=centre.grid_idx))
    accepted, cov, _tilt, refusal = lens.gate_board_views(views, (W, H),
                                                          min_views=3, min_coverage=4)
    assert len(accepted) >= 3
    assert cov.covered < 4
    assert refusal is not None and "regions" in refusal


def test_gate_accepts_diverse_views():
    accepted, cov, tilt, refusal = lens.gate_board_views(_diverse_views(), (W, H),
                                                         min_views=8)
    assert refusal is None
    assert len(accepted) >= 8
    assert cov.covered >= 4
    assert tilt > lens._MIN_TILT_FOR_FULL_SOLVE


# --- detection on a rendered board -----------------------------------------------------

CELL, ORIGIN = 80, 130                                    # 8x80 board at (130,130) in 900x900


def _render_board(occlude: list[tuple[int, int]] = ()) -> tuple[np.ndarray, list[list[float]]]:
    """Axis-aligned checkerboard image + its logged-corner quad (marker centres)."""
    img = np.full((900, 900), 128, np.uint8)
    for r in range(8):
        for c in range(8):
            v = 200 if (r + c) % 2 == 0 else 60
            img[ORIGIN + r * CELL:ORIGIN + (r + 1) * CELL,
                ORIGIN + c * CELL:ORIGIN + (c + 1) * CELL] = v
    for i, j in occlude:                                  # a "piece" over inner corner (i,j)
        cv2.circle(img, (ORIGIN + i * CELL, ORIGIN + j * CELL), 34, 128, -1)
    img = cv2.GaussianBlur(img, (3, 3), 0)
    m = MARGIN * 8 * CELL
    lo, hi = ORIGIN - m, ORIGIN + 8 * CELL + m
    quad = [[lo, lo], [hi, lo], [hi, hi], [lo, hi]]       # a8, h8, h1, a1
    return img, quad


def test_detect_grid_points_finds_the_inner_corners():
    img, quad = _render_board()
    det = lens.detect_grid_points(img, quad, margin=MARGIN)
    assert det is not None
    img_pts, obj_pts, grid_idx = det
    assert len(img_pts) == 49
    for p, (i, j) in zip(img_pts.reshape(-1, 2), grid_idx, strict=True):
        assert p[0] == pytest.approx(ORIGIN + i * CELL, abs=1.0)
        assert p[1] == pytest.approx(ORIGIN + j * CELL, abs=1.0)
    assert obj_pts[:, 2].max() == 0.0


def test_detect_grid_points_rejects_occluded_corners():
    img, quad = _render_board(occlude=[(2, 2), (5, 3)])
    det = lens.detect_grid_points(img, quad, margin=MARGIN)
    assert det is not None
    _img_pts, _obj_pts, grid_idx = det
    found = {tuple(g) for g in grid_idx.tolist()}
    assert (2, 2) not in found and (5, 3) not in found
    assert len(found) == 47


def test_detect_grid_points_refuses_degenerate_quad():
    img, _ = _render_board()
    assert lens.detect_grid_points(img, [[0, 0]] * 4, margin=MARGIN) is None


# --- harvest: session filtering on disk ------------------------------------------------

def _write_session(root, name, *, mode="play", camera_index=0, undistorted=False,
                   profile="tprof", with_frame=True, quad=None):
    sdir = root / name
    (sdir / "frames").mkdir(parents=True)
    yaml_txt = (f"session_id: {name}\nprofile: {profile}\nmode: {mode}\n"
                f"camera_index: {camera_index}\nundistorted: {str(undistorted).lower()}\n")
    (sdir / "session.yaml").write_text(yaml_txt, encoding="utf-8")
    if with_frame:
        img, q = _render_board()
        cv2.imwrite(str(sdir / "frames" / "0000.png"), img)
        quad = quad or q
    entry = {"frame": "frames/0000.png", "fen": "8/8/8/8/8/8/8/8 w - - 0 1",
             "corners": quad or [[100, 100], [800, 100], [800, 800], [100, 800]]}
    (sdir / "log.jsonl").write_text(json.dumps(entry) + "\n", encoding="utf-8")
    return sdir


def test_harvest_skips_synthetic_undistorted_and_frameless(tmp_path):
    root = tmp_path / "sessions"
    _write_session(root, "real")
    _write_session(root, "ingested", mode="ingested", camera_index=-1, with_frame=False)
    _write_session(root, "remapped", undistorted=True)
    _write_session(root, "no-frames", with_frame=False)
    views, stats = lens.harvest_board_views(root)
    assert stats["sessions"] == 4
    assert stats["skipped_synthetic"] == 1
    assert stats["skipped_undistorted"] == 1
    assert stats["skipped_no_frames"] == 1
    assert len(views) == 1
    v = views[0]
    assert v.session_id == "real"
    assert v.image_size == (900, 900)
    assert v.n_points == 49


def test_harvest_profile_filter(tmp_path):
    root = tmp_path / "sessions"
    _write_session(root, "a", profile="tprof")
    _write_session(root, "b", profile="other")
    views, stats = lens.harvest_board_views(root, profile="tprof")
    assert stats["skipped_profile"] == 1
    assert [v.session_id for v in views] == ["a"]


def test_harvest_missing_root_is_empty():
    views, stats = lens.harvest_board_views(sessions_dir=__import__("pathlib").Path("Z:/nope"))
    assert views == [] and stats["sessions"] == 0


# --- CLI: refusal path end-to-end ------------------------------------------------------

def test_cli_calibrate_board_refuses_a_single_pose(tmp_path):
    root = tmp_path / "sessions"
    _write_session(root, "only-one")
    out = tmp_path / "calib.npz"
    result = CliRunner().invoke(app, ["lens", "calibrate-board",
                                      "--sessions", str(root), "--out", str(out)])
    assert result.exit_code != 0
    assert "distinct" in result.stdout
    assert not out.exists()                                # refused -> nothing saved


def test_cli_calibrate_board_refuses_to_overwrite_without_force(tmp_path):
    out = tmp_path / "calib.npz"
    out.write_bytes(b"x")
    result = CliRunner().invoke(app, ["lens", "calibrate-board",
                                      "--sessions", str(tmp_path / "none"),
                                      "--out", str(out)])
    assert result.exit_code != 0
    assert "--force" in result.stdout
