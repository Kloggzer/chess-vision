"""Tests für web/state.py: LockedState, Thread-Safety, TRAIN.derive_state,
und Web-Härtung (H2: sliced_error, H3: Log-Handle, H6: Generator-Lifecycle).

Alle Tests laufen headless (kein GPU/Kamera/Blender nötig).
"""

import json
import subprocess
import threading

import pytest

from chesslab import config
from chesslab.web.state import (
    COLLECT,
    TRAIN,
    LockedState,
    train_derive_and_update,
)

# ---------------------------------------------------------------------------
# 1. LockedState basics
# ---------------------------------------------------------------------------

def test_snapshot_is_copy():
    """snapshot() returns a shallow copy — scalars are independent."""
    ls = LockedState(a=1, b=[1, 2, 3])
    snap = ls.snapshot()
    snap["a"] = 999
    assert ls.get("a") == 1
    # Flache Kopie: Referenz auf die Liste wird kopiert, aber neues Dict-Level
    assert snap is not ls.snapshot()  # jedes snapshot() gibt neues dict
    assert snap["b"] is ls.get("b")  # selbe Liste (flache Kopie)


def test_get_and_update():
    ls = LockedState(x=10)
    assert ls.get("x") == 10
    assert ls.get("missing", "default") == "default"
    ls.update(x=42, y="hello")
    assert ls.get("x") == 42
    assert ls.get("y") == "hello"
    # old key still present if not overwritten
    ls.update(z=7)
    assert ls.get("x") == 42


def test_snapshot_after_update():
    ls = LockedState(a=1)
    ls.update(a=2, b=3)
    snap = ls.snapshot()
    assert snap == {"a": 2, "b": 3}


def test_update_preserves_other_keys():
    ls = LockedState(a=1, b=2, c=3)
    ls.update(b=99)
    assert ls.get("a") == 1
    assert ls.get("b") == 99
    assert ls.get("c") == 3


# ---------------------------------------------------------------------------
# 2. Thread-Stress
# ---------------------------------------------------------------------------

def test_thread_stress():
    """8 Writer threads with 500 updates each, parallel readers — no exception, final state consistent."""
    ls = LockedState(counter=0)
    errors = []
    barrier = threading.Barrier(12, timeout=10)

    def writer(offset: int) -> None:
        try:
            barrier.wait()
            for i in range(500):
                ls.update(counter=offset * 500 + i)
        except Exception as e:
            errors.append(e)

    def reader() -> None:
        try:
            barrier.wait()
            for _ in range(5000):
                s = ls.snapshot()
                assert "counter" in s
                assert isinstance(s["counter"], int)
        except Exception as e:
            errors.append(e)

    threads = []
    for idx in range(8):
        threads.append(threading.Thread(target=writer, args=(idx,)))
    for _ in range(4):
        threads.append(threading.Thread(target=reader))
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0, f"Thread errors: {errors}"
    final = ls.get("counter")
    # Each writer wrote 500 values → letzter sollte >= 500 sein
    assert final >= 500


# ---------------------------------------------------------------------------
# 3. TRAIN.derive_state — state logic from /api/train/status (verbatim)
# ---------------------------------------------------------------------------

class _FakeProc:
    """Simuliert subprocess.Popen.poll()-Verhalten."""
    def __init__(self, rc: int | None):
        self._rc = rc
        self._polled = False

    def poll(self):
        self._polled = True
        return self._rc


def test_train_derive_running():
    """proc running (poll() → None) → 'running'."""
    TRAIN.update(proc=_FakeProc(None), state="idle")
    d = train_derive_and_update()
    assert d["_derived_state"] == "running"


def test_train_derive_done():
    """proc finished with rc=0 → 'done' (merkt sich im state)."""
    TRAIN.update(proc=_FakeProc(0), state="running")
    d = train_derive_and_update()
    assert d["_derived_state"] == "done"
    # Zweiter Aufruf (proc noch da, aber bereits done gemerkt)
    d2 = train_derive_and_update()
    assert d2["_derived_state"] == "done"
    # state wurde gespeichert
    assert TRAIN.get("state") == "done"


def test_train_derive_crashed():
    """proc finished with rc≠0 → 'crashed'."""
    TRAIN.update(proc=_FakeProc(1), state="running")
    d = train_derive_and_update()
    assert d["_derived_state"] == "crashed"
    assert TRAIN.get("state") == "crashed"


def test_train_derive_stopped():
    """No proc, state='stopped' → 'stopped'."""
    TRAIN.update(proc=None, state="stopped")
    d = train_derive_and_update()
    assert d["_derived_state"] == "stopped"


def test_train_derive_idle():
    """Fresh state (no proc, no state) → 'idle'."""
    TRAIN.update(proc=None, state="idle")
    d = train_derive_and_update()
    assert d["_derived_state"] == "idle"


# ---------------------------------------------------------------------------
# 4. collect_finish sliced_error (H2)
# ---------------------------------------------------------------------------

def test_collect_finish_sliced_error(tmp_path, monkeypatch):
    """Auto-Slice-Exception in collect_finish → sliced=0 + sliced_error im Response."""
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from chesslab.web.app import create_app

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    # collect_finish liest _manifest() aus dem globalen squares-Manifest
    config.DATA.manifests.mkdir(parents=True)
    (config.DATA.manifests / "squares.jsonl").write_text("", encoding="utf-8")

    # Singleton-Zustand bereinigen (Modul-Level, teilen sich Tests)
    COLLECT.update(writer=None, positions=[], i=0, profile=None, board=None)

    # collect_start needs a session – we fake the COLLECT state directly
    import numpy as np

    from chesslab.collect import SessionWriter
    sid = "test-sliced-error"
    sdir = config.DATA.sessions / sid
    sdir.mkdir(parents=True)
    (sdir / "frames").mkdir()
    writer = SessionWriter(sdir, session_id=sid, profile="default", mode="play",
                           camera_index=0, frame_size=(640, 480), notes="test")
    # Eine Aufnahme machen, damit writer.count > 0 und der Slice-Pfad betreten wird
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    corners = [[0, 0], [640, 0], [640, 480], [0, 480]]
    writer.capture(dummy_frame, ply=0, fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                   move_san=None, corners=corners)
    COLLECT.update(writer=writer, positions=[{"ply": 0, "san": None, "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"}],
                   i=0, profile=None, board=None)

    # Monkeypatch: run_slice raises Exception
    import chesslab.labeling as labeling_mod
    def _failing_run_slice(**kwargs):
        raise RuntimeError("simulated slice error")
    monkeypatch.setattr(labeling_mod, "run_slice", _failing_run_slice)

    client = TestClient(create_app())
    r = client.post("/api/collect/finish")
    assert r.status_code == 200
    data = r.json()
    assert data["sliced"] == 0
    assert "sliced_error" in data
    assert "failed" in data["sliced_error"]


# ---------------------------------------------------------------------------
# 5. Train-Log-Handle (H3) — Windows file lock
# ---------------------------------------------------------------------------

def test_train_log_handle_reopenable(tmp_path, monkeypatch):
    """After train start, web_train.log can be reopened (Windows file lock)."""
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from chesslab.web.app import create_app

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    config.DATA.manifests.mkdir(parents=True)
    config.DATA.models.mkdir(parents=True)
    config.DATA.sessions.mkdir(parents=True)
    # Create manifest + session dirs + split so the train endpoint runs the legacy path
    rows = []
    for sid in ("s1", "s2"):
        (config.DATA.sessions / sid).mkdir(parents=True)
        for lab in ("wK", "bK", "empty"):
            rows.append({"path": f"data/squares/{lab}/{sid}.png", "label": lab, "session_id": sid,
                         "frame": "0000", "ply": 0, "square": "e1", "square_color": "dark",
                         "fen": "x", "out_size": [96, 128], "ts": "t"})
    (config.DATA.manifests / "squares.jsonl").write_text(
        "\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    # Prepare split (train/val/test with sessions s1 and s2)
    import chesslab.dataset as ds_mod
    ds_mod.run_split(val_frac=0.3, test_frac=0.0, max_empty_ratio=99, seed=42,
                     max_class_ratio=None, allow_degenerate=True)
    TRAIN.update(proc=None, state="idle")

    # Stub Popen: returns a fake proc that doesn’t actually run

    class _FakePopen:
        def __init__(self, *args, **kwargs):
            self.returncode = None
        def poll(self):
            return None
        def terminate(self):
            pass
        def wait(self, timeout=None):
            return 0

    monkeypatch.setattr(subprocess, "Popen", _FakePopen)

    try:
        client = TestClient(create_app())
        r = client.post("/api/train", json={"backbone": "smallcnn", "epochs": 1, "batch_size": 2, "no_amp": True})
        assert r.status_code == 200

        # Now web_train.log should exist and be reopenable without PermissionError
        log_path = config.DATA.models / "web_train.log"
        # The handle was closed → reopen must work
        with open(log_path, "w", encoding="utf-8") as fh:
            fh.write("reopen ok\n")
        content = log_path.read_text(encoding="utf-8")
        assert "reopen ok" in content
    finally:
        # Clean up: remove fake proc from TRAIN
        TRAIN.update(proc=None, state="idle")


# ---------------------------------------------------------------------------
# 6. Existing tests stay green (Contract-Freeze)
#   → No separate test needed — existing tests/test_web.py must pass unchanged.
# ---------------------------------------------------------------------------
