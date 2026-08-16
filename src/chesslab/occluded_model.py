"""The trained model as a SECOND proposer — suggestions for a human, never labels.

`occluded.py` scores pixels against an interval's own quiet frames and takes no model output at
all, deliberately: a producer that learns from its own reads confirms its own mistakes. That
argument bounds what a model may do here, it does not forbid it. Proposing is not labelling —
every row this file emits still has to survive a keypress in the relabel UI, which is the
standard pre-label-then-correct workflow, not a feedback loop.

Two rules keep it honest, and they are the whole design:

- **Never on the video it was trained on.** Scoring `rg-rec-20260808-*` with a model whose
  `occluded` class came from exactly those cells reproduces its training labels and measures
  nothing. The caller is refused when the session is in the model's own training split.
- **The pixel channel keeps its own column.** `pixel_score` and `model_score` are written
  separately and `score` is their max, so a disagreement stays visible in the file instead of
  being averaged into a number nobody can take apart afterwards.

Preprocessing goes through `serving.predict_arrays`, the same path the device serves on — a
hand-rolled resize here would measure a domain shift instead of the model.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

OCCLUDED = "occluded"


def model_classes(run_dir: Path) -> list[str]:
    cfg = json.loads((run_dir / "config.json").read_text(encoding="utf-8"))
    return list(cfg.get("classes", []))


def trained_on(run_dir: Path) -> set[str]:
    """Session ids in the model's training split — the sessions it must not be asked about."""
    cfg = json.loads((run_dir / "config.json").read_text(encoding="utf-8"))
    dataset = cfg.get("dataset")
    if not dataset:
        return set()
    from . import config

    split = config.DATA.datasets / dataset / (cfg.get("split_file") or "split.json")
    if not split.exists():
        return set()
    splits = json.loads(split.read_text(encoding="utf-8")).get("splits") or {}
    return set(splits.get("train") or [])


def _names_session(entry: str, session_id: str) -> bool:
    """Crops enter datasets under variant prefixes (`occ-rg-…`), which walked past the literal
    match — the guard then ALLOWED exactly the trained-on sessions (found 2026-08-15)."""
    return entry == session_id or entry.endswith("-" + session_id)


def check_not_circular(run_dir: Path, session_id: str) -> None:
    """Refuse loudly: a model scoring its own training session is a mirror, not a proposer."""
    hits = sorted(e for e in trained_on(run_dir) if _names_session(e, session_id))
    if hits:
        raise ValueError(
            f"{run_dir.name} was TRAINED on {session_id} (split entries: {', '.join(hits)}) — "
            f"its reads there are its own labels. "
            f"Use a model trained without this session, or drop --model for this one."
        )


def p_occluded(run_dir: Path, cells: list[np.ndarray], device: str = "cpu") -> list[float]:
    """`P(occluded)` per crop, through the serving path. Zeros when the class list has none."""
    classes = model_classes(run_dir)
    if OCCLUDED not in classes:
        return [0.0] * len(cells)
    idx = classes.index(OCCLUDED)
    return [p[idx] for p in all_probs(run_dir, cells, device)]


def all_probs(run_dir: Path, cells: list[np.ndarray], device: str = "cpu") -> list[list[float]]:
    """The full softmax per crop, in the run's class order."""
    from . import serving

    out = serving.predict_arrays(run_dir, cells, device=device, return_probs=True)
    return [[float(x) for x in r["probs"]] for r in out]


#: Below this a probability is noise no filter would ever be pointed at.
PROB_FLOOR = 0.01


def sparse(probs: list[float], classes: list[str], floor: float = PROB_FLOOR) -> dict[str, float]:
    """Only what a human would ever filter on.

    A full 14-float vector per cell is ~12 MB per session of mostly `empty: 0.999`, and the UI
    parses the file on every request. Dropping everything under [floor] keeps the queries the
    relabel filter actually asks — "occluded > 0.1", "the model disagrees with the FEN" — while
    the rows stay small. A class absent from the dict is below the floor, not unknown.
    """
    return {c: round(p, 3) for c, p in zip(classes, probs, strict=True) if p >= floor}
