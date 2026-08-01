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

import hashlib
import json
import logging
import os
from pathlib import Path

import numpy as np
from PIL import Image

from .. import config

log = logging.getLogger("chesslab.pack")


def _packed_paths(dd: Path) -> tuple[Path, Path]:
    return dd / "packed_images.u8", dd / "packed_meta.json"


def _manifest_digest(rows: list[dict]) -> str:
    """Fingerprint of a manifest: which crops, in which order, with which labels, are packed.

    Row count and crop size are not enough to tell two datasets apart — see the resume guard in
    ``pack_dataset``. Path + label + out_size covers reordering, substitution and relabelling,
    and is cheap next to decoding a million PNGs.

    What it deliberately does NOT cover: a crop file whose PIXELS changed while keeping the same
    path (re-slicing with different photometry, a synth re-render writing over itself). Catching
    that would need a stat() or hash per row. Callers that rewrite crops in place must re-pack;
    ``build_dataset`` does so implicitly because it rmtree's the dataset dir first.
    """
    h = hashlib.sha256()
    for r in rows:
        h.update(str(r["path"]).encode("utf-8"))
        h.update(b"\x00")
        h.update(str(r.get("label", "")).encode("utf-8"))
        h.update(b"\x00")
        h.update(str(r.get("out_size", "")).encode("utf-8"))
        h.update(b"\n")
    return h.hexdigest()[:32]


def _manifest_rows(dd: Path) -> list[dict]:
    mp = dd / "manifest.jsonl"
    return [json.loads(line) for line in mp.read_text(encoding="utf-8").splitlines() if line.strip()]


# Target bytes per pack chunk. Small on purpose: a worker maps exactly one chunk at a time, so
# this — not the dataset size — bounds peak commit charge. It also sets the resume granularity
# (an interrupt costs at most one chunk of redone work) and how often progress is reported.
_PACK_CHUNK_BYTES = 256 * 1024 ** 2


def _pack_chunk(task) -> tuple[int, int]:
    """Worker: decode a contiguous run of crops and write them into the shared memmap.

    Multiple workers write DISJOINT index ranges of the same on-disk memmap concurrently — the
    read+decode of 1M small PNGs is the bottleneck (I/O-bound, ~15% CPU single-threaded), so
    overlapping it across cores/disk-queue is the win. Module-level so it pickles to spawn workers.
    """
    mm_path, shape, items = task
    _n, h, w = shape
    crop_bytes = h * w * 3
    start = items[0][0]                    # `items` is a contiguous index run (see pack_dataset)
    count = items[-1][0] - start + 1
    # Map ONLY this worker's slice, not the whole file. Mapping the full array per worker made
    # every worker reserve the entire size, which blew the Windows commit limit once the pack
    # grew past ~100 GB (WinError 1455 "paging file too small") no matter how much disk was free.
    # numpy handles the page-alignment of `offset` internally.
    mm = np.memmap(mm_path, dtype=np.uint8, mode="r+", shape=(count, h, w, 3),
                   offset=start * crop_bytes)
    for idx, p in items:
        im = Image.open(p).convert("RGB")
        a = np.asarray(im, dtype=np.uint8)
        if a.shape != (h, w, 3):                       # guard against odd edge crops
            a = np.asarray(im.resize((w, h)), dtype=np.uint8)
        mm[idx - start] = a
    mm.flush()
    del mm
    return start, len(items)


def pack_dataset(name: str, paths: config.Paths = config.DATA, workers: int | None = None) -> dict:
    """Decode every crop of dataset ``name`` once into a single (N,H,W,3) uint8 memmap (parallel)."""
    from multiprocessing import Pool

    from ..dataset_build import dataset_dir

    dd = dataset_dir(name, paths)
    rows = _manifest_rows(dd)
    if not rows:
        raise ValueError(f"dataset '{name}' has an empty manifest")
    if str(rows[0].get("path", "")).startswith("mm://"):
        # Fused build (dataset build-synth): the memmap IS the source of truth, there are no crop
        # files to decode — re-packing would overwrite the pixels with garbage.
        raise ValueError(f"dataset '{name}' is a fused synth build — it is already packed and has "
                         f"no crop files. Re-create it with `chesslab dataset build-synth`.")
    w, h = (int(rows[0]["out_size"][0]), int(rows[0]["out_size"][1]))   # out_size = [W, H]
    n = len(rows)
    img_path, meta_path = _packed_paths(dd)
    progress_path = meta_path.with_name("packed_progress.json")
    crop_bytes = h * w * 3
    total_bytes = n * crop_bytes

    # Allocate the file with plain I/O rather than a full-size w+ memmap: mapping it just to
    # create it reserves that much commit charge up front and fails with WinError 1455 once the
    # dataset exceeds RAM + pagefile, independently of free disk.
    if not (img_path.exists() and img_path.stat().st_size == total_bytes):
        with open(img_path, "wb") as fh:
            fh.truncate(total_bytes)
        progress_path.unlink(missing_ok=True)          # fresh file -> previous progress is void

    # Un-publish the previous meta BEFORE touching the pixels. A re-pack rewrites the file in
    # place, so if it dies half way the old meta would still be sitting there — and its digest
    # still matches, since it describes the same manifest. load_packed would then serve a file
    # that is half old pixels, half new, with no sidecar left to hint at it.
    meta_path.unlink(missing_ok=True)

    # Many SMALL chunks instead of a few huge ones: each worker only maps its own chunk, so peak
    # commit stays flat regardless of dataset size, progress is fine-grained, and — with the
    # sidecar below — an interrupted pack resumes instead of redoing all of it.
    csize = max(1, _PACK_CHUNK_BYTES // crop_bytes)
    starts = list(range(0, n, csize))

    # The digest is what makes resume SAFE. Without it the signature was effectively just
    # (n, h, w) — so an interrupted pack could be resumed onto a DIFFERENT dataset that happened
    # to have the same row count and crop size: the already-allocated file is not re-truncated,
    # the recorded chunks are skipped, and packed_meta.json is then written from the NEW manifest.
    # Result: old pixels sitting under new labels, exit code 0, "100%", no warning.
    digest = _manifest_digest(rows)
    signature = {"n": n, "h": h, "w": w, "csize": csize, "digest": digest}
    done_starts: set[int] = set()
    if progress_path.exists():
        try:
            prev = json.loads(progress_path.read_text(encoding="utf-8"))
            if prev.get("signature") == signature:
                done_starts = set(prev.get("done", []))
        except (OSError, ValueError):
            done_starts = set()                        # unreadable sidecar -> just redo the work
    if done_starts:
        print(f"[pack] resuming: {len(done_starts)}/{len(starts)} chunks already packed", flush=True)

    items = [(i, r["path"]) for i, r in enumerate(rows)]
    workers = workers or max(2, min(8, (os.cpu_count() or 4)))
    tasks = [(str(img_path), (n, h, w), items[k:k + csize]) for k in starts if k not in done_starts]

    done = sum(min(csize, n - k) for k in done_starts)
    with Pool(workers) as pool:
        for start, c in pool.imap_unordered(_pack_chunk, tasks):
            done += c
            done_starts.add(start)
            progress_path.write_text(json.dumps({"signature": signature, "done": sorted(done_starts)}),
                                     encoding="utf-8")
            print(f"[pack] {done}/{n} crops ({100.0 * done / n:.1f}%)", flush=True)

    # Never publish meta for a partially written file: load_packed would happily serve it and the
    # unwritten rows are indistinguishable from legitimately black crops.
    if done != n:
        raise RuntimeError(f"pack incomplete: {done}/{n} crops written — refusing to write "
                           f"{meta_path.name}. Re-run to resume from {progress_path.name}.")
    meta_path.write_text(json.dumps({"n": n, "h": h, "w": w, "digest": digest,
                                     "paths": [r["path"] for r in rows]}), encoding="utf-8")
    progress_path.unlink(missing_ok=True)              # complete -> sidecar no longer needed
    gb = n * h * w * 3 / 1e9
    print(f"[OK] packed {n} crops -> {img_path} ({gb:.1f} GB, {workers} workers)")
    return {"n": n, "h": h, "w": w, "path": str(img_path), "gb": round(gb, 1)}


#: How many manifest rows `_rewritten_since_pack` stats. The digest covers path/label/size, so the
#: one thing left is a crop file whose PIXELS were rewritten under an unchanged path — which is what
#: a re-slice does to the whole pool at once. Spread evenly, 256 stats cost ~1 ms and miss a re-slice
#: touching 5 % of the rows with probability 0.95^256 ≈ 2e-6. Full coverage would need a stat per
#: row, and at a million rows that is tens of seconds on every single load.
_STALE_SAMPLE = 256


def _rewritten_since_pack(crop_paths: list[str], img_path: Path) -> bool:
    """True if any sampled crop is NEWER than the packed pixels — i.e. the pack is stale.

    Reference is the memmap's own mtime, not the sidecar's: the sidecar is written after the last
    chunk, so it would grant a pack that resumed across a re-slice a few extra minutes of credit.
    A false positive costs only the (correct, slower) per-PNG loader; a false negative trains a
    model on the pixels of a previous geometry with no warning at all.
    """
    try:
        packed_at = img_path.stat().st_mtime
    except OSError:
        return False
    step = max(1, len(crop_paths) // _STALE_SAMPLE)
    for p in crop_paths[::step]:
        try:
            if Path(p).stat().st_mtime > packed_at:
                return True
        except OSError:
            continue                        # a missing crop is the per-PNG loader's problem, not ours
    return False


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

    # Refuse a pack that does not belong to the CURRENT manifest. Training reads this by index, so
    # a mismatch means images silently paired with the wrong labels — the one failure mode that
    # produces a plausible-looking but wrong model. Packs written before digests existed have no
    # entry; treat them as unverifiable and fall back to the (slow but correct) per-PNG loader.
    expected = _manifest_digest(_manifest_rows(dd))
    if meta.get("digest") != expected:
        log.warning("packed data for '%s' does not match the current manifest (%s vs %s) — "
                    "ignoring the pack. Re-run `chesslab dataset pack %s`.",
                    name, meta.get("digest", "none"), expected, name)
        return None

    expected_bytes = n * h * w * 3
    if img_path.stat().st_size != expected_bytes:
        log.warning("packed file for '%s' is %d bytes, expected %d — ignoring the pack.",
                    name, img_path.stat().st_size, expected_bytes)
        return None

    if _rewritten_since_pack(meta["paths"], img_path):
        log.warning("crops of '%s' were rewritten after it was packed — ignoring the pack. "
                    "Re-run `chesslab dataset pack %s`.", name, name)
        return None

    path2idx = {p: i for i, p in enumerate(meta["paths"])}
    return str(img_path), (n, h, w), path2idx


def open_packed_memmap(path: str, shape):
    """Read-only memmap of the packed crops, shape (N, H, W, 3). Called lazily per worker."""
    n, h, w = shape
    return np.memmap(path, dtype=np.uint8, mode="r", shape=(n, h, w, 3))
