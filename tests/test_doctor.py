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
