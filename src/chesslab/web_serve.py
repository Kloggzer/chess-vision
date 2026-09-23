"""Der Rumpf des Web-Workers ohne `chesslab.cli`: JSON-Zeilen auf stdin, eine Antwortzeile je Anfrage.

`platform/app/lib/py/worker.ts` startet `main` direkt; das Verb `chesslab web-worker` ruft dasselbe.
"""

from __future__ import annotations

import contextlib
import json
import sys
from typing import TextIO


def answer(line: str) -> dict:
    """`{id, op, args}` -> `{id, ok: true, value}` or `{id, ok: false, error, kind}`."""
    try:
        request = json.loads(line)
        rid = request.get("id") if isinstance(request, dict) else None
    except json.JSONDecodeError as exc:
        return {"id": None, "ok": False, "error": f"no JSON request: {exc}", "kind": "BadRequest"}
    if not isinstance(request, dict) or not isinstance(request.get("op"), str):
        return {"id": rid, "ok": False, "error": "request needs {id, op, args}", "kind": "BadRequest"}
    from .web_ops import OPS

    op = OPS.get(request["op"])
    if op is None:
        return {"id": rid, "ok": False, "error": f"unknown op: {request['op']}", "kind": "UnknownOp"}
    try:
        return {"id": rid, "ok": True, "value": op(**(request.get("args") or {}))}
    except Exception as exc:  # noqa: BLE001 - every failure goes back to the caller, with its kind
        return {"id": rid, "ok": False, "error": str(exc) or repr(exc), "kind": type(exc).__name__}


def serve(stdin: TextIO, stdout: TextIO) -> None:
    # EOF is the parent gone: no watcher thread needed, the pipe closes with it.
    for line in stdin:
        if line.strip():
            # A stray `print` in an op would be read as the answer line.
            with contextlib.redirect_stdout(sys.stderr):
                reply = answer(line)
            stdout.write(json.dumps(reply, ensure_ascii=False, separators=(",", ":")) + "\n")
            stdout.flush()


def main() -> None:
    """Never loads torch. `web_ops` is imported before the first request, while the web app still works."""
    for stream in (sys.stdin, sys.stdout):
        stream.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    from . import web_ops  # noqa: F401

    serve(sys.stdin, sys.stdout)
