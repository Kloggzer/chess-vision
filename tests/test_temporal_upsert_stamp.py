"""`temporal-upsert` liest den Herkunftsstempel nicht, den `propose_session` schreibt.

`adopt_proposals` prueft ihn (`proposals.meta.json` gegen `source_stamp`) und verweigert, wenn
Log, Bretter oder Geometrie sich seit dem Vorschlag geaendert haben. `upsert_proposals` schreibt
in dieselbe `matte.jsonl` und ERSETZT dort ganze Frames — ohne jede Pruefung.
"""
from __future__ import annotations

import json

import cv2
import numpy as np
import pytest

from chesslab import config, temporal_matte


@pytest.fixture
def stale(tmp_path, monkeypatch):
    rec = tmp_path / "recordings" / "g"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-g\nprofile: p\n", encoding="utf-8")
    (rec / "log.jsonl").write_text(json.dumps({
        "frame": "frames/000001.png", "ply": 1, "board": "boards/000001.webp",
    }) + "\n", encoding="utf-8")
    proposals = tmp_path / "reports" / "temporal-mattes" / "g" / "local"
    proposals.mkdir(parents=True)
    cv2.imwrite(str(proposals / "000001.alpha.png"), np.full((8, 8), 255, np.uint8))
    (proposals / "proposals.jsonl").write_text(json.dumps({
        "frame": "000001", "alpha": "000001.alpha.png", "fraction_above_half": 1.0,
    }) + "\n", encoding="utf-8")
    # Ein Stempel aus einer anderen Welt: so sah die Aufnahme beim Vorschlag NICHT aus.
    (proposals / "proposals.meta.json").write_text(json.dumps({
        "source": [["log.jsonl", 1, 1]], "training_alpha_updated": False,
    }), encoding="utf-8")
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda _name: object())
    monkeypatch.setattr("chesslab.matte.coverage_of",
                        lambda _alpha, _entry, _profile: {"a1": 1.0})
    return rec


def test_temporal_upsert_rejects_proposals_after_the_source_changed(stale):
    with pytest.raises((RuntimeError, ValueError)):
        temporal_matte.upsert_proposals("rg-g")
