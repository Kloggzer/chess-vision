"""`matte.jsonl` sagt jetzt, gegen WELCHEN Export ihre Alphas geschnitten wurden.

`pass.json` und `model-reads.jsonl` tragen den Stempel seit 2026-09-15, die Matte nicht — die
Sprosse schloss also auch auf Alphas von vor dem letzten Re-Export. Genau dort driftet die
gespeicherte `coverage` gegen ihre Crops (13 von 24 Aufnahmen, `docs/coverage-weight-2026-09-16.md`).
"""
from __future__ import annotations

import json

import numpy as np
import pytest

cv2 = pytest.importorskip("cv2")

from tests.test_matte import _dirty_rows, _profile, _session  # noqa: E402
from tests.test_recut_coverage import _session_with_drifted_coverage  # noqa: E402

from chesslab import matte, provenance  # noqa: E402
from chesslab.calibration import crop_border_px  # noqa: E402


def _rows(sdir) -> list[dict]:
    return [json.loads(line) for line
            in (sdir / "matte.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]


def test_the_worker_stamps_the_export_its_alpha_was_cut_against(tmp_path, monkeypatch):
    pad = crop_border_px(_profile())
    sdir = _session(tmp_path, monkeypatch, _dirty_rows(pad))
    monkeypatch.setattr(matte, "alpha_sam3", lambda b: (np.zeros(b.shape[:2], np.float32), {}))
    monkeypatch.setattr(matte, "coverage_of", lambda *a, **k: {"a8": 0.9})
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda name: _profile())

    matte.alpha_worker("s1", progress=False)

    row = _rows(sdir)[0]
    assert row["_source"] == provenance.source(sdir), "die Matte traegt die Herkunft ihres Exports"
    assert row["_source"]["log"] == provenance.session_stamp(sdir)


def test_the_recut_brings_the_stamp_forward_even_when_no_number_moves(tmp_path, monkeypatch):
    """Sonst bliebe die Sprosse nach genau dem Lauf offen, der die Drift beseitigt."""
    pytest.importorskip("torch")
    sdir = _session_with_drifted_coverage(tmp_path, monkeypatch)
    matte.recut_coverage("s1", progress=False)
    stale = _rows(sdir)[0] | {"_source": {"log": "1:1"}}
    (sdir / "matte.jsonl").write_text(json.dumps(stale) + "\n", encoding="utf-8")

    out = matte.recut_coverage("s1", progress=False)

    assert out["recut"] == 0, "die Zahlen stimmen schon — nur die Herkunft war alt"
    assert _rows(sdir)[0]["_source"] == provenance.source(sdir)
