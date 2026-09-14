"""`board_acc` und `visible_board_acc` sind in `evaluate_dataset` dieselbe Rechnung.

Beide entstehen aus `items`, und `items` ist schon durch `eligible` gefiltert — die HARTE Zahl
ueber alle Zellen wird nirgends mehr gebildet. Gemeldet wird sie trotzdem, als Kopfzahl in
`evaluate.run_eval` und in der `model_card.json`.
"""
from __future__ import annotations

import pytest

ROWS = [
    {"session_id": "s", "frame": "1", "square": "a1", "label": "empty", "coverage": 0.0},
    {"session_id": "s", "frame": "1", "square": "a2", "label": "wP", "coverage": 1.0},
]


@pytest.fixture
def board():
    torch = pytest.importorskip("torch")

    class OneBoard(torch.utils.data.Dataset):
        rows = ROWS
        c2i = {"empty": 0, "wP": 1}

        def __len__(self):
            return len(ROWS)

        def __getitem__(self, i):
            row = ROWS[i]
            target = torch.tensor([self.c2i[row["label"]], row["coverage"]], dtype=torch.float32)
            return torch.zeros(3, 8, 8), target

    class AlwaysEmpty(torch.nn.Module):
        """Says `empty` on both cells — right on the visible one, wrong on the covered one."""

        def forward(self, x):
            out = torch.zeros(x.shape[0], 3)
            out[:, 0] = 5.0
            out[:, 2] = 5.0
            return out

    return OneBoard(), AlwaysEmpty()


def test_board_acc_is_the_hard_number_over_every_cell(board):
    from chesslab.training.engine import evaluate_dataset

    dataset, model = board
    res = evaluate_dataset(model, dataset, "cpu", num_workers=0, keep_workers=False)

    assert res["visible_board_acc"] == 1.0, "the visible cell was read correctly"
    assert res["board_acc"] == 0.0, (
        "one of the board's two cells is misread, so the hard board accuracy is 0 — "
        f"got {res['board_acc']}, the same value as visible_board_acc")
