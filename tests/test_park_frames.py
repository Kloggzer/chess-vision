"""Parking the source frames: what moves, what is kept back, and what stops working."""

import json

import numpy as np
import pytest
from PIL import Image

from chesslab import config
from chesslab.realgames import game_dir
from chesslab.sessions import missing_source_frames, park_frames_session
from conftest import write_jsonl


@pytest.fixture
def session(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = game_dir("s1")
    (sdir / "frames").mkdir(parents=True)
    (sdir / "boards").mkdir()
    rows = []
    for i in range(3):
        stem = f"{i:06d}"
        Image.fromarray(np.full((40, 40, 3), 128, np.uint8)).save(sdir / "frames" / f"{stem}.png")
        row = {"frame": f"frames/{stem}.png", "fen": "8/8/8/8/8/8/8/8 w - - 0 1", "ply": 1}
        # The last row's fit failed, so it never got a board — its frame is the only source left.
        if i < 2:
            Image.fromarray(np.full((44, 44, 3), 128, np.uint8)).save(sdir / "boards" / f"{stem}.webp")
            row |= {"board": f"boards/{stem}.webp", "board_size": 40, "board_border": 2}
        rows.append(row)
    write_jsonl(sdir / "log.jsonl", rows)
    return sdir


def test_only_a_boarded_row_gives_up_its_frame(session):
    """A frame whose board is not on disk is the last copy of that picture — it stays."""
    r = park_frames_session("rg-s1")

    assert (r["moved"], r["of"]) == (2, 3)
    assert sorted(p.name for p in (session / "frames").iterdir()) == ["000002.png"]
    parked = config.DATA.root / "_parked" / "frames" / "rg-s1"
    assert sorted(p.name for p in parked.iterdir()) == ["000000.png", "000001.png"]


def test_parking_is_a_move_and_not_a_delete(session):
    """Project rule: park, never delete. The bytes have to be somewhere afterwards."""
    before = (session / "frames" / "000000.png").read_bytes()

    park_frames_session("rg-s1")

    assert (config.DATA.root / "_parked" / "frames" / "rg-s1" / "000000.png").read_bytes() == before


def test_a_step_that_needs_the_raw_picture_says_so(session):
    """`scan`, `autofix`, `fit-mesh` and `mark-hands` fit against the FRAME. Skipping every row in
    silence reported "0 of 2 608 measured" — a session that reads as empty rather than parked."""
    rows = [json.loads(line) for line in (session / "log.jsonl").read_text(encoding="utf-8").splitlines()]
    assert missing_source_frames(session, rows) is None

    park_frames_session("rg-s1")
    for row in rows[2:]:                       # the unboarded frame stays, so park it by hand
        (session / row["frame"]).unlink()

    why = missing_source_frames(session, rows)
    assert why and "export-session" in why and "_parked" in why
