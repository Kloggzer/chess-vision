"""QA 2026-09-25 Runde 2, Python-Kern: Pixel einer Aufnahme erst NACH dem bewachten Ledger umhaengen."""
from __future__ import annotations

import json

import cv2
import numpy as np
import pytest

from chesslab import calibration, config, ioutil, matte, temporal_matte
from conftest import write_jsonl


def test_adopt_contested_leaves_sams_pixels_under_sams_row(tmp_path, monkeypatch):
    """Der Alpha-Worker schreibt erst die Datei, dann die Zeile: dazwischen hielt `adopt` die Datei fuer
    eine eigene Waise und ueberschrieb sie. `Contested` liess dann SAMs Zeile ueber temporalen Pixeln."""
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "t"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-t\nprofile: p\n", encoding="utf-8")
    write_jsonl(rec / "log.jsonl", [{"frame": "frames/000002.png", "ply": 1, "board": "boards/000002.webp"}])
    write_jsonl(rec / "matte.jsonl", [])
    cv2.imwrite(str(rec / "mattes" / "000002.webp"), np.full((8, 8), 100, np.uint8))  # SAM, Zeile folgt
    proposals = tmp_path / "reports" / "temporal-mattes" / "t" / "local"
    proposals.mkdir(parents=True)
    cv2.imwrite(str(proposals / "000002.alpha.png"), np.full((8, 8), 255, np.uint8))
    write_jsonl(proposals / "proposals.jsonl",
                [{"frame": "000002", "alpha": "000002.alpha.png", "fraction_above_half": 1.0}])
    (proposals / "proposals.meta.json").write_text(
        json.dumps({"source": temporal_matte.source_stamp(rec)}), encoding="utf-8")
    monkeypatch.setattr(calibration, "load_profile", lambda _: "profile")

    def sam_row_lands(alpha, entry, profile):
        ioutil.append_rows(rec / "matte.jsonl", [{"frame": "000002", "concepts": {}, "coverage": {"a1": 100 / 255}}])
        return {"a1": float(alpha.mean())}

    monkeypatch.setattr(matte, "coverage_of", sam_row_lands)
    with pytest.raises(ioutil.Contested):
        temporal_matte.adopt_proposals("rg-t")
    assert cv2.imread(str(rec / "mattes" / "000002.webp"), 0).max() == 100, \
        "SAMs Zeile steht im Ledger, auf der Platte liegen temporale Pixel"
    assert not list((rec / "mattes").glob("*.tmp.webp"))
