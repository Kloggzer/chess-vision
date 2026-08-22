"""One writer at a time, for the two resources that only have one.

A lock is a JSON file naming the PID that holds it: it survives a web restart, and one left by a
dead process is reclaimed without a human. `data/inbox/heavy.lock` covers heavy jobs across CLI
and web app, `data/crops/<tag>/.pool.lock` the writers of one crop pool."""

from __future__ import annotations

import json
import os
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path


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
    return info


def describe(info: dict) -> str:
    return (f"{info.get('job', 'a job')} {info.get('name', '')} (PID "
            f"{info.get('childPid') or info.get('pid')}, started {info.get('startedAt', '?')})")


def acquire(lock: Path, job: str, name: str) -> dict | None:
    """None if the lock is now ours, otherwise the live holder — callers word their own refusal."""
    lock = Path(lock)
    info = held_by(lock)
    if info is not None:
        return info
    lock.parent.mkdir(parents=True, exist_ok=True)
    lock.write_text(json.dumps({"pid": os.getpid(), "childPid": os.getpid(), "job": job,
                                "name": name, "startedAt": datetime.now().isoformat()},
                               indent=2), encoding="utf-8")
    return None


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
