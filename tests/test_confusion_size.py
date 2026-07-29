"""The confusion matrix is sized by the model, and a stray label is named, not allocated."""
import pytest
import torch
from torch.utils.data import Dataset

from chesslab.training import engine


class _DS(Dataset):
    def __init__(self, labels):
        self.labels = labels
        self.rows = [{"session_id": "s", "frame": "f", "path": f"p{i}"}
                     for i in range(len(labels))]

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, i):
        return torch.zeros(3, 8, 8), int(self.labels[i])


class _Model(torch.nn.Module):
    def __init__(self, n_out):
        super().__init__()
        self.n_out = n_out

    def forward(self, x):
        return torch.zeros(x.shape[0], self.n_out)


def test_matrix_is_sized_by_the_model_not_the_labels():
    res = engine.evaluate_dataset(_Model(2), _DS([0, 1, 1, 0]), "cpu", batch_size=2, num_workers=0)
    assert res["macro_recall"] >= 0.0


def test_a_label_outside_the_head_is_named():
    with pytest.raises(ValueError, match="outside the model's 2 outputs"):
        engine.evaluate_dataset(_Model(2), _DS([0, 999_999]), "cpu", batch_size=2, num_workers=0)


def test_the_message_lists_the_offending_values():
    with pytest.raises(ValueError, match=r"\[7\]"):
        engine.evaluate_dataset(_Model(2), _DS([0, 7]), "cpu", batch_size=2, num_workers=0)
