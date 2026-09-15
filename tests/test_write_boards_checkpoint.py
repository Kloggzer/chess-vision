"""`write_boards_session` straightens the store it just rewrote — without persisting the flag.

`straighten_boards` says the flag is the ONLY thing between a killed run and a twice-corrected
store, and `straighten_boards_session` hands it a `checkpoint`. This verb does not, and it writes
the log once, at the very end.
"""
from __future__ import annotations

import json

import numpy as np
import pytest

from chesslab import config, labeling, realgames, sessions
from conftest import make_profile

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
    """Row 0's board is straight on the platter; if the log never says so, the next run pulls it
    a second time and the store is over-corrected — the 2026-08-21 incident, verbatim."""
    import cv2

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = config.DATA.recordings / "rec"
    (sdir / "frames").mkdir(parents=True)
    (sdir / "boards").mkdir(parents=True)
    rows = _rows(3)
    for row in rows:
        cv2.imwrite(str(sdir / row["frame"]), np.zeros((BS, BS, 3), np.uint8))
    (sdir / "session.yaml").write_text("session_id: rg-rec\nprofile: t\n", encoding="utf-8")
    (sdir / "log.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")

    monkeypatch.setattr(sessions, "session_dir", lambda sid, paths=None: (sdir, False))
    monkeypatch.setattr(labeling, "_profile_for_session", lambda meta, name: _profile())
    monkeypatch.setattr(realgames, "STRAIGHTEN_CHECKPOINT", 1)

    def _board(job):
        stem = job[1].split("/")[-1].split(".")[0]
        rel = f"boards/{stem}.webp"
        cv2.imwrite(str(sdir / rel), np.zeros((BS + 2 * BORDER, BS + 2 * BORDER, 3), np.uint8))
        return {"board": rel, "board_size": BS, "board_border": BORDER}

    monkeypatch.setattr(realgames, "board_from_frame", _board)

    from chesslab import calibration

    calls = {"n": 0}
    real = calibration.straighten_board

    def _killed(*a, **kw):
        calls["n"] += 1
        if calls["n"] > 1:
            raise KeyboardInterrupt("run killed mid-straighten")
        return real(*a, **kw)

    monkeypatch.setattr(calibration, "straighten_board", _killed)

    with pytest.raises(KeyboardInterrupt):
        sessions.write_boards_session("rg-rec")

    on_disk = [json.loads(line) for line in
               (sdir / "log.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    assert on_disk[0].get("board_straightened") is True, \
        "the board was pulled straight but the log does not say so — a rerun corrects it twice"
