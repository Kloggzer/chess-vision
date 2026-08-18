"""The occluder matte: what counts as an object over the backdrop, and what is only light."""

import numpy as np

from chesslab import occluders

STAGE = (300, 400)
BACKDROP = (110, 70, 45)  # BGR: the blue-grey desk mat the clips were shot over


def _plate() -> occluders.Plate:
    median = np.full((*STAGE, 3), BACKDROP, np.uint8)
    stage = np.zeros(STAGE, np.uint8)
    stage[20:-20, 20:-20] = 255
    return occluders.Plate(median=median, stage=stage, chroma_cut=0.10)


def _frame() -> np.ndarray:
    return np.full((*STAGE, 3), BACKDROP, np.uint8)


def test_a_hand_over_the_stage_is_kept():
    frame = _frame()
    frame[100:220, 120:300] = (60, 120, 200)  # skin: the colour direction moves, not just the level
    assert (occluders.alpha_of(frame, _plate()) > 0.5).sum() > 5000


def test_more_light_on_part_of_the_backdrop_is_still_the_backdrop():
    """A lamp swept the mat late in 230602 and the brightness branch kept it — 88 % of one plate
    was backdrop, on a frame holding no hand at all. Only PART of the stage brightens, so the
    global `rebalance` cannot cancel it; the colour direction is the half that stays put."""
    frame = _frame().astype(np.float32)
    frame[:, 200:] *= 1.8
    assert (occluders.alpha_of(np.clip(frame, 0, 255).astype(np.uint8), _plate()) > 0.5).sum() == 0


def test_novelty_compares_reduced_silhouettes():
    """The pose survives the reduction: the same alpha is a duplicate, a shifted one is not."""
    a = np.zeros((1080, 1920), np.float32)
    a[300:800, 500:1100] = 1.0
    b = np.roll(a, 500, axis=1)
    assert not occluders.is_novel(occluders.silhouette(a), [occluders.silhouette(a)], 0.85)
    assert occluders.is_novel(occluders.silhouette(b), [occluders.silhouette(a)], 0.85)
