"""QA 2026-09-25 Runde 2: `web_serve.serve` wie der Worker, Schnitt und Stift auf DEMSELBEN Alpha."""

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
from chesslab.matte import FIXED_SUFFIX


def _session(root: Path) -> Path:
    sdir = root / "recordings" / "g"
    (sdir / "boards").mkdir(parents=True)
    (sdir / "mattes").mkdir()
    (sdir / "candidate.json").write_text("{}", encoding="utf-8")
    assert cv2.imwrite(str(sdir / "boards" / "000001.webp"), np.full((8, 8, 3), 90, np.uint8))
    write_rows(sdir / "log.jsonl", [{"frame": "frames/000001.png", "ply": 1, "board": "boards/000001.webp",
                                     "board_size": 8, "board_border": 0, "board_straightened": True}])
    assert cv2.imwrite(str(sdir / "mattes" / "000001.webp"), np.full((8, 8), 60, np.uint8))
    assert cv2.imwrite(str(sdir / "mattes" / f"000001{FIXED_SUFFIX}"), np.full((8, 8), 250, np.uint8))
    return sdir


def _serve(requests: list[dict]) -> dict[int, dict]:
    stdout = io.StringIO()
    web_serve.serve(io.StringIO("".join(json.dumps(r) + "\n" for r in requests)), stdout)
    return {r["id"]: r for r in map(json.loads, stdout.getvalue().splitlines())}


def _holding_the_alpha(monkeypatch, write_name: str):
    """The cut holds the correction open until the write has run (or 1 s passed); the write starts
    only once the cut is reading — the interleaving a busy grid plus a pen click produces."""
    reading, written = threading.Event(), threading.Event()
    real_raster, real_write = web_cuts._raster, getattr(web_cuts, write_name)

    def raster(path: Path):
        if path.name.endswith(FIXED_SUFFIX):
            with open(path, "rb"):
                reading.set()
                written.wait(1)
        return real_raster(path)

    def write(*args):
        reading.wait(1)
        try:
            return real_write(*args)
        finally:
            written.set()

    monkeypatch.setattr(web_cuts, "_raster", raster)
    monkeypatch.setattr(web_cuts, write_name, write)


def test_a_restore_after_a_cut_does_not_pull_the_file_from_under_it(tmp_path, monkeypatch):
    _session(tmp_path)
    _holding_the_alpha(monkeypatch, "pen_restore")
    args = {"root": str(tmp_path), "name": "g", "stem": "000001"}
    replies = _serve([{"id": 1, "op": "cut_matte", "args": {**args, "size": 8}},
                      {"id": 2, "op": "pen", "args": {**args, "action": "restore"}}])
    assert replies[1]["ok"], f"BUG: the cut sent first lost its alpha to the later restore: {replies[1]}"
    assert replies[2]["ok"], f"BUG: the restore failed on the file a cut was reading: {replies[2]}"


def test_a_stroke_after_a_cut_can_replace_the_alpha(tmp_path, monkeypatch):
    _session(tmp_path)
    _holding_the_alpha(monkeypatch, "_write_alpha")
    rgba = np.full((8, 8, 4), (0, 0, 255, 255), np.uint8)
    mask = base64.b64encode(cv2.imencode(".png", rgba)[1].tobytes()).decode()
    args = {"root": str(tmp_path), "name": "g", "stem": "000001"}
    replies = _serve([{"id": 1, "op": "cut_matte", "args": {**args, "size": 8}},
                      {"id": 2, "op": "pen", "args": {**args, "action": "stroke", "mask": mask}}])
    assert replies[1]["ok"], replies[1]
    assert replies[2]["ok"], f"BUG: os.replace onto the alpha a cut holds open (Windows): {replies[2]}"


def test_a_failed_decode_leaves_no_flight_behind(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
    sdir = _session(tmp_path)
    (sdir / "boards" / "000001.webp").write_bytes(b"kein Bild")
    before = set(web_cuts._flights)
    with pytest.raises(ValueError, match="not a decodable image"):
        web_ops.cut_cell(str(tmp_path), "g", "000001", "e4", 8)
    assert set(web_cuts._flights) == before, "BUG: the flight lock of a failed decode stays forever"
