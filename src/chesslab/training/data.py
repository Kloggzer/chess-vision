"""Stufe 5 — torch-freie Datensatz-Logik.

Hier liegt alles, was OHNE PyTorch funktioniert und damit headless testbar ist:
Split-Filterung, Frame-Gruppierung, **Board-Accuracy**-Rekonstruktion und der
Model-Card-Aufbau. Die torch-gebundenen Teile (Dataset, Transforms) leben in
`torch_data.py`.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path

from .. import config


def load_manifest(path: Path) -> list[dict]:
    from ..ioutil import read_jsonl

    p = Path(path)
    if not p.exists():
        # Semantik wie vor Rework 05: fehlendes Manifest ist ein harter Fehler, kein leerer
        # Datensatz — sonst „trainiert" man still auf nichts.
        raise FileNotFoundError(f"Manifest nicht gefunden: {p}")
    return read_jsonl(p)


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


def _piece_type(label: str) -> str:
    """'wP'->'P', 'bN'->'N', 'empty'/'occluded' bleiben sie selbst."""
    return label if label in ("empty", "occluded") else label[1]


def _piece_color(label: str) -> str | None:
    """'wP'->'w', 'bN'->'b', leer/verdeckt -> None (keine Farbe)."""
    return None if label in ("empty", "occluded") else label[0]


def occupancy_piece_breakdown(classes: list[str], trues: list[int], preds: list[int]) -> dict:
    """Kopf-UNABHÄNGIGE Fehler-Diagnose aus dem 14-Klassen-Output — zeigt, WO die Fehler sitzen
    (die zentrale Frage aus der Recherche: Occupancy vs. Typ vs. Farbe).

    - `occ_acc`: leer-vs-besetzt pro Feld korrekt (Güte der Occupancy-Stufe; `occluded` zählt als besetzt).
    - `piece_acc`: unter den WAHR besetzten Feldern die Figur exakt richtig (Güte der Figuren-Stufe).
    - `type_err` / `color_err`: Anteil der wahren ECHTEN Figuren (12 Klassen) mit Typ- bzw. reiner
      Farb-Verwechslung (`wB→wN` = Typ; `wB→bB` = Farbe). Summe ≤ (1−piece_acc auf echten Figuren).
    """
    occ_ok = occ_n = 0
    piece_ok = occ_total = 0          # über WAHR besetzte Felder (inkl. occluded)
    real_n = type_err_n = color_err_n = 0   # über wahre echte Figuren (12)
    for t, p in zip(trues, preds):
        tl, pl = classes[t], classes[p]
        t_occ, p_occ = tl != "empty", pl != "empty"
        occ_n += 1
        occ_ok += int(t_occ == p_occ)
        if t_occ:
            occ_total += 1
            piece_ok += int(t == p)
            if tl != "occluded":                       # wahre echte Figur -> Typ/Farbe definiert
                real_n += 1
                if _piece_type(pl) != _piece_type(tl):
                    type_err_n += 1
                elif _piece_color(pl) != _piece_color(tl):
                    color_err_n += 1
    return {
        "occ_acc": occ_ok / occ_n if occ_n else 0.0,
        "piece_acc": piece_ok / occ_total if occ_total else 0.0,
        "type_err": type_err_n / real_n if real_n else 0.0,
        "color_err": color_err_n / real_n if real_n else 0.0,
        "n_occupied": occ_total,
        "n_pieces": real_n,
    }


def _macro_recall(trues: list[int], preds: list[int], n_classes: int) -> float:
    """Per-Klassen-Recall, gemittelt über alle Klassen mit Support (true>0)."""
    per_class_correct = [0] * n_classes
    per_class_total = [0] * n_classes
    for t, p in zip(trues, preds):
        per_class_total[t] += 1
        if t == p:
            per_class_correct[t] += 1
    recalls = [per_class_correct[i] / per_class_total[i] for i in range(n_classes) if per_class_total[i] > 0]
    return sum(recalls) / len(recalls) if recalls else 0.0


def checkpoint_score(rows: list[dict], classes: list[str],
                     trues: list[int], preds: list[int]) -> tuple[float, float, float]:
    """Sortierbarer Score für Checkpoint/Early-Stopping:
    (occ_board_acc, occ_acc, macro_recall) — Occupancy zuerst, macro_recall als Tiebreaker."""
    occ_ba = occupancy_board_acc(rows, classes, trues, preds)
    bd = occupancy_piece_breakdown(classes, trues, preds)
    mr = _macro_recall(trues, preds, len(classes))
    return (occ_ba, bd["occ_acc"], mr)


def occupancy_board_acc(rows: list[dict], classes: list[str], trues: list[int], preds: list[int]) -> float:
    """Board-Accuracy NUR auf der Occupancy-Stufe: ein Board ist korrekt, wenn alle 64 Felder
    leer-vs-besetzt richtig sind (deutlich leichter als die volle Board-Accuracy)."""
    items = [((r["session_id"], str(r["frame"])),
              (classes[t] != "empty") == (classes[p] != "empty"))
             for r, t, p in zip(rows, trues, preds)]
    return board_accuracy(items)


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
        "created_at": datetime.now(UTC).isoformat(),
    }
