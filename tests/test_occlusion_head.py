"""The occlusion output must not compete with the pieces, and must not be trained on their crops.

`docs/occluder-plates.md` has the measurement that forced it: as a 14th class it cost `empty`
recall 0.908 instead of 0.989 and roughly halved both kings.
"""

import pytest

torch = pytest.importorskip("torch")

from chesslab.training.occlusion import (  # noqa: E402
    OcclusionLoss,
    coverage_metrics,
    split_targets,
)

CLASSES = 3


def _logits(piece, occ):
    return torch.tensor([piece + [occ]], dtype=torch.float32)


def _target(cls, cov):
    return torch.tensor([[float(cls), float(cov)]])


def test_a_covered_crop_does_not_train_the_piece_head():
    """Past the visibility cut the pixels are gone — a piece loss there teaches noise."""
    loss = OcclusionLoss(torch.ones(CLASSES), occ_weight=0.0)

    wrong_but_covered = loss(_logits([9.0, -9.0, -9.0], 0.0), _target(1, 0.9))

    assert float(wrong_but_covered) == pytest.approx(0.0, abs=1e-6)


def test_a_visible_crop_still_trains_the_piece_head():
    loss = OcclusionLoss(torch.ones(CLASSES), occ_weight=0.0)

    wrong = loss(_logits([9.0, -9.0, -9.0], 0.0), _target(1, 0.0))

    assert float(wrong) > 1.0


def test_coverage_is_regressed_against_its_fraction_not_a_yes_no():
    """A calibrated output is what makes the tracker's veto a dial instead of a retrain."""
    loss = OcclusionLoss(torch.ones(CLASSES), occ_weight=1.0)
    near = torch.logit(torch.tensor(0.9)).item()

    exact = loss(_logits([0.0, 0.0, 0.0], near), _target(0, 0.9))
    binary = loss(_logits([0.0, 0.0, 0.0], 9.0), _target(0, 0.9))

    assert float(exact) < float(binary), "0.9 beats a confident 'yes' — the output is a fraction"


def test_the_two_targets_travel_in_one_tensor():
    """The training loop stays `for x, y in loader` — that is why they share a tensor."""
    y, cov = split_targets(_target(2, 0.25))

    assert (int(y), float(cov)) == (2, 0.25)
    assert y.dtype == torch.long


def test_metrics_read_the_last_logit_only():
    m = coverage_metrics(_logits([5.0, 0.0, 0.0], 9.0), _target(0, 1.0))

    assert m["occ_recall"] == 1.0
    assert m["occ_mae"] < 0.01
