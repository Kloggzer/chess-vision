"""QA 2026-09-25 Runde 9: Recut-Zustand und Wartebudget des Matte-Ledgers."""

from __future__ import annotations

import json
from contextlib import contextmanager
from pathlib import Path
from threading import Event, Thread, current_thread
from time import sleep as real_sleep

import cv2
import numpy as np
import pytest

from chesslab import calibration, config, ioutil, locks, matte, temporal_matte


def _recording(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "t"
    (rec / "boards").mkdir(parents=True)
    (rec / "mattes").mkdir()
    (rec / "session.yaml").write_text("session_id: rg-t\nprofile: p\n", encoding="utf-8")
    rows = [{
        "frame": f"frames/{index:06d}.png",
        "board": f"boards/{index:06d}.webp",
        "board_size": 8,
        "board_border": 0,
        "board_straightened": True,
    } for index in range(17)]
    ioutil.write_rows(rec / "log.jsonl", rows)
    ioutil.write_rows(rec / "matte.jsonl", [{
        "frame": "000000", "concepts": {"hand": 0.9}, "coverage": {"a1": 0.0},
    }])
    fixed = rec / "mattes" / f"000000{matte.FIXED_SUFFIX}"
    assert cv2.imwrite(str(fixed), np.full((8, 8), 255, np.uint8))
    monkeypatch.setattr(calibration, "load_profile", lambda _name: object())
    monkeypatch.setattr(matte, "usable_board", lambda *_args: True)
    monkeypatch.setattr(matte, "coverage_of", lambda alpha, *_args: {"a1": float(alpha.mean())})
    return rec


def test_recut_fixed_first_check_writes_the_cut_rows_and_counts_fixed_frames(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    rec = _recording(tmp_path, monkeypatch)

    result = matte.recut_fixed("t", progress=False)

    row = ioutil.read_jsonl(rec / "matte.jsonl")[0]
    assert row["alpha"] == "fixed" and row["coverage"] == {"a1": 1.0}
    assert result["recut"] == 1


def test_recut_fixed_never_publishes_the_last_cut_without_a_stable_lock_check(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    rec = _recording(tmp_path, monkeypatch)
    ledger = rec / "matte.jsonl"
    before = ledger.read_bytes()
    fixed = rec / "mattes" / f"000000{matte.FIXED_SUFFIX}"
    real_ledger = locks.matte_ledger
    checks = 0

    @contextmanager
    def move_before_each_check(session_dir: Path, job: str):
        nonlocal checks
        with real_ledger(session_dir, job):
            checks += 1
            assert cv2.imwrite(str(fixed), np.full((8 + checks, 8 + checks), checks, np.uint8))
            yield

    monkeypatch.setattr(matte.locks, "matte_ledger", move_before_each_check)

    with pytest.raises(RuntimeError, match="kept changing"):
        matte.recut_fixed("t", progress=False)

    assert checks == matte.RECUT_ATTEMPTS
    assert ledger.read_bytes() == before, "der ungepruefte letzte Nachschnitt wurde veroeffentlicht"


def test_batch_recut_can_wait_for_a_legitimate_long_adopt_publish(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Adopt benennt pro Frame unter dem Ledger-Lock um; ein paralleler Batchlauf durfte 60 s warten."""
    rec = _recording(tmp_path, monkeypatch)
    proposals = tmp_path / "reports" / "temporal-mattes" / "t" / "local"
    proposals.mkdir(parents=True)
    proposal_rows = []
    for index in range(1, 17):
        stem = f"{index:06d}"
        alpha = proposals / f"{stem}.alpha.png"
        assert cv2.imwrite(str(alpha), np.full((8, 8), 255, np.uint8))
        proposal_rows.append({
            "frame": stem, "alpha": alpha.name, "fraction_above_half": 1.0,
        })
    ioutil.write_rows(proposals / "proposals.jsonl", proposal_rows)
    (proposals / "proposals.meta.json").write_text(json.dumps({
        "source": temporal_matte.source_stamp(rec),
    }), encoding="utf-8")

    elapsed = [0.0]
    deadline_ready = Event()
    recut_done = Event()
    errors: list[BaseException] = []
    real_replace = Path.replace
    real_write = temporal_matte.write_rows_guarded
    worker: Thread | None = None

    def fake_monotonic() -> float:
        if current_thread().name == "parallel-recut":
            deadline_ready.set()
        return elapsed[0]

    def yielding_sleep(_seconds: float) -> None:
        real_sleep(0.0005)

    def timed_replace(path: Path, target: Path) -> Path:
        result = real_replace(path, target)
        if path.name.endswith(".tmp.webp"):
            elapsed[0] += 1.1
            real_sleep(0.002)
        return result

    def run_recut() -> None:
        try:
            matte.recut_fixed("t", progress=False)
        except BaseException as error:
            errors.append(error)
        finally:
            recut_done.set()

    def write_with_parallel_recut(*args, **kwargs) -> int:
        nonlocal worker
        written = real_write(*args, **kwargs)
        worker = Thread(target=run_recut, name="parallel-recut")
        worker.start()
        assert deadline_ready.wait(2), "der parallele Recut erreichte den belegten Ledger-Lock nicht"
        return written

    monkeypatch.setattr(locks, "monotonic", fake_monotonic)
    monkeypatch.setattr(locks, "sleep", yielding_sleep)
    monkeypatch.setattr(Path, "replace", timed_replace)
    monkeypatch.setattr(temporal_matte, "write_rows_guarded", write_with_parallel_recut)

    result = temporal_matte.adopt_proposals("rg-t")
    assert worker is not None
    worker.join(2)

    assert result["adopted"] == 16 and recut_done.is_set()
    assert errors == [], (
        "der parallele Batch-Recut bricht nach 15 s ab, obwohl der legitime Adopt-Publish noch "
        "Frames umbenennt; mit dem bisherigen 60-s-Default wartet er bis zur Freigabe"
    )
