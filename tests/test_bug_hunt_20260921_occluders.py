"""Verdeckte Zellen gehoeren nicht auf die Strittig-Lane — gemessen 2026-09-21.

`docs/position-check.md` nennt vier Urteile: ueber `MATTE_DIRTY` ist eine Zelle VERDECKT, behaelt
ihr FEN-Label und ist keine Karte. `timing_flags` und `temporal_flags.candidate_flags` filtern das;
`frame_flags` verliess sich auf `departures(covered_max=...)` und filterte selbst nicht.
"""

from chesslab.labeling import MATTE_DIRTY, SETTLE_LIMIT, all_squares
from chesslab.position_flags import frame_flags

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
E4 = all_squares().index("e4")


def _entry(left=(), dev=None, seen=None, **kw) -> dict:
    row = {"frame": "frames/000007.png", "fen": START, "ply": 3,
           "settle_dev": dev if dev is not None else [0.0] * 64,
           "settle_seen": seen if seen is not None else [1.0] * 64,
           "settle_left": list(left)}
    return row | kw


def _dev(square: int, value: float) -> list[float]:
    out = [0.0] * 64
    out[square] = value
    return out


def test_a_cell_the_matte_calls_covered_is_no_card_even_when_it_left():
    """Die Matte ist juenger als `settle_left`: ein Re-Matten oder `recut-coverage` hebt eine Zelle
    ueber die Schwelle, `settle_left` steht. Gemessen auf `data/reports/position-flags.jsonl`
    (Lauf vom 2026-09-19): 4 335 von 4 678 `changed`-Karten trugen `matte_cov` > 0,15.
    """
    entry = _entry(left=["e4"], dev=_dev(E4, SETTLE_LIMIT + 10))

    assert frame_flags(entry, {"e4": MATTE_DIRTY + 0.1}, "rg-x") == []


def test_a_covered_cell_is_no_card_even_when_it_was_never_readable():
    """Auch der `unreadable`-Zweig: was der Verlust maskiert, hat der Mensch nicht zu benennen."""
    seen = [1.0] * 64
    seen[E4] = 0.2

    assert frame_flags(_entry(left=["e4"], seen=seen), {"e4": 0.9}, "rg-x") == []


def test_unmeasured_coverage_still_asks():
    """`None` heisst UNGEMESSEN, nicht sichtbar und nicht verdeckt — die Karte bleibt."""
    entry = _entry(left=["e4"], dev=_dev(E4, SETTLE_LIMIT + 10))

    assert [f["square"] for f in frame_flags(entry, None, "rg-x")] == ["e4"]
    assert [f["square"] for f in frame_flags(entry, {}, "rg-x")] == ["e4"]
