"""Stage 5 — shared eval mechanics (used by train_loop.py and evaluate.py)."""

from __future__ import annotations

import weakref

import numpy as np
import torch

from .data import board_accuracy


def get_device(require_gpu: bool):
    if torch.cuda.is_available():
        return torch.device("cuda")
    if require_gpu:
        raise RuntimeError("no usable GPU (torch.cuda.is_available()==False).")
    return torch.device("cpu")


#: Eval loaders per dataset. WeakKey, not `id()`: an id is reused after collection, and the next
#: dataset would inherit the wrong loader.
_LOADERS: weakref.WeakKeyDictionary = weakref.WeakKeyDictionary()


@torch.no_grad()
def evaluate_dataset(model, dataset, device, criterion=None, batch_size: int = 256, num_workers: int = 4,
                     input_size: int | None = None, keep_workers: bool = True,
                     prefetch_factor: int = 2) -> dict:
    """Square accuracy, board accuracy, loss and raw (true, pred) arrays for a dataset; `input_size`
    rescales every batch to measure one deployment resolution.
    """
    import torch
    from torch.utils.data import DataLoader

    from .. import config

    low_memory = getattr(dataset, "low_memory", False)
    if low_memory:
        num_workers = 0
        keep_workers = False
    kw = {"batch_size": batch_size, "shuffle": False,
          **config.loader_kwargs(num_workers, persistent=keep_workers, pin_memory=not low_memory,
                                 prefetch_factor=prefetch_factor)}
    # Ohne das eigene Zusammenlegen kaeme das Ziel als `(B, 64, 2)`, und `occluding` laege still
    # falsch.
    if getattr(dataset, "collate_fn", None) is not None:
        kw["collate_fn"] = dataset.collate_fn
    # Kept across calls: a fresh loader per epoch re-imports torch in every Windows spawn worker.
    if keep_workers:
        per_ds = _LOADERS.setdefault(dataset, {})
        loader = per_ds.get((batch_size, num_workers, prefetch_factor))
        if loader is None:
            loader = per_ds[(batch_size, num_workers, prefetch_factor)] = DataLoader(dataset, **kw)
    else:
        loader = DataLoader(dataset, **kw)
    model.eval()
    trues: list[int] = []
    preds: list[int] = []
    cover: list[float] = []
    probs: list[float] = []
    conf: list[float] = []
    keep_logits: list = []
    loss_sum = torch.zeros((), device=device) if criterion is not None else None
    loss_den = torch.zeros((), device=device) if criterion is not None else None
    coverage_loss_sum = torch.zeros((), device=device) if criterion is not None else None
    coverage_loss_den = torch.zeros((), device=device) if criterion is not None else None
    n = 0
    n_out = 0
    from .memory import guarded_batches

    for x, y in guarded_batches(loader):
        x = x.to(device, non_blocking=not low_memory)
        y = y.to(device, non_blocking=not low_memory)
        if input_size is not None and input_size != x.shape[-1]:
            flat = x.flatten(0, 1) if x.dim() == 5 else x
            flat = torch.nn.functional.interpolate(flat, size=(input_size, input_size),
                                                   mode="bilinear", align_corners=False)
            x = flat.view(*x.shape[:2], *flat.shape[1:]) if x.dim() == 5 else flat
        logits = model(x)
        if criterion is not None:
            if hasattr(criterion, "validation_terms"):
                piece_sum, piece_n, coverage_sum, coverage_n = criterion.validation_terms(logits, y)
                loss_sum.add_(piece_sum.detach())
                loss_den.add_(piece_n)
                coverage_loss_sum.add_(coverage_sum.detach())
                coverage_loss_den.add_(coverage_n)
            else:
                loss_sum.add_(criterion(logits, y).detach() * logits.shape[0])
                loss_den.add_(logits.shape[0])
        # An occlusion run's LAST logit is coverage; class metrics must look past it.
        occluding = y.dim() == 2
        if occluding:
            cover.extend(y[:, 1].cpu().tolist())
            probs.extend(torch.sigmoid(logits[:, -1]).cpu().tolist())
            logits, y = logits[:, :-1], y[:, 0].long()
        n_out = int(logits.shape[1])
        p = logits.argmax(1)
        # Wie SICHER ist ein Fehler? Ein Modell mit 1,00 auf falschen Feldern reisst den Beam mit,
        # eines mit 0,80 laesst sich korrigieren.
        conf.extend(logits.softmax(1).max(1).values.cpu().tolist())
        keep_logits.append(logits.detach().cpu())
        trues.extend(y.cpu().tolist())
        preds.extend(p.cpu().tolist())
        n += logits.shape[0]

    trues_a = np.array(trues)
    preds_a = np.array(preds)
    if len(dataset.rows) != len(trues):
        raise ValueError(f"dataset has {len(dataset.rows)} rows but evaluation produced {len(trues)} labels")
    from ..cell_rule import classification_eligible

    # Die FESTE Maske an der ZEILE, nicht am Kopf oder an `--visible-max`: sonst benoteten
    # Korpuszahl und Checkpoint-Metrik verschiedene Zellmengen.
    eligible = np.array([classification_eligible(r) for r in dataset.rows], dtype=bool)
    metric_trues = trues_a[eligible]
    metric_preds = preds_a[eligible]
    metric_conf = np.asarray(conf)[eligible]
    # Eine leere Menge hat keine Note: `0.0` ist die SCHLECHTESTE, nicht die fehlende.
    square_acc = float((metric_trues == metric_preds).mean()) if len(metric_trues) else None

    # Macro-recall over present classes ignores the empty dominance. The MODEL's output width sizes
    # the matrix: derived from the data, one out-of-range label allocated an (N x N) array and
    # killed a run.
    n_classes = n_out if n_out else (len(getattr(dataset, "c2i", {})) or 1)
    if n:
        lo = int(trues_a.min())
        hi = int(max(trues_a.max(), preds_a.max()))
        if lo < 0 or hi >= n_classes:
            bad = sorted({int(v) for v in trues_a[(trues_a < 0) | (trues_a >= n_classes)]})[:8]
            raise ValueError(
                f"label {hi} outside the model's {n_classes} outputs — the dataset and the head "
                f"disagree, or a loader served a corrupt label. Offending true labels: {bad}")
    cm = confusion_matrix(metric_trues, metric_preds, n_classes) if len(metric_trues) else np.zeros((n_classes, n_classes))
    present = cm.sum(axis=1) > 0
    macro_recall = float(per_class_recall(cm)[present].mean()) if present.any() else None

    # strict: rows and predictions MUST align 1:1, or board accuracy scores a shifted pairing.
    every = [((r["session_id"], str(r["frame"])), bool(t == p))
             for r, t, p in zip(dataset.rows, trues, preds, strict=True)]
    items = [cell for cell, keep in zip(every, eligible, strict=True) if keep]
    # Die HARTE Zahl geht ueber jede Zelle.
    board_acc = board_accuracy(every)
    # Zwei Zwillinge daneben: ohne die verdeckten Zellen, und mit einer Zelle Spielraum.
    if criterion is not None and hasattr(criterion, "validation_terms"):
        total_loss = (loss_sum / loss_den.clamp(min=1)
                      + criterion.occ_weight * coverage_loss_sum / coverage_loss_den.clamp(min=1))
    else:
        total_loss = loss_sum / loss_den.clamp(min=1) if criterion is not None else None

    return {
        "loss": float(total_loss.cpu()) if (criterion is not None and n) else None,
        "square_acc": square_acc,
        "macro_recall": macro_recall,
        "board_acc": board_acc,
        "visible_board_acc": board_accuracy(items),
        "board_acc_tol1": board_accuracy(items, tolerance=1),
        "trues": trues_a,
        "preds": preds_a,
        "classification_eligible": eligible,
        # Gleicher leerer Nenner, aber 0.0: `test_training_bug_hunt` haelt die Zahl fest.
        "conf_wrong": float(metric_conf[metric_trues != metric_preds].mean())
        if (metric_trues != metric_preds).any() else 0.0,
        "conf_right": float(metric_conf[metric_trues == metric_preds].mean())
        if (metric_trues == metric_preds).any() else 0.0,
        # Roh-Logits fuer `fit_temperature`.
        "logits": torch.cat(keep_logits) if keep_logits else None,
        "conf": conf,
        **({"occ_mae": float(np.abs(np.array(probs) - np.array(cover)).mean()),
            "occ_recall": _hit_rate(probs, cover),
            "coverage_trues": np.asarray(cover, dtype=np.float32),
            "coverage_probs": np.asarray(probs, dtype=np.float32)} if cover else {}),
    }


def _hit_rate(probs: list[float], cover: list[float], cut: float = 0.5) -> float | None:
    """Share of truly covered cells the output also calls covered; `None` without any."""
    want = np.array(cover) > cut
    if not want.any():
        return None
    return float(((np.array(probs) > cut) & want).sum() / want.sum())


def confusion_matrix(trues: np.ndarray, preds: np.ndarray, n_classes: int) -> np.ndarray:
    cm = np.zeros((n_classes, n_classes), dtype=np.int64)
    for t, p in zip(trues, preds, strict=False):
        cm[t, p] += 1
    return cm


def per_class_recall(cm: np.ndarray) -> np.ndarray:
    totals = cm.sum(axis=1)
    with np.errstate(divide="ignore", invalid="ignore"):
        recall = np.where(totals > 0, np.diag(cm) / np.maximum(totals, 1), 0.0)
    return recall


def save_confusion_png(cm: np.ndarray, classes: list[str], path) -> None:
    import cv2

    n = len(classes)
    cell = 44
    pad = 70
    size = pad + n * cell
    img = np.full((size, size, 3), 255, dtype=np.uint8)
    row_tot = cm.sum(axis=1, keepdims=True).clip(min=1)
    norm = cm / row_tot
    for i in range(n):
        for j in range(n):
            inten = int(255 * (1 - norm[i, j]))
            y0, x0 = pad + i * cell, pad + j * cell
            cv2.rectangle(img, (x0, y0), (x0 + cell, y0 + cell), (255, inten, inten), -1)
            cv2.rectangle(img, (x0, y0), (x0 + cell, y0 + cell), (220, 220, 220), 1)
            if cm[i, j]:
                cv2.putText(img, str(int(cm[i, j])), (x0 + 4, y0 + cell // 2 + 4),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 0), 1, cv2.LINE_AA)
        cv2.putText(img, classes[i], (4, pad + i * cell + cell // 2 + 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1, cv2.LINE_AA)
        cv2.putText(img, classes[i], (pad + i * cell + 4, pad - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1, cv2.LINE_AA)
    cv2.imwrite(str(path), img)


def render_confusion_text(cm: np.ndarray, classes: list[str]) -> str:
    lines = ["confusion (rows=true, cols=pred):", "        " + " ".join(f"{c:>5}" for c in classes)]
    for i, c in enumerate(classes):
        lines.append(f"{c:>7} " + " ".join(f"{cm[i, j]:>5}" for j in range(len(classes))))
    return "\n".join(lines)
