"""Tests for lens undistortion (`chesslab.lens`).

No hardware: calibration files are synthesized into `tmp_path`. The behavioural crux
covered here is (a) undistortion is OFF unless a calibration exists, (b) the remap maps
are built exactly ONCE (never `cv2.undistort` per frame), and (c) the source policy —
the phone/IP cam and recorded files must never be remapped.
"""

from __future__ import annotations

import logging
from dataclasses import replace

import cv2
import numpy as np
import pytest
from typer.testing import CliRunner

from chesslab import config, lens
from chesslab.calibration import CalibrationProfile, CropParams
from chesslab.cli import app


@pytest.fixture(autouse=True)
def _reset_lens_state(monkeypatch, tmp_path):
    """Fresh module state per test: no cached maps, no 'already warned' flag, and the
    calibration path pointed at an empty tmp dir so nothing leaks between tests."""
    lens._MAP_CACHE.clear()
    monkeypatch.setattr(lens, "_warned", False)
    # config.LENS is a FROZEN dataclass — swap the whole instance instead of a field.
    monkeypatch.setattr(config, "LENS", replace(config.LENS, path=str(tmp_path / "calib.npz")))
    yield
    lens._MAP_CACHE.clear()


def _write_calib(path, w=640, h=480, k1=-0.25):
    """A synthetic but physically plausible barrel-distortion calibration."""
    k = np.array([[float(w), 0.0, w / 2.0],
                  [0.0, float(w), h / 2.0],
                  [0.0, 0.0, 1.0]], dtype=np.float64)
    d = np.array([k1, 0.05, 0.0, 0.0, 0.0], dtype=np.float64)
    calib = lens.LensCalibration(camera_matrix=k, dist_coeffs=d, image_size=(w, h),
                                 rms=0.42, created_at="2026-07-19T00:00:00+00:00",
                                 id=lens.calib_id(k, d))
    return lens.save(path, calib, n_frames=15)


# --- load() ---------------------------------------------------------------------------

def test_load_missing_returns_none_and_warns_exactly_once(tmp_path, caplog):
    missing = tmp_path / "nope.npz"
    with caplog.at_level(logging.WARNING, logger="chesslab.lens"):
        assert lens.load(missing) is None
        assert lens.load(missing) is None
        assert lens.load(missing) is None
    warnings = [r for r in caplog.records if "no lens calibration" in r.message]
    assert len(warnings) == 1


def test_load_roundtrips_a_saved_calibration(tmp_path):
    p = _write_calib(tmp_path / "calib.npz")
    calib = lens.load(p)
    assert calib is not None
    assert calib.image_size == (640, 480)
    assert calib.rms == pytest.approx(0.42)
    assert calib.dist_coeffs.shape == (5,)
    assert calib.id == lens.calib_id(calib.camera_matrix, calib.dist_coeffs)


# --- the performance contract ---------------------------------------------------------

def test_maps_are_built_once_and_undistort_is_never_called(tmp_path, monkeypatch):
    _write_calib(tmp_path / "calib.npz")
    calls = {"maps": 0, "undistort": 0}
    real_maps = cv2.initUndistortRectifyMap

    def counting_maps(*a, **k):
        calls["maps"] += 1
        return real_maps(*a, **k)

    def forbidden_undistort(*a, **k):
        calls["undistort"] += 1
        raise AssertionError("cv2.undistort must never be called per frame")

    monkeypatch.setattr(lens.cv2, "initUndistortRectifyMap", counting_maps)
    monkeypatch.setattr(lens.cv2, "undistort", forbidden_undistort)

    und = lens.active("clip.mp4", override=True, path=tmp_path / "calib.npz")
    assert und is not None
    frame = np.full((480, 640, 3), 128, np.uint8)
    for _ in range(10):
        out = und.apply(frame)
        assert out.shape == frame.shape
    assert calls["maps"] == 1
    assert calls["undistort"] == 0


# --- frame-size handling --------------------------------------------------------------

def test_matching_aspect_scales_k(tmp_path):
    _write_calib(tmp_path / "calib.npz", w=640, h=480)
    calib = lens.load(tmp_path / "calib.npz")
    und = lens.Undistorter(calib)
    k = und._scaled_k(1280, 960)          # same 4:3, exactly 2x
    assert k is not None
    assert k[0, 0] == pytest.approx(calib.camera_matrix[0, 0] * 2)
    assert k[0, 2] == pytest.approx(calib.camera_matrix[0, 2] * 2)
    assert k[1, 2] == pytest.approx(calib.camera_matrix[1, 2] * 2)


def test_mismatched_aspect_passes_through_with_one_warning(tmp_path, caplog):
    _write_calib(tmp_path / "calib.npz", w=640, h=480)
    calib = lens.load(tmp_path / "calib.npz")
    und = lens.Undistorter(calib)
    frame = np.full((360, 640, 3), 7, np.uint8)          # 16:9 vs 4:3
    with caplog.at_level(logging.WARNING, logger="chesslab.lens"):
        out1 = und.apply(frame)
        out2 = und.apply(frame)
    assert out1 is frame and out2 is frame               # untouched pass-through
    assert len([r for r in caplog.records if "aspect ratio" in r.message]) == 1


# --- pure geometry --------------------------------------------------------------------

def test_object_points_grid():
    pts = lens.object_points(7, 7, square_mm=25.0)
    assert pts.shape == (49, 3)
    assert np.all(pts[:, 2] == 0)
    assert pts[:, :2].max() == pytest.approx(6 * 25.0)


# --- automation helpers ---------------------------------------------------------------

def test_pose_novelty_first_view_is_infinite_then_measures_displacement():
    base = np.array([[0.0, 0.0], [10.0, 0.0], [0.0, 10.0]])
    assert lens.pose_novelty(base, []) == float("inf")
    assert lens.pose_novelty(base, [base]) == pytest.approx(0.0)
    moved = base + np.array([3.0, 4.0])                 # every corner shifted by 5 px
    assert lens.pose_novelty(moved, [base]) == pytest.approx(5.0)
    # closest accepted view wins, not the average
    assert lens.pose_novelty(moved, [base + 100, base]) == pytest.approx(5.0)


def test_coverage_grid_bookkeeping():
    cov = lens.CoverageGrid(300, 300, n=3)
    assert cov.covered == 0 and cov.fraction == 0.0
    assert "top-left" in cov.missing()
    cov.add([[10, 10], [20, 20]])                        # both land in the top-left cell
    assert cov.covered == 1
    assert cov.fraction == pytest.approx(1 / 9)
    assert "top-left" not in cov.missing()
    assert len(cov.missing()) == 8
    # one point per cell fills the grid
    cov.add([[x, y] for y in (50, 150, 250) for x in (50, 150, 250)])
    assert cov.covered == 9 and cov.missing() == []


def test_edge_bow_straight_vs_bowed():
    straight = [[0.0, 0.0], [50.0, 0.0], [100.0, 0.0]]
    assert lens.edge_bow(straight) == pytest.approx(0.0)
    bowed = [[0.0, 0.0], [50.0, 5.0], [100.0, 0.0]]      # 5 px sag over a 100 px chord
    assert lens.edge_bow(bowed) == pytest.approx(0.05)
    assert lens.edge_bow([[0.0, 0.0], [10.0, 10.0]]) == 0.0   # < 3 points cannot bow


def test_drift_monitor_warns_only_after_a_streak(caplog):
    bowed = [np.array([[0.0, 0.0], [50.0, 5.0], [100.0, 0.0]])]
    mon = lens.DriftMonitor(every=1, bow_thr=0.004, streak=3)
    with caplog.at_level(logging.WARNING, logger="chesslab.lens"):
        assert mon.sample(bowed) == pytest.approx(0.05)
        assert not [r for r in caplog.records if "moved/zoomed" in r.message]
        mon.sample(bowed)
        mon.sample(bowed)
        mon.sample(bowed)                                # further samples must not re-warn
    assert len([r for r in caplog.records if "moved/zoomed" in r.message]) == 1


def test_drift_monitor_samples_only_every_nth_frame():
    straight = [np.array([[0.0, 0.0], [50.0, 0.0], [100.0, 0.0]])]
    mon = lens.DriftMonitor(every=3)
    assert mon.sample(straight) is None
    assert mon.sample(straight) is None
    assert mon.sample(straight) == pytest.approx(0.0)


def test_drift_monitor_flags_image_size_mismatch(tmp_path, caplog):
    _write_calib(tmp_path / "calib.npz", w=640, h=480)
    calib = lens.load(tmp_path / "calib.npz")
    mon = lens.DriftMonitor()
    assert mon.check_frame_size((640, 480), calib) is True
    with caplog.at_level(logging.WARNING, logger="chesslab.lens"):
        assert mon.check_frame_size((1920, 1080), calib) is False
    assert any("lens calibration was shot at" in r.message for r in caplog.records)


# --- source policy --------------------------------------------------------------------

def test_should_undistort_source_policy():
    assert lens.should_undistort(0) is True
    assert lens.should_undistort("1") is True
    assert lens.should_undistort("https://phone/video/m.jpeg") is False
    assert lens.should_undistort("clip.mp4") is False
    assert lens.should_undistort("clip.mp4", True) is True
    assert lens.should_undistort(0, False) is False


# --- profile versioning ---------------------------------------------------------------

def _profile(**kw) -> CalibrationProfile:
    base = {"profile": "default", "camera_index": 0, "frame_size": (640, 480),
            "board_size": 800, "image_corners": [[0, 0], [1, 0], [1, 1], [0, 1]],
            "homography": [[1, 0, 0], [0, 1, 0], [0, 0, 1]], "white_pov": True,
            "crop": CropParams.default(800)}
    base.update(kw)
    return CalibrationProfile(**base)


def test_a_profile_written_before_2026_08_20_still_loads_and_its_lens_keys_are_ignored():
    """Every profile on disk carries the four retired keys; loading must not trip over them.

    They are dropped, not honoured: the lens state is derived from `calib.npz` at use time, so a
    stored copy could only disagree with reality.
    """
    d = _profile().to_dict()
    d |= {"undistorted": True, "lens_calib_id": "deadbeef",
          "camera_matrix": [[9, 0, 1], [0, 9, 1], [0, 0, 1]], "dist_coeffs": [-0.25, 0, 0, 0, 0]}
    back = CalibrationProfile.from_dict(d)
    assert back.board_size == 800 and back.white_pov is True
    assert not any(hasattr(back, k) for k in
                   ("undistorted", "lens_calib_id", "camera_matrix", "dist_coeffs"))


def test_the_profiles_actually_on_disk_still_load():
    """A regression the unit fixture cannot catch: the real YAMLs predate the removal."""
    from chesslab import config
    for path in sorted(config.DATA.calibration.glob("*.yaml")):
        prof = CalibrationProfile.load(path)
        assert prof.profile and prof.board_size > 0, path


# --- `lens calibrate` re-stamping of existing board profiles ---------------------------

@pytest.fixture
def calib_dir(monkeypatch, tmp_path):
    """`config.DATA.calibration` pointed at a tmp dir (config.DATA is frozen → swap it)."""
    d = tmp_path / "data" / "calibration"
    d.mkdir(parents=True)
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    return d


def test_profile_source_policy():
    assert lens.profile_source(_profile(camera_index=0)) == 0
    assert lens.profile_source(_profile(camera_index=2)) == 2
    assert lens.profile_source(_profile(camera_index=-1)) == "offline"
    assert lens.profile_source(_profile(camera_index=0, source="https://p/v")) == "https://p/v"


# --- CLI ------------------------------------------------------------------------------

def test_lens_show_on_missing_file_exits_nonzero(tmp_path):
    result = CliRunner().invoke(app, ["lens", "show", "--path", str(tmp_path / "gone.npz")])
    assert result.exit_code != 0
    assert "no lens calibration" in result.stdout


def test_lens_show_prints_the_calibration(tmp_path):
    p = _write_calib(tmp_path / "calib.npz")
    result = CliRunner().invoke(app, ["lens", "show", "--path", str(p)])
    assert result.exit_code == 0
    assert "640x480" in result.stdout
    assert "varifocal" in result.stdout        # the re-calibrate warning must be there


# --- live drift detection -------------------------------------------------------------

BASE_QUAD = [[100.0, 100.0], [500.0, 100.0], [500.0, 500.0], [100.0, 500.0]]


def _monitor(**kw) -> lens.DriftMonitor:
    """A monitor with a small, fast-firing window so tests stay short."""
    kw.setdefault("window", 3)
    return lens.DriftMonitor(**kw)


def _scaled(quad, s: float):
    cx = sum(p[0] for p in quad) / 4.0
    cy = sum(p[1] for p in quad) / 4.0
    return [[cx + (x - cx) * s, cy + (y - cy) * s] for x, y in quad]


def test_quad_descriptor_is_linear_in_scale():
    a = lens.quad_descriptor(BASE_QUAD)
    b = lens.quad_descriptor(_scaled(BASE_QUAD, 2.0))
    assert b["mean_side"] == pytest.approx(2 * a["mean_side"])
    assert b["root_area"] == pytest.approx(2 * a["root_area"])


def test_quad_descriptor_rejects_degenerate_input():
    assert lens.quad_descriptor([[0, 0], [1, 1]]) is None
    assert lens.quad_descriptor([[0, 0]] * 4) is None


def test_geometry_deviation_zero_for_identical_quad():
    assert lens.geometry_deviation(BASE_QUAD, BASE_QUAD) == pytest.approx(0.0)


def test_geometry_deviation_reports_relative_zoom_change():
    assert lens.geometry_deviation(_scaled(BASE_QUAD, 1.2), BASE_QUAD) == pytest.approx(0.2)


def test_geometry_deviation_none_when_baseline_unusable():
    assert lens.geometry_deviation(BASE_QUAD, [[0, 0], [1, 0]]) is None


def test_identical_quad_never_warns(caplog):
    m = _monitor(geometry_thr=0.05)
    with caplog.at_level(logging.WARNING, logger="chesslab.lens"):
        for _ in range(20):
            m.sample_geometry(BASE_QUAD, BASE_QUAD)
    assert m.status["geometry_alarm"] is False
    assert not [r for r in caplog.records if "drifted" in r.message]


def test_zoom_change_warns_after_the_configured_streak(caplog):
    m = _monitor(geometry_thr=0.05)
    zoomed = _scaled(BASE_QUAD, 1.3)
    fires = []
    with caplog.at_level(logging.WARNING, logger="chesslab.lens"):
        for _ in range(20):
            m.sample_geometry(zoomed, BASE_QUAD)
            fires.append(m.status["geometry_alarm"])
    # window (3) must fill AND the streak must be reached — never on the first sample.
    assert fires[0] is False
    assert m.status["geometry_alarm"] is True
    assert m.status["geometry"] == pytest.approx(0.3, abs=1e-3)


def test_noise_around_the_baseline_does_not_warn(caplog):
    """The rolling median must swallow jitter — this is the whole point of the window."""
    rng = np.random.default_rng(42)
    m = _monitor(geometry_thr=0.05)
    with caplog.at_level(logging.WARNING, logger="chesslab.lens"):
        for _ in range(60):
            noisy = [[x + rng.normal(0, 3.0), y + rng.normal(0, 3.0)] for x, y in BASE_QUAD]
            m.sample_geometry(noisy, BASE_QUAD)
    assert m.status["geometry_alarm"] is False
    assert not [r for r in caplog.records if "drifted" in r.message]


def test_single_bad_sample_between_good_ones_does_not_warn():
    m = _monitor(geometry_thr=0.05)
    for i in range(30):
        q = _scaled(BASE_QUAD, 2.0) if i % 7 == 0 else BASE_QUAD
        m.sample_geometry(q, BASE_QUAD)
    assert m.status["geometry_alarm"] is False


def test_sustained_drift_warns_exactly_once(caplog):
    m = _monitor(geometry_thr=0.05)
    zoomed = _scaled(BASE_QUAD, 1.5)
    with caplog.at_level(logging.WARNING, logger="chesslab.lens"):
        for _ in range(200):
            m.sample_geometry(zoomed, BASE_QUAD)
    assert len([r for r in caplog.records if "drifted" in r.message]) == 1


# --- signal 2: leave-one-marker-out residual ------------------------------------------

def _marker_quads(size: float = 20.0):
    """Four square marker quads at the corners of a 600 px board."""
    centres = {0: (60.0, 60.0), 1: (540.0, 60.0), 2: (540.0, 540.0), 3: (60.0, 540.0)}
    return {i: np.array([[cx - size, cy - size], [cx + size, cy - size],
                         [cx + size, cy + size], [cx - size, cy + size]], dtype=np.float64)
            for i, (cx, cy) in centres.items()}


def _warp_all(quads, h):
    return {i: cv2.perspectiveTransform(q.reshape(-1, 1, 2).astype(np.float32),
                                        h).reshape(-1, 2).astype(np.float64)
            for i, q in quads.items()}


def _radial(quads, k: float, centre=(300.0, 300.0)):
    out = {}
    for i, q in quads.items():
        rel = q - np.asarray(centre)
        r2 = (rel ** 2).sum(axis=1, keepdims=True) / (300.0 ** 2)
        out[i] = np.asarray(centre) + rel * (1.0 + k * r2)
    return out


def test_loo_residual_is_near_zero_under_a_pure_homography():
    canon = _marker_quads()
    h = np.array([[1.05, 0.03, 12.0], [-0.02, 0.98, -7.0], [1e-5, 2e-5, 1.0]], dtype=np.float32)
    live = _warp_all(canon, h)
    assert lens.loo_homography_residual(live, canon) < 1e-3


def test_loo_residual_grows_under_radial_distortion():
    canon = _marker_quads()
    clean = lens.loo_homography_residual(canon, canon)
    warped = lens.loo_homography_residual(_radial(canon, 0.15), canon)
    assert clean < 1e-3
    assert warped > 1.0          # pixels — far above sub-pixel detection noise


def test_loo_residual_none_with_fewer_than_four_markers():
    canon = _marker_quads()
    live = dict(list(canon.items())[:3])
    assert lens.loo_homography_residual(live, canon) is None


def test_residual_signal_warns_once_on_sustained_distortion(caplog):
    canon = _marker_quads()
    live = _radial(canon, 0.15)
    m = _monitor(residual_thr=0.001)
    with caplog.at_level(logging.WARNING, logger="chesslab.lens"):
        for _ in range(50):
            m.sample_residual(live, canon, scale=480.0)
    assert m.status["residual_alarm"] is True
    assert len([r for r in caplog.records if "residual" in r.message]) == 1


def test_residual_signal_quiet_when_the_model_still_fits(caplog):
    canon = _marker_quads()
    m = _monitor(residual_thr=0.001)
    with caplog.at_level(logging.WARNING, logger="chesslab.lens"):
        for _ in range(50):
            m.sample_residual(canon, canon, scale=480.0)
    assert m.status["residual_alarm"] is False


def test_status_is_published_for_doctor():
    m = _monitor(geometry_thr=0.05)
    m.sample_geometry(BASE_QUAD, BASE_QUAD)
    assert lens.last_drift_status() is m.status
