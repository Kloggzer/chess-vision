"""Ein Neustart nach einem Absturz muss den PLAN fortsetzen, nicht nur die Gewichte waermen."""

import pytest
import torch

from chesslab.training.train import STATE_KEYS, _load_state, _save_state


class _Dummy(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.fc = torch.nn.Linear(4, 2)


def _parts(epochs=60, lr=0.0125):
    model = _Dummy()
    opt = torch.optim.AdamW(model.parameters(), lr=lr)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs)
    return model, opt, sched, torch.amp.GradScaler("cuda", enabled=False)


def _cfg(**over):
    return {**dict.fromkeys(STATE_KEYS, "x"), "epochs": 60, "lr": 0.0125, **over}


def _write(tmp_path, epoch, cfg=None, sched_steps=0):
    model, opt, sched, scaler = _parts()
    for _ in range(sched_steps):
        sched.step()
    path = tmp_path / "state.pt"
    _save_state(path, epoch, model, opt, sched, scaler, None, None, None,
                (0.9, 0.8, 0.7), (0.95, 3), [0.9], 2, cfg or _cfg())
    return path, sched


def test_the_cosine_position_survives(tmp_path):
    """Der Kern: nach 30 Epochen darf der Plan nicht wieder bei lr anfangen."""
    path, sched = _write(tmp_path, epoch=29, sched_steps=30)
    _, opt2, sched2, _ = _parts()
    assert sched2.get_last_lr()[0] == pytest.approx(0.0125)
    sched2.load_state_dict(_load_state(path, _cfg())["scheduler"])
    assert sched2.get_last_lr()[0] == pytest.approx(sched.get_last_lr()[0])
    assert sched2.get_last_lr()[0] < 0.0125


def test_it_continues_at_the_next_epoch(tmp_path):
    path, _ = _write(tmp_path, epoch=29)
    blob = _load_state(path, _cfg())
    assert blob["epoch"] == 30
    assert blob["epochs_no_improve"] == 2
    assert tuple(blob["best_piece"]) == (0.95, 3)


def test_a_different_recipe_is_refused(tmp_path):
    """Sonst laeuft ein anderes Rezept unter demselben Namen weiter — der stille Fall."""
    path, _ = _write(tmp_path, epoch=10)
    with pytest.raises(ValueError, match="anderen Rezept"):
        _load_state(path, _cfg(lr=0.0149))


def test_the_random_streams_come_back(tmp_path):
    path, _ = _write(tmp_path, epoch=5)
    blob = _load_state(path, _cfg())
    torch.set_rng_state(blob["rng"]["torch"].to(torch.uint8).cpu())
    first = torch.rand(3)
    torch.set_rng_state(blob["rng"]["torch"].to(torch.uint8).cpu())
    assert torch.equal(first, torch.rand(3))


def test_old_checkpoint_selection_policy_cannot_silently_resume(tmp_path):
    path, _ = _write(tmp_path, epoch=10, cfg=_cfg(checkpoint_policy=None))
    with pytest.raises(ValueError, match="checkpoint_policy"):
        _load_state(path, _cfg(checkpoint_policy="visible-piece-v2"))
