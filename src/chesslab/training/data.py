"""Stufe 5 — torch-freie Datensatz-Logik.

Hier liegt alles, was OHNE PyTorch funktioniert und damit headless testbar ist:
Split-Filterung, Frame-Gruppierung, **Board-Accuracy**-Rekonstruktion und der
Model-Card-Aufbau. Die torch-gebundenen Teile (Dataset, Transforms) leben in
`torch_data.py`.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from .. import config


def load_manifest(path: Path) -> list[dict]:
    rows = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def load_split(path: Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def filter_rows_by_split(rows: list[dict], split: dict, which: str) -> list[dict]:
    """Nur Crops, deren Session zum gewünschten Split (train/val/test) gehört."""
    sids = set(split["splits"][which])
    return [r for r in rows if r["session_id"] in sids]


def class_to_idx(classes: list[str]) -> dict[str, int]:
    return {c: i for i, c in enumerate(classes)}


def group_frames(rows: list[dict]) -> dict[tuple[str, str], list[dict]]:
    """Crops je Frame gruppieren über (session_id, frame) — Basis der Board-Accuracy."""
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for r in rows:
        groups[(r["session_id"], str(r["frame"]))].append(r)
    return dict(groups)


def board_accuracy(items: list[tuple[tuple, bool]]) -> float:
    """Anteil der Frames, deren ALLE Felder korrekt sind.

    `items`: Liste von ((session, frame), is_correct). Ein einziger falscher Crop macht
    das ganze Board falsch — das ist die Zahl, die im Echtbetrieb zählt.
    """
    groups: dict[tuple, list[bool]] = defaultdict(list)
    for key, correct in items:
        groups[key].append(bool(correct))
    if not groups:
        return 0.0
    boards = [all(v) for v in groups.values()]
    return sum(boards) / len(boards)


def macro_f1(trues: list[int], preds: list[int], n_classes: int) -> float:
    """Makro-F1 über die Klassen: ungewichteter Mittelwert der Per-Klassen-F1. Anders als die
    rohe Accuracy lässt die empty-Dominanz so nicht das Bild kippen. Gemittelt über alle Klassen
    mit Support (true-count>0) oder Vorhersage — abwesende Klassen verzerren den Schnitt nicht."""
    tp = defaultdict(int)
    fp = defaultdict(int)
    fn = defaultdict(int)
    present: set[int] = set()
    for t, p in zip(trues, preds):
        present.add(t)
        present.add(p)
        if t == p:
            tp[t] += 1
        else:
            fp[p] += 1
            fn[t] += 1
    if not present:
        return 0.0
    f1s = []
    for c in present:
        denom = 2 * tp[c] + fp[c] + fn[c]
        f1s.append((2 * tp[c] / denom) if denom else 0.0)
    return sum(f1s) / len(f1s)


def grouped_board_acc(rows: list[dict], group_key: str) -> dict[str, float]:
    """Board-Accuracy je Gruppe (z.B. `session_id` oder `camera`/`profile`). Boards bleiben über
    (session_id, frame) definiert; nur die Aggregation wird nach `group_key` aufgeteilt.

    `rows`: Dicts mit `group_key`, `session_id`, `frame`, `correct` (bool)."""
    groups: dict[str, list[tuple[tuple, bool]]] = defaultdict(list)
    for r in rows:
        groups[str(r[group_key])].append(((r["session_id"], str(r["frame"])), bool(r["correct"])))
    return {g: board_accuracy(items) for g, items in groups.items()}


def board_acc_spread(grouped: dict[str, float]) -> float:
    """Spannweite (max−min) der gruppierten Board-Accuracy = Resilienzmaß (über Licht/Setup/Kamera).
    0 bei < 2 Gruppen."""
    if len(grouped) < 2:
        return 0.0
    vals = list(grouped.values())
    return max(vals) - min(vals)


def build_model_card(
    *,
    classes: list[str],
    out_size: tuple[int, int],
    backbone: str,
    metrics: dict,
    torch_version: str,
    hip_version: str | None,
    exported_formats: list[str],
) -> dict:
    return {
        "classes": list(classes),
        "out_size": [int(out_size[0]), int(out_size[1])],
        "normalize": {"mean": list(config.NORMALIZE_MEAN), "std": list(config.NORMALIZE_STD)},
        "backbone": backbone,
        "metrics": metrics,
        "torch_version": torch_version,
        "rocm_hip": hip_version,
        "exported_formats": list(exported_formats),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
