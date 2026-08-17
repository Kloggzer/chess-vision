"""The occlusion output: a coverage estimate beside the piece classes, not inside them.

Why a second output and not a 14th class, with the measurement that forced it:
`docs/occluder-plates.md`.
"""

from __future__ import annotations

import torch
from torch import nn

#: Above this coverage a crop stops being a piece example — measured, piece accuracy on occupied
#: cells falls 0.62 -> 0.41 between 0.10 and 0.20. It still trains the occlusion output.
PIECE_VISIBLE_MAX = 0.15


def split_targets(target: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
    """`(B, 2)` float target -> (class index, coverage). One tensor, so the loop stays `(x, y)`."""
    return target[:, 0].long(), target[:, 1]


class OcclusionLoss(nn.Module):
    """Weighted CE over the pieces plus BCE over the coverage, from ONE (B, C+1) output.

    Regressed against the FRACTION, not a yes/no: the composite knows it exactly, and a calibrated
    output makes the tracker's veto a threshold you can turn without retraining.
    """

    def __init__(self, class_weights: torch.Tensor, occ_weight: float = 1.0,
                 visible_max: float = PIECE_VISIBLE_MAX) -> None:
        super().__init__()
        self.ce = nn.CrossEntropyLoss(weight=class_weights, reduction="none")
        self.bce = nn.BCEWithLogitsLoss()
        self.occ_weight = occ_weight
        self.visible_max = visible_max

    def forward(self, logits: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        y, cov = split_targets(target)
        visible = cov <= self.visible_max
        piece = self.ce(logits[:, :-1], y)
        piece = (piece * visible).sum() / visible.sum().clamp(min=1)
        return piece + self.occ_weight * self.bce(logits[:, -1], cov)


def coverage_metrics(logits: torch.Tensor, target: torch.Tensor,
                     threshold: float = 0.5) -> dict[str, float]:
    """How well the coverage output tracks the truth: mean error, plus recall/precision at a cut."""
    _, cov = split_targets(target)
    pred = torch.sigmoid(logits[:, -1])
    hit, want = pred > threshold, cov > threshold
    tp = float((hit & want).sum())
    return {"occ_mae": float((pred - cov).abs().mean()),
            "occ_recall": tp / max(1.0, float(want.sum())),
            "occ_precision": tp / max(1.0, float(hit.sum()))}
