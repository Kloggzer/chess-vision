"""The occlusion output: a coverage estimate beside the piece classes, not a 14th class
(`docs/occluder-plates.md`).
"""

from __future__ import annotations

import torch
from torch import nn

from ..cell_rule import CELL_DARK_MIN as CELL_DARK_MIN
from ..cell_rule import PIECE_VISIBLE_MAX as PIECE_VISIBLE_MAX
from ..cell_rule import classification_eligible as classification_eligible


def split_targets(target: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """`(B, 2|3)` float target -> (class index, coverage, Helligkeit); ohne dritte Spalte gilt jede
    Zelle als hell.
    """
    bright = target[:, 2] if target.shape[1] > 2 else torch.full_like(target[:, 1], 255.0)
    return target[:, 0].long(), target[:, 1], bright


#: Ab hier liest das Modell die Figur schlechter als Zufall: der Schwanz ist systematisch falsch,
#: dort gehoert eine Null hin.
COVERAGE_ZERO_AT = 0.60
#: Sonst startete die S-Kurve WAAGERECHT, waehrend die Messung dort schon faellt.
COVERAGE_SHIFT = 0.01


def coverage_weight(cov: torch.Tensor, mode: str = "hard",
                    visible_max: float = PIECE_VISIBLE_MAX) -> torch.Tensor:
    """Wie schwer eine Zelle im KLASSENverlust zaehlt: `hard` 1 bis `visible_max`, dann 0; `soft`
    eine gestauchte S-Kurve, die nirgends ueber der gemessenen Lesbarkeit liegt.
    """
    if mode == "hard":
        return (cov <= visible_max).to(cov.dtype)
    if mode != "soft":
        raise ValueError(f"unknown coverage weight mode {mode!r} — hard or soft")
    # `visible_max` wird bewusst nicht gelesen — die Kurve IST die Kante.
    s = ((cov + COVERAGE_SHIFT) / COVERAGE_ZERO_AT).clamp(0.0, 1.0)
    return 1.0 - (3 * s**2 - 2 * s**3)


class OcclusionLoss(nn.Module):
    """Weighted CE over the pieces plus BCE over the coverage, from ONE (B, C+1) output. Regressed
    against the FRACTION, so the tracker's veto is a threshold turnable without retraining.
    """

    def __init__(self, class_weights: torch.Tensor, occ_weight: float = 1.0,
                 visible_max: float = PIECE_VISIBLE_MAX,
                 label_smoothing: float = 0.0, dark_min: float = CELL_DARK_MIN,
                 coverage_weight_mode: str = "hard") -> None:
        super().__init__()
        self.ce = nn.CrossEntropyLoss(weight=class_weights, reduction="none",
                                      label_smoothing=label_smoothing)
        self.occ_weight = occ_weight
        self.visible_max = visible_max
        self.dark_min = dark_min
        self.coverage_weight_mode = coverage_weight_mode

    def forward(self, logits: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        piece_sum, visible_count, coverage_sum, coverage_count = self.validation_terms(logits, target)
        piece = piece_sum / visible_count.clamp(min=1)
        coverage = coverage_sum / max(coverage_count, 1)
        return piece + self.occ_weight * coverage

    def validation_terms(self, logits: torch.Tensor, target: torch.Tensor):
        y, cov, bright = split_targets(target)
        # Verdeckt oder zu dunkel faellt aus dem KLASSENteil; der Coverage-Kopf lernt auf allen.
        # Dunkelheit bleibt ein HARTER Ausschluss, gewichtet wird nur die Verdeckung.
        weight = coverage_weight(cov, self.coverage_weight_mode, self.visible_max)
        visible = weight * (bright >= self.dark_min).to(weight.dtype)
        piece = self.ce(logits[:, :-1], y)
        coverage = torch.nn.functional.binary_cross_entropy_with_logits(
            logits[:, -1], cov, reduction="sum")
        return (piece * visible).sum(), visible.sum(), coverage, cov.numel()
