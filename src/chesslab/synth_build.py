"""Fused synthetic dataset build: renders -> packed memmap, WITHOUT the crop-PNG middle copy (~60 GB
and millions of files for 100k crops per class).

Curation runs on metadata only; each frame is then warped ONCE straight into the memmap. Rows
carry virtual `mm://` paths. No phash: every synth scene is unique."""

from __future__ import annotations

import json
import shutil
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from . import config
from . import dataset as dataset_mod
from .dataset_build import _safe_name, class_list_for, collapse_labels, dataset_dir, dedup_metadata
from .ioutil import write_json

_FILES = "abcdefgh"



def _virtual_path(name: str, sid: str, frame: str, square: str) -> str:
    """Stable, unique, non-filesystem path for a packed crop (digest + path2idx key)."""
    from .training import packs

    return packs.mm_path(name, sid, f"{frame}_{square}.png")


def _rows_for_entry(name: str, sid: str, entry: dict, crop) -> list[dict]:
    """64 metadata rows for one frame, label per square from the FEN (+ occluded override); `crop`
    makes the rows say what the picture holds (specs/45).
    """
    from .labeling import square_color
    from .state import GameState

    gs = GameState(entry["fen"])
    occ = set(entry.get("occluded_squares") or ())
    amb = set(entry.get("ambiguous_squares") or ())   # dropped: no true label exists
    stem = Path(str(entry["frame"])).stem
    rows = []
    for file in _FILES:
        for rank in range(1, 9):
            sq = f"{file}{rank}"
            if sq in amb:
                continue
            rows.append({
                "path": _virtual_path(name, sid, stem, sq),
                "label": "occluded" if sq in occ else gs.label_for(sq),
                "session_id": sid,
                "frame": stem,
                "ply": entry.get("ply", 0),
                "square": sq,
                "square_color": square_color(sq),
                "fen": entry["fen"],
                "out_size": [int(crop.out_size[0]), int(crop.out_size[1])],
                "pad_side": float(crop.pad_side),
                "ts": entry.get("ts") or datetime.now(UTC).isoformat(),
                "rot": 0,
            })
    return rows


def _crop_frames_into_memmap(task) -> int:
    """Worker: warp each frame once and write its selected crops into the shared memmap. Workers
    write DISJOINT row indices, so concurrent r+ maps are safe. Returns the crops written.
    """
    import cv2

    from .calibration import warp_board_for_crops
    from .ingest import ingestion_profile
    from .labeling import crop_square
    from .training.pack_dataset import row_window

    mm_path, shape, name, board_size, frames = task
    _n, h, w = shape
    profile = ingestion_profile(name, board_size, (w, h))

    written = 0
    all_idx = [i for _fp, _c, sqs in frames for i, _sq in sqs]
    with row_window(mm_path, (h, w), all_idx) as put:
        for frame_path, corners, sqs in frames:
            img = cv2.imread(str(frame_path))
            if img is None:
                # Name the culprit now: the caller only sees the shortfall after a ~30-min pass.
                print(f"[fuse] WARN unreadable render: {frame_path}", flush=True)
                continue
            # BORDERED warp, the canvas crop_square's boxes are built for; borderless shifts every
            # crop and breaks train/serve parity.
            warped = warp_board_for_crops(img, profile, corners)
            for row_idx, sq in sqs:
                crop = crop_square(warped, sq, profile, (w, h))
                put(row_idx, crop[:, :, ::-1])      # BGR -> RGB (pack stores RGB)
                written += 1
    return written


def build_synth_dataset(
    name: str,
    renders_root: str | Path,
    *,
    board_size: int = config.SYNTH.warp_board_size,
    per_cell_cap: int | None = None,
    rotations: tuple[int, ...] = config.DEDUP.rotations,
    val_frac: float = config.DEFAULT_VAL_FRAC,
    test_frac: float = config.DEFAULT_TEST_FRAC,
    max_empty_ratio: float | None = config.DEFAULT_MAX_EMPTY_RATIO,
    max_class_ratio: float | None = None,
    seed: int = config.SEED,
    workers: int | None = None,
    allow_degenerate: bool = False,
    paths: config.Paths | None = None,
    class_mode: str = "pieces",
) -> dict:
    """Renders -> curated split (metadata only) -> crops packed straight into the memmap. Session
    logs live INSIDE the dataset dir, never in the live `data/sessions` pool.
    """
    import os
    from multiprocessing import Pool

    from .ingest import _safe_group, synthesize_sessions, to_full_fen
    from .ingest_adapters.synthetic import iter_items
    from .training.pack_dataset import write_packed_meta
    from .training.packs import _manifest_digest

    name = _safe_name(name)
    classes = class_list_for(class_mode)
    paths = paths or config.DATA
    per_cell_cap = config.DEDUP.per_cell_cap if per_cell_cap is None else per_cell_cap
    from .calibration import CropParams
    # The SAME defaults the pixel pass cuts with, so the rows describe the packed crops.
    crop = CropParams.default(board_size)
    out_size = tuple(crop.out_size)

    scanned = list(iter_items(Path(renders_root)))
    items = [it for it in scanned if it is not None]
    if scanned.count(None):
        print(f"[fuse] {scanned.count(None)} Render ohne Bild oder Ecken verworfen", flush=True)
    if not items:
        raise ValueError(f"no render frames (json+jpg/png) found under {renders_root}")

    rows: list[dict] = []
    frame_src: dict[tuple[str, str], tuple[str, list]] = {}     # (sid, stem) -> (path, corners)
    for ply, it in enumerate(items):
        sid = f"{name}__{_safe_group(it.group)}"
        stem = Path(str(it.image_path)).stem
        key = (sid, stem)
        if key in frame_src:
            # Two frames sharing (session, stem) collide on the SAME mm:// path, and one frame's
            # labels would be served another frame's pixels.
            raise ValueError(f"duplicate frame id {key} — two renders map to the same "
                             f"session/stem (shard collision? {it.image_path} vs "
                             f"{frame_src[key][0]}).")
        frame_src[key] = (str(it.image_path), it.corners)
        entry = {"frame": str(it.image_path), "fen": to_full_fen(it.fen), "ply": ply,
                 "occluded_squares": (it.meta or {}).get("occluded_squares") or [],
                 "ambiguous_squares": (it.meta or {}).get("ambiguous_squares") or []}
        rows.extend(_rows_for_entry(name, sid, entry, crop))
    n_raw = len(rows)
    n_sessions = len({r["session_id"] for r in rows})
    print(f"[fuse] {len(items)} frames -> {n_sessions} sessions, {n_raw} candidate crops",
          flush=True)

    sizes = Counter(r["session_id"] for r in rows)
    splits = dataset_mod.assign_sessions_to_splits(dict(sizes), val_frac, test_frac, seed)
    split_of = {s: nm for nm, sids in splits.items() for s in sids}
    train_raw = [r for r in rows if split_of.get(r["session_id"]) == "train"]
    holdout = [r for r in rows if split_of.get(r["session_id"]) in ("val", "test")]
    train_rows = dedup_metadata(train_raw, per_cell_cap, seed)
    rows = train_rows + holdout
    n_after_dedup = len(rows)
    # Collapse LAST, as in `dataset build`: a narrowed build keeps the rows a `pieces` build would
    # keep.
    rows = collapse_labels(rows, class_mode)
    # Erst JETZT gezaehlt: `pieces13` wirft `occluded` weg, und Manifest, Memmap und Meta muessen
    # dieselbe Zahl tragen.
    n_final = len(rows)

    w, h = int(out_size[0]), int(out_size[1])
    need = n_final * h * w * 3
    paths.root.mkdir(parents=True, exist_ok=True)   # `Paths` legt on demand an; `disk_usage` nicht
    free = shutil.disk_usage(str(paths.root)).free
    if need > free * 0.9:
        raise ValueError(f"packed memmap would need ~{need / 1e9:.0f} GB but only "
                         f"{free / 1e9:.0f} GB are free — lower per_cell_cap or use fewer renders.")

    ds = dataset_dir(name, paths)
    if ds.exists():
        shutil.rmtree(ds)
    ds.mkdir(parents=True, exist_ok=True)
    session_ids = synthesize_sessions(items, tag=name, profile_name=name,
                                      paths=config.Paths(root=ds))
    (ds / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + ("\n" if rows else ""),
        encoding="utf-8")
    split = dataset_mod.make_split(rows, val_frac, test_frac, max_empty_ratio, seed,
                                   max_class_ratio, precomputed_splits=splits, classes=classes)
    errors, _warnings = dataset_mod.validate_split(split, rows, classes=classes)
    if errors:
        if not allow_degenerate:
            shutil.rmtree(ds, ignore_errors=True)
            raise ValueError("\n".join(errors))
        split["degenerate_errors"] = errors
    write_json(ds / "split.json", split)
    (ds / "stats.json").write_text(
        json.dumps(dataset_mod.compute_stats(rows, classes=classes), ensure_ascii=False),
        encoding="utf-8")
    import yaml
    cfg = {
        "name": name, "created_at": datetime.now(UTC).isoformat(), "class_mode": class_mode,
        "session_ids": list(session_ids), "fused_synth": True, "board_size": int(board_size),
        "renders_root": Path(renders_root).resolve().as_posix(),
        "dedup": {"per_cell_cap": per_cell_cap, "phash_enabled": False, "phash_hamming": None},
        "rotations": list(rotations),
        "split": {"val_frac": val_frac, "test_frac": test_frac, "max_empty_ratio": max_empty_ratio,
                  "max_class_ratio": max_class_ratio, "seed": seed},
        "counts": {"raw": n_raw, "after_dedup": n_after_dedup, "final": n_final},
    }
    (ds / "dataset.yaml").write_text(yaml.safe_dump(cfg, sort_keys=False, allow_unicode=True),
                                     encoding="utf-8")

    img_path = ds / "packed_images.u8"
    with open(img_path, "wb") as fh:
        fh.truncate(need)

    # Dedup/split reordered the rows: regroup by frame and chunk for the workers.
    by_frame: dict[tuple[str, str], list[tuple[int, str]]] = {}
    for i, r in enumerate(rows):
        by_frame.setdefault((r["session_id"], r["frame"]), []).append((i, r["square"]))
    frame_jobs = [(frame_src[key][0], frame_src[key][1], sqs) for key, sqs in by_frame.items()]
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
    # Empty fingerprint, not absent: absent means "legacy pack" and sends `_rewritten_since_pack`
    # down the file-mtime path.
    write_packed_meta(ds / "packed_meta.json", rows, h, w, digest=digest, crop_fingerprint={})
    gb = need / 1e9
    print(f"[OK] fused build '{name}': {n_final} crops -> {img_path} ({gb:.1f} GB, "
          f"{workers} workers, no crop PNGs)")
    # Whether the render was big enough for the class targets:
    tcc = split.get("train_class_counts") or {}
    if tcc:
        print("[OK] train per class: " + ", ".join(f"{k}={v}" for k, v in sorted(tcc.items())))
    return {"name": name, "counts": cfg["counts"], "split_counts": split["counts"],
            "warnings": split.get("warnings", []),
            "packed": {"n": n_final, "h": h, "w": w, "path": str(img_path), "gb": round(gb, 1)}}
