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

#: Darunter traegt die Zelle kein Signal mehr — das LABEL bleibt richtig (es kommt aus dem
#: Spielzustand), nur das Pixel ist nicht lesbar: a5 auf 20-41-33 liegt bei 20 von 255 und stellt
#: 38 von 58 Val-Fehlern. Am Bild gewaehlt (2026-09-09), ab 30-40 zeigen die Zellen wieder Details.
#: Wirksam erst mit einem Slice, der `brightness` schreibt — ohne die Spalte gilt jede Zelle als
#: hell, alte Packs rechnen also unveraendert weiter.
CELL_DARK_MIN = 25.0


def classification_eligible(row: dict, visible_max: float = PIECE_VISIBLE_MAX,
                            dark_min: float = CELL_DARK_MIN) -> bool:
    # `None` ist UNGEMESSEN, nicht dunkel — dieselbe Regel wie `capture_plan.band_of`. Der
    # alte `or 0.0` warf jede Zeile mit ausgeschriebenem `null` aus jeder Klassenmetrik.
    bright = row.get("brightness")
    return (float(row.get("coverage") or 0.0) <= visible_max
            and (255.0 if bright is None else float(bright)) >= dark_min)


def split_targets(target: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """`(B, 2|3)` float target -> (class index, coverage, Helligkeit).

    Zwei Spalten sind ein Datensatz ohne `brightness`: jede Zelle gilt dann als hell, damit alte
    Packs Zahl fuer Zahl dasselbe ergeben.
    """
    bright = target[:, 2] if target.shape[1] > 2 else torch.full_like(target[:, 1], 255.0)
    return target[:, 0].long(), target[:, 1], bright


class OcclusionLoss(nn.Module):
    """Weighted CE over the pieces plus BCE over the coverage, from ONE (B, C+1) output.

    Regressed against the FRACTION, not a yes/no: the composite knows it exactly, and a calibrated
    output makes the tracker's veto a threshold you can turn without retraining.
    """

    def __init__(self, class_weights: torch.Tensor, occ_weight: float = 1.0,
                 visible_max: float = PIECE_VISIBLE_MAX,
                 label_smoothing: float = 0.0, dark_min: float = CELL_DARK_MIN) -> None:
        super().__init__()
        self.ce = nn.CrossEntropyLoss(weight=class_weights, reduction="none",
                                      label_smoothing=label_smoothing)
        self.occ_weight = occ_weight
        self.visible_max = visible_max
        self.dark_min = dark_min

    def forward(self, logits: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        piece_sum, visible_count, coverage_sum, coverage_count = self.validation_terms(logits, target)
        piece = piece_sum / visible_count.clamp(min=1)
        coverage = coverage_sum / max(coverage_count, 1)
        return piece + self.occ_weight * coverage

    def validation_terms(self, logits: torch.Tensor, target: torch.Tensor):
        y, cov, bright = split_targets(target)
        # Zwei Gruende, dieselbe Zelle aus dem KLASSENteil zu nehmen — verdeckt oder zu dunkel.
        # Der Coverage-Kopf lernt weiter auf allen: Dunkelheit ist keine Verdeckung, und die
        # Hand-Sperre der App haengt an dieser Zahl.
        visible = (cov <= self.visible_max) & (bright >= self.dark_min)
        piece = self.ce(logits[:, :-1], y)
        coverage = torch.nn.functional.binary_cross_entropy_with_logits(
            logits[:, -1], cov, reduction="sum")
        return (piece * visible).sum(), visible.sum(), coverage, cov.numel()


def coverage_metrics(logits: torch.Tensor, target: torch.Tensor,
                     threshold: float = 0.5) -> dict[str, float]:
    """How well the coverage output tracks the truth: mean error, plus recall/precision at a cut."""
    _, cov, _ = split_targets(target)
    pred = torch.sigmoid(logits[:, -1])
    hit, want = pred > threshold, cov > threshold
    tp = float((hit & want).sum())
    return {"occ_mae": float((pred - cov).abs().mean()),
            "occ_recall": tp / max(1.0, float(want.sum())),
            "occ_precision": tp / max(1.0, float(hit.sum()))}
