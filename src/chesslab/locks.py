"""One writer at a time: `data/inbox/heavy.lock` for heavy jobs across CLI and web app,
`data/crops/<tag>/.pool.lock` for one crop pool. A dead PID's lock is reclaimed automatically.
"""

from __future__ import annotations

import json
import os
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from time import monotonic, sleep

from .session_store.names import mattes_dir

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

        # OpenProcess alone answers the WRONG question: Windows keeps the process OBJECT alive while
        # anyone holds a handle. Ask for the exit code; `restype` matters too, a HANDLE is 64-bit on
        # x64.
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
        # 259 = STILL_ACTIVE; a process exiting WITH 259 reads as alive — the documented ambiguity,
        # and the safe direction for a lock.
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
    """Dieselbe Sitzung? Die LAUFZEIT entscheidet: eine Zeitumstellung verschob die abgeleitete
    Bootzeit und gab das Lock frei, waehrend der Lauf lief.
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
    """The record of the LIVE process holding `lock`, or None; corrupt or dead-PID counts as free.
    `childPid` is the job, `pid` the claimant (the web app claims with the server's pid).
    """
    try:
        info = json.loads(Path(lock).read_text(encoding="utf-8"))
        pid = int(info.get("childPid") or info.get("pid") or -1)
    except (OSError, ValueError, TypeError, AttributeError):
        return None
    if pid <= 0 or pid == os.getpid() or not pid_alive(pid):
        return None
    # Ein Lock aus einer FRUEHEREN Sitzung haelt niemand mehr: Windows vergibt die PID nach dem
    # Neustart neu, und `pid_alive` sagt ja. Ein Lock ohne `boot`-Feld bleibt gueltig.
    if not _same_boot(info.get("boot"), info.get("uptime")):
        return None
    return info


def _holder(lock: Path, token: str | None) -> dict | None:
    """`held_by`, except that another thread's token on our own PID holds the lock too."""
    info = _read_lock(lock)
    if (info is not None and info.get("token") not in (None, token)
            and info.get("pid") == os.getpid() and info.get("childPid") == os.getpid()):
        return info
    return held_by(lock)


def describe(info: dict) -> str:
    return (f"{info.get('job', 'a job')} {info.get('name', '')} (PID "
            f"{info.get('childPid') or info.get('pid')}, started {info.get('startedAt', '?')})")


def acquire(lock: Path, job: str, name: str, *, token: str | None = None) -> dict | None:
    """None if the lock is now ours, otherwise the live holder — callers word their own refusal."""
    lock = Path(lock)
    observed = _raw(lock)
    info = _holder(lock, token)
    if info is not None:
        return info
    lock.parent.mkdir(parents=True, exist_ok=True)
    boot, up = _boot_time(), _uptime_s()
    payload = json.dumps({"pid": os.getpid(), "childPid": os.getpid(), "job": job,
                          "name": name, "startedAt": datetime.now().isoformat(),
                          **({"token": token} if token else {}),
                          **({"boot": boot.isoformat()} if boot else {}),
                          **({"uptime": round(up, 1)} if up is not None else {})}, indent=2)
    # Ein Lock, das VOR dem Versuch dalag, ist tot; eines, das WAEHREND entsteht, gehoert einem
    # Mitbewerber. Zweimal, weil es gleich wieder verschwinden kann.
    for _ in range(2):
        _break_stale(lock, observed)
        if _claim(lock, payload):
            return None
        info = _holder(lock, token) or _read_lock(lock)
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
    """Move the dead lock WE read aside; what someone else wrote meanwhile goes back, or two
    reclaimers both think they hold it.
    """
    if observed is None:
        return
    aside = lock.with_name(f"{lock.name}.stale-{os.getpid()}-{threading.get_ident()}")
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


def release(lock: Path, token: str | None = None) -> None:
    lock = Path(lock)
    try:
        if lock.exists():
            info = json.loads(lock.read_text(encoding="utf-8"))
            if int(info.get("pid", -1)) == os.getpid() and info.get("token") == token:
                lock.unlink()
    except Exception:  # noqa: BLE001 — best-effort cleanup
        pass


@contextmanager
def pool_lock(pool_root: Path, name: str):
    """Serialize the writers of ONE crop pool; raises. Two `slice --all` runs once overwrote 425k
    crops in parallel for 18 minutes.
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


def matte_publish_lock(mattes: Path) -> Path:
    return Path(mattes) / ".publish.lock"


@contextmanager
def waiting(lock: Path, job: str, name: str, *, timeout: float = 60.0):
    """Hold `lock` for a SHORT critical section, waiting for a live holder; a dead one is reclaimed."""
    deadline = monotonic() + timeout
    token = uuid.uuid4().hex
    try:
        while (info := acquire(lock, job, name, token=token)) is not None:
            if monotonic() > deadline:
                raise RuntimeError(f"{lock} is held by {describe(info)} — remove it if that process is gone.")
            sleep(0.05)
    except BaseException:
        # An interrupt right after the claim left our own token behind; the token keeps others' locks safe.
        release(lock, token)
        raise
    try:
        yield
    finally:
        release(lock, token)


def matte_ledger(session_dir: Path, job: str):
    """EVERY writer of `matte.jsonl` and its alphas holds this, briefly; not re-entrant."""
    return waiting(matte_publish_lock(mattes_dir(session_dir)), job, Path(session_dir).name)
