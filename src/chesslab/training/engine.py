"""Stage 5 — shared eval mechanics (used by train.py and evaluate.py)."""

from __future__ import annotations

import numpy as np
import torch

from .data import board_accuracy


def get_device(require_gpu: bool):
    if torch.cuda.is_available():
        return torch.device("cuda")
    if require_gpu:
        raise RuntimeError("no usable GPU (torch.cuda.is_available()==False).")
    return torch.device("cpu")


@torch.no_grad()
def evaluate_dataset(model, dataset, device, criterion=None, batch_size: int = 256, num_workers: int = 4,
                     input_size: int | None = None) -> dict:
    """Square accuracy, board accuracy, loss and raw (true, pred) arrays for a dataset.

    `input_size`: wenn gesetzt, wird jeder Batch auf diese Eingabegröße skaliert (size-agnostisches
    Modell) → so misst man die Genauigkeit bei einer bestimmten Deployment-Auflösung (Auflösungs-Kurve).
    """
    import torch
    from torch.utils.data import DataLoader

    kw = {"batch_size": batch_size, "shuffle": False, "num_workers": num_workers, "pin_memory": True}
    if num_workers > 0:
        kw["prefetch_factor"] = 4
    loader = DataLoader(dataset, **kw)
    model.eval()
    trues: list[int] = []
    preds: list[int] = []
    loss_sum = 0.0
    n = 0
    for x, y in loader:
        x = x.to(device, non_blocking=True)
        y = y.to(device, non_blocking=True)
        if input_size is not None and input_size != x.shape[-1]:
            x = torch.nn.functional.interpolate(x, size=(input_size, input_size), mode="bilinear", align_corners=False)
        logits = model(x)
        if criterion is not None:
            loss_sum += float(criterion(logits, y)) * x.size(0)
        p = logits.argmax(1)
        trues.extend(y.cpu().tolist())
        preds.extend(p.cpu().tolist())
        n += x.size(0)

    trues_a = np.array(trues)
    preds_a = np.array(preds)
    square_acc = float((trues_a == preds_a).mean()) if n else 0.0

    # Macro-recall: mean of per-class hit rate over present classes.
    # Meaningful even when board_acc=0 (small/hard datasets) and ignores the
    # empty dominance -> better checkpoint/early-stop metric than raw square_acc.
    n_classes = len(getattr(dataset, "c2i", {})) or (int(max(trues_a.max(), preds_a.max())) + 1 if n else 1)
    cm = confusion_matrix(trues_a, preds_a, n_classes) if n else np.zeros((1, 1))
    present = cm.sum(axis=1) > 0
    macro_recall = float(per_class_recall(cm)[present].mean()) if present.any() else 0.0

    # Board-Accuracy: Crops über (session, frame) gruppieren (dataset.rows ist ausgerichtet).
    # strict: rows and predictions MUST align 1:1 — silent truncation here would compute
    # board accuracy on a shifted pairing (the plausible-but-wrong failure mode).
    items = [((r["session_id"], str(r["frame"])), bool(t == p))
             for r, t, p in zip(dataset.rows, trues, preds, strict=True)]
    board_acc = board_accuracy(items)

    return {
        "loss": loss_sum / n if (criterion is not None and n) else None,
        "square_acc": square_acc,
        "macro_recall": macro_recall,
        "board_acc": board_acc,
        "trues": trues_a,
        "preds": preds_a,
    }


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
