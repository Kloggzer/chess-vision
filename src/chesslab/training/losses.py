"""Loss functions beyond plain cross-entropy.

`FocalLoss` exists for the occupancy task (specs/18-occupancy-model/02-two-class-model.md):
after the 14 -> 2 class collapse, most `empty` crops are trivially easy (a flat board
square) and cross-entropy keeps spending gradient on examples already solved at p > 0.99.

That is the situation focal loss was introduced for — extreme imbalance where the majority
class is also the easy one (docs/references.md#lin-2017). The `gamma=2.0` default is inherited
from common practice and has not been swept here.
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class FocalLoss(nn.Module):
    """`(1 - p_t)^gamma * CE`, with the SAME per-class weight vector as `CrossEntropyLoss`.

    `gamma = 0` is exactly weighted cross-entropy (asserted in `tests/test_training.py`).

    **Input is LOGITS, not log-probs.** `HierarchicalHead` (`--head twostage`) returns
    reconstructed log-probabilities; feeding those here would apply `log_softmax` a second
    time and silently change the loss. A 2-class occupancy run uses `--head combined`,
    which returns logits, so the standard formulation applies — but the assumption is
    stated here rather than left implicit.
    """

    def __init__(self, weight: torch.Tensor | None = None, gamma: float = 2.0) -> None:
        super().__init__()
        if gamma < 0:
            raise ValueError(f"focal gamma must be >= 0, got {gamma}")
        self.gamma = float(gamma)
        self.register_buffer("weight", weight if weight is None else weight.detach().clone())

    def forward(self, logits: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        w = self.weight
        # `reduction="none"` keeps the per-sample CE (already class-weighted when `w` is set),
        # so the focal modulation multiplies the weighted term — not the other way round.
        ce = F.cross_entropy(logits, target, weight=w, reduction="none")
        if self.gamma == 0.0:
            log_pt = None
        else:
            log_pt = F.log_softmax(logits, dim=1).gather(1, target.unsqueeze(1)).squeeze(1)
        loss = ce if log_pt is None else ((1.0 - log_pt.exp()) ** self.gamma) * ce
        if w is None:
            return loss.mean()
        # `CrossEntropyLoss(weight=w)` normalizes by the summed sample weights, not by N.
        # Matching that is what makes gamma=0 identical to weighted CE.
        return loss.sum() / w[target].sum().clamp_min(torch.finfo(loss.dtype).tiny)
