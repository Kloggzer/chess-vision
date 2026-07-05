"""Locked, thread-safe state for the web UI.

Contains ``LockedState`` (lock + snapshot semantics) and five module singletons
(TRAIN, COLLECT, INFER, MANUAL, CALIB) that replace the former module-global dicts
in ``app.py``. Generators read EXCLUSIVELY via ``snapshot()``
(once per frame iteration); writing request handlers use ``update()``.
"""

from __future__ import annotations

import threading


class LockedState:
    """A lock + snapshot semantics around a state dict.

    Generators read EXCLUSIVELY via ``snapshot()`` (1× per frame iteration).
    """

    def __init__(self, **initial) -> None:
        self._lock = threading.Lock()
        self._d = dict(initial)

    def snapshot(self) -> dict:
        """Shallow copy of the complete state under lock — for readers."""
        with self._lock:
            return dict(self._d)

    def get(self, key: str, default=None):
        """Read a single field under lock."""
        with self._lock:
            return self._d.get(key, default)

    def update(self, **fields) -> None:
        """Write several fields atomically."""
        with self._lock:
            self._d.update(fields)

    def mutate(self, fn):
        """Atomic read-modify-write: `fn(dict)` runs under the lock.

        For counters and the like (e.g. advancing the collect index). `fn` must NOT
        perform any I/O operations (lock discipline, entry.md rule 4)."""
        with self._lock:
            return fn(self._d)


# --- Singletons ----------------------------------------------------------------

TRAIN = LockedState(proc=None, log=None, cmd=None, state="idle", before=set())

COLLECT = LockedState(writer=None, positions=[], i=0, profile=None, camera=0,
                      board=None, show_target=False)





# --- Domain methods (Read-Modify-Write atomic) --------------------------------


def _derive_train_state(proc, stored_state: str) -> str:
    """Ports 1:1 the state logic from /api/train/status (app.py lines 545–556).

    May ONLY be called while the TRAIN lock is held.
    """
    rc = proc.poll() if proc is not None else None
    if proc is not None and rc is None:
        return "running"
    if proc is not None:
        state = "done" if rc == 0 else "crashed"
        # Remember, even after proc is gone (written by the caller)
        return state
    # No proc: return last remembered state
    return stored_state  # "stopped" / "done" / "crashed" / "idle"


def train_derive_and_update() -> dict:
    """Atomically derive TRAIN state, persist if changed and return as dict.

    Returns: ``{"proc": ..., "log": ..., "cmd": ..., "state": ..., "before": ...}``.
    """
    with TRAIN._lock:
        d = dict(TRAIN._d)
        proc = d.get("proc")
        state = _derive_train_state(proc, d.get("state", "idle"))
        if state in ("done", "crashed") and d.get("state") != state:
            d["state"] = state
            TRAIN._d["state"] = state
        elif state in ("running",) and d.get("state") != "running":
            TRAIN._d["state"] = "running"
            d["state"] = "running"
        d["_derived_state"] = state
        return d
