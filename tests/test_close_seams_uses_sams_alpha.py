"""`close_seams` nimmt das Alpha DIESER Zeile (`.sam.webp` nach einem Upsert)."""
from __future__ import annotations

import json

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from tests.test_geometry_bug_hunt import SIDE, _profile, _session  # noqa: E402

from chesslab import matte  # noqa: E402
from chesslab.calibration import crop_border_px  # noqa: E402


def _session_after_an_upsert(tmp_path, monkeypatch):
    prof = _profile()
    pad = crop_border_px(prof)
    side = SIDE + 2 * pad
    rows = [{"frame": "frames/000001.png", "board": "dirty/000001.webp", "ply": 1,
             "dirty": True, "dirty_reason": "occluded", "corners": prof.image_corners,
             "board_size": SIDE, "board_border": pad}]
    sdir = _session(tmp_path, monkeypatch, rows, (side, side))
    (sdir / "mattes").mkdir()

    seamed = np.zeros((side, side), np.uint8)
    seamed[100:140, 100:140] = 255
    seamed[100:140, 142:182] = 255            # SAMs Alpha traegt die Naht
    cv2.imwrite(str(sdir / "mattes" / "000001.sam.webp"), seamed)
    cv2.imwrite(str(sdir / "mattes" / "000001.webp"), np.zeros((side, side), np.uint8))

    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.1}}) + "\n", encoding="utf-8")
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: prof)
    return sdir


def test_a_sam_row_closes_the_seam_in_sams_own_alpha(tmp_path, monkeypatch):
    pytest.importorskip("torch")
    sdir = _session_after_an_upsert(tmp_path, monkeypatch)
    sam = sdir / "mattes" / "000001.sam.webp"
    sensor = sdir / "mattes" / "000001.webp"
    sensor_before = sensor.read_bytes()

    out = matte.close_seams("s1", progress=False)

    assert out["closed"] == 1, "die Naht liegt in SAMs Alpha — dort ist etwas zu schliessen"
    assert sam.read_bytes() != _seamed_bytes(sdir), "SAMs Alpha traegt die geschlossene Naht"
    assert sensor.read_bytes() == sensor_before, (
        "das Alpha des Sensors gehoert nicht zu dieser Zeile und bleibt unangetastet")


def _seamed_bytes(sdir):
    """Die Pixel VOR dem Lauf — aus dem Test heraus neu erzeugt, nicht gemerkt."""
    prof = _profile()
    pad = crop_border_px(prof)
    side = SIDE + 2 * pad
    seamed = np.zeros((side, side), np.uint8)
    seamed[100:140, 100:140] = 255
    seamed[100:140, 142:182] = 255
    tmp = sdir / "mattes" / "_probe.webp"
    cv2.imwrite(str(tmp), seamed)
    raw = tmp.read_bytes()
    tmp.unlink()
    return raw
