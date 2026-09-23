"""Ein Vorschlagssatz ohne `proposals.meta.json` wird von der Frische-Wache verweigert."""
from __future__ import annotations

import json

import cv2
import numpy as np
import pytest

from chesslab import config, temporal_matte


@pytest.fixture
def unstamped(tmp_path, monkeypatch):
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
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    monkeypatch.setattr("chesslab.calibration.load_profile", lambda _name: object())
    monkeypatch.setattr("chesslab.matte.coverage_of",
                        lambda _alpha, _entry, _profile: {"a1": 1.0})
    return rec


def test_adopt_refuses_proposals_that_carry_no_source_stamp(unstamped):
    """Ohne Stempel ist die Herkunft nicht unbekannt-aber-egal, sondern unbekannt."""
    with pytest.raises((RuntimeError, ValueError)):
        temporal_matte.adopt_proposals("rg-g")

    assert not (unstamped / "matte.jsonl").is_file(), "eine Matte ohne Herkunft wurde gestempelt"
