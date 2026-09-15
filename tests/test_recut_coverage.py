"""Die gespeicherte `coverage` muss zum Alpha UND zur heutigen Geometrie passen.

Gemessen 2026-09-16: bei 13 von 24 Aufnahmen laesst sie sich nicht mehr aus Alpha plus aktuellem
Log nachrechnen — ein Re-Export verschiebt die Ecken, die Coverage bleibt stehen. 35 von 35 392
Stichprobenzellen kippen dabei ueber `PIECE_VISIBLE_MAX`, fast alle auf der Grundreihe und von
0,000 auf 1,000. Der Crop zeigt dann eine Hand, das Label nennt die Figur darunter.
"""
from __future__ import annotations

import json

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from tests.test_geometry_bug_hunt import SIDE, _profile, _session  # noqa: E402

from chesslab import matte  # noqa: E402
from chesslab.calibration import crop_border_px  # noqa: E402


def _session_with_drifted_coverage(tmp_path, monkeypatch):
    prof = _profile()
    pad = crop_border_px(prof)
    side = SIDE + 2 * pad
    rows = [{"frame": "frames/000001.png", "board": "dirty/000001.webp", "ply": 1,
             "dirty": True, "dirty_reason": "occluded", "corners": prof.image_corners,
             "board_size": SIDE, "board_border": pad}]
    sdir = _session(tmp_path, monkeypatch, rows, (side, side))
    alpha = np.zeros((side, side), np.uint8)
    alpha[pad:pad + SIDE // 8, pad:pad + SIDE // 8] = 255      # a8 voll verdeckt
    (sdir / "mattes").mkdir()
    cv2.imwrite(str(sdir / "mattes" / "000001.webp"), alpha)
    # Die gespeicherte Zahl sagt "frei", das Alpha daneben sagt "voll" — genau die Drift.
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.0, "h1": 0.0}}) + "\n",
        encoding="utf-8")
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: prof)
    return sdir


def test_the_recut_brings_the_number_back_to_its_pixels(tmp_path, monkeypatch):
    pytest.importorskip("torch")
    sdir = _session_with_drifted_coverage(tmp_path, monkeypatch)

    out = matte.recut_coverage("s1", progress=False)

    row = json.loads((sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines()[0])
    assert row["coverage"]["a8"] > 0.5, f"a8 ist voll verdeckt, steht aber auf {row['coverage']['a8']}"
    assert row["coverage"]["h1"] == 0.0
    assert out["recut"] == 1 and out["crossed"] == 1, out


def test_a_human_corrected_alpha_is_left_alone(tmp_path, monkeypatch):
    pytest.importorskip("torch")
    sdir = _session_with_drifted_coverage(tmp_path, monkeypatch)
    human = {"a8": 0.42, "h1": 0.0}
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": human, "alpha": "fixed"}) + "\n",
        encoding="utf-8")

    out = matte.recut_coverage("s1", progress=False)

    row = json.loads((sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines()[0])
    assert row["coverage"] == human, "die Zahlen des Menschen gehoeren ihm"
    assert out["recut"] == 0


def test_a_row_that_already_matches_is_not_counted(tmp_path, monkeypatch):
    pytest.importorskip("torch")
    _session_with_drifted_coverage(tmp_path, monkeypatch)
    matte.recut_coverage("s1", progress=False)

    again = matte.recut_coverage("s1", progress=False)

    assert again["recut"] == 0 and again["crossed"] == 0, "ein zweiter Lauf hat nichts mehr zu tun"
