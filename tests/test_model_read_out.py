"""`model-reads.jsonl` is load-bearing; a gate measurement must not overwrite it."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from chesslab import occluded_model


@pytest.fixture
def session(tmp_path, monkeypatch):
    sdir = tmp_path / "s"
    sdir.mkdir()
    (sdir / "log.jsonl").write_text("{}\n", encoding="utf-8")
    monkeypatch.setattr(occluded_model, "game_dir", lambda name: sdir, raising=False)
    monkeypatch.setattr("chesslab.realgames.game_dir", lambda name: sdir)
    monkeypatch.setattr(occluded_model, "read_session_meta",
                        lambda d: {"session_id": "rg-s", "profile": "p"})
    monkeypatch.setattr(occluded_model, "check_not_circular", lambda run, sid: None)
    monkeypatch.setattr(occluded_model, "load_profile", lambda name: object())
    monkeypatch.setattr(occluded_model, "model_classes", lambda run: ["empty", "wP"])
    monkeypatch.setattr(occluded_model, "read_log",
                        lambda d: [{"frame": "000001.webp", "fen": "8/8/8/8/8/8/8/8 w - - 0 1"}])
    monkeypatch.setattr(occluded_model, "frame_cells",
                        lambda d, row, prof: [np.zeros((4, 4, 3), np.uint8)] * 64)
    monkeypatch.setattr(occluded_model, "all_reads",
                        lambda run, cells, dev, w: [{"probs": [1.0, 0.0]}] * 64)
    return sdir


def test_reads_can_be_written_beside_the_canonical_file(session, tmp_path):
    canonical = session / occluded_model.READS_FILE
    canonical.write_text('{"_model": "haendisch"}\n', encoding="utf-8")

    res = occluded_model.read_session("s", tmp_path / "run", out="model-reads.p4a-80-clahe.jsonl")

    assert Path(res["path"]).name == "model-reads.p4a-80-clahe.jsonl", (
        "read_session writes only to the fixed READS_FILE, so measuring the coverage_gate for "
        "eight bundled models overwrites the canonical reads eight times — the file the "
        "labeling lane, audit-flags, chain-steps and provenance all read."
    )
    assert json.loads(canonical.read_text(encoding="utf-8"))["_model"] == "haendisch", (
        "the canonical model-reads.jsonl was overwritten by a side measurement"
    )
