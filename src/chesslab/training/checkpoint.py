"""Checkpoint-Wahl: welche Epoche `best.pt`, `best_piece.pt` und `last.pt` wird."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from pathlib import Path


def _checkpoint_rank(breakdown, auroc):
    """Rank actual weights by visible identity, then occupancy and error confidence."""
    return (breakdown["visible_piece_acc"], breakdown["visible_occupied_acc"],
            auroc if auroc is not None else 0.0)


@dataclass
class Progress:

    best_score: tuple = (-1.0, -1.0, -1.0)
    best_piece: tuple = (-1.0, -1)
    recent: deque = field(default_factory=lambda: deque(maxlen=3))
    epochs_no_improve: int = 0
    start_epoch: int = 0


def keep_checkpoints(run_dir: Path, model, bd: dict, score, epoch: int,
                     progress: Progress) -> None:
    import torch

    torch.save(model.state_dict(), run_dir / "last.pt")
    # Keep the first checkpoint attaining the best visible identity accuracy.
    # best.pt may break accuracy ties using occupancy and confidence.
    if bd["visible_piece_acc"] > progress.best_piece[0]:
        progress.best_piece = (bd["visible_piece_acc"], epoch)
        torch.save(model.state_dict(), run_dir / "best_piece.pt")
    progress.recent.append(score)
    if score > progress.best_score:
        progress.best_score = score
        progress.epochs_no_improve = 0
        torch.save(model.state_dict(), run_dir / "best.pt")
    else:
        progress.epochs_no_improve += 1
