"""The Python mirror of GridOcclusion.kt, pinned to the same synthetic-board behaviour
as `GridOcclusionTest.kt` — clean grid clean, erased block flagged, POV flip, adjacency rule."""

import numpy as np
import pytest

from chesslab.grid_occlusion import hand_squares, missing_edges

SIDE = 320
PAD = 12
CELL = SIDE // 8
GROOVE = 3  # 3 px wide, like the Kotlin test: the notch centroid refuses a run under 3 samples.


def synthetic_grid() -> np.ndarray:
    """White padded canvas with all 9 black grid lines per axis."""
    img = np.full((SIDE + 2 * PAD, SIDE + 2 * PAD), 255.0, dtype=np.float32)
    for i in range(9):
        p = PAD + i * CELL
        img[:, p - 1 : p + GROOVE - 1] = 0.0
        img[p - 1 : p + GROOVE - 1, :] = 0.0
    return img


def erased(img: np.ndarray) -> np.ndarray:
    """The lines wiped under a 2x2-cell "hand" at warp cells g2..h3 (white POV)."""
    out = img.copy()
    rub = 4
    out[PAD + 5 * CELL - rub : PAD + 7 * CELL + rub, PAD + 6 * CELL - rub : PAD + 8 * CELL + rub] = 255.0
    return out


def test_clean_grid_flags_nothing():
    assert missing_edges(synthetic_grid(), SIDE, PAD) == {}


def test_erased_block_reads_as_the_squares_under_it():
    edges = missing_edges(erased(synthetic_grid()), SIDE, PAD)
    assert {sq for sq, n in edges.items() if n >= 2} == {"g2", "g3", "h2", "h3"}
    assert hand_squares(edges) == {"g2", "g3", "h2", "h3"}


def test_flipped_board_names_the_mirror_squares():
    edges = missing_edges(erased(synthetic_grid()), SIDE, PAD, white_pov=False)
    assert {sq for sq, n in edges.items() if n >= 2} == {"a6", "a7", "b6", "b7"}


@pytest.mark.parametrize(
    ("edges", "want"),
    [
        ({"c8": 4}, set()),  # the 222741 lesson: a lone leaning piece is not a hand
        ({"c8": 4, "f2": 2}, set()),  # nor is it plus scattered noise
        ({"h3": 2, "h2": 2}, {"h3", "h2"}),  # the leaving hand's tail — always neighbours
        ({"c8": 4, "h3": 2, "h2": 2}, {"c8", "h3", "h2"}),  # a pair admits the whole flag set
    ],
)
def test_hand_needs_an_adjacent_pair(edges, want):
    assert hand_squares(edges) == want
