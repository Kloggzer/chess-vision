"""Ein Abbruch von `close_seams` darf keinen halben Zustand hinterlassen.

Die Pixel gingen VOR dem Nebenlaeufigkeits-Waechter auf die Platte. Brach er danach ab, trugen N
Alphas die geschlossenen Pixel und `matte.jsonl` die alte `coverage` — und ein zweiter Lauf
reparierte das NICHT, weil `gained` dann 0 ist. Die Meldung forderte trotzdem dazu auf.
"""
from __future__ import annotations

import json

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from tests.test_geometry_bug_hunt import SIDE, _profile, _session  # noqa: E402

from chesslab import matte  # noqa: E402
from chesslab.calibration import crop_border_px  # noqa: E402


def _seamed_session(tmp_path, monkeypatch):
    prof = _profile()
    pad = crop_border_px(prof)
    rows = [{"frame": "frames/000001.png", "board": "dirty/000001.webp", "ply": 1,
             "dirty": True, "dirty_reason": "occluded", "corners": prof.image_corners,
             "board_size": SIDE, "board_border": pad}]
    sdir = _session(tmp_path, monkeypatch, rows, (SIDE + 2 * pad, SIDE + 2 * pad))
    seamed = np.zeros((SIDE + 2 * pad, SIDE + 2 * pad), np.uint8)
    seamed[100:140, 100:140] = 255
    seamed[100:140, 142:182] = 255      # die Naht: zwei Blöcke mit einer Lücke
    (sdir / "mattes").mkdir()
    cv2.imwrite(str(sdir / "mattes" / "000001.webp"), seamed)
    (sdir / "matte.jsonl").write_text(
        json.dumps({"frame": "000001", "coverage": {"a8": 0.1}}) + "\n", encoding="utf-8")
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: prof)
    return sdir


def test_a_refused_run_leaves_the_alpha_exactly_as_it_was(tmp_path, monkeypatch):
    pytest.importorskip("torch")
    sdir = _seamed_session(tmp_path, monkeypatch)
    alpha = sdir / "mattes" / "000001.webp"
    before = alpha.read_bytes()
    ledger = sdir / "matte.jsonl"
    # Der Alpha-Worker schreibt weiter, waehrend wir schliessen — genau der Fall, den der
    # Waechter abfangen soll.
    real = matte.coverage_of

    def touch_then_measure(*a, **kw):
        ledger.write_text(ledger.read_text(encoding="utf-8") + "\n", encoding="utf-8")
        return real(*a, **kw)

    monkeypatch.setattr(matte, "coverage_of", touch_then_measure)

    with pytest.raises(ValueError, match="changed while closing seams"):
        matte.close_seams("s1", progress=False)

    assert alpha.read_bytes() == before, (
        "die geschlossenen Pixel liegen auf der Platte, obwohl der Lauf abgebrochen hat — "
        "ein zweiter Lauf findet `gained == 0` und repariert die Coverage nie")


def test_a_clean_run_still_closes_the_seam(tmp_path, monkeypatch):
    pytest.importorskip("torch")
    sdir = _seamed_session(tmp_path, monkeypatch)
    alpha = sdir / "mattes" / "000001.webp"
    before = alpha.read_bytes()

    out = matte.close_seams("s1", progress=False)

    assert out["closed"] == 1 and out["px"] > 0
    assert alpha.read_bytes() != before, "der saubere Lauf muss die Pixel sehr wohl schreiben"
    row = json.loads((sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines()[0])
    assert row["coverage"] != {"a8": 0.1}, "und die Coverage nachziehen"
