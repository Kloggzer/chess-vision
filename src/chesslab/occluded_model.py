"""The trained model as a SECOND proposer — suggestions for a human, never labels.

Never on its own training sessions (a mirror, not a proposer), and preprocessing goes through
`serving.predict_arrays`, the path the device serves on.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import cv2
import numpy as np

from . import provenance
from .calibration import load_profile
from .labeling import all_squares, crops_for_frame, usable_board
from .runs import read_run_config
from .session_store.log import read_log_rows
from .session_store.names import READS_FILE, log_path
from .session_store.paths import read_session_meta
from .state import GameState


def model_classes(run_dir: Path) -> list[str]:
    return list(read_run_config(run_dir).get("classes", []))


def split_path(run_dir: Path) -> Path | None:
    """Where the run's training split should be — `None` when the run names no dataset."""
    cfg = read_run_config(run_dir)
    dataset = cfg.get("dataset")
    if not dataset:
        return None
    from . import config

    return config.DATA.datasets / dataset / (cfg.get("split_file") or "split.json")


def trained_on(run_dir: Path) -> set[str]:
    """Session ids in the model's training split. The run's OWN `config.json["split"]` wins: the
    dataset directory can be rebuilt or deleted underneath it.
    """
    embedded = (read_run_config(run_dir).get("split") or {}).get("splits")
    if embedded:
        return set(embedded.get("train") or [])
    split = split_path(run_dir)
    if split is None or not split.exists():
        return set()
    splits = json.loads(split.read_text(encoding="utf-8")).get("splits") or {}
    return set(splits.get("train") or [])


def _names_session(entry: str, session_id: str) -> bool:
    """Crops enter datasets under variant prefixes (`occ-rg-…`); a literal match allowed exactly the
    trained-on sessions.
    """
    return entry == session_id or entry.endswith("-" + session_id)


def check_not_circular(run_dir: Path, session_id: str) -> None:
    """Refuse loudly: a model scoring its own training session is a mirror. An UNREADABLE split
    refuses too — no hits there does not mean "held out".
    """
    embedded = (read_run_config(run_dir).get("split") or {}).get("splits")
    split = split_path(run_dir)
    if not embedded and split is None:
        raise ValueError(f"{run_dir.name} carries neither a `split` nor a dataset name, so its "
                         f"training split cannot be checked — the guard refuses rather than "
                         f"assume {session_id} is held out.")
    if not embedded and not split.exists():
        raise ValueError(f"{run_dir.name} was trained on `{split.parent.name}`, whose split is "
                         f"not on disk ({split}) — whether {session_id} is held out is UNKNOWN, "
                         f"so the guard refuses. Restore the dataset or use another model.")
    hits = sorted(e for e in trained_on(run_dir) if _names_session(e, session_id))
    if hits:
        raise ValueError(
            f"{run_dir.name} was TRAINED on {session_id} (split entries: {', '.join(hits)}) — "
            f"its reads there are its own labels. "
            f"Use a model trained without this session, or drop --model for this one."
        )


def all_reads(run_dir: Path, cells: list[np.ndarray], device: str = "cpu",
              weights: str | None = None) -> list[dict]:
    """Per crop the full softmax AND the occlusion head's coverage, where the run carries one."""
    from . import serving

    return serving.predict_arrays(run_dir, cells, device=device, return_probs=True, weights=weights)


#: Below this a probability is noise no filter would ever be pointed at.
PROB_FLOOR = 0.01


def sparse(probs: list[float], classes: list[str], floor: float = PROB_FLOOR) -> dict[str, float]:
    """Only what a human would ever filter on; the full vector was ~12 MB per session of `empty:
    0.999`. A class absent from the dict is below the floor, not unknown.
    """
    return {c: round(p, 3) for c, p in zip(classes, probs, strict=True) if p >= floor}


def frame_cells(session_dir: Path, row: dict, profile) -> list[np.ndarray]:
    """The 64 BGR crops of one logged row via `crops_for_frame`, from the stored BOARD; a row
    without one falls back to its frame, warped.
    """
    # `usable_board` ist die Wache jedes Brettlesers: mit dem gerade geladenen Profil geschnitten
    # liegt ein Brett anderer Groesse bis zu 59 px daneben, still.
    from_board = usable_board(row, profile)
    path = session_dir / (row["board"] if from_board else row["frame"])
    image = cv2.imread(str(path))
    if image is None:
        raise FileNotFoundError(f"board not readable: {path}")
    # Without a usable stored board the row names a RAW frame; cutting board boxes from it is wrong,
    # so warp it.
    if from_board:
        return crops_for_frame(None, row["corners"], profile, board=image)
    return crops_for_frame(image, row["corners"], profile)



def read_session(name: str, model_dir: Path, *, device: str = "cpu",
                 progress: bool = True, weights: str | None = None,
                 out: str | None = None) -> dict:
    """Every square of every board, as the model reads it, into `model-reads.jsonl` — EVERY row: a
    wrong piece on a clean board is what the p8 stock trains on.
    """
    from .realgames.progress import PROGRESS_EVERY
    from .session_store.recording import game_dir

    session_dir = game_dir(name)
    if not log_path(session_dir).exists():
        raise FileNotFoundError(f"{name}: no exported session at {session_dir}")
    meta = read_session_meta(session_dir)
    check_not_circular(model_dir, meta["session_id"])
    profile = load_profile(meta["profile"])
    classes = model_classes(model_dir)
    squares = all_squares()
    rows = [r for r in read_log_rows(session_dir) if r.get("board") or r.get("frame")]
    # A side measurement (`out`, e.g. a `coverage_gate` run) must not overwrite the canonical file
    # the lane, audit-flags and chain read.
    path = game_dir(name) / (out or READS_FILE)
    written = 0
    # Atomar: eine halbe Datei haelt die Kette fuer fertig, und die Labeling-Lane liest sie als
    # Wahrheit.
    temp = path.with_suffix(path.suffix + ".tmp")
    try:
        with temp.open("w", encoding="utf-8") as fh:
            fh.write(json.dumps({"_model": str(model_dir), "_classes": classes,
                                 **({"_weights": weights} if weights else {}),
                                 "_source": provenance.source(session_dir, str(model_dir)),
                                 "_written_at": datetime.now(UTC).isoformat()}) + "\n")
            for n, row in enumerate(rows, 1):
                cells = frame_cells(session_dir, row, profile)
                reads = all_reads(model_dir, cells, device, weights)
                # Zeilen OHNE `frame` kommen durch (`board` reicht); Brett und Frame teilen den
                # Stamm.
                stem = Path(row.get("frame") or row["board"]).stem
                labels = GameState(row["fen"]).labels()
                for sq, read, crop in zip(squares, reads, cells, strict=True):
                    # Only where the run carries an occlusion head: `hand_flags` needs the model's
                    # claim.
                    cov = read.get("coverage")
                    fh.write(json.dumps({
                        "session_id": meta["session_id"], "frame": stem, "square": sq,
                        "fen_label": labels[sq], "dirty_reason": row.get("dirty_reason"),
                        **({"model_cov": cov} if cov is not None else {}),
                        # Die Helligkeit DIESER Zelle auf DIESEM Frame: ein Schatten zieht b4 von 32
                        # auf 5.
                        "bright": round(float(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).mean()), 1),
                        "probs": sparse(read["probs"], classes)}) + "\n")
                    written += 1
                if progress and n % PROGRESS_EVERY == 0:
                    print(f"  {n}/{len(rows)} boards, {written} cells", flush=True)
    except BaseException:
        temp.unlink(missing_ok=True)
        raise
    temp.replace(path)
    return {"path": path, "boards": len(rows), "cells": written, "model": str(model_dir)}
