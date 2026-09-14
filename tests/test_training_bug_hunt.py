"""Red proofs for defects found in the unaudited training package."""

from __future__ import annotations

import random

import pytest

from chesslab.training.data import checkpoint_metrics, visible_board_items, visible_confidence
from chesslab.training.occlusion import CELL_DARK_MIN, PIECE_VISIBLE_MAX


class _WorkerRandomDataset:
    def __len__(self):
        return 4

    def __getitem__(self, index):
        return random.random()


def _row(*, coverage: float = 0.0, brightness: float = 255.0) -> dict:
    return {
        "session_id": "session",
        "frame": 1,
        "coverage": coverage,
        "brightness": brightness,
    }


def test_checkpoint_rank_is_invariant_when_every_cell_is_loss_masked():
    classes = ["empty", "wP"]
    rows = [_row(coverage=PIECE_VISIBLE_MAX + 0.01)]

    correct, _ = checkpoint_metrics(rows, classes, [1], [1])
    wrong, _ = checkpoint_metrics(rows, classes, [1], [0])

    assert correct == wrong, (
        "all cells are masked out of the classification loss, so their guesses must not move "
        "checkpoint selection"
    )


def test_confidence_scoring_uses_the_same_dark_and_coverage_mask_as_the_loss():
    rows = [
        _row(),
        _row(brightness=CELL_DARK_MIN - 1),
        _row(coverage=PIECE_VISIBLE_MAX + 0.01),
    ]

    got = visible_confidence(rows, [0, 1, 1], [0, 0, 0], [0.6, 0.99, 0.98])

    assert got == ([0], [0], [0.6]), (
        "confidence AUROC must exclude both dark and covered cells because OcclusionLoss learns "
        "classification on neither"
    )


def test_visible_board_accuracy_excludes_dark_cells_masked_by_the_loss():
    rows = [_row(), _row(brightness=CELL_DARK_MIN - 1)]

    items = visible_board_items(rows, [0, 0], [0, 1])

    assert len(items) == 1 and items[0][1] is True, (
        "a wrong guess on a dark cell excluded by OcclusionLoss must not spoil visible-board accuracy"
    )


def test_evaluate_dataset_scores_classification_only_where_the_loss_learns_it():
    torch = pytest.importorskip("torch")
    from torch.utils.data import Dataset

    from chesslab.training.engine import evaluate_dataset

    class Crops(Dataset):
        rows = [_row(), _row(coverage=PIECE_VISIBLE_MAX + 0.01)]

        def __len__(self):
            return 2

        def __getitem__(self, index):
            return torch.tensor([float(index)]), torch.tensor([0.0, self.rows[index]["coverage"]])

    class Model(torch.nn.Module):
        def forward(self, x):
            logits = torch.tensor([[5.0, 0.0, 0.0], [0.0, 5.0, 0.0]])
            return logits[x[:, 0].long()]

    result = evaluate_dataset(Model(), Crops(), "cpu", batch_size=2, num_workers=0)

    assert result["square_acc"] == 1.0 and result["conf_wrong"] == 0.0, (
        "classification accuracy and error confidence must ignore a covered mistake that the "
        "classification loss masks"
    )


def test_occlusion_validation_loss_does_not_depend_on_batch_partitioning():
    torch = pytest.importorskip("torch")
    from torch.utils.data import Dataset

    from chesslab.training.engine import evaluate_dataset
    from chesslab.training.occlusion import OcclusionLoss

    class Crops(Dataset):
        rows = [_row(), _row(), _row(coverage=1.0), _row(coverage=1.0)]

        def __len__(self):
            return 4

        def __getitem__(self, index):
            target = torch.tensor([0.0, 0.0 if index < 2 else 1.0, 255.0])
            return torch.tensor([float(index)]), target

    class Model(torch.nn.Module):
        def forward(self, x):
            index = x[:, 0].long()
            piece = torch.tensor([[10.0, 0.0], [0.0, 10.0], [0.0, 10.0], [0.0, 10.0]])
            return torch.cat((piece[index], torch.zeros(len(index), 1)), dim=1)

    criterion = OcclusionLoss(torch.ones(2), occ_weight=0.0)
    by_two = evaluate_dataset(Model(), Crops(), "cpu", criterion, batch_size=2, num_workers=0)
    by_four = evaluate_dataset(Model(), Crops(), "cpu", criterion, batch_size=4, num_workers=0)

    assert by_two["loss"] == pytest.approx(by_four["loss"]), (
        "validation loss must be a property of the examples, not of how visible and masked rows "
        "happen to be divided into batches"
    )


def test_occlusion_head_does_not_count_coverage_output_as_a_class():
    torch = pytest.importorskip("torch")
    from torch.utils.data import Dataset

    from chesslab.training.engine import evaluate_dataset

    class CorruptCrops(Dataset):
        rows = [_row()]

        def __len__(self):
            return 1

        def __getitem__(self, index):
            return torch.zeros(1), torch.tensor([2.0, 0.0])

    class TwoClassesPlusCoverage(torch.nn.Module):
        def forward(self, x):
            return torch.tensor([[1.0, 0.0, 0.0]]).repeat(len(x), 1)

    with pytest.raises(ValueError, match="2 outputs"):
        evaluate_dataset(TwoClassesPlusCoverage(), CorruptCrops(), "cpu", batch_size=1,
                         num_workers=0)


def test_batch_cutout_can_start_at_the_last_valid_row(monkeypatch):
    torch = pytest.importorskip("torch")
    from chesslab.training import batch_aug

    calls = 0

    def fixed_factors(n, lo, hi, device, dtype):
        nonlocal calls
        calls += 1
        value = 0.75 if calls == 1 else 1.0
        return torch.full((n, 1, 1, 1), value, device=device, dtype=dtype)

    monkeypatch.setattr(batch_aug, "_factors", fixed_factors)
    out = batch_aug._erase(torch.ones(2048, 1, 4, 4), p=1.0, scale=(0.75, 0.75))
    first_row_clear = out[:, :, 0, :].bool().all(dim=(1, 2))
    last_row_touched = ~out[:, :, -1, :].bool().all(dim=(1, 2))
    starts_on_last_valid_row = first_row_clear & last_row_touched

    assert starts_on_last_valid_row.any(), (
        "cutout samples [0, H-height) instead of [0, H-height], so the final legal vertical "
        "placement is unreachable"
    )


def test_saved_main_rng_state_is_not_enough_to_resume_persistent_worker_augmentation():
    torch = pytest.importorskip("torch")
    from torch.utils.data import DataLoader

    torch.manual_seed(42)
    loader = DataLoader(_WorkerRandomDataset(), batch_size=None, num_workers=1,
                        persistent_workers=True)
    list(loader)
    saved_main_rng = torch.get_rng_state()
    uninterrupted_next_epoch = [float(value) for value in loader]
    loader._iterator._shutdown_workers()

    torch.set_rng_state(saved_main_rng)
    resumed = DataLoader(_WorkerRandomDataset(), batch_size=None, num_workers=1,
                         persistent_workers=True)
    resumed_next_epoch = [float(value) for value in resumed]
    resumed._iterator._shutdown_workers()

    assert resumed_next_epoch == uninterrupted_next_epoch, (
        "state.pt saves only the main-process RNG; recreated DataLoader workers restart from a "
        "new seed instead of continuing their saved augmentation streams"
    )
