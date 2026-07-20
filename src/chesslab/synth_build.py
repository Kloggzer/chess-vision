"""Fused synthetic dataset build: renders -> packed memmap, WITHOUT the crop-PNG middle copy.

The classic chain (`ingest synthetic` -> 64 crop PNGs per frame -> `dataset build` -> pack)
materializes every crop once as a PNG only for the packer to decode it exactly once into the
memmap. For a 100k-per-class synthetic set that middle copy is ~60 GB and millions of small
files. This module fuses the two pixel passes into one:

  1. metadata pass  — sessions are synthesized from the render JSONs (frame path + corners +
     FEN, no pixels), labels derive from the FEN per square; curation (per-cell cap, split,
     class caps) runs on metadata only. phash is deliberately NOT offered: every synth scene
     has its own position/camera/lighting, there are no near-duplicates to find.
  2. pixel pass     — each selected frame is loaded ONCE, warped ONCE, and its selected squares
     are cropped straight into the final ``packed_images.u8`` memmap (parallel over frames).

Manifest rows carry a virtual ``mm://`` path (unique per crop, digest-able) — there are no crop
files. Training reads the memmap (``PackedSquareDataset``); rotation augmentation happens
on-the-fly at train time (``torch_data._RandomRot90``), never on disk.
"""

from __future__ import annotations

import json
import shutil
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from . import config
from . import dataset as dataset_mod
from .dataset_build import _safe_name, dataset_dir, dedup_metadata

_FILES = "abcdefgh"

# Warp resolution for slicing. 1100 px board -> ~137 px/square, matching the ~134 px/square the
# framed renders carry (frame_frac 0.80 @ res 1024) — the old default of 900 (112 px/square)
# UPSCALED every crop to 128 and threw away real resolution.
SYNTH_BOARD_SIZE = 1100


def _virtual_path(name: str, sid: str, frame: str, square: str) -> str:
    """Stable, unique, non-filesystem path for a packed crop (digest + path2idx key)."""
    return f"mm://{name}/{sid}/{frame}_{square}.png"


def _rows_for_entry(name: str, sid: str, entry: dict, out_size: tuple[int, int]) -> list[dict]:
    """64 metadata rows for one frame: label per square from the FEN (+ occluded override)."""
    from .labeling import square_color
    from .state import GameState

    gs = GameState(entry["fen"])
    occ = set(entry.get("occluded_squares") or ())
    # Match the classic slice naming: frame id = the render's stem.
    stem = Path(str(entry["frame"])).stem
    rows = []
    for file in _FILES:
        for rank in range(1, 9):
            sq = f"{file}{rank}"
            rows.append({
                "path": _virtual_path(name, sid, stem, sq),
                "label": "occluded" if sq in occ else gs.label_for(sq),
                "session_id": sid,
                "frame": stem,
                "ply": entry.get("ply", 0),
                "square": sq,
                "square_color": square_color(sq),
                "fen": entry["fen"],
                "out_size": [int(out_size[0]), int(out_size[1])],
                "geometry": "warp",
                "photometry": "none",
                "ts": entry.get("ts") or datetime.now(UTC).isoformat(),
                "rot": 0,
            })
    return rows


# --- pixel pass (multiprocessing worker) --------------------------------------------------

def _crop_frames_into_memmap(task) -> int:
    """Worker: warp each frame once and write its selected crops into the shared memmap.

    ``task`` = (mm_path, (n, h, w), name, board_size, frames) with
    ``frames`` = [(frame_path, corners, [(row_idx, square), ...]), ...].
    Workers write DISJOINT row indices, so concurrent r+ maps are safe (same scheme as
    ``training.pack._pack_chunk``). Returns the number of crops written.
    """
    import cv2
    import numpy as np

    from .calibration import warp_from_corners
    from .ingest import ingestion_profile
    from .labeling import crop_square

    mm_path, shape, name, board_size, frames = task
    n, h, w = shape
    crop_bytes = h * w * 3
    profile = ingestion_profile(name, board_size, (w, h))

    written = 0
    # One small memmap window per frame-run keeps commit charge flat (cf. pack._pack_chunk).
    all_idx = [i for _fp, _c, sqs in frames for i, _sq in sqs]
    lo, hi = min(all_idx), max(all_idx)
    mm = np.memmap(mm_path, dtype=np.uint8, mode="r+", shape=(hi - lo + 1, h, w, 3),
                   offset=lo * crop_bytes)
    for frame_path, corners, sqs in frames:
        img = cv2.imread(str(frame_path))
        if img is None:
            continue                    # unreadable render -> rows stay black; counted by caller
        warped = warp_from_corners(img, profile, corners)
        for row_idx, sq in sqs:
            crop = crop_square(warped, sq, profile, (w, h))
            mm[row_idx - lo] = crop[:, :, ::-1]                # BGR -> RGB (pack stores RGB)
            written += 1
    mm.flush()
    del mm
    return written


def build_synth_dataset(
    name: str,
    renders_root: str | Path,
    *,
    board_size: int = SYNTH_BOARD_SIZE,
    per_cell_cap: int | None = None,
    rotations: tuple[int, ...] = (0, 90, 180, 270),
    val_frac: float = config.DEFAULT_VAL_FRAC,
    test_frac: float = config.DEFAULT_TEST_FRAC,
    max_empty_ratio: float | None = config.DEFAULT_MAX_EMPTY_RATIO,
    max_class_ratio: float | None = None,
    seed: int = config.SEED,
    workers: int | None = None,
    allow_degenerate: bool = False,
    paths: config.Paths | None = None,
) -> dict:
    """Renders -> sessions (metadata) -> curated split -> crops packed straight into the memmap."""
    import os
    from multiprocessing import Pool

    from .ingest import synthesize_sessions
    from .ingest_adapters.synthetic import iter_items
    from .labeling import read_log
    from .training.pack import _manifest_digest

    name = _safe_name(name)
    paths = paths or config.DATA
    per_cell_cap = config.DEDUP.per_cell_cap if per_cell_cap is None else per_cell_cap
    from .calibration import CropParams
    out_size = tuple(CropParams.default(board_size).out_size)

    items = list(iter_items(Path(renders_root)))
    if not items:
        raise ValueError(f"no render frames (json+jpg/png) found under {renders_root}")
    session_ids = synthesize_sessions(items, tag=name, profile_name=name, paths=paths)

    # ---- metadata pass -------------------------------------------------------------------
    rows: list[dict] = []
    frame_src: dict[tuple[str, str], tuple[str, list]] = {}     # (sid, stem) -> (path, corners)
    for sid in session_ids:
        for entry in read_log(paths.sessions / sid):
            stem = Path(str(entry["frame"])).stem
            frame_src[(sid, stem)] = (entry["frame"], entry["corners"])
            rows.extend(_rows_for_entry(name, sid, entry, out_size))
    n_raw = len(rows)

    sizes = Counter(r["session_id"] for r in rows)
    splits = dataset_mod.assign_sessions_to_splits(dict(sizes), val_frac, test_frac, seed)
    split_of = {s: nm for nm, sids in splits.items() for s in sids}
    train_raw = [r for r in rows if split_of.get(r["session_id"]) == "train"]
    holdout = [r for r in rows if split_of.get(r["session_id"]) in ("val", "test")]
    train_rows = dedup_metadata(train_raw, per_cell_cap, seed)
    rows = train_rows + holdout
    n_final = len(rows)

    # Disk preflight without reading any file: the memmap size is exact arithmetic here.
    w, h = int(out_size[0]), int(out_size[1])
    need = n_final * h * w * 3
    free = shutil.disk_usage(str(paths.root)).free
    if need > free * 0.9:
        raise ValueError(f"packed memmap would need ~{need / 1e9:.0f} GB but only "
                         f"{free / 1e9:.0f} GB are free — lower per_cell_cap or use fewer renders.")

    ds = dataset_dir(name, paths)
    if ds.exists():
        shutil.rmtree(ds)
    ds.mkdir(parents=True, exist_ok=True)
    (ds / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + ("\n" if rows else ""),
        encoding="utf-8")
    split = dataset_mod.make_split(rows, val_frac, test_frac, max_empty_ratio, seed,
                                   max_class_ratio, precomputed_splits=splits)
    errors, _warnings = dataset_mod.validate_split(split, rows)
    if errors:
        if not allow_degenerate:
            shutil.rmtree(ds, ignore_errors=True)
            raise ValueError("\n".join(errors))
        split["degenerate_errors"] = errors
    (ds / "split.json").write_text(json.dumps(split, ensure_ascii=False, indent=2), encoding="utf-8")
    (ds / "stats.json").write_text(json.dumps(dataset_mod.compute_stats(rows), ensure_ascii=False),
                                   encoding="utf-8")
    import yaml
    cfg = {
        "name": name, "created_at": datetime.now(UTC).isoformat(),
        "session_ids": list(session_ids), "fused_synth": True, "board_size": int(board_size),
        "renders_root": Path(renders_root).resolve().as_posix(),
        "dedup": {"per_cell_cap": per_cell_cap, "phash_enabled": False, "phash_hamming": None},
        "rotations": list(rotations),
        "split": {"val_frac": val_frac, "test_frac": test_frac, "max_empty_ratio": max_empty_ratio,
                  "max_class_ratio": max_class_ratio, "seed": seed},
        "counts": {"raw": n_raw, "after_dedup": n_final, "final": n_final},
    }
    (ds / "dataset.yaml").write_text(yaml.safe_dump(cfg, sort_keys=False, allow_unicode=True),
                                     encoding="utf-8")

    # ---- pixel pass ----------------------------------------------------------------------
    img_path = ds / "packed_images.u8"
    with open(img_path, "wb") as fh:
        fh.truncate(need)

    # Group row indices by frame; rows were emitted frame-by-frame, but dedup/split reordered
    # them — regroup and chunk into contiguous-ish frame batches for the workers.
    by_frame: dict[tuple[str, str], list[tuple[int, str]]] = {}
    for i, r in enumerate(rows):
        by_frame.setdefault((r["session_id"], r["frame"]), []).append((i, r["square"]))
    frame_jobs = [(frame_src[key][0], frame_src[key][1], sqs) for key, sqs in by_frame.items()]
    # ~64 frames per task: big enough to amortize process dispatch, small enough for progress.
    chunk = 64
    tasks = [(str(img_path), (n_final, h, w), name, int(board_size), frame_jobs[k:k + chunk])
             for k in range(0, len(frame_jobs), chunk)]
    workers = workers or max(2, min(8, (os.cpu_count() or 4)))

    written = 0
    expected = sum(len(sqs) for _fp, _c, sqs in frame_jobs)
    with Pool(workers) as pool:
        for c in pool.imap_unordered(_crop_frames_into_memmap, tasks):
            written += c
            print(f"[fuse] {written}/{expected} crops ({100.0 * written / max(1, expected):.1f}%)",
                  flush=True)
    if written != expected:
        raise RuntimeError(f"fused pack incomplete: {written}/{expected} crops written "
                           f"(unreadable renders?) — dataset left WITHOUT packed_meta.json.")

    digest = _manifest_digest(rows)
    (ds / "packed_meta.json").write_text(
        json.dumps({"n": n_final, "h": h, "w": w, "digest": digest,
                    "paths": [r["path"] for r in rows]}), encoding="utf-8")
    gb = need / 1e9
    print(f"[OK] fused build '{name}': {n_final} crops -> {img_path} ({gb:.1f} GB, "
          f"{workers} workers, no crop PNGs)")
    return {"name": name, "counts": cfg["counts"], "split_counts": split["counts"],
            "warnings": split.get("warnings", []),
            "packed": {"n": n_final, "h": h, "w": w, "path": str(img_path), "gb": round(gb, 1)}}
