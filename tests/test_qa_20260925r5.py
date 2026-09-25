"""QA 2026-09-25 Runde 5: JEDER Schreiber von `matte.jsonl` haelt `mattes/.publish.lock`."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import calibration, config, locks, matte, session_lifecycle, temporal_matte
from conftest import write_jsonl


def _recording(tmp_path: Path, monkeypatch, rows: list[dict]) -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "r1"
    (rec / "mattes").mkdir(parents=True)
    (rec / "session.yaml").write_text("session_id: rg-r1\nprofile: p\n", encoding="utf-8")
    log = [{"frame": "frames/000001.png", "ply": 1, "board": "boards/000001.png"}]
    write_jsonl(rec / "log.jsonl", log)
    write_jsonl(rec / "matte.jsonl", rows)
    assert cv2.imwrite(str(rec / "mattes" / "000001.webp"), np.zeros((8, 8), np.uint8))
    assert cv2.imwrite(str(rec / "mattes" / f"000001{matte.FIXED_SUFFIX}"), np.full((8, 8), 255, np.uint8))
    monkeypatch.setattr(calibration, "load_profile", lambda _name: object())
    monkeypatch.setattr(matte, "read_log_rows", lambda _rec: log)
    monkeypatch.setattr(matte, "read_session_meta", lambda _rec: {"profile": "p"})
    monkeypatch.setattr(matte, "usable_board", lambda *_a: True)
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, *_a: {"a1": float(alpha.mean())})
    monkeypatch.setattr(matte, "solid", lambda image: np.full_like(image, 255))
    return rec


_SAM = {"frame": "000001", "concepts": {"hand": 0.9}, "coverage": {"a1": 0.5}}
_WRITERS = {
    "recut_coverage": (matte, lambda rec: matte.recut_coverage("r1", progress=False), [_SAM]),
    "recut_fixed": (matte, lambda rec: matte.recut_fixed("r1", progress=False), [_SAM]),
    "close_seams": (matte, lambda rec: matte.close_seams("r1", progress=False), [_SAM]),
    "prune": (temporal_matte, lambda rec: temporal_matte.prune_dead_rows("rg-r1"),
              [{"frame": "000001", "source": "temporal", "coverage": {"a1": 1.0}}, _SAM]),
    "trim": (session_lifecycle, lambda rec: session_lifecycle._filter_matte_frames(rec, {"000001"}),
             [_SAM]),
}


@pytest.mark.parametrize("writer", sorted(_WRITERS))
def test_every_ledger_writer_holds_the_publish_lock(tmp_path: Path, monkeypatch, writer: str):
    module, run, rows = _WRITERS[writer]
    rec = _recording(tmp_path, monkeypatch, rows)
    lock = locks.matte_publish_lock(rec / "mattes")
    guarded, held = module.write_rows_guarded, []

    def spy(path, *args, **kwargs):
        held.append(lock.is_file())
        return guarded(path, *args, **kwargs)

    monkeypatch.setattr(module, "write_rows_guarded", spy)
    run(rec)

    assert held == [True], f"{writer} schreibt matte.jsonl ohne den Lock des Alpha-Workers"
    assert not lock.exists()


@pytest.mark.parametrize("operation", ["adopt", "upsert"])
def test_temporal_publish_holds_the_publish_lock(tmp_path: Path, monkeypatch, operation: str):
    sam = [] if operation == "adopt" else [{"frame": "000002", "coverage": {"a1": 0.0}}]
    rec = _recording(tmp_path, monkeypatch, sam)
    write_jsonl(rec / "log.jsonl", [{"frame": "frames/000002.png", "ply": 2, "board": "boards/000002.png"}])
    (rec / "boards").mkdir()
    assert cv2.imwrite(str(rec / "boards" / "000002.png"), np.zeros((8, 8, 3), np.uint8))
    proposals = tmp_path / "reports" / "temporal-mattes" / "r1" / "local"
    proposals.mkdir(parents=True)
    assert cv2.imwrite(str(proposals / "000002.alpha.png"), np.full((8, 8), 255, np.uint8))
    write_jsonl(proposals / "proposals.jsonl",
                [{"frame": "000002", "alpha": "000002.alpha.png", "fraction_above_half": 1.0}])
    (proposals / "proposals.meta.json").write_text(
        json.dumps({"source": temporal_matte.source_stamp(rec)}), encoding="utf-8")
    lock = locks.matte_publish_lock(rec / "mattes")
    guarded, held = temporal_matte.write_rows_guarded, []

    def spy(path, *args, **kwargs):
        held.append(lock.is_file())
        return guarded(path, *args, **kwargs)

    monkeypatch.setattr(temporal_matte, "write_rows_guarded", spy)
    publish = temporal_matte.adopt_proposals if operation == "adopt" else temporal_matte.upsert_proposals
    assert publish("rg-r1")[f"{operation}ed"] == 1

    assert held == [True], f"{operation} schreibt matte.jsonl ohne den Lock des Alpha-Workers"
    assert not lock.exists()


def test_release_leaves_another_threads_lock_alone(tmp_path: Path):
    lock = tmp_path / ".publish.lock"
    assert locks.acquire(lock, "matte", "first", token="a") is None
    locks.release(lock, "b")
    assert lock.exists()
    locks.release(lock, "a")
    assert not lock.exists()
