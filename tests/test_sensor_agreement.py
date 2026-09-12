"""Regression checks for the audit's missing-evidence and temporal semantics."""

import numpy as np
import pytest

from chesslab.sensor_audit import measured_deviation, peer_reference, temporal_residual


@pytest.mark.parametrize("dev,seen,status", [
    (0, 0, "unseen"), (9, .49, "unseen"), (0, None, "missing"),
    (None, 1, "missing"), (float("nan"), 1, "invalid"), (2, 1.1, "invalid"),
])
def test_unmeasured_cells_do_not_enter_the_distribution(dev, seen, status):
    assert measured_deviation(dev, seen) == (None, status)


def test_real_zero_and_boundary_visibility_are_preserved():
    assert measured_deviation(0, 1) == (0., "measured")
    assert measured_deviation(12, .5) == (12., "measured")
    assert measured_deviation(0, 0, seen_min=0) == (None, "unseen")


def test_scored_frame_cannot_supply_its_own_reference():
    stack = np.zeros((6, 1, 8, 8, 3), np.float32)
    stack[0] = 200
    assert np.all(peer_reference(stack, 0) == 0)
    assert peer_reference(stack[:5], 0) is None


def test_dirty_majority_does_not_contaminate_the_selected_reference():
    stack = np.zeros((20, 1, 8, 8, 3), np.float32)
    stack[5:] = 200
    eligible = [i < 5 for i in range(20)]
    assert np.all(peer_reference(stack, 7, eligible=eligible) == 0)
    assert peer_reference(stack, 0, eligible=eligible) is None
    assert eligible[0] is True  # The caller's selection is not mutated.


def test_unmasked_sensor_sees_structure_but_rejects_uniform_brightness_shift():
    ref = np.full((2, 8, 8, 3), 40, np.float32)
    current = ref.copy()
    current[0] += 25
    current[1, :4] += 100
    raw, normalized = temporal_residual(current, ref)
    assert raw[0] == 0
    assert raw[1] > 0
    assert np.isfinite(normalized).all()


def test_temporal_majority_occlusion_is_an_explicit_limitation():
    stack = np.full((6, 1, 8, 8, 3), 40, np.float32)
    stack[:, :, :4] += 100
    raw, _ = temporal_residual(stack[0], peer_reference(stack, 0))
    assert raw[0] == 0  # No clean view exists: a temporal sensor cannot invent one.
