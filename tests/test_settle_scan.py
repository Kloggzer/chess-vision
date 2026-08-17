"""The settle score: a cell that stops matching its own interval's settled board."""

import numpy as np

from chesslab.realgames import SETTLE_CELL_PX, cell_deviations


def _interval(frames: int = 7, cells: int = 64, shade: int = 90) -> np.ndarray:
    """A board that never changes — every cell the same flat shade in every frame."""
    px = SETTLE_CELL_PX
    return np.full((frames, cells, px, px, 3), shade, np.uint8)


def test_a_still_interval_scores_zero():
    """The median IS the interval when nothing moves, so nothing may look suspicious."""
    stack = _interval()

    dev = cell_deviations(stack, np.median(stack.astype(np.int16), axis=0))

    assert dev.shape == (7, 64)
    assert dev.max() == 0.0


def test_only_the_covered_cell_and_only_while_it_is_covered():
    """A hand over one square in two of seven frames: those two entries move, nothing else does.

    This is the whole point of the median — the covered frames are the MINORITY, so they cannot
    drag the reference towards themselves and hide.
    """
    stack = _interval()
    stack[2:4, 27] = 200                      # e4 covered in frames 2 and 3

    dev = cell_deviations(stack, np.median(stack.astype(np.int16), axis=0))

    assert dev[2, 27] == 110.0 and dev[3, 27] == 110.0
    assert dev[np.arange(7) != 2, 27][np.arange(6) != 2].max() == 0.0, "the other frames of that cell"
    assert dev[:, np.arange(64) != 27].max() == 0.0, "every other cell"


def test_the_majority_becomes_the_reference():
    """The documented limit: a hand lying over the WHOLE interval is the settled board, and the
    clean frames are the deviation. `dirty`'s commit window is what covers that case."""
    stack = _interval()
    stack[:5, 27] = 200                       # covered in 5 of 7 — now the majority

    dev = cell_deviations(stack, np.median(stack.astype(np.int16), axis=0))

    assert dev[0, 27] == 0.0, "the covered frames now look normal"
    assert dev[5, 27] == 110.0, "and the clean ones look wrong"


def test_a_gradual_change_is_caught_at_its_own_size():
    """Not every departure is a hand: a piece half-placed shifts fewer pixels, and the score has
    to report THAT rather than a verdict — the threshold is set from the distribution, not here."""
    stack = _interval()
    stack[3, 27, :8] = 200                    # a quarter of the cell, one frame

    dev = cell_deviations(stack, np.median(stack.astype(np.int16), axis=0))

    assert 25.0 < dev[3, 27] < 30.0, dev[3, 27]
