"""`write_boards_session` persists `board_straightened` when it straightens the store."""
from __future__ import annotations

import json

import numpy as np
import pytest

from chesslab import calibration, config, session_boards
from chesslab.realgames import boards as rg_boards
from conftest import make_profile, write_jsonl

BS, BORDER = 64, 4
EIGHTHS = [k / 8.0 for k in range(9)]


def _profile():

    corners = [[0.0, 0.0], [float(BS), 0.0], [float(BS), float(BS)], [0.0, float(BS)]]
    return make_profile(BS, corners=corners, profile="t", camera_index=-1, source="test")


def _rows(n: int) -> list[dict]:
    return [{"frame": f"frames/{i:06d}.png", "corners": [[0, 0], [BS, 0], [BS, BS], [0, BS]],
             "grid_lines": {"x": list(EIGHTHS), "y": list(EIGHTHS),
                            "tx": [0.04] * 9, "ty": [0.0] * 9}}
            for i in range(n)]


def test_a_killed_write_boards_leaves_the_straightened_flag_on_disk(tmp_path, monkeypatch):
    """Row 0's board is straight on disk; if the log never says so, the next run pulls it a second
    time and the store is over-corrected.
    """
    import cv2

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = config.DATA.recordings / "rec"
    (sdir / "frames").mkdir(parents=True)
    (sdir / "boards").mkdir(parents=True)
    rows = _rows(3)
    for row in rows:
        cv2.imwrite(str(sdir / row["frame"]), np.zeros((BS, BS, 3), np.uint8))
    (sdir / "session.yaml").write_text("session_id: rg-rec\nprofile: t\n", encoding="utf-8")
    write_jsonl(sdir / "log.jsonl", rows)

    monkeypatch.setattr(session_boards, "session_dir", lambda sid, paths=None: (sdir, False))
    _profile().save(calibration.profile_path("t"))
    monkeypatch.setattr(rg_boards, "STRAIGHTEN_CHECKPOINT", 1)

    def _board(job):
        stem = job[1].split("/")[-1].split(".")[0]
        rel = f"boards/{stem}.webp"
        cv2.imwrite(str(sdir / rel), np.zeros((BS + 2 * BORDER, BS + 2 * BORDER, 3), np.uint8))
        return {"board": rel, "board_size": BS, "board_border": BORDER}

    monkeypatch.setattr(rg_boards, "board_from_frame", _board)

    calls = {"n": 0}
    real = calibration.straighten_board

    def _killed(*a, **kw):
        calls["n"] += 1
        if calls["n"] > 1:
            raise KeyboardInterrupt("run killed mid-straighten")
        return real(*a, **kw)

    monkeypatch.setattr(calibration, "straighten_board", _killed)

    with pytest.raises(KeyboardInterrupt):
        session_boards.write_boards_session("rg-rec")

    on_disk = [json.loads(line) for line in
               (sdir / "log.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    assert on_disk[0].get("board_straightened") is True, \
        "the board was pulled straight but the log does not say so — a rerun corrects it twice"
