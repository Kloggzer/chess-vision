"""What several verbs do alike: report an expected error and exit, pick sessions, parse sizes."""

from __future__ import annotations

from collections.abc import Callable, Iterator
from contextlib import contextmanager

import typer

from .. import labeling as labeling_mod

#: What a reader of one recording raises when it is missing or broken.
LOOKUP_ERRORS = (FileNotFoundError, ValueError, KeyError)


@contextmanager
def fail_on(*errors: type[Exception], tag: str = "FAIL") -> Iterator[None]:
    """An expected error becomes `[<tag>] <message>` and exit 1 — a message, not a stack."""
    try:
        yield
    except errors as e:
        print(f"[{tag}] {e}")
        raise typer.Exit(1) from None


def csv_list(value: str | None) -> list[str]:
    return [s.strip() for s in (value or "").split(",") if s.strip()]


def _out_size(value: str | None) -> tuple[int, int] | None:
    """`WxH` from a command line — a bad one is a message, not a stack."""
    if not value:
        return None
    with fail_on(ValueError):
        return labeling_mod.parse_out_size(value)


def _require_target(session: str | None, every: bool) -> None:
    if not (session or every):
        print("[FAIL] specify a session ID or --all.")
        raise typer.Exit(1)


def _one_or_all(name: object, every: bool, what: str = "name") -> None:
    if bool(name) == every:
        print(f"[ERR] {what} or --all, not both")
        raise typer.Exit(1)


def _rg_recordings() -> list[str]:
    """Every recording that has a session, by its recording name (without `rg-`)."""
    from ..session_store.paths import all_sessions

    return [sid[3:] for sid, _ in all_sessions() if sid.startswith("rg-")]


def _target_sessions(session: str | None, every: bool) -> list[str]:
    """One session, or every ACTIVE one: archived sessions stay out of bulk verbs."""
    _require_target(session, every)
    if not every:
        return [session]
    from .. import session_lifecycle
    return [s["session_id"] for s in session_lifecycle.list_sessions() if not s["archived"]]


def _session_call(fn, *args):
    """Run a `sessions` operation, turning errors into a message and exit code; `NothingToDo` is an
    answer, not a crash.
    """
    from ..sessions import NothingToDo

    try:
        return fn(*args)
    except NothingToDo as e:
        print(f"[--] {e}")
        raise typer.Exit(0) from e
    except (ValueError, FileNotFoundError) as e:
        print(f"[ERR] {e}")
        raise typer.Exit(1) from e


def _session_try(fn, *args) -> dict:
    """Wie `_session_call`, aber der Fehler kommt als Wert zurueck: in `--all`-Schleifen raeumte
    eine Session mit totem Profil den ganzen Lauf ab.
    """
    from ..sessions import NothingToDo

    try:
        return fn(*args)
    except (NothingToDo, ValueError, FileNotFoundError) as e:
        return {"error": str(e)}


def _each_session(session: str | None, every: bool, fn: Callable[[str], dict],
                  say: Callable[[str, dict], None]) -> tuple[int, int]:
    """`fn` over one session or all; a failure is a `[FAIL]` line, not an abort. -> (seen, failed)"""
    ids = _target_sessions(session, every)
    failed = 0
    for sid in ids:
        r = _session_try(fn, sid)
        if r.get("error"):
            print(f"[FAIL] {sid}: {r['error']}", flush=True)
            failed += 1
            continue
        say(sid, r)
    return len(ids), failed


def _each_recording(names: list[str], fn: Callable[[str], dict], say: Callable[[str, dict], None],
                    errors: tuple[type[Exception], ...] = LOOKUP_ERRORS) -> int:
    """`fn` over recordings; a failure is an `[ERR]` line, not an abort. -> failed"""
    failed = 0
    for name in names:
        try:
            res = fn(name)
        except errors as e:
            print(f"[ERR] {name}: {e}")
            failed += 1
            continue
        say(name, res)
    return failed


def _exit_on_bulk_failures(failed: int) -> None:
    if failed:
        raise typer.Exit(1)
