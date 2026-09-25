"""QA 2026-09-25 Runde 4: `mattes/.publish.lock` serialisiert SAMs Zeile+Umbenennen gegen adopt."""

from __future__ import annotations

import json
import os
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import calibration, config, ioutil, locks, matte, temporal_matte
from conftest import write_jsonl
from test_qa_20260925r4_codex import _recording


def _hold(lock: Path, pid: int) -> None:
    lock.write_text(json.dumps({"pid": pid, "childPid": pid, "job": "matte", "name": "x"}),
                    encoding="utf-8")


def _adoptable(tmp_path: Path, monkeypatch) -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "t"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-t\nprofile: p\n", encoding="utf-8")
    write_jsonl(rec / "log.jsonl", [{"frame": "frames/000002.png", "ply": 1,
                                     "board": "boards/000002.webp"}])
    write_jsonl(rec / "matte.jsonl", [])
    proposals = tmp_path / "reports" / "temporal-mattes" / "t" / "local"
    proposals.mkdir(parents=True)
    assert cv2.imwrite(str(proposals / "000002.alpha.png"), np.full((8, 8), 255, np.uint8))
    write_jsonl(proposals / "proposals.jsonl", [
        {"frame": "000002", "alpha": "000002.alpha.png", "fraction_above_half": 1.0}])
    (proposals / "proposals.meta.json").write_text(
        json.dumps({"source": temporal_matte.source_stamp(rec)}), encoding="utf-8")
    monkeypatch.setattr(calibration, "load_profile", lambda _: "profile")
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, *_a: {"a1": float(alpha.mean())})
    return rec


def test_adopt_rereads_the_ledger_under_the_publish_lock(tmp_path, monkeypatch):
    rec = _adoptable(tmp_path, monkeypatch)
    lock = locks.matte_publish_lock(rec / "mattes")
    measured, held = temporal_matte.matted_frames, []
    monkeypatch.setattr(temporal_matte, "matted_frames",
                        lambda rows: held.append(lock.is_file()) or measured(rows))

    temporal_matte.adopt_proposals("rg-t")

    assert held[-1], "adopt liest den Ledger vor dem Umbenennen ohne den Lock des Alpha-Workers"
    assert not lock.exists()
    assert (rec / "mattes" / "000002.webp").is_file()


def test_a_dead_holder_does_not_block_adopt(tmp_path, monkeypatch):
    rec = _adoptable(tmp_path, monkeypatch)
    _hold(locks.matte_publish_lock(rec / "mattes"), 2**31 - 7)

    temporal_matte.adopt_proposals("rg-t")

    assert (rec / "mattes" / "000002.webp").is_file()


def test_alpha_worker_waits_for_a_live_holder_before_row_and_rename(tmp_path, monkeypatch):
    rec = _recording(tmp_path, monkeypatch, [])
    _hold(locks.matte_publish_lock(rec / "mattes"), os.getppid())
    clock = iter([0.0] + [1e9] * 10)
    monkeypatch.setattr(locks, "monotonic", lambda: next(clock))
    monkeypatch.setattr(locks, "sleep", lambda _s: None)

    with pytest.raises(RuntimeError, match="held by"):
        matte.alpha_worker("r1", frames={"000001"}, progress=False)

    assert ioutil.read_jsonl(rec / "matte.jsonl") == []
    assert not list((rec / "mattes").glob("*.webp"))
