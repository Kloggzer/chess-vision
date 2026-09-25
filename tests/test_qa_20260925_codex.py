"""Regression witnesses for the 2026-09-25 consolidation diff."""

from __future__ import annotations

import base64
import io
import json
import threading
from pathlib import Path

import cv2
import numpy as np
import pytest

from chesslab import config, web_cuts, web_ops, web_serve
from chesslab.ioutil import write_rows


def _web_session(root: Path, *, matte: int | None = None) -> Path:
    sdir = root / "recordings" / "g"
    (sdir / "boards").mkdir(parents=True)
    (sdir / "mattes").mkdir()
    (sdir / "candidate.json").write_text("{}", encoding="utf-8")
    board = np.full((8, 8, 3), 90, np.uint8)
    assert cv2.imwrite(str(sdir / "boards" / "000001.webp"), board)
    write_rows(sdir / "log.jsonl", [{
        "frame": "frames/000001.png",
        "ply": 1,
        "board": "boards/000001.webp",
        "board_size": 8,
        "board_border": 0,
        "board_straightened": True,
    }])
    if matte is not None:
        assert cv2.imwrite(str(sdir / "mattes" / "000001.webp"), np.full((8, 8), matte, np.uint8))
    return sdir


def test_cut_rejects_a_windows_root_relative_board_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """A rooted path without a drive must not escape the recording on Windows."""
    if not tmp_path.drive:
        pytest.skip("the vulnerable path form is Windows-specific")
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    sdir = _web_session(tmp_path)
    outside = tmp_path / "outside.webp"
    assert cv2.imwrite(str(outside), np.full((8, 8, 3), 211, np.uint8))
    rooted_without_drive = "\\" + str(outside.relative_to(outside.anchor))
    assert not Path(rooted_without_drive).is_absolute()
    assert (sdir / rooted_without_drive).resolve() == outside.resolve()
    write_rows(sdir / "log.jsonl", [{
        "frame": "frames/000001.png",
        "ply": 1,
        "board": rooted_without_drive,
        "board_size": 8,
        "board_border": 0,
        "board_straightened": True,
    }])

    with pytest.raises(ValueError, match="leaves the recording"):
        web_ops.cut_cell(str(tmp_path), "g", "000001", "e4", 4)


def test_worker_does_not_overtake_a_preceding_matte_write(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
):
    """A cut submitted after `pen clear` must not answer with the pre-clear alpha."""
    _web_session(tmp_path, matte=200)
    entered, cut_answered = threading.Event(), threading.Event()
    real_write = web_cuts._write_alpha

    def paused_write(file: Path, alpha) -> None:
        entered.set()
        cut_answered.wait(1)  # without the barrier the cut answers in here
        real_write(file, alpha)

    monkeypatch.setattr(web_cuts, "_write_alpha", paused_write)

    class Output(io.StringIO):
        def write(self, text: str) -> int:
            if '"id":2' in text:
                cut_answered.set()
            return super().write(text)

    requests = [
        {"id": 1, "op": "pen", "args": {"root": str(tmp_path), "name": "g", "stem": "000001", "action": "clear"}},
        {"id": 2, "op": "cut_matte", "args": {"root": str(tmp_path), "name": "g", "stem": "000001", "size": 8}},
    ]
    stdout = Output()
    web_serve.serve(io.StringIO("".join(json.dumps(r) + "\n" for r in requests)), stdout)
    assert entered.is_set()
    replies = {r["id"]: r for r in map(json.loads, stdout.getvalue().splitlines())}
    assert replies[1]["ok"] and replies[2]["ok"], replies
    image = cv2.imdecode(np.frombuffer(base64.b64decode(replies[2]["value"]), np.uint8), cv2.IMREAD_GRAYSCALE)
    assert image is not None
    assert int(image.max()) == 0, "the later cut overtook pen-clear and served SAM's old alpha"
