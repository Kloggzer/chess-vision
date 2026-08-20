"""Smoke tests for Stage 0 (doctor + config). No GPU/camera required."""

from chesslab import config, doctor


def test_classes_are_canonical():
    assert config.CLASSES[0] == "empty"
    assert len(config.CLASSES) == 14            # 1 empty + 12 Figuren + 1 occluded
    assert config.CLASSES.count("empty") == 1
    assert config.CLASSES[-1] == "occluded"     # verdeckt: nie aus FEN, nur Inference/Review
    assert config.OPTIONAL_CLASSES == {"empty", "occluded"}
    # 6 white + 6 black piece classes
    assert sum(c.startswith("w") for c in config.CLASSES) == 6
    assert sum(c.startswith("b") for c in config.CLASSES) == 6


def test_label_from_piece():
    assert config.label_from_piece("P") == "wP"
    assert config.label_from_piece("n") == "bN"
    assert config.label_from_piece("K") == "wK"
    assert config.label_from_piece(None) == "empty"
    assert config.label_from_piece("") == "empty"
    # every produced label is a valid class
    for sym in "PNBRQKpnbrqk":
        assert config.label_from_piece(sym) in config.CLASSES


def test_base_checks_run_without_gpu_or_camera():
    checks = doctor.base_checks()
    assert checks, "base_checks must return at least one Check"
    assert all(c.status in {doctor.PASS, doctor.WARN, doctor.FAIL} for c in checks)
    names = {c.name for c in checks}
    assert "python.version" in names
    assert "data.dirs" in names


def test_render_includes_summary():
    checks = [doctor.Check("x.y", doctor.PASS, "ok")]
    out = doctor.render(checks)
    assert "[PASS] x.y" in out
    assert "1 pass" in out


def test_validate_gpu_returns_tuple():
    # Without a torch install this still returns a (bool, checks) pair, never raises.
    ok, checks = doctor.validate_gpu()
    assert isinstance(ok, bool)
    assert isinstance(checks, list)


def test_lens_profile_check_names_which_profiles_the_lens_applies_to(tmp_path, monkeypatch):
    """Unreachable without a `calib.npz`, so nothing on the dev machine ever runs it.

    Since 2026-08-20 profiles carry no lens stamp, so the check no longer asks "does the stamp
    disagree" but "does this lens touch this profile at all" — decided by the source policy.
    """
    import numpy as np

    from chesslab import config, lens
    from chesslab.calibration import CalibrationProfile, CropParams

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    lens.save(config.DATA.root / "lens" / "calib.npz",
              lens.LensCalibration(camera_matrix=np.eye(3), dist_coeffs=np.zeros(5),
                                   image_size=(640, 480), rms=0.3, created_at="", id="abc123"))

    def _prof(name, **kw):
        CalibrationProfile(profile=name, camera_index=kw.pop("camera_index", -1),
                           frame_size=(640, 480), board_size=800,
                           image_corners=[[0, 0], [1, 0], [1, 1], [0, 1]],
                           homography=[[1, 0, 0], [0, 1, 0], [0, 0, 1]],
                           white_pov=True, crop=CropParams.default(800), **kw
                           ).save(config.DATA.calibration / f"{name}.yaml")

    _prof("rig", camera_index=0)                       # local index -> the rig lens applies
    _prof("phone", source="https://phone:4444/snap")   # a URL is never undistorted

    checks = {c.name: c for c in doctor.lens_checks()}
    assert checks["lens.calibration"].status == doctor.PASS
    msg = checks["lens.profiles"].detail
    assert "rig" in msg and "phone" not in msg, msg
