"""The worker cuts in parallel, keeps every other op in order, and shares one data root safely."""

import io
import json
import threading
import time
from pathlib import Path

import numpy as np

from chesslab import config, web_ops, web_serve


def _serve(lines: list[dict]) -> list[dict]:
    out = io.StringIO()
    web_serve.serve(io.StringIO("".join(json.dumps(r) + "\n" for r in lines)), out)
    return [json.loads(line) for line in out.getvalue().splitlines()]


def test_cut_ops_run_side_by_side(monkeypatch):
    meet = threading.Barrier(2, timeout=3)
    monkeypatch.setitem(web_ops.OPS, "cut_cell", lambda: meet.wait() >= 0)
    answers = _serve([{"id": 1, "op": "cut_cell"}, {"id": 2, "op": "cut_cell"}])
    assert sorted(a["id"] for a in answers) == [1, 2]
    assert all(a["ok"] for a in answers), answers


def test_every_other_op_keeps_its_order(monkeypatch):
    seen = []
    monkeypatch.setitem(web_ops.OPS, "slow", lambda: time.sleep(0.2) or seen.append("slow"))
    monkeypatch.setitem(web_ops.OPS, "fast", lambda: seen.append("fast"))
    _serve([{"id": 1, "op": "slow"}, {"id": 2, "op": "fast"}])
    assert seen == ["slow", "fast"]


def test_a_request_answers_by_id_even_out_of_order(monkeypatch):
    monkeypatch.setitem(web_ops.OPS, "cut_board", lambda: time.sleep(0.2) or "late")
    monkeypatch.setitem(web_ops.OPS, "cut_matte", lambda: "early")
    answers = {a["id"]: a["value"] for a in _serve([{"id": 1, "op": "cut_board"},
                                                     {"id": 2, "op": "cut_matte"}])}
    assert answers == {1: "late", 2: "early"}


def test_one_root_stays_set_while_any_user_holds_it(tmp_path):
    before = config.DATA
    inside, leave = threading.Event(), threading.Event()
    seen = []

    def long_user():
        with web_ops._rooted(str(tmp_path)):
            inside.set()
            leave.wait(3)
            seen.append(config.DATA.root)

    t = threading.Thread(target=long_user)
    t.start()
    inside.wait(3)
    with web_ops._rooted(str(tmp_path)):
        pass
    leave.set()
    t.join(3)
    assert seen == [Path(tmp_path)]
    assert config.DATA is before


def test_another_root_waits_for_the_first(tmp_path):
    a, b = tmp_path / "a", tmp_path / "b"
    inside, order = threading.Event(), []

    def holder():
        with web_ops._rooted(str(a)):
            inside.set()
            time.sleep(0.2)
            order.append(("a", config.DATA.root))

    t = threading.Thread(target=holder)
    t.start()
    inside.wait(3)
    with web_ops._rooted(str(b)):
        order.append(("b", config.DATA.root))
    t.join(3)
    assert order == [("a", a), ("b", b)]


def test_one_board_is_decoded_once_under_concurrent_cells(tmp_path, monkeypatch):
    import cv2

    from chesslab import web_cuts

    board = tmp_path / "board.webp"
    cv2.imwrite(str(board), np.zeros((16, 16, 3), np.uint8))
    real, calls = cv2.imdecode, []

    def slow_decode(buf, flags):
        calls.append(1)
        time.sleep(0.1)
        return real(buf, flags)

    monkeypatch.setattr(web_cuts.cv2, "imdecode", slow_decode)
    threads = [threading.Thread(target=web_cuts._raster, args=(board,)) for _ in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(3)
    assert len(calls) == 1


def test_the_real_worker_answers_heavy_ops_while_its_pipe_stays_open(tmp_path):
    """Input sent up front with EOF hid it: a cv2 import in an op thread hung behind the pending read."""
    import subprocess
    import sys

    proc = subprocess.Popen([sys.executable, "-c", "from chesslab.web_serve import main; main()"],
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8")
    got: list[dict] = []
    reader = threading.Thread(target=lambda: got.extend(json.loads(line) for line in proc.stdout),
                              daemon=True)
    reader.start()
    root = str(tmp_path)
    requests = [("ping", {}), ("warm_cuts", {}),
                ("cut_cell", {"root": root, "name": "x", "stem": "0", "square": "e4", "size": 64}),
                ("admission", {"root": root, "names": ["x"]}), ("pool", {"root": root, "names": ["x"]}),
                ("chain_status", {"root": root, "names": ["x"], "target": 1})]
    try:
        for i, (op, args) in enumerate(requests):
            proc.stdin.write(json.dumps({"id": i, "op": op, "args": args}) + "\n")
            proc.stdin.flush()
        deadline = time.monotonic() + 30
        while len(got) < len(requests) and time.monotonic() < deadline:
            time.sleep(0.05)
        assert sorted(a["id"] for a in got) == list(range(len(requests))), got
        assert got[0]["value"]["cv2"] is False
    finally:
        subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True) \
            if sys.platform == "win32" else proc.kill()


def test_one_log_is_parsed_once_under_concurrent_cells(tmp_path):
    from chesslab import web_cuts

    log = tmp_path / "log.jsonl"
    log.write_text("{}\n", encoding="utf-8")
    calls = []

    def slow_parse(path):
        calls.append(1)
        time.sleep(0.1)
        return {}

    threads = [threading.Thread(target=web_cuts._parsed_once, args=(log, slow_parse)) for _ in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(3)
    assert len(calls) == 1
