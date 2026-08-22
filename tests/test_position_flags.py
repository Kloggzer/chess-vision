"""Die strittigen Zellen: was die Stellungs-Lane vorlegt, und was sie bewusst NICHT vorlegt."""

import numpy as np

from chesslab.labeling import MATTE_DIRTY, SETTLE_LIMIT, all_squares
from chesslab.position_flags import frame_flags
from chesslab.realgames import SETTLE_CELL_PX, interval_moves

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
E4 = all_squares().index("e4")
A2 = all_squares().index("a2")


def _entry(left=(), dev=None, seen=None, **kw) -> dict:
    """Eine Log-Zeile, wie `session settle-scan` sie schreibt: Messung PLUS Urteil."""
    row = {"frame": "frames/000007.png", "fen": START, "ply": 3,
           "settle_dev": dev if dev is not None else [0.0] * 64,
           "settle_seen": seen if seen is not None else [1.0] * 64,
           "settle_left": list(left)}
    return row | kw


def _dev(square: int, value: float) -> list[float]:
    out = [0.0] * 64
    out[square] = value
    return out


def test_a_visible_cell_that_left_its_position_is_the_card():
    """Der laufende Bauer: a2 ist leer, a3 hält ihn — beide Felder sind sichtbar und weichen ab."""
    flags = frame_flags(_entry(left=["a2"], dev=_dev(A2, SETTLE_LIMIT + 10)), {"a2": 0.0}, "rg-x")

    assert [f["square"] for f in flags] == ["a2"]
    assert flags[0]["reason"] == "changed"
    assert flags[0]["fen_label"] == "wP"
    assert flags[0]["frame"] == "000007"


def test_a_covered_cell_is_never_asked():
    """Unter der Hand nimmt die Coverage die Zelle aus dem Loss — da ist nichts zu benennen.

    `departures` nimmt sie schon aus `settle_left`; hier steht die Zeile deshalb ohne Urteil da,
    obwohl die Abweichung riesig ist.
    """
    flags = frame_flags(_entry(dev=_dev(E4, SETTLE_LIMIT + 10)), {"e4": MATTE_DIRTY + 0.1}, "rg-x")

    assert flags == []


def test_a_cell_the_alpha_barely_saw_is_asked_as_unreadable():
    """Halb verdeckt heißt weder vergleichbar noch vom Loss ausgenommen — genau die Lücke."""
    seen = [1.0] * 64
    seen[E4] = 0.2

    flags = frame_flags(_entry(left=["e4"], seen=seen), {"e4": 0.1}, "rg-x")

    assert [(f["square"], f["reason"]) for f in flags] == [("e4", "unreadable")]


def test_without_a_verdict_nothing_is_strittig():
    """Ungemessen ist nicht unstrittig: ohne `settle_left` gelten die alten Frame-Tore."""
    assert frame_flags(_entry(dev=[], seen=[]), {"e4": 0.0}, "rg-x") == []
    assert frame_flags(_entry(dev=_dev(E4, 99.0)), {"e4": 0.0}, "rg-x") == []


def test_a_square_the_exporter_already_doubts_is_not_asked_twice():
    """`unknown_squares` hat seine eigene Lane; zwei Karten für dieselbe Zelle sind eine zu viel."""
    entry = _entry(left=["e4"], dev=_dev(E4, SETTLE_LIMIT + 10), unknown_squares=["e4"])

    assert frame_flags(entry, {"e4": 0.0}, "rg-x") == []


def _ref(shade: int = 90) -> np.ndarray:
    return np.full((64, SETTLE_CELL_PX, SETTLE_CELL_PX, 3), shade, np.uint8)


def test_the_commit_window_proves_itself_on_the_squares_the_move_touched():
    """Ein Commit an der falschen Stelle hängt einen FEN an Pixel, die ihn nie gezeigt haben —
    und danach stimmt jedes Frame des Intervalls mit einer Referenz überein, die schon falsch ist."""
    after = _ref()
    after[all_squares().index("e2"), :SETTLE_CELL_PX // 2] = 220
    fens = {1: START, 2: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"}

    seen = interval_moves({1: _ref(), 2: after}, fens)
    blind = interval_moves({1: _ref(), 2: _ref()}, fens)

    assert [(c["ply"], c["seen"]) for c in seen] == [(2, True)]
    assert seen[0]["moved"] == ["e2", "e4"]
    assert [(c["ply"], c["seen"]) for c in blind] == [(2, False)]
