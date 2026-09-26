"""Stage 5 — torch-free dataset logic: split filtering, frame grouping, board accuracy, model
card.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path

from .. import config


def crop_of_rows(rows: list[dict]) -> float | None:
    """The `pad_side` EVERY row was cut with, or None when they cannot agree (predating the field,
    or mixed profiles). A wrong declaration is worse than an absent one (specs/45).
    """
    pads: set[float] = set()
    for row in rows:
        if "pad_side" not in row:
            return None
        pads.add(float(row["pad_side"]))
        if len(pads) > 1:
            return None
    return next(iter(pads)) if len(pads) == 1 else None


def dataset_paths(ds_name: str | None, split_file: str | None = None,
                  default_split: str = "split.json") -> tuple[Path, Path]:
    if not ds_name:
        return config.DATA.crop_pool / "manifest.jsonl", config.DATA.reports / "split.json"
    from ..dataset_build import dataset_dir

    dd = dataset_dir(ds_name)
    return dd / "manifest.jsonl", dd / (split_file or default_split)


def unnamed_pin(ds_name: str, split_file: str | None,
                default_split: str = "split.json") -> Path | None:
    # Ein gepinnter Schnitt existiert genau dann, wenn der voreingestellte NICHT gemessen werden
    # soll: der Val von `real13-mix-v6-80` traegt keinen einzigen weissen Springer.
    from ..dataset_build import dataset_dir

    pinned = dataset_dir(ds_name) / "split-pin.json"
    if split_file is None and pinned.exists() and default_split != pinned.name:
        return pinned
    return None


def read_run_config(run_dir: Path) -> dict:
    return json.loads((Path(run_dir) / "config.json").read_text(encoding="utf-8"))


def filter_rows_by_split(rows: list[dict], split: dict, which: str) -> list[dict]:
    """Only crops whose session belongs to the desired split (train/val/test)."""
    sids = set(split["splits"][which])
    return [r for r in rows if r["session_id"] in sids]


def class_to_idx(classes: list[str]) -> dict[str, int]:
    return {c: i for i, c in enumerate(classes)}


def board_accuracy(items: list[tuple[tuple, bool]], tolerance: int = 0) -> float:
    """Fraction of frames with at most `tolerance` wrong squares; `items` = ((session, frame),
    is_correct).

    `tolerance`: 32 Figuren gleichzeitig richtig sind bei `piece_acc` 0,657 genau 1,5e-06.
    """
    groups: dict[tuple, list[bool]] = defaultdict(list)
    for key, correct in items:
        groups[key].append(bool(correct))
    if not groups:
        return 0.0
    boards = [sum(1 for c in v if not c) <= tolerance for v in groups.values()]
    return sum(boards) / len(boards)


def visible_board_items(rows: list[dict], trues: list[int], preds: list[int]) -> list[tuple[tuple, bool]]:
    """Board-Items OHNE verdeckte Zellen: 46 % der Val-Bretter tragen eine, `board_acc` waere sonst
    konstruktionsbedingt auf 54 % gedeckelt.
    """
    from ..cell_rule import classification_eligible

    return [((r["session_id"], str(r["frame"])), bool(t == p))
            for r, t, p in zip(rows, trues, preds, strict=True)
            if classification_eligible(r)]


def _piece_type(label: str) -> str:
    """'wP'->'P', 'bN'->'N', 'empty'/'occluded' stay as-is."""
    return label if label in ("empty", "occluded") else label[1]


def _piece_color(label: str) -> str | None:
    """'wP'->'w', 'bN'->'b', empty/occluded -> None (no color)."""
    return None if label in ("empty", "occluded") else label[0]


def occupancy_piece_breakdown(classes: list[str], trues: list[int], preds: list[int]) -> dict:
    """Head-independent error diagnosis: occupancy vs. type vs. color.

    `occupied_acc` (occluded counts as occupied), `piece_acc` on truly occupied squares,
    `type_err`/`color_err` over real pieces (`wB→wN` type, `wB→bB` color).
    """
    occ_ok = occ_n = 0
    piece_ok = occ_total = 0          # over TRULY occupied squares (incl. occluded)
    real_n = type_err_n = color_err_n = 0   # over true real pieces (12)
    for t, p in zip(trues, preds, strict=False):
        tl, pl = classes[t], classes[p]
        t_occ, p_occ = tl != "empty", pl != "empty"
        occ_n += 1
        occ_ok += int(t_occ == p_occ)
        if t_occ:
            occ_total += 1
            piece_ok += int(t == p)
            if tl != "occluded":                       # true real piece -> type/color defined
                real_n += 1
                if _piece_type(pl) != _piece_type(tl):
                    type_err_n += 1
                elif _piece_color(pl) != _piece_color(tl):
                    color_err_n += 1
    return {
        "occupied_acc": occ_ok / occ_n if occ_n else 0.0,
        "piece_acc": piece_ok / occ_total if occ_total else 0.0,
        "type_err": type_err_n / real_n if real_n else 0.0,
        "color_err": color_err_n / real_n if real_n else 0.0,
        "n_occupied": occ_total,
        "n_pieces": real_n,
        # Der Nenner gehoert mit heraus: sonst ist eine leere Menge nicht von einer gemessenen Null
        # zu unterscheiden.
        "n_cells": occ_n,
    }


def _macro_recall(trues: list[int], preds: list[int], n_classes: int) -> float:
    """Per-class recall, averaged over all classes with support (true>0)."""
    per_class_correct = [0] * n_classes
    per_class_total = [0] * n_classes
    for t, p in zip(trues, preds, strict=False):
        per_class_total[t] += 1
        if t == p:
            per_class_correct[t] += 1
    recalls = [per_class_correct[i] / per_class_total[i] for i in range(n_classes) if per_class_total[i] > 0]
    return sum(recalls) / len(recalls) if recalls else 0.0


def checkpoint_score(rows: list[dict], classes: list[str],
                     trues: list[int], preds: list[int]) -> tuple[float, float, float]:
    """Sortable checkpoint score: (weighted score, occupied_board_acc, macro_recall), see
    CHECKPOINT_WEIGHTS.
    """
    return checkpoint_metrics(rows, classes, trues, preds)[0]


#: Beide Ebenen eines SICHTBAREN Feldes gleich gewichtet, plus die Konfidenz-AUROC als
#: Falsch-Detektor (skaleninvariant), klein, damit sie nur bei gleich genauen Epochen entscheidet.
CHECKPOINT_WEIGHTS = {"visible_piece_acc": 0.45, "visible_occupied_acc": 0.45,
                      "calibration": 0.10}


def checkpoint_metrics(rows: list[dict], classes: list[str], trues: list[int],
                       preds: list[int],
                       auroc: float | None = None) -> tuple[tuple[float, float, float], dict]:
    """Gewichteter Checkpoint-Score plus die geteilte Belegungs-Aufschluesselung, in einem Durchgang."""
    bd = occupancy_piece_breakdown(classes, trues, preds)
    # Benotet wird, was der Verlust lernt, auch in beiden Tiebreakern; ohne Coverage-Spalte ist jede
    # Zelle sichtbar.
    from ..cell_rule import classification_eligible

    vis = [i for i, r in enumerate(rows) if classification_eligible(r)]
    v_rows = [rows[i] for i in vis]
    v_trues, v_preds = [trues[i] for i in vis], [preds[i] for i in vis]
    bd_vis = occupancy_piece_breakdown(classes, v_trues, v_preds)
    bd["occupied_board_acc"] = occupancy_board_acc(v_rows, classes, v_trues, v_preds)
    bd["visible_piece_acc"] = bd_vis["piece_acc"]
    bd["visible_occupied_acc"] = bd_vis["occupied_acc"]
    # Ohne gemessene Konfidenz neutral (0,5).
    bd["calibration"] = auroc if auroc is not None else 0.5
    score = sum(w * bd[k] for k, w in CHECKPOINT_WEIGHTS.items())
    mr = _macro_recall(v_trues, v_preds, len(classes))
    return (score, bd["occupied_board_acc"], mr), bd


def occupancy_board_acc(rows: list[dict], classes: list[str], trues: list[int], preds: list[int]) -> float:
    """Board accuracy at the occupancy level only: all 64 squares right as empty vs. occupied."""
    items = [((r["session_id"], str(r["frame"])),
              (classes[t] != "empty") == (classes[p] != "empty"))
              for r, t, p in zip(rows, trues, preds, strict=False)]
    return board_accuracy(items)


def per_session_metrics(rows: list[dict], classes: list[str],
                        trues: list[int], preds: list[int]) -> dict[str, dict]:
    """The corpus line's three numbers per session; `evaluate_dataset` runs unshuffled, so
    `trues[i]`/`preds[i]` line up with `rows[i]`.
    """
    from ..cell_rule import classification_eligible

    by_sid: dict[str, list[tuple[dict, int, int]]] = defaultdict(list)
    for r, t, p in zip(rows, trues, preds, strict=False):
        by_sid[r["session_id"]].append((r, t, p))
    out: dict[str, dict] = {}
    for sid, items in by_sid.items():
        visible = [(r, t, p_) for r, t, p_ in items if classification_eligible(r)]
        ok = [t == p for _, t, p in visible]
        boards = [((r["session_id"], str(r["frame"])), t == p) for r, t, p in visible]
        # `piece_acc` streut ueber die Sessions am staerksten (0,584 bis 0,993) und entscheidet.
        vis = [(t, p_) for _, t, p_ in visible if classes[t] != "empty"]
        vrs = [r for r, _, _ in visible]
        vts = [t for _, t, _ in visible]
        vps = [p for _, _, p in visible]
        # Leerer Nenner ist `None`, nicht `nan`: die Zahlen gehen nach JSON.
        out[sid] = {"crops": len(items), "square_acc": sum(ok) / len(ok) if ok else None,
                    "visible_piece_acc": (sum(t == p_ for t, p_ in vis) / len(vis)) if vis else None,
                    "board_acc": board_accuracy(boards) if boards else None,
                    "occupied_board_acc": (occupancy_board_acc(vrs, classes, vts, vps)
                                           if vrs else None)}
    return out


def visible_confidence(rows, trues, preds, conf):
    """(trues, preds, conf) nur auf sichtbaren Zellen — leere Konfidenz reicht sie durch."""
    from ..cell_rule import classification_eligible

    if not conf:
        return trues, preds, conf
    vis = [i for i, r in enumerate(rows) if classification_eligible(r)]
    return [trues[i] for i in vis], [preds[i] for i in vis], [conf[i] for i in vis]


def confidence_auroc(trues, preds, conf) -> float:
    """Wie gut trennt die Konfidenz richtig von falsch (0,5 = Zufall). Skaleninvariant, anders als
    `conf_right - conf_wrong`, das fast nur `conf_wrong` neu misst.
    """
    import numpy as np

    t, p, c = np.asarray(trues), np.asarray(preds), np.asarray(conf, dtype=float)
    if not len(c):
        return 0.5
    ok = t == p
    n_pos, n_neg = int(ok.sum()), int((~ok).sum())
    if not n_pos or not n_neg:
        return 0.5
    # DURCHSCHNITTSRAENGE: sonst faellt "alle gleich sicher" je nach Sortierung auf 0,0 oder 1,0
    # statt 0,5.
    order = np.argsort(c, kind="mergesort")
    s = c[order]
    ranks = np.empty(len(c), dtype=float)
    i = 0
    while i < len(s):
        j = i
        while j + 1 < len(s) and s[j + 1] == s[i]:
            j += 1
        ranks[order[i:j + 1]] = (i + j) / 2.0 + 1.0
        i = j + 1
    return float((ranks[ok].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg))


def confident_confusions(classes: list[str], trues, preds, conf, top: int = 8) -> list[dict]:
    """Welche Verwechslungen tragen die UEBERZEUGTEN Fehler — (wahr, vorhergesagt, n, mean_conf),
    sortiert nach n * mean_conf.
    """
    import numpy as np

    t, p, c = np.asarray(trues), np.asarray(preds), np.asarray(conf, dtype=float)
    wrong = t != p
    if not wrong.any():
        return []
    out: dict[tuple[int, int], list[float]] = {}
    for ti, pi, ci in zip(t[wrong], p[wrong], c[wrong], strict=True):
        out.setdefault((int(ti), int(pi)), []).append(float(ci))
    rows = [{"true": classes[k[0]], "pred": classes[k[1]], "n": len(v),
             "mean_conf": sum(v) / len(v)} for k, v in out.items()]
    rows.sort(key=lambda r: r["n"] * r["mean_conf"], reverse=True)
    return rows[:top]


def build_model_card(
    *,
    classes: list[str],
    out_size: tuple[int, int],
    backbone: str,
    metrics: dict,
    torch_version: str,
    hip_version: str | None,
    exported_formats: list[str],
    infer_size: tuple[int, int] | None = None,
    normalize: dict | None = None,
) -> dict:
    """`out_size` = the crops' build size; `infer_size` = what the exported graph takes (specs/22),
    None for runs predating it.
    """
    size = infer_size or out_size
    return {
        "classes": list(classes),
        "out_size": [int(out_size[0]), int(out_size[1])],
        "infer_size": [int(size[0]), int(size[1])],
        # Woertlich aus `config.json`: `--crop-norm per-crop` rechnet mean/std gar nicht.
        "normalize": normalize or {"mean": list(config.NORMALIZE_MEAN),
                                   "std": list(config.NORMALIZE_STD), "mode": "fixed"},
        "backbone": backbone,
        # Kein `coverage_gate`: es wird NACH dem Ablegen gemessen und steht in der
        # Asset-`config.json` (`scripts/stage_model_asset.py --gate`).
        "metrics": metrics,
        "torch_version": torch_version,
        "rocm_hip": hip_version,
        "exported_formats": list(exported_formats),
        "created_at": datetime.now(UTC).isoformat(),
    }
