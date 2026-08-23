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
from datetime import UTC, datetime
from pathlib import Path

import cv2
import numpy as np

from .calibration import load_profile
from .labeling import all_squares, crops_for_frame, read_log, read_session_meta
from .state import GameState


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


def all_reads(run_dir: Path, cells: list[np.ndarray], device: str = "cpu") -> list[dict]:
    """Per crop the full softmax AND the occlusion head's coverage, where the run carries one."""
    from . import serving

    return serving.predict_arrays(run_dir, cells, device=device, return_probs=True)


def all_probs(run_dir: Path, cells: list[np.ndarray], device: str = "cpu") -> list[list[float]]:
    """The full softmax per crop, in the run's class order."""
    return [[float(x) for x in r["probs"]] for r in all_reads(run_dir, cells, device)]


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


def frame_cells(session_dir: Path, row: dict, profile) -> list[np.ndarray]:
    """The 64 BGR crops of one logged row — through `crops_for_frame`, the slice's own path.

    From the stored BOARD, like `slice_session`: a session has kept no source stills since the
    board store landed (2026-08-17), and reading `row["frame"]` failed on every session.
    """
    path = session_dir / (row.get("board") or row["frame"])
    board = cv2.imread(str(path))
    if board is None:
        raise FileNotFoundError(f"board not readable: {path}")
    return crops_for_frame(None, row["corners"], profile, board=board)


#: What one model saw on every square of a session. `occluded-proposals.jsonl` carried this as a
#: side effect of hunting occlusion — which SAM 3 measures now, so the reads travel alone.
READS_FILE = "model-reads.jsonl"


def read_session(name: str, model_dir: Path, *, device: str = "cpu",
                 progress: bool = True) -> dict:
    """Every square of every board, as the model reads it, into `model-reads.jsonl`.

    EVERY row, not only the dirty ones: a wrong piece on a clean board is what the p8 stock
    trains on, and the proposer only ever looked at the pile (`docs/frame-scan.md`).
    """
    from .realgames import PROGRESS_EVERY, game_dir

    session_dir = game_dir(name)
    if not (session_dir / "log.jsonl").exists():
        raise FileNotFoundError(f"{name}: no exported session at {session_dir}")
    meta = read_session_meta(session_dir)
    check_not_circular(model_dir, meta["session_id"])
    profile = load_profile(meta["profile"])
    classes = model_classes(model_dir)
    squares = all_squares()
    rows = [r for r in read_log(session_dir) if r.get("board") or r.get("frame")]
    path = game_dir(name) / READS_FILE
    written = 0
    with path.open("w", encoding="utf-8") as fh:
        fh.write(json.dumps({"_model": str(model_dir), "_classes": classes,
                             "_written_at": datetime.now(UTC).isoformat()}) + "\n")
        for n, row in enumerate(rows, 1):
            reads = all_reads(model_dir, frame_cells(session_dir, row, profile), device)
            stem = Path(row["frame"]).stem
            labels = GameState(row["fen"]).labels()
            for sq, read in zip(squares, reads, strict=True):
                # `cov` rides along only where the run carries an occlusion head: `hand_flags`
                # needs the model's claim beside the matte's measurement, and a re-read is an hour.
                cov = read.get("coverage")
                fh.write(json.dumps({
                    "session_id": meta["session_id"], "frame": stem, "square": sq,
                    "fen_label": labels[sq], "dirty_reason": row.get("dirty_reason"),
                    **({"cov": cov} if cov is not None else {}),
                    "probs": sparse(read["probs"], classes)}) + "\n")
                written += 1
            if progress and n % PROGRESS_EVERY == 0:
                print(f"  {n}/{len(rows)} boards, {written} cells", flush=True)
    return {"path": path, "boards": len(rows), "cells": written, "model": str(model_dir)}
