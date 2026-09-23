"""`recut_coverage` rechnet eine SAM-Zeile aus SAMs Alpha (`.sam.webp` nach einem Upsert)."""
from __future__ import annotations

import json

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from tests.test_geometry_bug_hunt import SIDE, _profile, _session  # noqa: E402

from chesslab import matte  # noqa: E402
from chesslab.calibration import crop_border_px  # noqa: E402


def _session_after_an_upsert(tmp_path, monkeypatch):
    """SAM sah a8 frei, der Sensor sieht a8 voll — die beiden Alphas sind unterscheidbar."""
    prof = _profile()
    pad = crop_border_px(prof)
    side = SIDE + 2 * pad
    rows = [{"frame": "frames/000001.png", "board": "dirty/000001.webp", "ply": 1,
             "dirty": True, "dirty_reason": "occluded", "corners": prof.image_corners,
             "board_size": SIDE, "board_border": pad}]
    sdir = _session(tmp_path, monkeypatch, rows, (side, side))
    (sdir / "mattes").mkdir()

    sam = np.zeros((side, side), np.uint8)                         # SAM: nichts verdeckt
    temporal = np.zeros((side, side), np.uint8)
    temporal[pad:pad + SIDE // 8, pad:pad + SIDE // 8] = 255       # Sensor: a8 voll
    cv2.imwrite(str(sdir / "mattes" / "000001.sam.webp"), sam)
    cv2.imwrite(str(sdir / "mattes" / "000001.webp"), temporal)

    # SAMs Zeile traegt eine veraltete Zahl, damit `recut_coverage` sie anfasst.
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.5, "h1": 0.5}}) + "\n",
        encoding="utf-8")
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: prof)
    return sdir


def test_a_sam_row_is_recut_from_sams_alpha_not_the_sensors(tmp_path, monkeypatch):
    sdir = _session_after_an_upsert(tmp_path, monkeypatch)

    matte.recut_coverage("s1", progress=False)

    row = json.loads((sdir / "matte.jsonl").read_text(encoding="utf-8").strip())
    assert row["coverage"]["a8"] == pytest.approx(0.0, abs=1e-3), (
        "a8 kommt aus dem Temporal-Alpha — SAMs Zeile traegt die Zahlen des Sensors")
