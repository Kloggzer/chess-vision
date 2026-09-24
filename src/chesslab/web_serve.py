"""Der Rumpf des Web-Workers ohne `chesslab.cli`: JSON-Zeilen auf stdin, eine Antwortzeile je Anfrage.

`platform/app/lib/py/worker.ts` startet `main` direkt; das Verb `chesslab web-worker` ruft dasselbe.
Antworten kommen in Fertig-Reihenfolge, der Aufrufer ordnet sie ueber `id` zu.
"""

from __future__ import annotations

import contextlib
import json
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import TextIO

#: A browser opens ~6 connections per host; more threads would only queue behind them.
CUT_THREADS = 4


def _request(line: str) -> tuple[dict | None, dict | None]:
    try:
        request = json.loads(line)
        rid = request.get("id") if isinstance(request, dict) else None
    except json.JSONDecodeError as exc:
        return None, {"id": None, "ok": False, "error": f"no JSON request: {exc}", "kind": "BadRequest"}
    if not isinstance(request, dict) or not isinstance(request.get("op"), str):
        return None, {"id": rid, "ok": False, "error": "request needs {id, op, args}", "kind": "BadRequest"}
    return request, None


def _run(request: dict) -> dict:
    """`{id, op, args}` -> `{id, ok: true, value}` or `{id, ok: false, error, kind}`."""
    from .web_ops import OPS

    rid = request.get("id")
    op = OPS.get(request["op"])
    if op is None:
        return {"id": rid, "ok": False, "error": f"unknown op: {request['op']}", "kind": "UnknownOp"}
    try:
        return {"id": rid, "ok": True, "value": op(**(request.get("args") or {}))}
    except Exception as exc:  # noqa: BLE001 - every failure goes back to the caller, with its kind
        return {"id": rid, "ok": False, "error": str(exc) or repr(exc), "kind": type(exc).__name__}


def serve(stdin: TextIO, stdout: TextIO) -> None:
    from .web_ops import PARALLEL_OPS, preload

    lock = threading.Lock()
    loaded = False

    def emit(reply: dict) -> None:
        line = json.dumps(reply, ensure_ascii=False, separators=(",", ":")) + "\n"
        with lock:
            stdout.write(line)
            stdout.flush()

    # Once for the whole loop: a per-request redirect swaps `sys.stdout` under the other threads.
    # A stray `print` in an op would be read as the answer line.
    with contextlib.redirect_stdout(sys.stderr), \
            ThreadPoolExecutor(CUT_THREADS) as cuts, ThreadPoolExecutor(1) as ordered:
        # EOF is the parent gone: no watcher thread needed, the pipe closes with it.
        for line in stdin:
            if not line.strip():
                continue
            request, refused = _request(line)
            if refused is not None:
                ordered.submit(emit, refused)
                continue
            # `ping` stays light: it reports whether the start pulled cv2 in.
            if not loaded and request["op"] != "ping":
                preload()
                loaded = True
            lane = cuts if request["op"] in PARALLEL_OPS else ordered
            lane.submit(lambda r=request: emit(_run(r)))


def main() -> None:
    """Never loads torch. `web_ops` is imported before the first request, while the web app still works."""
    for stream in (sys.stdin, sys.stdout):
        stream.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    from . import web_ops  # noqa: F401

    serve(sys.stdin, sys.stdout)
