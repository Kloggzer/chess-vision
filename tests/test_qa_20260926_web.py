"""A lost alpha of a frame `matte.jsonl` measured is an internal file gone (500), not `Missing` (404)."""
from __future__ import annotations

import json

import numpy as np
import pytest

from chesslab import web_ops, web_serve
from conftest import make_profile, write_jsonl, write_session

FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"


def _recording(paths, matte_rows):
    sdir = paths.recordings / "g"
    image = np.random.default_rng(1).integers(0, 256, (928, 928, 3), dtype=np.uint8)
    write_session(sdir, [{"frame": "frames/000110.png", "ply": 1, "fen": FEN}], profile=make_profile(928), image=image)
    (sdir / "candidate.json").write_text(json.dumps({"moves": [], "source": {"crop": {"pad_side": 0.05}}}), "utf-8")
    if matte_rows is not None:
        write_jsonl(sdir / "matte.jsonl", matte_rows)
    return sdir


@pytest.mark.parametrize("rows", [
    None,
    [{"frame": "000111", "coverage": {"e4": 0.4}}],
    [{"frame": "000110", "skipped": "zone too big"}],
    [{"frame": "000110", "coverage": {"e4": 0.4}}, {"frame": "000110", "skipped": "zone too big"}],
], ids=["no-matte", "other-frame", "refused", "refused-last"])
def test_an_alpha_sam_never_cut_is_missing(paths, rows):
    _recording(paths, rows)
    with pytest.raises(web_ops.Missing):
        web_ops.cut_matte(str(paths.root), "g", "000110", 128)
    with pytest.raises(web_ops.Missing):
        web_ops.pen(str(paths.root), "g", "000110", "clear")


@pytest.mark.parametrize("frame", ["000110", "boards/000110.webp"])
def test_a_measured_frames_lost_alpha_is_an_internal_error(paths, frame):
    _recording(paths, [{"frame": frame, "coverage": {"e4": 0.4}}])
    for op, args in (("cut_matte", {"size": 128}), ("pen", {"action": "clear"})):
        reply = web_serve._run({"id": 1, "op": op, "args": {"root": str(paths.root), "name": "g", "stem": "000110", **args}})
        assert reply["ok"] is False
        assert reply["kind"] == "FileNotFoundError", f"BUG: {op} reports a lost alpha as never cut"
