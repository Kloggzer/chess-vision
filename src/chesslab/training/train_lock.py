"""Der GPU-Riegel eines Trainings: `heavy*.lock`, den auch der Autopilot der Web-App liest."""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

from .. import config, locks


def _train_lock_path() -> Path:
    """The SAME file the web app's Autopilot serializes on (`platform/app/lib/autopilot-state.ts`).

    Two locks that do not know each other are no lock: the Autopilot started a replay onto the GPU
    while a training held it, and the only remedy was pausing it by hand (2026-08-16).

    `CHESSLAB_TRAIN_SLOT` gibt einem Lauf einen EIGENEN Lock und laesst damit zwei Trainings
    nebeneinander zu. Der Grund, dass es das gibt: gemessen 2026-08-26 kostet ein Lauf 11,7 GB
    Commit von 79,8, und bei 25 ms je Batch ist er datengebunden, nicht rechengebunden. Der Grund,
    dass es NICHT der Default ist: der Lock existiert wegen eines Speicher-Absturzes, und wer
    Slots benutzt, umgeht auch die Serialisierung gegen den Autopilot.
    """
    slot = os.environ.get("CHESSLAB_TRAIN_SLOT")
    if slot:
        return config.DATA.heavy_lock.with_name(f"heavy-{slot}.lock")
    return config.DATA.heavy_lock


# Zwei Laeufe passen neben den Pack, drei nicht: gemessen 2026-08-29 auf 31,8 GB kosteten drei
# Slots 23,9 GB privat, der 11,7-GB-Pack flog damit aus dem Seitencache und die Loader lasen ihn
# mit 642 Seitenfehlern/s von der SSD zurueck. Bei zweien bleibt er warm.
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
    """Jeder `heavy*.lock`, den ein LEBENDER Prozess haelt — der Default-Lock und jeder Slot.

    `locks.held_by` meldet den EIGENEN Lock als frei (damit ein Aufrufer sich nicht selbst als
    fremden Halter sieht), darum wird der eigene Datensatz hier direkt gelesen. Veraltete
    Slot-Locks fallen dabei raus, ohne dass jemand sie loeschen muss.
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
    """`startedAt` als Zeitpunkt, nicht als Zeichenkette — beide Schreiber teilen sich die Datei.

    `locks.acquire` schreibt ORTSZEIT ohne Zone (`datetime.now().isoformat()`), die Web-App
    schreibt UTC mit `Z` (`new Date().toISOString()`) in denselben `heavy*.lock`-Satz. Als Text
    verglichen lag die Reihenfolge um den UTC-Versatz daneben, und der spaeteste trat nicht
    zurueck. Ohne Stempel ist ein Lock UNBEKANNT, nicht der aelteste.
    """
    try:
        ts = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return float("inf")
    return ts.timestamp() if ts.tzinfo else ts.astimezone().timestamp()


def _trainings_ahead_of_us() -> list[dict]:
    """Die Laeufe, die vor uns dran waren, falls wir ueber der Grenze liegen — sonst leer.

    Slot-Locks kennen einander nicht: `CHESSLAB_TRAIN_SLOT` gibt jedem Lauf eine EIGENE Datei
    und der Guard im (2026-09-23 geloeschten) Sweep-Skript pruefte nur den eigenen Slot. So starteten
    am 2026-08-29 drei Laeufe (C/D/E, 0,8 s auseinander) auf einer Maschine, die zwei traegt.

    Entschieden wird nach `startedAt`, der spaeteste tritt zurueck. Das haelt auch dem Rennen
    stand, das die drei erzeugt haben: jeder schreibt erst seinen Lock und zaehlt dann, also
    liest jeder dieselbe Reihenfolge — und wer zu frueh zaehlt, um den Dritten zu sehen, wird
    von genau diesem Dritten gesehen.
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
