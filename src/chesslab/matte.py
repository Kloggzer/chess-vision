"""The two models the pipeline keeps: RT-DETR finds the hand, SAM 3 cuts it out.

`person_score` is the frame scan's sensor (~24.6 ms), `alpha_sam3` the matte the labels come
from. Grounding DINO sat between them and did neither job better — `docs/session-mattes.md`."""

from __future__ import annotations

import gc
import json
from datetime import datetime
from pathlib import Path
from time import perf_counter

import cv2
import numpy as np

from .labeling import (
    all_squares,
    crops_for_frame,
    read_log,
    read_session_meta,
)

SAM3_REPO = "facebook/sam3"

# One pass each, unioned. The expensive part is the image encoder, so all concepts reuse
# the same vision embedding. The cut becomes the actual training label.
CONCEPTS = (
    "person",
    "hand",
    "arm",
    "sleeve",
    "wristwatch",
)

# Past this share of the board it is not an arm reaching in.
MAX_ZONE_FRAC = 0.60


RTDETR_REPO = "PekingU/rtdetr_r18vd_coco_o365"

# A plain COCO detector, ~25 ms against Grounding DINO's ~405 ms — and `person`
# is all it is asked for. Clean boards sit around 0.14, a hand at 0.5+.
PERSON_THR = 0.20


_RTDETR: tuple = ()
_SAM3: tuple = ()


def _timestamp() -> str:
    """Human-readable local timestamp for worker logs."""
    return datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S")


def _rate(frames: int, started: float) -> tuple[float, float]:
    """Return average frames/s and seconds/frame since `started`."""
    if frames <= 0:
        return 0.0, 0.0

    elapsed = perf_counter() - started

    if elapsed <= 0:
        return 0.0, 0.0

    return frames / elapsed, elapsed / frames


def _sam3():
    """SAM 3, loaded lazily and separately from the cheap frame scanner."""
    global _SAM3

    if not _SAM3:
        import torch
        from transformers import Sam3Model, Sam3Processor

        device = "cuda" if torch.cuda.is_available() else "cpu"

        processor = Sam3Processor.from_pretrained(SAM3_REPO)
        model = Sam3Model.from_pretrained(SAM3_REPO).to(device).eval()

        _SAM3 = (
            processor,
            model,
            device,
        )

    return _SAM3


def _rtdetr():
    """The fast sensor's weights, loaded lazily."""
    global _RTDETR

    if not _RTDETR:
        import torch
        from transformers import (
            AutoImageProcessor,
            AutoModelForObjectDetection,
        )

        device = "cuda" if torch.cuda.is_available() else "cpu"

        model = (
            AutoModelForObjectDetection
            .from_pretrained(RTDETR_REPO)
            .to(device)
            .eval()
        )

        processor = AutoImageProcessor.from_pretrained(RTDETR_REPO)

        person_labels = [
            int(i)
            for i, name in model.config.id2label.items()
            if name == "person"
        ]

        if not person_labels:
            raise ValueError(
                f"{RTDETR_REPO}: model config contains no 'person' label"
            )

        _RTDETR = (
            processor,
            model,
            device,
            person_labels,
        )

    return _RTDETR


def unload_models() -> None:
    """Release cached Torch models before interpreter shutdown.

    Workers keep them alive across frames and sessions; releasing at the end avoids leaving
    several GB of CUDA-backed objects for interpreter shutdown to dismantle."""
    global _SAM3, _RTDETR

    _SAM3 = ()
    _RTDETR = ()

    gc.collect()

    try:
        import torch
    except ImportError:
        return

    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def person_score(board: np.ndarray) -> float:
    """How sure a COCO detector is that a person reaches into this board raster.

    The frame scan's sensor: the groove read is blind to a hand that covers no line, and the
    1 s commit window it replaced condemned clean boards wholesale (`docs/frame-scan.md`)."""
    import torch

    processor, model, device, person_labels = _rtdetr()

    rgb = cv2.cvtColor(
        board,
        cv2.COLOR_BGR2RGB,
    )

    inputs = processor(
        images=rgb,
        return_tensors="pt",
    ).to(device)

    with torch.inference_mode():
        outputs = model(**inputs)

    found = processor.post_process_object_detection(
        outputs,
        threshold=0.05,
        target_sizes=[board.shape[:2]],
    )[0]

    return max(
        (
            float(score)
            for label, score in zip(
                found["labels"].tolist(),
                found["scores"].tolist(),
                strict=True,
            )
            if int(label) in person_labels
        ),
        default=0.0,
    )


def alpha_sam3(
    board: np.ndarray,
) -> tuple[np.ndarray, dict[str, float]]:
    """The union of SAM 3's concept masks.

    The five concepts share one preprocessed image and one vision encoding.
    Only their text inputs and prompt-dependent model path run separately.
    """
    import torch

    processor, model, device = _sam3()

    rgb = cv2.cvtColor(
        board,
        cv2.COLOR_BGR2RGB,
    )

    alpha = np.zeros(
        board.shape[:2],
        dtype=np.float32,
    )

    hits: dict[str, float] = {}

    # Process and upload the image only once.
    image_inputs = processor(
        images=rgb,
        return_tensors="pt",
    ).to(device)

    with torch.inference_mode():
        vision_embeds = model.get_vision_features(
            pixel_values=image_inputs["pixel_values"],
        )

        for concept in CONCEPTS:
            # Text-only processing: no repeated image resize, normalization or upload.
            text_inputs = processor(
                text=concept,
                return_tensors="pt",
            ).to(device)

            outputs = model(
                vision_embeds=vision_embeds,
                **text_inputs,
            )

            found = processor.post_process_instance_segmentation(
                outputs,
                threshold=0.5,
                mask_threshold=0.5,
                target_sizes=image_inputs["original_sizes"].tolist(),
            )[0]

            if not len(found["masks"]):
                continue

            mask = (
                found["masks"]
                .float()
                .amax(dim=0)
                .cpu()
                .numpy()
                .astype(np.float32, copy=False)
            )

            # Usually already original size because target_sizes was supplied.
            # Keep a fallback for compatibility with different Transformers versions.
            if mask.shape != alpha.shape:
                mask = cv2.resize(
                    mask,
                    (board.shape[1], board.shape[0]),
                    interpolation=cv2.INTER_NEAREST,
                )

            np.maximum(
                alpha,
                mask,
                out=alpha,
            )

            hits[concept] = round(
                float(found["scores"].max()),
                3,
            )

    return alpha, hits


def coverage_of(
    alpha: np.ndarray,
    entry: dict,
    profile,
) -> dict[str, float]:
    """Per square, cut by the SAME `crops_for_frame` call the image goes through.

    That makes the label region the crop region by construction — mesh and pads included —
    which is the granularity the hand-marked class never had (`docs/occluder-plates.md`)."""
    grey = (
        np.clip(alpha, 0.0, 1.0)
        * 255.0
    ).astype(np.uint8)

    board = cv2.cvtColor(
        grey,
        cv2.COLOR_GRAY2BGR,
    )

    masks = crops_for_frame(
        None,
        entry["corners"],
        profile,
        board=board,
        out_size=tuple(profile.crop.out_size),
    )

    return {
        square: round(
            float(mask.mean()) / 255.0,
            4,
        )
        for square, mask in zip(
            all_squares(),
            masks,
            strict=True,
        )
    }


# Frames whose FEN still holds under the hand — `framescan.classify`'s verdict.
# The approach phase carries a board nobody can label, so its alpha would be a
# mask over an unknown position.
ALPHA_REASON = "occluded"


# A hand-corrected alpha lands beside SAM's, never on top of it: the model's
# own cut stays readable, and which one a row used is written down rather than
# guessed from a timestamp.
FIXED_SUFFIX = ".fixed.webp"


def recut_fixed(
    name: str,
    *,
    progress: bool = True,
) -> dict:
    """Recompute coverage for every frame whose alpha a human corrected.

    The cut has one implementation — `coverage_of`, the same `crops_for_frame` call the image
    goes through. The UI paints pixels and hands them over, never a coverage number."""
    from .calibration import load_profile
    from .ioutil import read_jsonl
    from .realgames import game_dir

    session_dir = game_dir(name)

    path = (
        session_dir
        / "matte.jsonl"
    )

    if not path.exists():
        raise FileNotFoundError(
            f"{name}: no matte.jsonl — "
            "run `occluders alpha-worker` first"
        )

    profile = load_profile(
        read_session_meta(session_dir)["profile"],
    )

    entries = {
        Path(entry["board"]).stem: entry
        for entry in read_log(session_dir)
        if entry.get("board")
    }

    # This rewrites the file whole while alpha_worker appends to it.
    # A row the worker adds between our read and our write would otherwise die.
    stamp = (
        path.stat().st_mtime_ns,
        path.stat().st_size,
    )

    rows: list[dict] = []
    redone = 0

    for row in read_jsonl(path):
        fixed = (
            session_dir
            / "mattes"
            / f"{row['frame']}{FIXED_SUFFIX}"
        )

        entry = entries.get(
            row["frame"],
        )

        if fixed.exists() and entry is not None:
            fixed_image = cv2.imread(
                str(fixed),
                cv2.IMREAD_GRAYSCALE,
            )

            if fixed_image is None:
                raise ValueError(
                    f"{name}: corrected alpha is unreadable: {fixed}"
                )

            alpha = (
                fixed_image.astype(np.float32)
                / 255.0
            )

            coverage = coverage_of(
                alpha,
                entry,
                profile,
            )

            row = row | {
                "coverage": coverage,
                "alpha": "fixed",
                "cells_over_half": sum(
                    value > 0.5
                    for value in coverage.values()
                ),
            }

            redone += 1

            if progress and redone % 10 == 0:
                print(
                    f"[{_timestamp()}] "
                    f"  {redone} corrected alphas recut",
                    flush=True,
                )

        rows.append(row)

    # Size as well as mtime: an append inside the same filesystem tick can
    # leave the timestamp equal.
    if (
        path.stat().st_mtime_ns,
        path.stat().st_size,
    ) != stamp:
        raise ValueError(
            f"{name}: matte.jsonl changed while recutting — "
            "the alpha worker is writing it. "
            "Let it finish and run this again; nothing was written."
        )

    # Write atomically so a killed recut cannot leave half a JSONL file.
    temp_path = path.with_suffix(
        path.suffix + ".tmp",
    )

    temp_path.write_text(
        "".join(
            json.dumps(row) + "\n"
            for row in rows
        ),
        encoding="utf-8",
    )

    # Re-check immediately before replacing the source file.
    if (
        path.stat().st_mtime_ns,
        path.stat().st_size,
    ) != stamp:
        temp_path.unlink(
            missing_ok=True,
        )

        raise ValueError(
            f"{name}: matte.jsonl changed while recutting — "
            "the alpha worker is writing it. "
            "Let it finish and run this again; nothing was written."
        )

    temp_path.replace(path)

    return {
        "path": path,
        "frames": len(rows),
        "recut": redone,
    }


def alpha_worker_all(
    names: list[str],
    *,
    limit: int | None = None,
    reason: str = ALPHA_REASON,
    progress: bool = True,
) -> dict:
    """Every session in one process, so SAM 3's weights are loaded only once.

    Models stay resident for the complete --all run and are explicitly
    released once every requested session has finished.
    """
    runs: list[dict] = []

    started_all = perf_counter()

    try:
        for index, name in enumerate(
            names,
            1,
        ):
            if progress:
                print(
                    f"[{_timestamp()}] "
                    f"=== {name} ({index}/{len(names)})",
                    flush=True,
                )

            try:
                result = alpha_worker(
                    name,
                    limit=limit,
                    reason=reason,
                    progress=progress,
                )

                runs.append(
                    result
                    | {
                        "session": name,
                    }
                )

            except (
                FileNotFoundError,
                ValueError,
                KeyError,
                OSError,
            ) as exc:
                print(
                    f"[{_timestamp()}] "
                    f"[ERR] {name}: {exc}",
                    flush=True,
                )

        result = {
            "sessions": len(runs),
            "alphas": sum(
                run["alphas"]
                for run in runs
            ),
            "already": sum(
                run["already"]
                for run in runs
            ),
            "runs": runs,
        }

        if progress:
            total_frames = sum(
                run["frames"]
                for run in runs
            )

            fps, seconds_per_frame = _rate(
                total_frames,
                started_all,
            )

            elapsed = (
                perf_counter()
                - started_all
            )

            print(
                f"[{_timestamp()}] "
                f"=== alpha-worker finished: "
                f"{result['sessions']} sessions, "
                f"{result['alphas']} new alphas, "
                f"{result['already']} already present, "
                f"{total_frames} frames in {elapsed:.1f}s "
                f"({fps:.3f} frames/s, "
                f"{seconds_per_frame:.2f} s/frame)",
                flush=True,
            )

        return result

    finally:
        unload_models()

        if progress:
            print(
                f"[{_timestamp()}] "
                "=== models released",
                flush=True,
            )


def alpha_worker(
    name: str,
    *,
    limit: int | None = None,
    reason: str = ALPHA_REASON,
    progress: bool = True,
) -> dict:
    """SAM 3 over a session's dirty pile: one alpha per frame, coverage per square.

    Each row is appended the moment it is complete, so a kill loses at most the current frame.
    `limit` is the target number of SUCCESSFUL alphas for the session, not a batch size — 220
    existing plus `--limit 300` means at most 80 more."""
    from .calibration import load_profile
    from .ioutil import read_jsonl
    from .realgames import game_dir

    session_dir = game_dir(name)

    if not (
        session_dir
        / "log.jsonl"
    ).exists():
        raise FileNotFoundError(
            f"{name}: no exported session at {session_dir}"
        )

    profile = load_profile(
        read_session_meta(session_dir)["profile"],
    )

    path = (
        session_dir
        / "matte.jsonl"
    )

    rows = read_log(
        session_dir,
    )

    live = {
        Path(entry["board"]).stem
        for entry in rows
        if entry.get("board")
    }

    existing_rows = (
        [
            row
            for row in read_jsonl(path)
            if row.get("frame") in live
        ]
        if path.exists()
        else []
    )

    # Every existing row is considered processed, including deliberate skips.
    # Otherwise "zone too big" would be recomputed forever.
    done = {
        row["frame"]
        for row in existing_rows
        if row.get("frame")
    }

    # --limit counts actual usable alpha labels rather than JSONL rows.
    successful = {
        row["frame"]
        for row in existing_rows
        if row.get("frame")
        and not row.get("skipped")
        and row.get("coverage") is not None
    }

    todo = [
        entry
        for entry in rows
        if entry.get("dirty")
        and (
            reason == "all"
            or entry.get("dirty_reason") == reason
        )
        and Path(entry["board"]).stem not in done
    ]

    if limit is not None:
        target_remaining = max(
            0,
            limit - len(successful),
        )

        todo = todo[
            :target_remaining
        ]

    out_dir = (
        session_dir
        / "mattes"
    )

    out_dir.mkdir(
        exist_ok=True,
    )

    written = 0
    skipped: dict[str, int] = {}

    started = perf_counter()

    if progress and not todo:
        print(
            f"[{_timestamp()}] "
            f"  0 frames to process — "
            f"{len(successful)} successful alphas already present",
            flush=True,
        )

    with path.open(
        "a",
        encoding="utf-8",
    ) as file_handle:
        for index, entry in enumerate(
            todo,
            1,
        ):
            stem = Path(
                entry["board"],
            ).stem

            board_path = (
                session_dir
                / entry["board"]
            )

            board = cv2.imread(
                str(board_path),
                cv2.IMREAD_COLOR,
            )

            row = {
                "frame": stem,
                "ply": entry.get("ply"),
                "dirty_reason": entry.get(
                    "dirty_reason",
                ),
            }

            if board is None:
                row["skipped"] = (
                    "board unreadable"
                )

            else:
                alpha, hits = alpha_sam3(
                    board,
                )

                zone_fraction = float(
                    (alpha > 0.5).mean(),
                )

                if zone_fraction > MAX_ZONE_FRAC:
                    row["skipped"] = (
                        "zone too big"
                    )

                else:
                    matte_path = (
                        out_dir
                        / f"{stem}.webp"
                    )

                    matte = (
                        np.clip(
                            alpha,
                            0.0,
                            1.0,
                        )
                        * 255.0
                    ).astype(
                        np.uint8,
                    )

                    if not cv2.imwrite(
                        str(matte_path),
                        matte,
                    ):
                        raise OSError(
                            f"{name}: failed to write matte: "
                            f"{matte_path}"
                        )

                    coverage = coverage_of(
                        alpha,
                        entry,
                        profile,
                    )

                    row |= {
                        "concepts": hits,
                        "coverage": coverage,
                        "cells_over_half": sum(
                            value > 0.5
                            for value in coverage.values()
                        ),
                    }

                    written += 1

            if why := row.get("skipped"):
                skipped[why] = (
                    skipped.get(
                        why,
                        0,
                    )
                    + 1
                )

            file_handle.write(
                json.dumps(row)
                + "\n"
            )

            # One completed frame is the unit of durability.
            file_handle.flush()

            if progress and (
                index % 10 == 0
                or index == len(todo)
            ):
                fps, seconds_per_frame = _rate(
                    index,
                    started,
                )

                elapsed = (
                    perf_counter()
                    - started
                )

                print(
                    f"[{_timestamp()}] "
                    f"  {index}/{len(todo)} frames, "
                    f"{written} alphas, "
                    f"{elapsed:.1f}s "
                    f"({fps:.3f} frames/s, "
                    f"{seconds_per_frame:.2f} s/frame)",
                    flush=True,
                )

    elapsed = (
        perf_counter()
        - started
    )

    return {
        "path": path,
        "frames": len(todo),
        "alphas": written,
        "skipped": skipped,

        # Existing usable targets, matching --limit semantics.
        "already": len(successful),

        # Every frame for which a JSONL row already exists.
        "processed": len(done),

        "seconds": round(
            elapsed,
            3,
        ),
    }