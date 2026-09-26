"""Temperatur-Fitting nach dem Training: ein Skalar je Modell, Argmax unberuehrt (Guo 2017)."""

from __future__ import annotations

from pathlib import Path

from ..ioutil import write_json
from ..runs import read_run_config


def fit_temperature(logits, trues, iters: int = 200, *, n_classes: int | None = None) -> float:
    """Ein Skalar, der die Wahrscheinlichkeiten ehrlich macht, post-hoc auf val (Guo 2017); der
    Argmax und damit jede Genauigkeit bleiben.
    """
    import torch

    if logits is None or not len(trues):
        return 1.0
    z = logits.detach().float()
    y = torch.as_tensor(trues, dtype=torch.long)
    # Aus dem Aufrufer, nicht aus den Labels: fehlt die letzte Klasse im Val, fiel ihre Spalte mit
    # der Coverage-Spalte weg.
    if n_classes is not None and z.shape[1] > n_classes:
        z = z[:, :n_classes]                 # Coverage-Logit gehoert nicht dazu
    log_t = torch.zeros(1, requires_grad=True)
    opt = torch.optim.LBFGS([log_t], lr=0.1, max_iter=iters)
    loss_fn = torch.nn.CrossEntropyLoss()

    def step():
        opt.zero_grad()
        loss = loss_fn(z / log_t.exp(), y)
        loss.backward()
        return loss

    opt.step(step)
    return float(log_t.exp().item())


def _record_temperature(cfg_path: Path, temp: float | None, err: Exception | None = None) -> None:
    """Absent reads as 1,0 on the device, so a failed fit leaves `temperature_error` instead."""
    try:
        cfg = read_run_config(cfg_path.parent)
        if err is None:
            cfg["temperature"] = round(temp, 4)
            cfg.pop("temperature_error", None)
        else:
            cfg.pop("temperature", None)
            cfg["temperature_error"] = f"{type(err).__name__}: {err}"
        write_json(cfg_path, cfg)
    except (OSError, ValueError) as e:
        print(f"[WARN] config.json nicht geschrieben ({cfg_path}): {e}")


def calibrate_run(run_dir: Path, model, val_ds, device, eval_batch: int, classes: list[str]) -> None:
    from .engine import evaluate_dataset

    # Jedes Modell bringt seine eigene Temperatur mit, statt einer handgesetzten Konstante im
    # Dekoder.
    try:
        import torch

        model.load_state_dict(torch.load(run_dir / "best.pt", map_location=device))
        # num_workers=0: a fresh worker loader after the last epoch deadlocks on Windows spawn (hung
        # 36 h).
        cal = evaluate_dataset(model, val_ds, device, batch_size=eval_batch,
                               num_workers=0, keep_workers=False)
        eligible = cal["classification_eligible"]
        temp = fit_temperature(cal.get("logits")[eligible], cal["trues"][eligible],
                               n_classes=len(classes))
        _record_temperature(run_dir / "config.json", temp)
        wrong = cal["conf_wrong"]
        print(f"[OK] Temperatur {temp:.3f} auf val angepasst -> config.json "
              f"(conf auf Fehlern {'—' if wrong is None else format(wrong, '.3f')})")
    except Exception as e:  # noqa: BLE001 — Kalibrierung darf keinen Lauf kippen
        print(f"[WARN] Temperatur nicht angepasst: {e} -> temperature_error in config.json")
        _record_temperature(run_dir / "config.json", None, e)
