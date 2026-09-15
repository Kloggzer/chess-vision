"""Eine Matte darf nicht zweimal geradegezogen werden — auch nicht, wenn ihr Brett es wird.

`straighten_boards` haengt seinen Riegel an `board_straightened` der LOG-ZEILE. `write_boards_session`
poppt genau den und schneidet die Bretter frisch (also wieder gebogen) aus den Frames — das Brett
gehoert dann gezogen. Die Matte daneben wurde beim vorigen Lauf schon gezogen und liegt gerade auf
der Platte; sie wird trotzdem ein zweites Mal korrigiert. CLAUDE.md fuehrt "Never straighten a
second time" als harte Regel, und `straighten_boards` sagt im eigenen Docstring: "a twice-corrected
one is neither".
"""
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

from chesslab.realgames import MATTE_DIR, straighten_boards  # noqa: E402


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


def test_write_boards_session_asks_for_boards_only():
    # Die Naht selbst: der Schalter nuetzt nichts, solange der Aufrufer ihn nicht setzt. Ein
    # echter Durchlauf braucht Video und Frames, die diese Session per Konstruktion nicht hat.
    import inspect

    from chesslab.sessions import write_boards_session

    src = inspect.getsource(write_boards_session)
    assert "mattes=False" in src, "write_boards_session zieht die Matten ein zweites Mal"
