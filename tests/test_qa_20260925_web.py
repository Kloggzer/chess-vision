"""QA 2026-09-25: the real worker process, stdin left OPEN, as `platform/app/lib/py/worker.ts` drives it."""

from __future__ import annotations

import base64
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

from chesslab.ioutil import write_rows

WORKER = [sys.executable, "-c", "from chesslab.web_serve import main; main()"]
SIDE = 3000


def _session(root: Path) -> Path:
    sdir = root / "recordings" / "g"
    (sdir / "boards").mkdir(parents=True)
    (sdir / "mattes").mkdir()
    (sdir / "candidate.json").write_text("{}", encoding="utf-8")
    assert cv2.imwrite(str(sdir / "boards" / "000001.webp"), np.full((8, 8, 3), 90, np.uint8))
    write_rows(sdir / "log.jsonl", [{"frame": "frames/000001.png", "ply": 1, "board": "boards/000001.webp",
                                     "board_size": SIDE, "board_border": 0, "board_straightened": True}])
    # Noise keeps the lossless re-encode slow: the pen is still writing when the cut arrives.
    noise = np.random.default_rng(1).integers(0, 200, (SIDE, SIDE), dtype=np.uint8)
    assert cv2.imwrite(str(sdir / "mattes" / "000001.webp"), noise, [cv2.IMWRITE_WEBP_QUALITY, 101])
    return sdir


def _full_mask() -> str:
    rgba = np.full((8, 8, 4), (0, 0, 255, 255), np.uint8)  # BGRA red: raises every pixel
    return base64.b64encode(cv2.imencode(".png", rgba)[1].tobytes()).decode()


def test_a_cut_sent_after_a_pen_stroke_sees_the_stroke(tmp_path):
    _session(tmp_path)
    args = {"root": str(tmp_path), "name": "g", "stem": "000001"}
    proc = subprocess.Popen(WORKER, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                            text=True, encoding="utf-8")
    try:
        for req in ({"id": 1, "op": "pen", "args": {**args, "action": "stroke", "mask": _full_mask()}},
                    {"id": 2, "op": "cut_matte", "args": {**args, "size": 128}}):
            proc.stdin.write(json.dumps(req) + "\n")
        proc.stdin.flush()
        replies = {}
        while len(replies) < 2:
            reply = json.loads(proc.stdout.readline())
            replies[reply["id"]] = reply
    finally:
        proc.stdin.close()
        proc.wait(60)
    assert replies[1]["ok"] and replies[2]["ok"], replies
    alpha = cv2.imdecode(np.frombuffer(base64.b64decode(replies[2]["value"]), np.uint8), cv2.IMREAD_GRAYSCALE)
    assert int(alpha.min()) >= 250, "the cut overtook the stroke sent before it and served SAM's alpha"
