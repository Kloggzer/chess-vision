"""Stage 5 — torch-free dataset logic.

Everything that works WITHOUT PyTorch and is therefore testable headless:
split filtering, frame grouping, **board accuracy** reconstruction, and
model card construction. The torch-bound parts (dataset, transforms) live in
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
        # Semantics as before Rework 05: missing manifest is a hard error, not an empty
        # dataset — otherwise one silently "trains" on nothing.
        raise FileNotFoundError(f"Manifest not found: {p}")
    return read_jsonl(p)


def crop_of_rows(rows: list[dict]) -> tuple[float, float] | None:
    """`(pad_side, pad_up)` EVERY row was cut with — or None when they cannot agree on one.

    None has two causes and one meaning. The rows may predate the fields (every crop written
    before 2026-08-06 does), or they may disagree because the sessions were sliced under
    different profiles. Either way the run must declare nothing: a consumer crops to what the
    model declares, so a wrong value is worse than an absent one — an absent one is at least
    visible as legacy (specs/45).
    """
    pads: set[tuple[float, float]] = set()
    for row in rows:
        if "pad_side" not in row or "pad_up" not in row:
            return None
        pads.add((float(row["pad_side"]), float(row["pad_up"])))
        if len(pads) > 1:
            return None
    return next(iter(pads)) if len(pads) == 1 else None


def load_split(path: Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def filter_rows_by_split(rows: list[dict], split: dict, which: str) -> list[dict]:
    """Only crops whose session belongs to the desired split (train/val/test)."""
    sids = set(split["splits"][which])
    return [r for r in rows if r["session_id"] in sids]


def class_to_idx(classes: list[str]) -> dict[str, int]:
    return {c: i for i, c in enumerate(classes)}


def board_accuracy(items: list[tuple[tuple, bool]]) -> float:
    """Fraction of frames where ALL squares are correct.

    `items`: list of ((session, frame), is_correct). A single wrong crop makes
    the whole board wrong — this is the metric that counts in real operation.
    """
    groups: dict[tuple, list[bool]] = defaultdict(list)
    for key, correct in items:
        groups[key].append(bool(correct))
    if not groups:
        return 0.0
    boards = [all(v) for v in groups.values()]
    return sum(boards) / len(boards)


def _piece_type(label: str) -> str:
    """'wP'->'P', 'bN'->'N', 'empty'/'occluded' stay as-is."""
    return label if label in ("empty", "occluded") else label[1]


def _piece_color(label: str) -> str | None:
    """'wP'->'w', 'bN'->'b', empty/occluded -> None (no color)."""
    return None if label in ("empty", "occluded") else label[0]


def occupancy_piece_breakdown(classes: list[str], trues: list[int], preds: list[int]) -> dict:
    """Head-INDEPENDENT error diagnosis from the 14-class output — shows WHERE errors occur
    (the central question from research: occupancy vs. type vs. color).

    - `occ_acc`: empty-vs-occupied per square correct (quality of the occupancy level; `occluded` counts as occupied).
    - `piece_acc`: among the TRULY occupied squares, the piece is exactly right (quality of the piece level).
    - `type_err` / `color_err`: fraction of true REAL pieces (12 classes) with type or pure
      color confusion (`wB→wN` = type; `wB→bB` = color). Sum ≤ (1−piece_acc on real pieces).
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
        "occ_acc": occ_ok / occ_n if occ_n else 0.0,
        "piece_acc": piece_ok / occ_total if occ_total else 0.0,
        "type_err": type_err_n / real_n if real_n else 0.0,
        "color_err": color_err_n / real_n if real_n else 0.0,
        "n_occupied": occ_total,
        "n_pieces": real_n,
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
    """Sortable score for checkpoint/early-stopping:
    (occ_board_acc, occ_acc, macro_recall) — occupancy first, macro_recall as tiebreaker."""
    occ_ba = occupancy_board_acc(rows, classes, trues, preds)
    bd = occupancy_piece_breakdown(classes, trues, preds)
    mr = _macro_recall(trues, preds, len(classes))
    return (occ_ba, bd["occ_acc"], mr)


def occupancy_board_acc(rows: list[dict], classes: list[str], trues: list[int], preds: list[int]) -> float:
    """Board accuracy ONLY at the occupancy level: a board is correct if all 64 squares
    are correctly classified as empty vs. occupied (significantly easier than full board accuracy)."""
    items = [((r["session_id"], str(r["frame"])),
              (classes[t] != "empty") == (classes[p] != "empty"))
              for r, t, p in zip(rows, trues, preds, strict=False)]
    return board_accuracy(items)


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
) -> dict:
    """`out_size` = the size the crops were built at; `infer_size` = the size the exported graph
    takes (specs/22). They are the same number for every run predating that pack, which is what
    `infer_size=None` records."""
    size = infer_size or out_size
    return {
        "classes": list(classes),
        "out_size": [int(out_size[0]), int(out_size[1])],
        "infer_size": [int(size[0]), int(size[1])],
        "normalize": {"mean": list(config.NORMALIZE_MEAN), "std": list(config.NORMALIZE_STD)},
        "backbone": backbone,
        "metrics": metrics,
        "torch_version": torch_version,
        "rocm_hip": hip_version,
        "exported_formats": list(exported_formats),
        "created_at": datetime.now(UTC).isoformat(),
    }
