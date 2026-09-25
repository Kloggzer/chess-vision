"""QA 2026-09-25 Runde 5: Rest-Rennen im Matte-Publish-Lock."""

from __future__ import annotations

import json
from pathlib import Path
from threading import Event, Thread

import cv2
import numpy as np
import pytest

from chesslab import calibration, config, ioutil, locks, matte, temporal_matte
from conftest import write_jsonl


def test_waiting_serializes_callers_from_the_same_process(tmp_path: Path):
    lock = tmp_path / ".publish.lock"
    held, release = Event(), Event()

    def holder() -> None:
        with locks.waiting(lock, "matte", "first"):
            held.set()
            assert release.wait(2)

    thread = Thread(target=holder)
    thread.start()
    assert held.wait(2)
    try:
        with pytest.raises(RuntimeError, match="held by"):
            with locks.waiting(lock, "adopt", "second", timeout=0):
                pass
    finally:
        release.set()
        thread.join(2)
    assert not thread.is_alive()


@pytest.mark.parametrize("operation", ["adopt", "upsert"])
def test_temporal_publish_works_while_alpha_worker_has_the_ledger_open(
    tmp_path: Path, monkeypatch, operation: str,
):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    recording = tmp_path / "recordings" / "r1"
    (recording / "boards").mkdir(parents=True)
    (recording / "mattes").mkdir()
    (recording / "session.yaml").write_text("session_id: rg-r1\nprofile: p\n", encoding="utf-8")
    log = [
        {"frame": "frames/000001.png", "ply": 1, "board": "boards/000001.png"},
        {"frame": "frames/000002.png", "ply": 2, "board": "boards/000002.png"},
    ]
    for stem in ("000001", "000002"):
        assert cv2.imwrite(str(recording / "boards" / f"{stem}.png"), np.zeros((8, 8, 3), np.uint8))
    write_jsonl(recording / "log.jsonl", log)
    initial = [] if operation == "adopt" else [{"frame": "000002", "coverage": {"a1": 0.0}}]
    write_jsonl(recording / "matte.jsonl", initial)

    proposals = tmp_path / "reports" / "temporal-mattes" / "r1" / "local"
    proposals.mkdir(parents=True)
    assert cv2.imwrite(str(proposals / "000002.alpha.png"), np.full((8, 8), 255, np.uint8))
    write_jsonl(proposals / "proposals.jsonl", [
        {"frame": "000002", "alpha": "000002.alpha.png", "fraction_above_half": 1.0},
    ])
    (proposals / "proposals.meta.json").write_text(
        json.dumps({"source": temporal_matte.source_stamp(recording)}), encoding="utf-8")

    worker_open, finish_worker = Event(), Event()

    def blocked_sam(_board):
        worker_open.set()
        assert finish_worker.wait(2)
        return np.ones((8, 8), np.float32), {"hand": 0.9}

    monkeypatch.setattr(calibration, "load_profile", lambda _name: object())
    monkeypatch.setattr(matte, "read_log_rows", lambda _recording: log)
    monkeypatch.setattr(matte, "read_session_meta", lambda _recording: {"profile": "p"})
    monkeypatch.setattr(matte, "usable_board", lambda *_args: True)
    monkeypatch.setattr(matte, "alpha_sam3", blocked_sam)
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, *_args: {"a1": float(alpha.mean())})

    worker_error: list[BaseException] = []

    def run_worker() -> None:
        try:
            matte.alpha_worker("r1", frames={"000001"}, progress=False)
        except BaseException as error:
            worker_error.append(error)

    worker = Thread(target=run_worker)
    worker.start()
    assert worker_open.wait(2), "alpha_worker reached SAM only after opening matte.jsonl for append"
    try:
        publish = (temporal_matte.adopt_proposals if operation == "adopt"
                   else temporal_matte.upsert_proposals)
        result = publish("rg-r1")
    finally:
        finish_worker.set()
        worker.join(2)

    assert not worker.is_alive()
    assert worker_error == []
    assert result[f"{operation}ed"] == 1
    assert set(temporal_matte.matted_frames(ioutil.read_jsonl(recording / "matte.jsonl"))) == {
        "000001", "000002",
    }


def test_alpha_rollback_does_not_replace_a_row_appended_after_the_last_guard(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    recording = tmp_path / "recordings" / "r1"
    (recording / "boards").mkdir(parents=True)
    (recording / "mattes").mkdir()
    assert cv2.imwrite(str(recording / "boards" / "000001.png"), np.zeros((8, 8, 3), np.uint8))
    log = [{"frame": "frames/000001.png", "ply": 1, "board": "boards/000001.png"}]
    write_jsonl(recording / "log.jsonl", log)
    write_jsonl(recording / "matte.jsonl", [])
    (recording / "mattes" / "000001.webp").mkdir()

    monkeypatch.setattr(calibration, "load_profile", lambda _name: object())
    monkeypatch.setattr(matte, "read_log_rows", lambda _recording: log)
    monkeypatch.setattr(matte, "read_session_meta", lambda _recording: {"profile": "p"})
    monkeypatch.setattr(matte, "usable_board", lambda *_args: True)
    monkeypatch.setattr(
        matte, "alpha_sam3", lambda _board: (np.ones((8, 8), np.float32), {"hand": 0.9}))
    monkeypatch.setattr(matte, "coverage_of", lambda _alpha, *_args: {"a1": 1.0})

    matte_path = recording / "matte.jsonl"
    original_replace = Path.replace
    writers: list[Thread] = []

    def human_writer() -> None:
        # Every ledger writer holds the lock (`recut_fixed` carries the human's pen).
        with locks.matte_ledger(recording, "recut-fixed"):
            ioutil.append_rows(matte_path, [{"frame": "human", "coverage": {"a1": 0.5}}])

    def append_immediately_before_replace(source: Path, target: Path):
        if target == matte_path and source.name.startswith("matte.jsonl.") and not writers:
            writers.append(Thread(target=human_writer))
            writers[0].start()
            writers[0].join(0.3)
        return original_replace(source, target)

    monkeypatch.setattr(Path, "replace", append_immediately_before_replace)

    with pytest.raises(OSError, match="row is retracted"):
        matte.alpha_worker("r1", frames={"000001"}, progress=False)

    assert writers
    writers[0].join(2)
    assert any(row.get("frame") == "human" for row in ioutil.read_jsonl(matte_path))
