"""QA 2026-09-25 Runde 8: Laufzeitgrenzen des Matte-Locks."""

from __future__ import annotations

import re
from contextlib import contextmanager
from pathlib import Path
from threading import Event, Thread

import cv2
import numpy as np
import pytest

from chesslab import calibration, config, ioutil, locks, matte, web_cuts


def _recording(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    rec = tmp_path / "recordings" / "g"
    (rec / "boards").mkdir(parents=True)
    (rec / "mattes").mkdir()
    (rec / "candidate.json").write_text('{"source":{"crop":{"pad_side":0.05}}}', encoding="utf-8")
    (rec / "session.yaml").write_text("session_id: rg-g\nprofile: p\n", encoding="utf-8")
    ioutil.write_rows(rec / "log.jsonl", [{
        "frame": "frames/000001.png", "board": "boards/000001.webp",
        "board_size": 8, "board_border": 0, "board_straightened": True,
    }])
    ioutil.write_rows(rec / "matte.jsonl", [{
        "frame": "000001", "concepts": {"hand": 0.9}, "coverage": {"a1": 0.0},
    }])
    assert cv2.imwrite(str(rec / "boards" / "000001.webp"), np.zeros((8, 8, 3), np.uint8))
    assert cv2.imwrite(str(rec / "mattes" / "000001.webp"), np.zeros((8, 8), np.uint8))
    assert cv2.imwrite(str(rec / "mattes" / f"000001{matte.FIXED_SUFFIX}"), np.zeros((8, 8), np.uint8))
    monkeypatch.setattr(calibration, "load_profile", lambda _name: object())
    monkeypatch.setattr(matte, "usable_board", lambda *_args: True)
    return rec


def test_changed_fixed_alpha_is_not_expensively_recut_while_holding_up_the_pen(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Die Stempel-Nachpruefung darf rechnen, aber nicht den interaktiven Stift festhalten."""
    rec = _recording(tmp_path, monkeypatch)
    fixed = rec / "mattes" / f"000001{matte.FIXED_SUFFIX}"
    real_ledger = locks.matte_ledger
    second_cut = Event()
    release_cut = Event()
    calls = 0

    def slow_coverage(alpha, *_args):
        nonlocal calls
        calls += 1
        if calls == 2:
            second_cut.set()
            release_cut.wait(2)
        return {"a1": float(alpha.mean())}

    @contextmanager
    def change_before_locked_check(session_dir: Path, job: str, **kwargs):
        with real_ledger(session_dir, job, **kwargs):
            assert cv2.imwrite(str(fixed), np.full((8, 8), 255, np.uint8))
            yield

    monkeypatch.setattr(matte, "coverage_of", slow_coverage)
    monkeypatch.setattr(matte.locks, "matte_ledger", change_before_locked_check)
    recut = Thread(target=matte.recut_fixed, args=("g",), kwargs={"progress": False})
    recut.start()
    assert second_cut.wait(2), "die geaenderte .fixed.webp wurde nicht unter dem Lock nachgeschnitten"

    pen = Thread(target=web_cuts.pen_clear, args=("g", "000001"))
    pen.start()
    pen.join(0.25)
    pen_was_blocked = pen.is_alive()
    release_cut.set()
    recut.join(2)
    pen.join(2)

    assert not recut.is_alive() and not pen.is_alive()
    assert not pen_was_blocked, (
        "recut_fixed fuehrt coverage_of unter matte_ledger aus; ein langsamer Nachschnitt blockiert den Stift"
    )


def test_pen_lock_wait_budget_is_shorter_than_the_web_worker_deadline() -> None:
    """Der Stift-Lock muss vor dem Worker antworten, sonst sieht die Route nie seinen Fehler."""
    lock_seconds = web_cuts.PEN_LOCK_SECONDS
    worker = (Path(__file__).parents[1] / "platform" / "app" / "lib" / "py" / "worker.ts").read_text(
        encoding="utf-8",
    )
    match = re.search(r"const DEFAULT_TIMEOUT_MS = ([\d_]+);", worker)
    assert match is not None
    worker_ms = int(match.group(1).replace("_", ""))

    assert lock_seconds * 1000 < worker_ms, (
        f"matte_ledger wartet {lock_seconds:g} s, der Web-Worker stirbt schon nach {worker_ms / 1000:g} s"
    )
