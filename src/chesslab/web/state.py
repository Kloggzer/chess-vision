"""Gelockter, thread-sicherer Zustand für die Web-UI.

Enthält ``LockedState`` (Lock + Snapshot-Semantik) und fünf Modul-Singletons
(TRAIN, COLLECT, INFER, MANUAL, CALIB), die die bisherigen modulglobalen Dicts
in ``app.py`` ersetzen. Generatoren lesen AUSSCHLIESSLICH über ``snapshot()``
(einmal pro Frame-Iteration); schreibende Request-Handler nutzen ``update()``.
"""

from __future__ import annotations

import threading


class LockedState:
    """Ein Lock + Snapshot-Semantik um ein Zustands-Dict.

    Generatoren lesen AUSSCHLIESSLICH über ``snapshot()`` (1× pro Frame-Iteration).
    """

    def __init__(self, **initial) -> None:
        self._lock = threading.Lock()
        self._d = dict(initial)

    def snapshot(self) -> dict:
        """Flache Kopie des kompletten Zustands unter Lock — für Leser."""
        with self._lock:
            return dict(self._d)

    def get(self, key: str, default=None):
        """Einzelnes Feld unter Lock lesen."""
        with self._lock:
            return self._d.get(key, default)

    def update(self, **fields) -> None:
        """Mehrere Felder atomar schreiben."""
        with self._lock:
            self._d.update(fields)

    def mutate(self, fn):
        """Atomares Read-Modify-Write: `fn(dict)` läuft unter dem Lock.

        Für Zähler u. ä. (z. B. Collect-Index weiterschalten). `fn` darf KEINE
        I/O-Operationen machen (Lock-Disziplin, entry.md Regel 4)."""
        with self._lock:
            return fn(self._d)


# --- Singletons ----------------------------------------------------------------

TRAIN = LockedState(proc=None, log=None, cmd=None, state="idle", before=set())

COLLECT = LockedState(writer=None, positions=[], i=0, profile=None, camera=0,
                      board=None, show_target=False)

INFER = LockedState(profile=None, board=None, run=None, camera=0, last=None)

MANUAL = LockedState(profile=None, board=None, camera=0, writer=None)

CALIB = LockedState(margin=0.06, tracker=None)


# --- Domain-Methoden (Read-Modify-Write atomar) --------------------------------


def _derive_train_state(proc, stored_state: str) -> str:
    """Portiert 1:1 die Zustandslogik aus /api/train/status (app.py Z.545–556).

    Darf NUR aufgerufen werden, während der TRAIN-Lock gehalten wird.
    """
    rc = proc.poll() if proc is not None else None
    if proc is not None and rc is None:
        return "running"
    if proc is not None:
        state = "done" if rc == 0 else "crashed"
        # Merken, auch nachdem proc weg ist (wird vom Aufrufer geschrieben)
        return state
    # Kein proc: zuletzt gemerkten Zustand zurückgeben
    return stored_state  # "stopped" / "done" / "crashed" / "idle"


def train_derive_and_update() -> dict:
    """Atomar: TRAIN-Zustand ableiten, ggf. ablegen und als Dict zurückgeben.

    Rückgabe: ``{"proc": ..., "log": ..., "cmd": ..., "state": ..., "before": ...}``.
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
