"""`chesslab web-worker`: JSON lines in, one answer line each, and no torch (`docs/web-ruft-python.md`)."""
from __future__ import annotations

import json
import subprocess
import sys

import pytest

# Der Verb-Weg (Typer) und der Weg, den `platform/app/lib/py/worker.ts` startet.
ENTRIES = {
    "verb": [sys.executable, "-m", "chesslab.cli", "web-worker"],
    "web": [sys.executable, "-c", "from chesslab.cli.web_worker import web_worker; web_worker()"],
}


@pytest.mark.parametrize("entry", sorted(ENTRIES))
def test_the_worker_answers_by_id_and_refuses_an_unknown_op(entry):
    requests = [
        {"id": 1, "op": "ping"},
        {"id": 2, "op": "lcs_report", "args": {"truth": ["e4", "e5"], "cand": ["e4", "d5"]}},
        {"id": 3, "op": "gibt-es-nicht"},
        {"id": 4, "op": "lcs_report", "args": {"truth": ["e4"]}},
    ]
    stdin = "".join(json.dumps(r) + "\n" for r in requests) + "kein json\n"
    run = subprocess.run(ENTRIES[entry], input=stdin, capture_output=True, text=True, encoding="utf-8",
                         timeout=120, check=True)
    answers = [json.loads(line) for line in run.stdout.splitlines()]
    assert [a["id"] for a in answers] == [1, 2, 3, 4, None]
    assert answers[0]["ok"] is True and answers[0]["value"]["torch"] is False
    assert answers[1] == {"id": 2, "ok": True, "value": {"matched": [[0, 0]], "invented": [1], "missed": [1]}}
    assert answers[2]["ok"] is False and answers[2]["kind"] == "UnknownOp"
    assert answers[3]["ok"] is False and answers[3]["kind"] == "TypeError"
    assert answers[4]["kind"] == "BadRequest"


def test_a_stray_print_in_an_op_does_not_become_the_answer(monkeypatch):
    import io

    from chesslab import web_ops
    from chesslab.cli import web_worker

    monkeypatch.setitem(web_ops.OPS, "noisy", lambda: print("laut") or 7)
    out = io.StringIO()
    web_worker.serve(io.StringIO('{"id": 9, "op": "noisy"}\n'), out)
    assert json.loads(out.getvalue()) == {"id": 9, "ok": True, "value": 7}
