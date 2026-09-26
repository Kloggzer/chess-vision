"""Eine Matte wird nicht zweimal geradegezogen, auch wenn ihr Brett neu geschnitten wird."""
from __future__ import annotations

import pytest

cv2 = pytest.importorskip("cv2")

from tests.test_store_straightening import (  # noqa: E402
    TILT,
    _drawn,
    _row,
    _session,
    line_spread,
)

from chesslab.realgames.boards import straighten_boards  # noqa: E402
from chesslab.session_store.names import MATTE_DIR  # noqa: E402
from conftest import make_profile, write_jsonl  # noqa: E402


def _matte(sdir, stem: str):
    return cv2.imread(str(sdir / MATTE_DIR / f"{stem}.webp"))


def test_a_matte_that_is_already_straight_survives_a_second_board_pass(tmp_path):
    rows = [_row(i, TILT) for i in (0, 3, 6)]
    stems = tuple(f"{i:06d}" for i in (0, 3, 6))
    sdir, _ = _session(tmp_path, rows, mattes=stems)

    # Erster Durchlauf: Brett UND Matte werden gezogen, beide liegen danach gerade.
    assert straighten_boards(sdir, rows)["mattes"] == len(stems)
    after_first = _matte(sdir, stems[0])
    assert line_spread(after_first) <= 2, "die Matte muss nach dem ersten Zug gerade sein"

    # Was `write_boards_session` tut: das Flag faellt, die BRETTER werden frisch (gebogen)
    # geschnitten — die Matten nicht, die bleiben gerade auf der Platte liegen.
    for row in rows:
        row.pop("board_straightened", None)
        cv2.imwrite(str(sdir / row["board"]), _drawn(TILT))

    straighten_boards(sdir, rows, mattes=False)

    after_second = _matte(sdir, stems[0])
    assert line_spread(after_second) <= 2, (
        f"die Matte wurde ein zweites Mal gezogen: Versatz {line_spread(after_second):.0f} px "
        f"gegen {line_spread(after_first):.0f} nach dem ersten Zug")


def test_the_first_pass_still_pulls_both(tmp_path):
    # Die Gegenprobe: wo Brett UND Matte gebogen sind, muessen weiterhin beide gezogen werden.
    rows = [_row(i, TILT) for i in (0, 3, 6)]
    stems = tuple(f"{i:06d}" for i in (0, 3, 6))
    sdir, board = _session(tmp_path, rows, mattes=stems)
    assert line_spread(board) > 15

    out = straighten_boards(sdir, rows)

    assert out["straightened"] == len(rows) and out["mattes"] == len(stems)
    assert line_spread(_matte(sdir, stems[0])) <= 2


def test_write_boards_session_asks_for_boards_only(tmp_path, monkeypatch):
    # Die Naht selbst, am echten Aufruf: der Schalter nuetzt nichts, solange der Aufrufer ihn
    # nicht setzt. Video und Frames fehlen hier, also schneidet ein Stellvertreter die Bretter.
    from chesslab import calibration, config, session_boards
    from chesslab.realgames import boards as rg_boards
    from chesslab.session_store.recording import game_dir

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    rows = [_row(i, TILT) for i in (0, 3)]
    for row in rows:
        row["corners"] = [[0, 0], [1, 0], [1, 1], [0, 1]]
    sdir = game_dir("rec")
    sdir.mkdir(parents=True)
    write_jsonl(sdir / "log.jsonl", rows)
    asked = []

    def spy(_sdir, _rows, **kwargs):
        asked.append(kwargs)
        return {"straightened": 0}

    def cut(job):
        return {"board": f"boards/{job[1][-10:-4]}.webp"}

    monkeypatch.setattr(session_boards, "missing_source_frames", lambda *_a: None)
    (sdir / "session.yaml").write_text("profile: t\n", encoding="utf-8")
    make_profile().save(calibration.profile_path("t"))
    monkeypatch.setattr(rg_boards, "board_from_frame", cut)
    monkeypatch.setattr(rg_boards, "straighten_boards", spy)

    out = session_boards.write_boards_session("rg-rec")

    assert out["written"] == len(rows)
    assert len(asked) == 1 and asked[0].get("mattes") is False, (
        "write_boards_session zieht die Matten ein zweites Mal")
