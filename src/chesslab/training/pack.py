"""Pack a built dataset's square crops into ONE memory-mapped uint8 array.

Loading 1M+ individual PNGs per epoch (``Image.open`` per item in ``SquareDataset``) is the
training bottleneck on this project — random small-file opens on Windows dominate and the GPU
starves (see docs / the "WebDataset/LMDB statt Mio PNGs" note). Packing all crops into a single
``packed_images.u8`` memmap turns 1M random file opens into slice reads from one file: the first
epoch warms the OS page cache, later epochs are effectively RAM-speed. ``PackedSquareDataset``
(in ``torch_data``) reads from this instead of the filesystem.

Layout, per dataset dir ``data/datasets/<name>/``:
  - ``packed_images.u8``  : raw memmap, shape (N, H, W, 3) uint8, in manifest row order.
  - ``packed_meta.json``  : {"n", "h", "w", "paths": [crop path per row]} — ``paths`` maps each
    manifest row's crop path to its memmap index, so the existing per-split ``rows`` lists work
    unchanged (just path -> index instead of path -> file).
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
from PIL import Image

from .. import config


def _packed_paths(dd: Path) -> tuple[Path, Path]:
    return dd / "packed_images.u8", dd / "packed_meta.json"


def _manifest_rows(dd: Path) -> list[dict]:
    mp = dd / "manifest.jsonl"
    return [json.loads(line) for line in mp.read_text(encoding="utf-8").splitlines() if line.strip()]


def _pack_chunk(task) -> int:
    """Worker: decode a contiguous run of crops and write them into the shared memmap.

    Multiple workers write DISJOINT index ranges of the same on-disk memmap concurrently — the
    read+decode of 1M small PNGs is the bottleneck (I/O-bound, ~15% CPU single-threaded), so
    overlapping it across cores/disk-queue is the win. Module-level so it pickles to spawn workers.
    """
    mm_path, shape, items = task
    n, h, w = shape
    mm = np.memmap(mm_path, dtype=np.uint8, mode="r+", shape=(n, h, w, 3))
    for idx, p in items:
        im = Image.open(p).convert("RGB")
        a = np.asarray(im, dtype=np.uint8)
        if a.shape != (h, w, 3):                       # guard against odd edge crops
            a = np.asarray(im.resize((w, h)), dtype=np.uint8)
        mm[idx] = a
    mm.flush()
    del mm
    return len(items)


def pack_dataset(name: str, paths: config.Paths = config.DATA, workers: int | None = None) -> dict:
    """Decode every crop of dataset ``name`` once into a single (N,H,W,3) uint8 memmap (parallel)."""
    from multiprocessing import Pool

    from ..dataset_build import dataset_dir

    dd = dataset_dir(name, paths)
    rows = _manifest_rows(dd)
    if not rows:
        raise ValueError(f"dataset '{name}' has an empty manifest")
    w, h = (int(rows[0]["out_size"][0]), int(rows[0]["out_size"][1]))   # out_size = [W, H]
    n = len(rows)
    img_path, meta_path = _packed_paths(dd)

    np.memmap(img_path, dtype=np.uint8, mode="w+", shape=(n, h, w, 3)).flush()   # allocate the file
    items = [(i, r["path"]) for i, r in enumerate(rows)]
    workers = workers or max(2, min(8, (os.cpu_count() or 4)))
    csize = (n + workers * 4 - 1) // (workers * 4)      # contiguous chunks, a few per worker
    tasks = [(str(img_path), (n, h, w), items[k:k + csize]) for k in range(0, n, csize)]

    done = 0
    with Pool(workers) as pool:
        for c in pool.imap_unordered(_pack_chunk, tasks):
            done += c
            print(f"[pack] {done}/{n} crops", flush=True)

    meta_path.write_text(json.dumps({"n": n, "h": h, "w": w,
                                     "paths": [r["path"] for r in rows]}), encoding="utf-8")
    gb = n * h * w * 3 / 1e9
    print(f"[OK] packed {n} crops -> {img_path} ({gb:.1f} GB, {workers} workers)")
    return {"n": n, "h": h, "w": w, "path": str(img_path), "gb": round(gb, 1)}


def load_packed(name: str, paths: config.Paths = config.DATA):
    """Return (packed_file_path, (N,H,W), {crop_path: index}) or None if not packed.

    Deliberately does NOT return an open memmap: an np.memmap doesn't survive pickling to Windows
    spawn DataLoader workers (`pickle data was truncated`). PackedSquareDataset opens the memmap
    lazily inside each worker from the path+shape instead, and keeps only a small int index array.
    """
    from ..dataset_build import dataset_dir

    dd = dataset_dir(name, paths)
    img_path, meta_path = _packed_paths(dd)
    if not img_path.exists() or not meta_path.exists():
        return None
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    n, h, w = int(meta["n"]), int(meta["h"]), int(meta["w"])
    path2idx = {p: i for i, p in enumerate(meta["paths"])}
    return str(img_path), (n, h, w), path2idx


def open_packed_memmap(path: str, shape):
    """Read-only memmap of the packed crops, shape (N, H, W, 3). Called lazily per worker."""
    n, h, w = shape
    return np.memmap(path, dtype=np.uint8, mode="r", shape=(n, h, w, 3))
