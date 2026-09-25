"""QA 2026-09-25 Runde 3: verbleibendes Race im temporalen Adopt."""
from __future__ import annotations

import json

import cv2
import numpy as np
import pytest

from chesslab import calibration, config, ioutil, matte, temporal_matte
from conftest import write_jsonl


def test_adopt_does_not_replace_sam_pixels_when_sam_row_lands_after_guard(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "t"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-t\nprofile: p\n", encoding="utf-8")
    write_jsonl(rec / "log.jsonl", [
        {"frame": "frames/000002.png", "ply": 1, "board": "boards/000002.webp"},
    ])
    write_jsonl(rec / "matte.jsonl", [])
    cv2.imwrite(str(rec / "mattes" / "000002.webp"), np.full((8, 8), 100, np.uint8))

    proposals = tmp_path / "reports" / "temporal-mattes" / "t" / "local"
    proposals.mkdir(parents=True)
    cv2.imwrite(str(proposals / "000002.alpha.png"), np.full((8, 8), 255, np.uint8))
    write_jsonl(proposals / "proposals.jsonl", [
        {"frame": "000002", "alpha": "000002.alpha.png", "fraction_above_half": 1.0},
    ])
    (proposals / "proposals.meta.json").write_text(
        json.dumps({"source": temporal_matte.source_stamp(rec)}), encoding="utf-8")
    monkeypatch.setattr(calibration, "load_profile", lambda _: "profile")
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, entry, profile: {"a1": float(alpha.mean())})

    guarded = temporal_matte.write_rows_guarded

    def sam_row_lands_after_guard(path, rows, expected, *, what):
        guarded(path, rows, expected, what=what)
        ioutil.append_rows(path, [{"frame": "000002", "concepts": {}, "coverage": {"a1": 100 / 255}}])

    monkeypatch.setattr(temporal_matte, "write_rows_guarded", sam_row_lands_after_guard)

    temporal_matte.adopt_proposals("rg-t")

    assert cv2.imread(str(rec / "mattes" / "000002.webp"), 0).max() == 100, \
        "SAMs juengste Zeile steht ueber temporalen Pixeln"


def test_adopt_replace_failure_does_not_publish_a_ledger_row(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "t"
    (rec / "mattes" / "000002.webp").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-t\nprofile: p\n", encoding="utf-8")
    write_jsonl(rec / "log.jsonl", [
        {"frame": "frames/000002.png", "ply": 1, "board": "boards/000002.webp"},
    ])
    write_jsonl(rec / "matte.jsonl", [])
    proposals = tmp_path / "reports" / "temporal-mattes" / "t" / "local"
    proposals.mkdir(parents=True)
    cv2.imwrite(str(proposals / "000002.alpha.png"), np.full((8, 8), 255, np.uint8))
    write_jsonl(proposals / "proposals.jsonl", [
        {"frame": "000002", "alpha": "000002.alpha.png", "fraction_above_half": 1.0},
    ])
    (proposals / "proposals.meta.json").write_text(
        json.dumps({"source": temporal_matte.source_stamp(rec)}), encoding="utf-8")
    monkeypatch.setattr(calibration, "load_profile", lambda _: "profile")
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, entry, profile: {"a1": float(alpha.mean())})

    with pytest.raises(OSError):
        temporal_matte.adopt_proposals("rg-t")

    assert ioutil.read_jsonl(rec / "matte.jsonl") == [], \
        "der Guard publiziert die Zeile, bevor feststeht, dass die Pixel umbenannt werden koennen"
