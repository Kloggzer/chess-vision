"""Stage 5 — shared eval mechanics (used by train.py and evaluate.py)."""

from __future__ import annotations

import weakref

import numpy as np
import torch

from .data import board_accuracy, visible_board_items


def get_device(require_gpu: bool):
    if torch.cuda.is_available():
        return torch.device("cuda")
    if require_gpu:
        raise RuntimeError("no usable GPU (torch.cuda.is_available()==False).")
    return torch.device("cpu")


#: Eval loaders per dataset — see `evaluate_dataset`. WeakKey, not `id()`: an id is reused after
#: the object is collected, and the next dataset would silently inherit the wrong loader.
_LOADERS: weakref.WeakKeyDictionary = weakref.WeakKeyDictionary()


@torch.no_grad()
def evaluate_dataset(model, dataset, device, criterion=None, batch_size: int = 256, num_workers: int = 4,
                     input_size: int | None = None, keep_workers: bool = True,
                     prefetch_factor: int = 2) -> dict:
    """Square accuracy, board accuracy, loss and raw (true, pred) arrays for a dataset.

    `input_size`: wenn gesetzt, wird jeder Batch auf diese Eingabegröße skaliert (size-agnostisches
    Modell) → so misst man die Genauigkeit bei einer bestimmten Deployment-Auflösung (Auflösungs-Kurve).
    """
    import torch
    from torch.utils.data import DataLoader

    from .. import config

    kw = {"batch_size": batch_size, "shuffle": False,
          **config.loader_kwargs(num_workers, persistent=keep_workers,
                                 prefetch_factor=prefetch_factor)}
    # Der Brettdatensatz bringt sein eigenes Zusammenlegen mit — ohne das kaeme das Ziel als
    # `(B, 64, 2)` an und `occluding` unten laege still falsch.
    if getattr(dataset, "collate_fn", None) is not None:
        kw["collate_fn"] = dataset.collate_fn
    # Kept across calls: the training loop evaluates once per EPOCH, and a fresh loader spawns
    # `num_workers` processes that each re-import torch — on Windows spawn that is the idle gap
    # between epochs, and it grows with the worker count instead of shrinking.
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
    n = 0
    n_out = 0
    for x, y in loader:
        x = x.to(device, non_blocking=True)
        y = y.to(device, non_blocking=True)
        if input_size is not None and input_size != x.shape[-1]:
            flat = x.flatten(0, 1) if x.dim() == 5 else x
            flat = torch.nn.functional.interpolate(flat, size=(input_size, input_size),
                                                   mode="bilinear", align_corners=False)
            x = flat.view(*x.shape[:2], *flat.shape[1:]) if x.dim() == 5 else flat
        logits = model(x)
        n_out = int(logits.shape[1])
        if criterion is not None:
            loss_sum.add_(criterion(logits, y).detach() * logits.shape[0])
        # An occlusion run carries (class, coverage) in one target and reads its LAST logit as the
        # coverage — the class metrics must look past both or they score a regression head.
        occluding = y.dim() == 2
        if occluding:
            cover.extend(y[:, 1].cpu().tolist())
            probs.extend(torch.sigmoid(logits[:, -1]).cpu().tolist())
            logits, y = logits[:, :-1], y[:, 0].long()
        p = logits.argmax(1)
        # Wie SICHER ist das Modell? Nicht die Genauigkeit entscheidet die Dekodierung,
        # sondern wie ueberzeugt ein Fehler auftritt — ein Modell mit 1,00 auf falschen
        # Feldern reisst den Beam mit, eines mit 0,80 laesst sich korrigieren.
        conf.extend(logits.softmax(1).max(1).values.cpu().tolist())
        keep_logits.append(logits.detach().cpu())
        trues.extend(y.cpu().tolist())
        preds.extend(p.cpu().tolist())
        n += logits.shape[0]

    trues_a = np.array(trues)
    preds_a = np.array(preds)
    square_acc = float((trues_a == preds_a).mean()) if n else 0.0

    # Macro-recall: mean of per-class hit rate over present classes.
    # Meaningful even when board_acc=0 (small/hard datasets) and ignores the
    # empty dominance -> better checkpoint/early-stop metric than raw square_acc.
    # The MODEL's output width decides the matrix size. Deriving it from the data - as this did,
    # via `max(trues.max(), preds.max()) + 1` whenever the dataset had no `c2i` attribute, which is
    # every packed dataset - means one out-of-range label allocates an (N x N) array from it. That
    # is how a training run died at epoch 5 of 20 with `array is too big` instead of naming the bad
    # value, after four epochs had already passed through the same code.
    n_classes = n_out if n_out else (len(getattr(dataset, "c2i", {})) or 1)
    if n:
        hi = int(max(trues_a.max(), preds_a.max()))
        if hi >= n_classes:
            bad = sorted({int(v) for v in trues_a[trues_a >= n_classes]})[:8]
            raise ValueError(
                f"label {hi} outside the model's {n_classes} outputs — the dataset and the head "
                f"disagree, or a loader served a corrupt label. Offending true labels: {bad}")
    cm = confusion_matrix(trues_a, preds_a, n_classes) if n else np.zeros((1, 1))
    present = cm.sum(axis=1) > 0
    macro_recall = float(per_class_recall(cm)[present].mean()) if present.any() else 0.0

    # Board-Accuracy: Crops über (session, frame) gruppieren (dataset.rows ist ausgerichtet).
    # strict: rows and predictions MUST align 1:1 — silent truncation here would compute
    # board accuracy on a shifted pairing (the plausible-but-wrong failure mode).
    items = [((r["session_id"], str(r["frame"])), bool(t == p))
             for r, t, p in zip(dataset.rows, trues, preds, strict=True)]
    board_acc = board_accuracy(items)
    # Zwei Zwillinge neben der harten Zahl, weil die allein nicht lesbar ist: ohne die verdeckten
    # Zellen (die der Verlust maskiert, also nie gelernt wurden) und mit einer Zelle Spielraum.
    visible_items = visible_board_items(dataset.rows, trues, preds)

    return {
        "loss": float(loss_sum.cpu()) / n if (criterion is not None and n) else None,
        "square_acc": square_acc,
        "macro_recall": macro_recall,
        "board_acc": board_acc,
        "visible_board_acc": board_accuracy(visible_items),
        "board_acc_tol1": board_accuracy(items, tolerance=1),
        "trues": trues_a,
        "preds": preds_a,
        "conf_wrong": float(np.array(conf)[trues_a != preds_a].mean())
        if n and (trues_a != preds_a).any() else 0.0,
        "conf_right": float(np.array(conf)[trues_a == preds_a].mean())
        if n and (trues_a == preds_a).any() else 0.0,
        # Roh-Logits fuer die Temperatur-Anpassung: der Argmax bleibt, nur die
        # Wahrscheinlichkeiten werden ehrlich (`fit_temperature`).
        "logits": torch.cat(keep_logits) if keep_logits else None,
        "conf": conf,
        **({"occ_mae": float(np.abs(np.array(probs) - np.array(cover)).mean()),
            "occ_recall": _hit_rate(probs, cover),
            "coverage_trues": np.asarray(cover, dtype=np.float32),
            "coverage_probs": np.asarray(probs, dtype=np.float32)} if cover else {}),
    }


def _hit_rate(probs: list[float], cover: list[float], cut: float = 0.5) -> float:
    """Share of truly covered cells the output also calls covered — the veto's own metric."""
    want = np.array(cover) > cut
    return float(((np.array(probs) > cut) & want).sum() / max(1, want.sum()))


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
