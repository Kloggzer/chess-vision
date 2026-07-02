"""Tests für die Video-Frame-Extraktion (synth_frames) — mit synthetisch erzeugtem Video."""

import cv2
import numpy as np
import pytest

from chesslab.synth_frames import extract_frames, next_index, sharpness


def _make_video(path, n_frames=30, size=200, blur_every=2):
    """Testvideo: strukturiertes Muster; jeder `blur_every`-te Frame stark weichgezeichnet."""
    vw = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), 10, (size, size))
    assert vw.isOpened(), "mp4v-VideoWriter nicht verfügbar"
    rng = np.random.default_rng(7)
    frames = []
    for i in range(n_frames):
        img = (rng.integers(0, 255, (size, size, 3))).astype(np.uint8)   # scharfes Rauschen
        if i % blur_every == 0:
            img = cv2.GaussianBlur(img, (31, 31), 12)                     # „verwackelt"
        frames.append(img)
        vw.write(img)
    vw.release()
    return frames


def test_sharpness_orders_blur():
    rng = np.random.default_rng(1)
    sharp = (rng.integers(0, 255, (200, 200))).astype(np.uint8)
    blurred = cv2.GaussianBlur(sharp, (31, 31), 12)
    assert sharpness(sharp) > sharpness(blurred) * 5


def test_extract_picks_sharp_frames(tmp_path):
    video = tmp_path / "t.mp4"
    _make_video(video, n_frames=30, blur_every=2)
    out = tmp_path / "scan"
    stats = extract_frames(video, out, n=10, quality=95)
    assert stats["written"] == 10
    assert stats["start_index"] == 0
    written = sorted(out.glob("*.jpg"))
    assert len(written) == 10
    # Alle gewählten Frames müssen scharf sein (deutlich über dem Blur-Niveau)
    for p in written:
        g = cv2.cvtColor(cv2.imread(str(p)), cv2.COLOR_BGR2GRAY)
        assert sharpness(g) > 500, f"{p.name} ist ein unscharfer Frame"


def test_extract_appends_after_existing(tmp_path):
    video = tmp_path / "t.mp4"
    _make_video(video, n_frames=12)
    out = tmp_path / "scan"
    out.mkdir()
    (out / "004.jpg").write_bytes(b"x")                 # bestehender Ring endet bei 004
    assert next_index(out) == 5
    stats = extract_frames(video, out, n=3)
    assert stats["start_index"] == 5
    assert (out / "005.jpg").exists() and (out / "007.jpg").exists()


def test_extract_crop_applies(tmp_path):
    video = tmp_path / "t.mp4"
    _make_video(video, n_frames=8, size=200)
    out = tmp_path / "scan"
    extract_frames(video, out, n=2, crop=(10, 20, 110, 170))
    img = cv2.imread(str(sorted(out.glob("*.jpg"))[0]))
    assert img.shape[:2] == (150, 100)                  # (y1-y0, x1-x0)


def test_extract_crop_out_of_bounds(tmp_path):
    video = tmp_path / "t.mp4"
    _make_video(video, n_frames=4)
    with pytest.raises(ValueError, match="Crop"):
        extract_frames(video, tmp_path / "s", n=2, crop=(300, 300, 400, 400))


def test_extract_unreadable_video(tmp_path):
    bad = tmp_path / "nope.mp4"
    bad.write_bytes(b"not a video")
    with pytest.raises(ValueError):
        extract_frames(bad, tmp_path / "s", n=2)
