"""Ein stark verdecktes Brett ist ein LABEL, keine Ablehnung.

`MAX_ZONE_FRAC = 0.60` verwarf jede SAM-Maske, die mehr als 60 % des Bretts deckte — begruendet mit
"past this share it is not an arm reaching in". Gemessen 2026-09-16: die Grenze ist im ganzen Korpus
NIE gefeuert (8 328 Matte-Zeilen, null Absagen). Sie hat also nichts gefangen und wartete nur auf
das erste wirklich schwere Material — und genau das steht an (von Schwarz gespielt, im Dunkeln).
Entscheidung des Nutzers: was SAM findet, wird geglaubt.
"""
from __future__ import annotations

import json

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from tests.test_geometry_bug_hunt import SIDE, _profile, _session  # noqa: E402

from chesslab import matte  # noqa: E402
from chesslab.calibration import crop_border_px  # noqa: E402


def test_a_board_covered_beyond_the_old_limit_still_gets_its_alpha(tmp_path, monkeypatch):
    pytest.importorskip("torch")
    prof = _profile()
    pad = crop_border_px(prof)
    side = SIDE + 2 * pad
    rows = [{"frame": "frames/000001.png", "board": "dirty/000001.webp", "ply": 1,
             "dirty": True, "dirty_reason": "occluded", "corners": prof.image_corners,
             "board_size": SIDE, "board_border": pad}]
    sdir = _session(tmp_path, monkeypatch, rows, (side, side))
    # 80 % des Bretts verdeckt — ein Arm quer darueber, oder ein Koerper davor.
    huge = np.zeros((side, side), np.float32)
    huge[: int(side * 0.8), :] = 1.0
    monkeypatch.setattr(matte, "alpha_sam3", lambda board: (huge, {"arm": 1.0}))
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: prof)

    matte.alpha_worker("s1", progress=False)

    line = (sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines()[0]
    row = json.loads(line)
    assert "skipped" not in row, f"das Brett wurde verworfen statt gelabelt: {row.get('skipped')}"
    assert (sdir / "mattes" / "000001.webp").is_file(), "kein Alpha auf der Platte"
    assert max(row["coverage"].values()) > 0.5, "die Coverage muss die Verdeckung auch zeigen"


def test_a_board_that_never_reached_sam_is_still_refused(tmp_path, monkeypatch):
    # Die beiden anderen Ausstiege bleiben: dort hat SAM gar nicht erst gelaufen.
    pytest.importorskip("torch")
    prof = _profile()
    pad = crop_border_px(prof)
    rows = [{"frame": "frames/000001.png", "board": "dirty/000001.webp", "ply": 1,
             "dirty": True, "dirty_reason": "occluded", "corners": prof.image_corners,
             "board_size": SIDE, "board_border": pad}]
    sdir = _session(tmp_path, monkeypatch, rows, (SIDE + 2 * pad, SIDE + 2 * pad))
    (sdir / "dirty" / "000001.webp").write_bytes(b"kein bild")
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: prof)

    matte.alpha_worker("s1", progress=False)

    row = json.loads((sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines()[0])
    assert row.get("skipped"), "ein unlesbares Brett muss weiter abgelehnt werden"
