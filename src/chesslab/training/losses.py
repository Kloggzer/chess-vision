"""Loss functions beyond plain cross-entropy. `FocalLoss` for extreme imbalance where the majority
class is also the easy one (Lin 2017); `gamma=2.0` is inherited, not swept.
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class FocalLoss(nn.Module):
    """`(1 - p_t)^gamma * CE` with the SAME class weights as `CrossEntropyLoss`; `gamma = 0` is
    exactly weighted CE (`tests/test_training.py`). Input is LOGITS.
    """

    def __init__(self, weight: torch.Tensor | None = None, gamma: float = 2.0) -> None:
        super().__init__()
        if gamma < 0:
            raise ValueError(f"focal gamma must be >= 0, got {gamma}")
        self.gamma = float(gamma)
        self.register_buffer("weight", weight if weight is None else weight.detach().clone())

    def forward(self, logits: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        w = self.weight
        # Per-sample CE, already class-weighted: the focal term multiplies the weighted term.
        ce = F.cross_entropy(logits, target, weight=w, reduction="none")
        if self.gamma == 0.0:
            log_pt = None
        else:
            log_pt = F.log_softmax(logits, dim=1).gather(1, target.unsqueeze(1)).squeeze(1)
        loss = ce if log_pt is None else ((1.0 - log_pt.exp()) ** self.gamma) * ce
        if w is None:
            return loss.mean()
        # Normalised by the summed sample weights like `CrossEntropyLoss(weight=w)`, which makes
        # gamma=0 identical.
        return loss.sum() / w[target].sum().clamp_min(torch.finfo(loss.dtype).tiny)
