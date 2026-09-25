"""Only the ASKED-FOR thing missing is `Missing` (404); an internal file gone stays a bare FileNotFoundError (500)."""
from __future__ import annotations

import json

import numpy as np
import pytest

from chesslab import web_ops, web_serve
from conftest import make_profile, write_session

FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"


def _recording(paths, name="g"):
    sdir = paths.recordings / name
    image = np.random.default_rng(1).integers(0, 256, (928, 928, 3), dtype=np.uint8)
    write_session(sdir, [{"frame": "frames/000110.png", "ply": 1, "fen": FEN}], profile=make_profile(928), image=image)
    (sdir / "candidate.json").write_text(json.dumps({"moves": [], "source": {"crop": {"pad_side": 0.05}}}), "utf-8")
    return sdir


def test_an_unknown_recording_is_missing(paths):
    with pytest.raises(web_ops.Missing):
        web_ops.cut_cell(str(paths.root), "nirgends", "000110", "e4", 32)
    with pytest.raises(web_ops.Missing):
        web_ops.cut_board(str(paths.root), "nirgends", "000110", 128)


def test_an_unknown_stem_of_an_exported_recording_is_missing(paths):
    _recording(paths)
    with pytest.raises(web_ops.Missing):
        web_ops.cut_cell(str(paths.root), "g", "000999", "e4", 32)


def test_a_frame_without_an_alpha_is_missing(paths):
    _recording(paths)
    with pytest.raises(web_ops.Missing):
        web_ops.cut_matte(str(paths.root), "g", "000110", 128)


def test_an_internal_file_gone_is_no_missing_resource(paths):
    sdir = _recording(paths)
    (sdir / "candidate.json").unlink()
    with pytest.raises(FileNotFoundError) as caught:
        web_ops.cut_cell(str(paths.root), "g", "000110", "e4", 32)
    assert not isinstance(caught.value, web_ops.Missing), "BUG: a missing candidate.json reads as 'no such frame'"


def test_confirm_without_a_candidate_is_missing_and_the_worker_says_so(paths):
    (paths.recordings / "g").mkdir(parents=True)
    with pytest.raises(web_ops.Missing):
        web_ops.confirm(str(paths.root), "g", [], [])
    reply = web_serve._run({"id": 1, "op": "confirm", "args": {"root": str(paths.root), "name": "g", "kept": [], "drop": []}})
    assert reply["kind"] == "Missing"


def test_a_missing_alpha_on_the_pen_is_missing(paths):
    _recording(paths)
    with pytest.raises(web_ops.Missing):
        web_ops.pen(str(paths.root), "g", "000110", "clear")
