"""One writer at a time, for the two resources that only have one.

A lock is a JSON file naming the PID that holds it: it survives a web restart, and one left by a
dead process is reclaimed without a human. `data/inbox/heavy.lock` covers heavy jobs across CLI
and web app, `data/crops/<tag>/.pool.lock` the writers of one crop pool."""

from __future__ import annotations

import json
import os
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path

#: Die Bootzeit kommt aus der Laufzeit seit dem Start und wackelt um Sekundenbruchteile.
_BOOT_TOLERANCE_S = 60


def pool_lock_path(pool_root: Path) -> Path:
    return Path(pool_root) / ".pool.lock"


def pid_alive(pid: int) -> bool:
    """True if a process with `pid` currently exists (cross-platform, no psutil)."""
    if pid <= 0:
        return False
    if os.name == "nt":
        import ctypes

        # OpenProcess alone answers the WRONG question: Windows keeps the process OBJECT alive
        # while anyone holds a handle, so a job dead for minutes still opens and reads as live.
        # Ask for the exit code. `restype` is not optional either — a HANDLE is 64-bit on x64.
        k = ctypes.windll.kernel32
        k.OpenProcess.restype = ctypes.c_void_p
        k.OpenProcess.argtypes = (ctypes.c_uint32, ctypes.c_int, ctypes.c_uint32)
        k.GetExitCodeProcess.argtypes = (ctypes.c_void_p, ctypes.POINTER(ctypes.c_uint32))
        k.CloseHandle.argtypes = (ctypes.c_void_p,)
        h = k.OpenProcess(0x1000, False, pid)   # PROCESS_QUERY_LIMITED_INFORMATION
        if not h:
            return False
        code = ctypes.c_uint32()
        ok = k.GetExitCodeProcess(h, ctypes.byref(code))
        k.CloseHandle(h)
        # 259 = STILL_ACTIVE. A process that deliberately exits WITH 259 reads as alive; that is
        # the documented ambiguity of this API and it is the safe direction for a lock.
        return bool(ok) and code.value == 259
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def _uptime_s() -> float | None:
    """Sekunden seit dem Systemstart, ohne psutil. None, wenn unbekannt."""
    try:
        if os.name == "nt":
            import ctypes

            ctypes.windll.kernel32.GetTickCount64.restype = ctypes.c_uint64
            return ctypes.windll.kernel32.GetTickCount64() / 1000.0
        return float(Path("/proc/uptime").read_text().split()[0])
    except (OSError, ValueError, AttributeError):
        return None


def _boot_time() -> datetime | None:
    """Wann der Rechner zuletzt gestartet ist. None, wenn unbekannt."""
    up = _uptime_s()
    return None if up is None else datetime.now() - timedelta(seconds=up)


def _same_boot(stamp: object, uptime: object = None) -> bool:
    """Dieselbe Sitzung? Die LAUFZEIT entscheidet, die Wanduhr ist nur Rueckfall: eine
    Zeitumstellung verschob die abgeleitete Bootzeit und gab das Lock frei, waehrend der Lauf lief.
    """
    now_up = _uptime_s()
    if isinstance(uptime, (int, float)) and now_up is not None:
        return now_up >= float(uptime) - _BOOT_TOLERANCE_S
    boot = _boot_time()
    if boot is None or not isinstance(stamp, str):
        return True
    try:
        return abs((datetime.fromisoformat(stamp) - boot).total_seconds()) < _BOOT_TOLERANCE_S
    except ValueError:
        return True


def held_by(lock: Path) -> dict | None:
    """The record of the LIVE process holding `lock`, or None. Corrupt or dead-PID counts as free.

    `childPid` is the JOB, `pid` the process that claimed the slot — the web app claims with the
    SERVER's pid and stamps the child once it exists.
    """
    try:
        info = json.loads(Path(lock).read_text(encoding="utf-8"))
        pid = int(info.get("childPid") or info.get("pid") or -1)
    except (OSError, ValueError, TypeError, AttributeError):
        return None
    if pid <= 0 or pid == os.getpid() or not pid_alive(pid):
        return None
    # Ein Lock aus einer FRUEHEREN Sitzung kann niemand mehr halten. Ohne das blockiert ein
    # eingefrorener Lauf jedes weitere Training: Windows vergibt die PID nach dem Neustart neu
    # (2026-09-11 gehoerte 20176 danach `taskhostw`), und `pid_alive` sagt brav ja. Verglichen wird
    # der beim Setzen notierte Systemstart, nicht das Alter — ein Lock ohne das Feld bleibt gueltig.
    if not _same_boot(info.get("boot"), info.get("uptime")):
        return None
    return info


def describe(info: dict) -> str:
    return (f"{info.get('job', 'a job')} {info.get('name', '')} (PID "
            f"{info.get('childPid') or info.get('pid')}, started {info.get('startedAt', '?')})")


def acquire(lock: Path, job: str, name: str) -> dict | None:
    """None if the lock is now ours, otherwise the live holder — callers word their own refusal."""
    lock = Path(lock)
    observed = _raw(lock)
    info = held_by(lock)
    if info is not None:
        return info
    lock.parent.mkdir(parents=True, exist_ok=True)
    boot, up = _boot_time(), _uptime_s()
    payload = json.dumps({"pid": os.getpid(), "childPid": os.getpid(), "job": job,
                          "name": name, "startedAt": datetime.now().isoformat(),
                          **({"boot": boot.isoformat()} if boot else {}),
                          **({"uptime": round(up, 1)} if up is not None else {})}, indent=2)
    # Ein Lock, das VOR unserem Versuch schon dalag, ist tot (`held_by` sagte frei) und darf weg;
    # eines, das WAEHREND des Versuchs entsteht, gehoert einem Mitbewerber.
    # Zweimal, weil ein gescheiterter `_claim` nur heisst "die Datei lag JETZT da": verschwindet
    # sie gleich darauf, meldete der Rueckfall unten den EIGENEN Auftrag als Halter.
    for _ in range(2):
        _break_stale(lock, observed)
        if _claim(lock, payload):
            return None
        info = held_by(lock) or _read_lock(lock)
        if info is not None:
            return info
        observed = _raw(lock)
    return {"job": job, "name": name}


def _read_lock(lock: Path) -> dict | None:
    try:
        info = json.loads(lock.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return info if isinstance(info, dict) else None


def _raw(lock: Path) -> bytes | None:
    try:
        return lock.read_bytes()
    except OSError:
        return None


def _break_stale(lock: Path, observed: bytes | None) -> None:
    """Move the dead lock WE read aside, so a reclaimer can create the file anew.

    Zurueckgelegt wird, was inzwischen jemand anderes geschrieben hat: sonst raeumt der zweite
    Reclaimer den FRISCHEN Anspruch des ersten weg und beide halten sich fuer den Halter.
    """
    if observed is None:
        return
    aside = lock.with_name(f"{lock.name}.stale-{os.getpid()}")
    try:
        os.replace(lock, aside)
        if aside.read_bytes() == observed:
            aside.unlink()
        else:
            os.replace(aside, lock)
    except OSError:
        pass


def _claim(lock: Path, payload: str) -> bool:
    """True if WE created the lock file. `O_EXCL` is the whole point — one winner, no window."""
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        return False
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(payload)
    return True


def release(lock: Path) -> None:
    lock = Path(lock)
    try:
        if lock.exists():
            info = json.loads(lock.read_text(encoding="utf-8"))
            if int(info.get("pid", -1)) == os.getpid():
                lock.unlink()
    except Exception:  # noqa: BLE001 — best-effort cleanup
        pass


@contextmanager
def pool_lock(pool_root: Path, name: str):
    """Serialize the writers of ONE crop pool. Raises, because a second writer has no sane answer.

    Two `slice --all` runs overwrote the same 425k crops for 18 minutes on 2026-08-21, and the
    first thing to notice was a pack reading the pool mid-rewrite.
    """
    lock = pool_lock_path(pool_root)
    info = acquire(lock, "slice", name)
    if info is not None:
        raise RuntimeError(f"crop pool {pool_root} is being written by {describe(info)} — "
                           f"wait for it, or remove {lock} if that process is gone.")
    try:
        yield
    finally:
        release(lock)
