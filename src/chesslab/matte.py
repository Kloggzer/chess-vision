"""The two models the pipeline keeps: RT-DETR finds the hand, SAM 3 cuts it out.

`person_score` is the frame scan's sensor (24.6 ms), `alpha_sam3` the matte the labels come from
(11.9 s). Grounding DINO sat between them and did neither job better — `docs/session-mattes.md`.
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from . import config
from .calibration import mesh_from_lines
from .labeling import all_squares, crops_for_frame, read_log, read_session_meta

SAM3_REPO = "facebook/sam3"
#: One pass each, unioned. 11.9 s a frame buys the cut that becomes a label: the ring around a
#: wristwatch closes to 4 px, where the cheaper detectors left a 96 px hole saying "board".
CONCEPTS = ("person", "hand", "arm", "sleeve", "wristwatch")
#: Past this share of the board it is not an arm reaching in. Nothing measured here came close.
MAX_ZONE_FRAC = 0.60
RTDETR_REPO = "PekingU/rtdetr_r18vd_coco_o365"
#: A plain COCO detector, 25 ms against Grounding DINO's 405 — and `person` is all it is asked
#: for: on a CLEAN board the same model finds `mouse` 0.35 and `cup` 0.34, which are the pieces.
#: Clean boards sit flat at 0.14, a hand at 0.5+; 0.10 collapses (`docs/frame-scan.md`).
PERSON_THR = 0.20

_RTDETR: tuple = ()
_SAM3: tuple = ()


def _sam3():
    """SAM 3, loaded lazily and separately — the finder must not pay for the matter's weights."""
    global _SAM3
    if not _SAM3:
        import torch
        from transformers import Sam3Model, Sam3Processor

        device = "cuda" if torch.cuda.is_available() else "cpu"
        _SAM3 = (Sam3Processor.from_pretrained(SAM3_REPO),
                 Sam3Model.from_pretrained(SAM3_REPO).to(device).eval(), device)
    return _SAM3


def _rtdetr():
    """The fast sensor's weights, lazily — the export pays 25 ms a frame, not a model load."""
    global _RTDETR
    if not _RTDETR:
        import torch
        from transformers import AutoImageProcessor, AutoModelForObjectDetection

        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = AutoModelForObjectDetection.from_pretrained(RTDETR_REPO).to(device).eval()
        _RTDETR = (AutoImageProcessor.from_pretrained(RTDETR_REPO), model, device,
                   [i for i, n in model.config.id2label.items() if n == "person"])
    return _RTDETR


def person_score(board: np.ndarray) -> float:
    """How sure a COCO detector is that a person reaches into this board raster.

    The frame scan's sensor: the groove read is blind to a hand that covers no line, and the 1 s
    commit window it replaced condemned clean boards wholesale (`docs/frame-scan.md`).
    """
    import torch

    proc, model, device, person = _rtdetr()
    inputs = proc(images=cv2.cvtColor(board, cv2.COLOR_BGR2RGB), return_tensors="pt").to(device)
    with torch.no_grad():
        out = model(**inputs)
    found = proc.post_process_object_detection(out, threshold=0.05,
                                               target_sizes=[board.shape[:2]])[0]
    return max((float(s) for lab, s in zip(found["labels"].tolist(), found["scores"].tolist(), strict=True)
                if int(lab) in person), default=0.0)


def alpha_sam3(board: np.ndarray) -> tuple[np.ndarray, dict[str, float]]:
    """The union of SAM 3's concept masks — the better cut, for the alpha that becomes a target."""
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
            out, threshold=0.5, mask_threshold=0.5,
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


#: Frames whose FEN still holds under the hand — `framescan.classify`'s verdict. The approach
#: phase carries a board nobody can label, so its alpha would be a mask over an unknown position.
ALPHA_REASON = "occluded"


#: A hand-corrected alpha lands beside SAM's, never on top of it: the model's own cut stays
#: readable, and which one a row used is written down rather than guessed from a timestamp.
FIXED_SUFFIX = ".fixed.webp"


def recut_fixed(name: str, *, progress: bool = True) -> dict:
    """Recompute coverage for every frame whose alpha a human corrected.

    The cut has ONE implementation — `coverage_of`, the same `crops_for_frame` call the image goes
    through. The UI paints pixels and hands them over; it never computes a coverage number itself.
    """
    import json

    from .calibration import load_profile
    from .ioutil import read_jsonl
    from .labeling import read_log, read_session_meta

    session_dir = config.DATA.sessions / f"rg-{name}"
    path = session_dir / "matte.jsonl"
    if not path.exists():
        raise FileNotFoundError(f"{name}: no matte.jsonl — run `occluders alpha-worker` first")
    profile = load_profile(read_session_meta(session_dir)["profile"])
    entries = {Path(e["board"]).stem: e for e in read_log(session_dir) if e.get("board")}
    rows, redone = [], 0
    for row in read_jsonl(path):
        fixed = session_dir / "mattes" / f"{row['frame']}{FIXED_SUFFIX}"
        entry = entries.get(row["frame"])
        if fixed.exists() and entry is not None:
            alpha = cv2.imread(str(fixed), cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
            cov = coverage_of(alpha, entry, profile)
            row = row | {"coverage": cov, "alpha": "fixed",
                         "cells_over_half": sum(v > 0.5 for v in cov.values())}
            redone += 1
            if progress and redone % 10 == 0:
                print(f"  {redone} corrected alphas recut", flush=True)
        rows.append(row)
    path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")
    return {"path": path, "frames": len(rows), "recut": redone}


def alpha_worker(name: str, *, limit: int | None = None, reason: str = ALPHA_REASON,
                 progress: bool = True) -> dict:
    """SAM 3 over a session's dirty pile: one alpha per frame, coverage per square.

    Each row is appended the moment it is done, so a kill costs one frame at 11.9 s instead of
    the run — the same argument `training/pack.py` makes for its chunk sidecar.
    """
    import json

    from .calibration import load_profile
    from .ioutil import read_jsonl

    session_dir = config.DATA.sessions / f"rg-{name}"
    if not (session_dir / "log.jsonl").exists():
        raise FileNotFoundError(f"{name}: no exported session at {session_dir}")
    profile = load_profile(read_session_meta(session_dir)["profile"])
    path = session_dir / "matte.jsonl"
    done = {r["frame"] for r in read_jsonl(path)} if path.exists() else set()
    todo = [e for e in read_log(session_dir)
            if e.get("dirty") and (reason == "all" or e.get("dirty_reason") == reason)
            and Path(e["board"]).stem not in done]
    # `limit` is the TARGET per session, not the batch size: a second round asking for 80 on a
    # session that already has 40 computes 40, not another 80. Idempotent, and it matches how one
    # says it out loud — "bring the frames to 80".
    todo = todo[:max(0, limit - len(done))] if limit else todo
    out_dir = session_dir / "mattes"
    out_dir.mkdir(exist_ok=True)
    written, skipped = 0, {}
    with path.open("a", encoding="utf-8") as fh:
        for n, entry in enumerate(todo, 1):
            stem = Path(entry["board"]).stem
            board = cv2.imread(str(session_dir / entry["board"]))
            row = {"frame": stem, "ply": entry.get("ply"),
                   "dirty_reason": entry.get("dirty_reason")}
            if board is None:
                row["skipped"] = "board unreadable"
            else:
                alpha, hits = alpha_sam3(board)
                if float((alpha > 0.5).mean()) > MAX_ZONE_FRAC:
                    row["skipped"] = "zone too big"
                else:
                    cv2.imwrite(str(out_dir / f"{stem}.webp"), (alpha * 255).astype(np.uint8))
                    cov = coverage_of(alpha, entry, profile)
                    row |= {"concepts": hits, "coverage": cov,
                            "cells_over_half": sum(v > 0.5 for v in cov.values())}
                    written += 1
            if why := row.get("skipped"):
                skipped[why] = skipped.get(why, 0) + 1
            fh.write(json.dumps(row) + "\n")
            fh.flush()
            if progress and n % 10 == 0:
                print(f"  {n}/{len(todo)} frames, {written} alphas", flush=True)
    return {"path": path, "frames": len(todo), "alphas": written, "skipped": skipped,
            "already": len(done)}
