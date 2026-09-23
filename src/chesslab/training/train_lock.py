"""Der GPU-Riegel eines Trainings: `heavy*.lock`, den auch der Autopilot der Web-App liest."""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

from .. import config, locks


def _train_lock_path() -> Path:
    """The SAME file the web app's Autopilot serializes on: two locks that do not know each other
    are no lock.

    `CHESSLAB_TRAIN_SLOT` gives a run its OWN lock, allowing two trainings side by side; not the
    default, because it also bypasses the serialisation against the Autopilot."""
    slot = os.environ.get("CHESSLAB_TRAIN_SLOT")
    if slot:
        return config.DATA.heavy_lock.with_name(f"heavy-{slot}.lock")
    return config.DATA.heavy_lock


# Zwei Laeufe passen neben den Pack, drei nicht: drei Slots drueckten den 11,7-GB-Pack aus dem
# Seitencache (642 Seitenfehler/s von der SSD).
_MAX_LIVE_TRAININGS = 2


def _max_live_trainings() -> int:
    """Die Obergrenze, `CHESSLAB_MAX_TRAININGS` hebt sie bewusst an (groessere Maschine)."""
    raw = os.environ.get("CHESSLAB_MAX_TRAININGS")
    if not raw:
        return _MAX_LIVE_TRAININGS
    try:
        return max(1, int(raw))
    except ValueError:
        print(f"[WARN] CHESSLAB_MAX_TRAININGS={raw!r} ist keine Zahl — bleibe bei "
              f"{_MAX_LIVE_TRAININGS}.")
        return _MAX_LIVE_TRAININGS


def _live_train_locks() -> list[tuple[Path, dict]]:
    """Jeder `heavy*.lock`, den ein LEBENDER Prozess haelt. `locks.held_by` meldet den EIGENEN Lock
    als frei, darum wird er hier direkt gelesen.
    """
    lock_path = _train_lock_path()
    inbox = lock_path.parent
    live: list[tuple[Path, dict]] = []
    for path in sorted(inbox.glob(f"{config.DATA.heavy_lock.stem}*.lock")):
        info = locks.held_by(path)
        if info is None:
            try:
                raw = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError, TypeError):
                continue
            if int(raw.get("childPid") or raw.get("pid") or -1) != os.getpid():
                continue                       # fremd und tot -> veraltet, zaehlt nicht mit
            info = raw
        live.append((path, info))
    return live


def started_at(raw) -> float:
    """`startedAt` als Zeitpunkt: Python schreibt Ortszeit ohne Zone, die Web-App UTC mit `Z` in
    dieselbe Datei. Ohne Stempel ist ein Lock UNBEKANNT, nicht der aelteste.
    """
    try:
        ts = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return float("inf")
    return ts.timestamp() if ts.tzinfo else ts.astimezone().timestamp()


def _trainings_ahead_of_us() -> list[dict]:
    """Die Laeufe, die vor uns dran waren, falls wir ueber der Grenze liegen. Slot-Locks kennen
    einander nicht; jeder schreibt erst und zaehlt dann, der spaeteste `startedAt` tritt zurueck.
    """
    cap = _max_live_trainings()
    live = _live_train_locks()
    if len(live) <= cap:
        return []
    order = sorted(live, key=lambda item: (started_at(item[1].get("startedAt")),
                                           int(item[1].get("childPid") or item[1].get("pid") or 0)))
    ours = _train_lock_path()
    rank = next((i for i, (path, _) in enumerate(order) if path == ours), None)
    if rank is None or rank < cap:
        return []
    return [info for _, info in order[:cap]]


def _acquire_train_lock(desc: str) -> bool:
    """False if another LIVE training holds the GPU. A stale lock is reclaimed automatically."""
    holder = locks.acquire(_train_lock_path(), "train", desc)
    if holder is not None:
        print(f"[FAIL] {locks.describe(holder)} is already running. The GPU takes one at a time - "
              "stop it first (Training tab 'Stop', Autopilot pause, or kill the process).")
        return False
    ahead = _trainings_ahead_of_us()
    if ahead:
        _release_train_lock()                  # unser eigener Lock, gerade erst geschrieben
        print(f"[FAIL] {len(ahead)} Trainings laufen bereits, das Maximum ist "
              f"{_max_live_trainings()} — der Datensatz-Pack passt sonst nicht mehr neben sie "
              f"in den Speicher:")
        for info in ahead:
            print(f"        {locks.describe(info)}")
        print("       Warten, eines stoppen, oder bewusst CHESSLAB_MAX_TRAININGS hochsetzen.")
        return False
    return True


def _release_train_lock() -> None:
    locks.release(_train_lock_path())
