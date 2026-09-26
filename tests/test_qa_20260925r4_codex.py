"""QA 2026-09-25 Runde 4: Publish-Rennen der Matte-Fixes."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import calibration, config, ioutil, matte, temporal_matte
from chesslab.session_store.matte import effective_rows
from conftest import write_jsonl


def _recording(tmp_path: Path, monkeypatch, rows: list[dict]) -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "r1"
    (rec / "boards").mkdir(parents=True)
    (rec / "mattes").mkdir()
    assert cv2.imwrite(str(rec / "boards" / "000001.png"), np.zeros((8, 8, 3), np.uint8))
    log = [{"frame": "frames/000001.png", "ply": 1, "board": "boards/000001.png"}]
    write_jsonl(rec / "log.jsonl", log)
    write_jsonl(rec / "matte.jsonl", rows)
    monkeypatch.setattr(matte, "read_log_rows", lambda _d: log)
    (rec / "session.yaml").write_text("profile: p\n", encoding="utf-8")
    monkeypatch.setattr(matte, "usable_board", lambda *_a: True)
    monkeypatch.setattr(calibration, "load_profile", lambda _n: object())
    monkeypatch.setattr(matte, "alpha_sam3", lambda _b: (np.ones((8, 8), np.float32), {"hand": 0.9}))
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, *_a: {"a1": float(alpha.mean())})
    return rec


def test_alpha_worker_rename_failure_retracts_the_new_row(tmp_path, monkeypatch):
    rec = _recording(tmp_path, monkeypatch, [{"frame": "000001", "coverage": {"a1": 0.2}}])
    (rec / "mattes" / "000001.webp").mkdir()

    with pytest.raises(OSError):
        matte.alpha_worker("r1", frames={"000001"}, progress=False)

    row = effective_rows(ioutil.read_jsonl(rec / "matte.jsonl"))["000001"]
    assert row["coverage"] == {"a1": 0.2}, \
        "BUG: die neue SAM-Zeile bleibt stehen, obwohl ihr gestapeltes Alpha nicht publiziert wurde"
    assert not list((rec / "mattes").glob("*.tmp.webp"))


def test_adopt_does_not_replace_sam_pixels_when_sam_row_lands_during_promote(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "t"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-t\nprofile: p\n", encoding="utf-8")
    write_jsonl(rec / "log.jsonl", [
        {"frame": "frames/000002.png", "ply": 1, "board": "boards/000002.webp"},
    ])
    write_jsonl(rec / "matte.jsonl", [])
    assert cv2.imwrite(str(rec / "mattes" / "000002.webp"), np.full((8, 8), 100, np.uint8))

    proposals = tmp_path / "reports" / "temporal-mattes" / "t" / "local"
    proposals.mkdir(parents=True)
    assert cv2.imwrite(str(proposals / "000002.alpha.png"), np.full((8, 8), 255, np.uint8))
    write_jsonl(proposals / "proposals.jsonl", [
        {"frame": "000002", "alpha": "000002.alpha.png", "fraction_above_half": 1.0},
    ])
    (proposals / "proposals.meta.json").write_text(
        json.dumps({"source": temporal_matte.source_stamp(rec)}), encoding="utf-8")
    monkeypatch.setattr(calibration, "load_profile", lambda _: "profile")
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, *_a: {"a1": float(alpha.mean())})

    measured = temporal_matte.matted_frames
    calls = 0

    def sam_lands_after_the_reread(rows):
        nonlocal calls
        calls += 1
        result = measured(rows)
        if calls == 2:
            ioutil.append_rows(rec / "matte.jsonl", [
                {"frame": "000002", "concepts": {}, "coverage": {"a1": 100 / 255}},
            ])
        return result

    monkeypatch.setattr(temporal_matte, "matted_frames", sam_lands_after_the_reread)
    temporal_matte.adopt_proposals("rg-t")

    assert cv2.imread(str(rec / "mattes" / "000002.webp"), 0).max() == 100, \
        "BUG: eine SAM-Zeile zwischen Re-Read und Rename steht ueber temporalen Pixeln"
