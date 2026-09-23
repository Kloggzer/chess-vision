"""Die Klassengewichte zaehlen ueber DIESELBE Zellmenge wie `OcclusionLoss`."""

from __future__ import annotations

import torch

from chesslab.training.occlusion import CELL_DARK_MIN, PIECE_VISIBLE_MAX, OcclusionLoss
from chesslab.training.train_recipe import visible_class_counts

CLASSES = ["empty", "wP", "bP"]


def _row(label: str, coverage: float, brightness: float | None) -> dict:
    return {"label": label, "coverage": coverage, "brightness": brightness}


def _loss_weights(rows: list[dict]) -> dict[str, int]:
    """Was der Verlust je Klasse wirklich gewichtet — gefragt, nicht nachgebaut."""
    loss = OcclusionLoss(torch.ones(len(CLASSES)))
    counts: dict[str, int] = {}
    for label in {r["label"] for r in rows}:
        same = [r for r in rows if r["label"] == label]
        target = torch.tensor([[float(CLASSES.index(label)), r["coverage"],
                                255.0 if r["brightness"] is None else r["brightness"]]
                               for r in same])
        logits = torch.zeros(len(same), len(CLASSES) + 1)
        n = int(loss.validation_terms(logits, target)[1].item())
        if n:
            counts[label] = n
    return counts


ROWS = [
    _row("bP", 0.0, CELL_DARK_MIN - 1.0),
    _row("bP", 0.0, CELL_DARK_MIN + 1.0),
    _row("wP", 0.0, 200.0),
    _row("wP", PIECE_VISIBLE_MAX + 0.1, 200.0),
    _row("empty", 0.0, None),
]


def test_weights_count_the_cells_the_loss_weights() -> None:
    assert visible_class_counts(ROWS) == _loss_weights(ROWS)


def test_a_dark_cell_does_not_raise_its_class_weight() -> None:
    # Der eigentliche Schaden: eine dunkle Zelle zaehlte als Beleg fuer eine haeufige Klasse
    # und drueckte deren Gewicht, obwohl der Verlust sie nie sieht.
    assert visible_class_counts(ROWS)["bP"] == 1


def test_unmeasured_brightness_still_counts() -> None:
    # `None` ist UNGEMESSEN, nicht dunkel — alte Packs ohne die Spalte rechnen unveraendert.
    assert visible_class_counts([_row("empty", 0.0, None)]) == {"empty": 1}
