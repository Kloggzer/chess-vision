"""QA 2026-09-25, Python-Kern: Frische ohne Brett-Stempel verlangt, dass kein Brett neu ist, waehrend das Log alt ist."""
from __future__ import annotations

import numpy as np
import pytest

from chesslab import config, labeling, session_boards
from chesslab.realgames import boards as rg_boards
from chesslab.session_store.log import export_interrupted
from conftest import make_profile, write_jsonl

BS, BORDER = 64, 4


def test_write_boards_killed_while_cutting_leaves_the_marker(tmp_path, monkeypatch):
    """Das Log sagt `board_straightened`, auf der Platte liegt ein frisch gebogenes Brett: ohne Marker
    liest jeder Folgeschritt (und `provenance.check`, das Bretter nicht mehr stat-et) das als frisch."""
    import cv2

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    sdir = config.DATA.recordings / "rec"
    (sdir / "frames").mkdir(parents=True)
    (sdir / "boards").mkdir(parents=True)
    corners = [[0.0, 0.0], [float(BS), 0.0], [float(BS), float(BS)], [0.0, float(BS)]]
    rows = [{"frame": f"frames/{i:06d}.png", "corners": corners, "board": f"boards/{i:06d}.webp",
             "board_size": BS, "board_border": BORDER, "board_straightened": True} for i in range(3)]
    for row in rows:
        cv2.imwrite(str(sdir / row["frame"]), np.zeros((BS, BS, 3), np.uint8))
    (sdir / "session.yaml").write_text("session_id: rg-rec\nprofile: t\n", encoding="utf-8")
    write_jsonl(sdir / "log.jsonl", rows)
    monkeypatch.setattr(session_boards, "session_dir", lambda sid, paths=None: (sdir, False))
    monkeypatch.setattr(labeling, "_profile_for_session",
                        lambda meta, name: make_profile(BS, corners=corners, profile="t",
                                                        camera_index=-1, source="test"))
    real, calls = rg_boards.write_board, []

    def killed(*a, **kw):
        calls.append(1)
        if len(calls) > 1:
            raise KeyboardInterrupt("run killed while cutting boards")
        return real(*a, **kw)

    monkeypatch.setattr(rg_boards, "write_board", killed)
    with pytest.raises(KeyboardInterrupt):
        session_boards.write_boards_session("rg-rec")
    assert (sdir / "boards" / "000000.webp").is_file(), "das erste Brett ist neu geschnitten"
    assert export_interrupted(sdir), "Bretter neu, Log alt — und kein Marker haelt die Folgeschritte an"
