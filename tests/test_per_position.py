"""Boards per POSITION, not per second — the rig records every 0.1 s while the board stands still.

Measured over the corpus: 246 positions across 9 386 boards, so 38 near-identical takes each.
Keeping 16 per position beat all of them on macro recall (0.79 vs 0.71), see `docs/sampling.md`.
"""

from chesslab.dataset_build import keep_per_position

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
AFTER = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"


def _rows(session, fen, frames, squares=("a1", "e4")):
    return [{"session_id": session, "fen": fen, "frame": f, "square": s}
            for f in frames for s in squares]


def test_every_position_keeps_its_budget():
    """A long think and a fast move end up with the same number of boards."""
    rows = _rows("s1", START, [f"{i:06d}" for i in range(100)])
    rows += _rows("s1", AFTER, ["000200", "000201"])

    kept = keep_per_position(rows, 4)

    assert {r["frame"] for r in kept if r["fen"] == AFTER} == {"000200", "000201"}
    assert len({r["frame"] for r in kept if r["fen"] == START}) == 4


def test_the_budget_spans_the_interval():
    """First and last, so a light change across the position is inside the sample."""
    rows = _rows("s1", START, [f"{i:06d}" for i in range(10)])

    frames = sorted({r["frame"] for r in keep_per_position(rows, 3)})

    assert frames == ["000000", "000004", "000009"]


def test_whole_boards_survive():
    """Frames, never single crops: a half board would break `board_accuracy`."""
    rows = _rows("s1", START, ["000000", "000001"], squares=("a1", "b2", "c3"))

    kept = keep_per_position(rows, 1)

    assert len(kept) == 3, "all three squares of the one kept frame"


def test_sessions_do_not_share_a_budget():
    """The same position in two sessions is two situations — different light, different rig."""
    rows = _rows("s1", START, ["000000", "000001"]) + _rows("s2", START, ["000000", "000001"])

    kept = keep_per_position(rows, 1)

    assert {r["session_id"] for r in kept} == {"s1", "s2"}
