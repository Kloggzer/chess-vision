"""Die Trainingsschleife: Schritt, Epoche, Zustand fuers Fortsetzen, SWA-Abschluss."""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from ..ioutil import append_rows
from ..work_audit import current as current_work_audit
from .checkpoint import Progress, _checkpoint_rank, keep_checkpoints
from .data import checkpoint_metrics, confidence_auroc, visible_confidence
from .epoch_metrics import epoch_record, occlusion_diagnostics, print_epoch, score_epoch
from .train_feed import _device_batches

#: Alles, was eine Epochengrenze ueberlebt haben muss. `last.pt` traegt nur Gewichte — damit
#: faengt ein Neustart die Cosine bei lr an und zaehlt `patience` von vorn.
STATE_FILE = "state.pt"


#: Ein Zustand gehoert zu SEINEM Rezept. Weicht eines dieser Felder ab, ist es ein anderer Lauf.
STATE_KEYS = ("backbone", "epochs", "batch_size", "lr", "sched", "seed", "dataset", "split_file",
              "head", "norm", "out_size", "batch_aug", "epoch_frac", "balance",
              "checkpoint_policy", "worker_rng_policy")


def _save_state(path, epoch, model, optimizer, scheduler, scaler, sampler, swa_model, swa_sched,
                best_score, best_piece, recent, epochs_no_improve, cfg) -> None:
    """Nach JEDER Epoche, atomar ueber eine Nebendatei — ein Absturz mitten im Schreiben
    duerfte sonst den einzigen Zustand zerreissen."""
    import random as _random

    import numpy as _np
    import torch

    gen = getattr(sampler, "generator", None)
    blob = {
        "epoch": epoch + 1, "config": {k: cfg.get(k) for k in STATE_KEYS},
        "model": model.state_dict(), "optimizer": optimizer.state_dict(),
        "scheduler": scheduler.state_dict(), "scaler": scaler.state_dict(),
        "sampler_generator": gen.get_state() if gen is not None else None,
        "swa_model": swa_model.state_dict() if swa_model is not None else None,
        "swa_sched": swa_sched.state_dict() if swa_sched is not None else None,
        "best_score": best_score, "best_piece": best_piece, "recent": list(recent),
        "epochs_no_improve": epochs_no_improve,
        "rng": {"torch": torch.get_rng_state(), "numpy": _np.random.get_state(),
                "python": _random.getstate(),
                "cuda": torch.cuda.get_rng_state_all() if torch.cuda.is_available() else None},
    }
    tmp = Path(path).with_suffix(".tmp")
    torch.save(blob, tmp)
    tmp.replace(path)


def _load_state(path, cfg):
    """Der Zustand oder None — und ein lauter Abbruch, wenn er zu einem anderen Rezept gehoert."""
    import torch

    blob = torch.load(path, map_location="cpu", weights_only=False)
    want = {k: cfg.get(k) for k in STATE_KEYS}
    have = blob.get("config", {})
    diff = [k for k in STATE_KEYS if have.get(k) != want.get(k)]
    if diff:
        raise ValueError(f"{path} gehoert zu einem anderen Rezept ({', '.join(diff)}) — "
                         f"neues --out waehlen statt fortsetzen.")
    return blob


@dataclass
class TrainRun:

    model: object
    optimizer: object
    scheduler: object
    scaler: object
    criterion: object
    device: object
    feed: object
    val_ds: object
    photometric: object
    scales: list[int] | None
    amp: bool
    channels_last: bool
    eval_workers: int
    prefetch_factor: int
    run_dir: Path
    cfg_written: dict
    classes: list[str]
    occluding: bool
    epochs: int
    patience: int
    swa_model: object = None
    swa_sched: object = None
    swa_from: int = -1


def start_swa(run: TrainRun, swa: bool, swa_lr: float, swa_start: float, sched: str) -> None:
    # SWA mittelt die Gewichte ueber die Epochen statt eine einzelne auszuwaehlen: flache Minima
    # trennen die Konfidenz richtiger von falschen Vorhersagen besser (FMFP, ECCV 2022 —
    # `docs/references.md`), und das Springen der Validierung verschwindet.
    run.swa_from = int(run.epochs * swa_start) if swa else -1
    if swa:
        from torch.optim.swa_utils import SWALR, AveragedModel

        run.swa_model = AveragedModel(run.model)
        run.swa_sched = SWALR(run.optimizer, swa_lr=swa_lr)
        print(f"[OK] SWA ab Epoche {run.swa_from}, davor unveraenderter {sched}-Plan; "
              f"danach konstant {swa_lr}")


def resume_progress(run: TrainRun, continue_run: bool) -> Progress:
    # Fortsetzen heisst: derselbe Plan an derselben Stelle. Gewichte allein reichen dafuer nicht —
    # Optimizer-Momente, Cosine-Position, Sampler-Strom und die Zufallsstaende gehoeren dazu.
    import random

    import numpy as np
    import torch

    progress = Progress()
    run_dir, sampler = run.run_dir, run.feed.sampler
    metrics_path = run_dir / "metrics.jsonl"
    state_path = run_dir / STATE_FILE
    if continue_run and state_path.exists():
        blob = _load_state(state_path, run.cfg_written)
        run.model.load_state_dict(blob["model"])
        run.optimizer.load_state_dict(blob["optimizer"])
        run.scheduler.load_state_dict(blob["scheduler"])
        run.scaler.load_state_dict(blob["scaler"])
        if blob.get("sampler_generator") is not None and getattr(sampler, "generator", None):
            sampler.generator.set_state(blob["sampler_generator"])
        if run.swa_model is not None and blob.get("swa_model") is not None:
            run.swa_model.load_state_dict(blob["swa_model"])
            run.swa_sched.load_state_dict(blob["swa_sched"])
        progress.best_score = tuple(blob["best_score"])
        progress.best_piece = tuple(blob["best_piece"])
        progress.recent = deque(blob["recent"], maxlen=3)
        progress.epochs_no_improve = blob["epochs_no_improve"]
        progress.start_epoch = blob["epoch"]
        torch.set_rng_state(blob["rng"]["torch"].to(torch.uint8).cpu())
        np.random.set_state(blob["rng"]["numpy"])
        random.setstate(blob["rng"]["python"])
        if blob["rng"]["cuda"] is not None and torch.cuda.is_available():
            torch.cuda.set_rng_state_all([t.to(torch.uint8).cpu() for t in blob["rng"]["cuda"]])
        print(f"[OK] fortgesetzt bei Epoche {progress.start_epoch}/{run.epochs} "
              f"(lr {run.scheduler.get_last_lr()[0]:.5f}, bester Score {progress.best_score[0]:.4f})")
    elif continue_run:
        if metrics_path.exists():
            raise ValueError(f"{run_dir} has metrics but no {STATE_FILE}; choose a new --out.")
        print(f"[continue] kein {STATE_FILE} in {run_dir} — Lauf beginnt bei Epoche 0.")
    return progress


def train_epoch(run: TrainRun) -> tuple[float, int, float]:
    import numpy as np
    import torch

    model, device, optimizer, scaler = run.model, run.device, run.optimizer, run.scaler
    model.train()
    running_sum = torch.zeros((), dtype=torch.float64, device=device)
    seen = 0
    t_data = 0.0
    t_fetch = time.perf_counter()
    for x, y in _device_batches(run.feed.loader, device, channels_last=run.channels_last):
        t_data += time.perf_counter() - t_fetch
        if run.photometric is not None:
            x = run.photometric(x)
        if run.scales:
            # Multi-Scale: gesamten Batch auf eine zufällige Eingabegröße bringen (uniform je
            # Batch, damit stapelbar). Modell ist size-agnostisch → lernt alle Auflösungen.
            s = int(np.random.choice(run.scales))
            if s != x.shape[-1]:
                x = torch.nn.functional.interpolate(x, size=(s, s), mode="bilinear", align_corners=False)
        optimizer.zero_grad(set_to_none=True)
        with torch.autocast(device_type="cuda", enabled=run.amp):
            loss = run.criterion(model(x), y)
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        running_sum.add_(loss.detach().double() * x.size(0))
        seen += x.size(0)
        t_fetch = time.perf_counter()
    # Synchronize once before stopping the timer. The epoch record divides this SUM by
    # seen below; averaging here as well would silently divide the reported loss twice.
    return float(running_sum), seen, t_data


def run_epochs(run: TrainRun, progress: Progress) -> None:
    from .engine import evaluate_dataset

    model = run.model
    metrics_path = run.run_dir / "metrics.jsonl"
    state_path = run.run_dir / STATE_FILE
    for epoch in range(progress.start_epoch, run.epochs):
        t_epoch = time.perf_counter()
        running, seen, t_data = train_epoch(run)
        # Sobald SWA uebernimmt, haelt SWALR die Rate — der Cosine-Plan darf dann nicht
        # weiterlaufen, sonst treten zwei Scheduler gegen denselben Optimizer an.
        if run.swa_from < 0 or epoch < run.swa_from:
            run.scheduler.step()
        t_train = time.perf_counter() - t_epoch

        t0 = time.perf_counter()
        val = evaluate_dataset(model, run.val_ds, run.device, criterion=run.criterion,
                               batch_size=run.feed.eval_batch, num_workers=run.eval_workers,
                               prefetch_factor=run.prefetch_factor)
        t_val = time.perf_counter() - t0
        work_audit = current_work_audit()
        validation_key = (id(model), id(run.val_ds), epoch)
        if work_audit is not None:
            work_audit.record_work("validation inference passes", validation_key, seconds=t_val)
        t0 = time.perf_counter()
        vis_conf, auroc, bd, score = score_epoch(val, run.feed.score_rows, run.classes)
        t_score = time.perf_counter() - t0
        occ_diag = occlusion_diagnostics(val, run.feed.score_rows, run.classes, run.occluding)
        timings = {"t_train_s": round(t_train, 2), "t_data_s": round(t_data, 2),
                   "t_val_s": round(t_val, 2), "t_score_s": round(t_score, 2)}
        rec = epoch_record(epoch, running / max(seen, 1), val, bd, vis_conf, auroc, score,
                           run.scheduler.get_last_lr()[0], timings, occ_diag)
        append_rows(metrics_path, [rec])
        print_epoch(epoch, rec, score, occ_diag)

        keep_checkpoints(run.run_dir, model, bd, score, epoch, progress)
        # Bis `swa_from` laeuft das Rezept unveraendert; erst danach wird gemittelt und die
        # Rate konstant gehalten. Sonst waere es ein anderes Rezept, kein A/B.
        if run.swa_model is not None and epoch >= run.swa_from:
            run.swa_model.update_parameters(model)
            run.swa_sched.step()
        _save_state(state_path, epoch, model, run.optimizer, run.scheduler, run.scaler,
                    run.feed.sampler, run.swa_model, run.swa_sched, progress.best_score,
                    progress.best_piece, progress.recent, progress.epochs_no_improve,
                    run.cfg_written)
        if progress.epochs_no_improve >= run.patience:
            print(f"[OK] Early stopping: no visible-piece improvement for {run.patience} epochs.")
            break

    best_score, best_piece = progress.best_score, progress.best_piece
    print(f"[OK] done. best visible_piece_acc={best_score[0]:.4f} (visible_occupied_acc={best_score[1]:.4f}, "
          f"confidence_auroc={best_score[2]:.4f}); best.pt in {run.run_dir}")
    print(f"[OK] best_piece.pt: visible_piece_acc={best_piece[0]:.4f} bei Epoche {best_piece[1]} "
          "— gegen best.pt messen, bevor eine Stufe darauf aufbaut.")


def finish_swa(run: TrainRun, best_score) -> None:
    # Die gemittelten Gewichte haben NIE einen Batch gesehen — ohne den BatchNorm-Durchlauf
    # ueber die Trainingsdaten ist ein SWA-Modell unbrauchbar.
    import torch

    from .engine import evaluate_dataset

    swa_model, device, score_rows, classes = run.swa_model, run.device, run.feed.score_rows, run.classes
    if swa_model is not None:
        from torch.optim.swa_utils import update_bn

        print("[i] SWA: BatchNorm-Statistiken werden neu geschaetzt ...", flush=True)
        update_bn(run.feed.loader, swa_model, device=device)
        inner = swa_model.module
        torch.save(inner.state_dict(), run.run_dir / "swa.pt")
        sv = evaluate_dataset(inner, run.val_ds, device, criterion=run.criterion,
                              batch_size=run.feed.eval_batch, num_workers=0, keep_workers=False)
        sva = visible_confidence(score_rows, list(sv["trues"]), list(sv["preds"]),
                                 sv.get("conf") or [])
        _, sbd = checkpoint_metrics(score_rows, classes, list(sv["trues"]), list(sv["preds"]),
                                    auroc=confidence_auroc(*sva))
        # Dasselbe Tupel wie `best_score`: der gewichtete Score aus `checkpoint_metrics` lag
        # hier im Median 0,163 ueber `visible_piece_acc`, also gewann swa.pt jeden Vergleich.
        srank = _checkpoint_rank(sbd, sbd["calibration"])
        print(f"[OK] swa.pt: visible_piece_acc {srank[0]:.4f} "
              f"(visible_occupied_acc {srank[1]:.4f}, auroc {srank[2]:.4f}) "
              f"— gegen best.pt {best_score[0]:.4f} messen")
