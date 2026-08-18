"""Occluder mattes for a session: SAM 3 reads the stored board, the grid grooves veto it.

A model, where `occluded.py` uses none, because a light change between intervals reads as "not
the reference" and lights up a whole board. Numbers, rivals, prompts: `docs/session-mattes.md`.
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from . import config
from . import grid_occlusion as grid
from .calibration import mesh_from_lines
from .labeling import all_squares, crops_for_frame, read_log, read_session_meta, usable_board

SAM3_REPO = "facebook/sam3"
#: Unioned concept prompts. `person` is what closes a ring: an enumeration leaves the metal as a
#: hole in the matte (2074 px on 005745, 4 px with `person`), and a hole is a label that says
#: "board" where there is none. Long descriptions score worse than nouns — SAM 3 wants phrases.
CONCEPTS = ("person", "hand", "arm", "sleeve", "wristwatch")
SCORE_THR = 0.5
#: Past this share of the board it is not an arm reaching in. Nothing measured here came close.
MAX_ZONE_FRAC = 0.60

_MODEL: tuple = ()


def _sam3():
    """Loaded once, lazily — importing torch costs seconds the rest of the CLI must not pay."""
    global _MODEL
    if not _MODEL:
        import torch

        try:
            from transformers import Sam3Model, Sam3Processor
        except ImportError as e:  # optional, like every other heavy extra in this repo
            raise ImportError("matte-session needs transformers and an accepted licence for "
                              f"{SAM3_REPO}: uv run --with transformers, then `hf auth login`") from e
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _MODEL = (Sam3Processor.from_pretrained(SAM3_REPO),
                  Sam3Model.from_pretrained(SAM3_REPO).to(device).eval(), device)
    return _MODEL


def alpha_for(board: np.ndarray) -> tuple[np.ndarray, dict[str, float]]:
    """Union of the concept masks over one board raster, plus each concept's best score."""
    import torch

    processor, model, device = _sam3()
    rgb = cv2.cvtColor(board, cv2.COLOR_BGR2RGB)
    alpha = np.zeros(board.shape[:2], np.float32)
    hits: dict[str, float] = {}
    for concept in CONCEPTS:
        inputs = processor(images=rgb, text=concept, return_tensors="pt").to(device)
        with torch.no_grad():
            out = model(**inputs)
        found = processor.post_process_instance_segmentation(
            out, threshold=SCORE_THR, mask_threshold=0.5,
            target_sizes=inputs.get("original_sizes").tolist())[0]
        if not len(found["masks"]):
            continue
        mask = found["masks"].float().amax(0).cpu().numpy()
        alpha = np.maximum(alpha, cv2.resize(mask, (board.shape[1], board.shape[0])))
        hits[concept] = round(float(found["scores"].max()), 3)
    return alpha, hits


def coverage_of(alpha: np.ndarray, entry: dict, profile) -> dict[str, float]:
    """Per square, cut by the SAME `crops_for_frame` call the image goes through.

    That makes the label region the crop region by construction — mesh and pads included — which
    is the granularity the hand-marked class never had (`docs/occluder-plates.md`).
    """
    grey = cv2.cvtColor((np.clip(alpha, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    masks = crops_for_frame(None, entry["corners"], profile, board=grey,
                            out_size=tuple(profile.crop.out_size),
                            mesh=mesh_from_lines(entry.get("grid_lines")))
    return {sq: round(float(m.mean()) / 255.0, 4)
            for sq, m in zip(all_squares(), masks, strict=True)}


def veto(board: np.ndarray, entry: dict) -> str:
    """Why this frame may carry no matte at all, or "" when it may.

    The grid grooves are the one witness that shares no arithmetic with the model, so they decide
    WHETHER a hand is there; the model only decides where it is.
    """
    size, border = int(entry["board_size"]), int(entry["board_border"])
    grey = cv2.cvtColor(board, cv2.COLOR_BGR2GRAY)
    if not grid.hand_squares(grid.missing_edges(grey, size, border)):
        return "no grid hand"
    return ""


def matte_frame(board: np.ndarray, entry: dict, profile) -> tuple[np.ndarray | None, dict]:
    """One frame's matte and its row, or `(None, row)` when a veto fired."""
    row = {"frame": Path(entry["board"]).stem, "ply": entry.get("ply"),
           "dirty": bool(entry.get("dirty"))}
    if reason := veto(board, entry):
        return None, row | {"skipped": reason}
    alpha, hits = alpha_for(board)
    if float((alpha > 0.5).mean()) > MAX_ZONE_FRAC:
        return None, row | {"skipped": "zone too big"}
    coverage = coverage_of(alpha, entry, profile)
    return alpha, row | {"concepts": hits, "coverage": coverage,
                         "cells_over_half": sum(v > 0.5 for v in coverage.values())}


def matte_session(name: str, *, limit: int | None = None, progress: bool = True,
                  resume: bool = True) -> dict:
    """Every frame of `data/sessions/rg-<name>/` into `mattes/` + `matte.jsonl`.

    Not only the dirty ones: a resting hand sits in quiet windows too (1 % here) and would reach
    the trainer as coverage 0.0. The 30 ms grid veto keeps the model off the other 99 %.
    """
    import json

    from .calibration import load_profile
    from .ioutil import read_jsonl

    session_dir = config.DATA.sessions / f"rg-{name}"
    if not (session_dir / "log.jsonl").exists():
        raise FileNotFoundError(f"{name}: no exported session at {session_dir}")
    profile = load_profile(read_session_meta(session_dir)["profile"])
    entries = [e for e in read_log(session_dir) if usable_board(e, profile)]
    entries = entries[:limit] if limit else entries
    out_dir = session_dir / "mattes"
    out_dir.mkdir(exist_ok=True)
    path = session_dir / "matte.jsonl"
    done = {r["frame"]: r for r in read_jsonl(path)} if resume and path.exists() else {}
    rows, written = [], 0
    for n, entry in enumerate(entries, 1):
        if (kept := done.get(Path(entry["board"]).stem)) is not None:
            rows.append(kept)
            continue
        board = cv2.imread(str(session_dir / entry["board"]))
        if board is None:
            rows.append({"frame": Path(entry["board"]).stem, "skipped": "board unreadable"})
            continue
        alpha, row = matte_frame(board, entry, profile)
        if alpha is not None:
            cv2.imwrite(str(out_dir / f"{row['frame']}.webp"), (alpha * 255).astype(np.uint8))
            written += 1
        rows.append(row)
        if progress and n % 25 == 0:
            print(f"  {n}/{len(entries)} frames, {written} mattes", flush=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    skipped: dict[str, int] = {}
    for r in rows:
        if reason := r.get("skipped"):
            skipped[reason] = skipped.get(reason, 0) + 1
    return {"path": path, "frames": len(rows), "mattes": written, "skipped": skipped,
            "cells_over_half": sum(r.get("cells_over_half", 0) for r in rows)}
