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
