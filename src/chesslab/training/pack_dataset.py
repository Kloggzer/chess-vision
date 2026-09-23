"""Das DATENSATZ-PACK schreiben: die Crops eines Datensatzes in EINE `packed_images.u8` in
Manifest-Reihenfolge, weil 1M+ einzelne PNGs je Epoche die GPU aushungern.
"""

from __future__ import annotations

import json
import os
import time
from contextlib import contextmanager
from pathlib import Path

import numpy as np
from PIL import Image

from .. import config
from ..ioutil import write_json
from ..session_store.names import BOARD_DIR, LOG_FILE
from .packs import PACKS_KEY, _crop_fingerprint, _manifest_digest, _manifest_rows, _packed_paths


def write_packed_meta(meta_path: Path, rows: list[dict], h: int, w: int, *,
                      digest: str | None = None,
                      crop_fingerprint: dict[str, list] | None = None,
                      started_at: float | None = None) -> None:
    """Der EINE Schreiber von `packed_meta.json`. `crop_fingerprint` None heisst NICHT GERECHNET
    (Mtime-Weg), ein leeres dict GERECHNET ohne Dateien (`mm://`).
    """
    meta: dict = {"n": len(rows), "h": h, "w": w,
                  "digest": _manifest_digest(rows) if digest is None else digest,
                  "paths": [r["path"] for r in rows]}
    if started_at is not None:
        meta["started_at"] = started_at
    if crop_fingerprint is not None:
        meta["crop_fingerprint"] = crop_fingerprint
    write_json(meta_path, meta, indent=None)


# Small on purpose: a worker maps one chunk at a time, so this bounds peak commit charge and the
# resume granularity.
_PACK_CHUNK_BYTES = 256 * 1024 ** 2


@contextmanager
def row_window(mm_path, hw: tuple[int, int], indices):
    """Ein Schreibfenster ueber NUR die eigenen Zeilen: die ganze Datei je Worker sprengte jenseits
    ~100 GB das Commit-Limit (WinError 1455). Disjunkte Bereiche, also ist gleichzeitiges `r+`
    sicher.
    """
    h, w = hw
    lo, hi = min(indices), max(indices)
    mm = np.memmap(mm_path, dtype=np.uint8, mode="r+", shape=(hi - lo + 1, h, w, 3),
                   offset=lo * h * w * 3)
    try:
        yield lambda row, rgb: mm.__setitem__(row - lo, rgb)
    finally:
        mm.flush()


def _pack_chunk(task) -> tuple[int, int]:
    """Worker: decode a contiguous run of crops into the shared memmap; workers write DISJOINT
    ranges. Module-level so it pickles to spawn workers.
    """
    mm_path, shape, items = task
    _n, h, w = shape
    start = items[0][0]
    with row_window(mm_path, (h, w), [i for i, _ in items]) as put:
        for idx, p in items:
            put(idx, decode_crop(p, (w, h)))
    return start, len(items)


def write_crops(img_path: Path, crop_bytes: int, items) -> int:
    """`(index, BGR-Bild)` an ihren Platz: `seek` statt Memmap-Fenster, weil die Zeilen einer
    Aufnahme nach dem Split verstreut liegen.
    """
    written = 0
    with open(img_path, "r+b") as fh:
        for idx, crop in items:
            fh.seek(idx * crop_bytes)
            fh.write(np.ascontiguousarray(crop[:, :, ::-1]).tobytes())          # BGR -> RGB
            written += 1
    return written


def _cut_session(task) -> int:
    """Worker: eine Aufnahme aus ihren BRETTERN schneiden. Modulebene, damit sie sich picklen laesst."""
    img_path, crop_bytes, wh, sid, frames = task
    import cv2

    from ..calibration import load_profile
    from ..labeling import crop_square, read_log, read_session_meta, usable_board
    from ..session_store.recording import game_dir

    d = game_dir(sid[3:] if sid.startswith("rg-") else sid)
    profile = load_profile(read_session_meta(d)["profile"])
    rows = {Path(x["frame"]).stem: x for x in read_log(d)}

    def cuts():
        for stem, wanted in frames.items():
            row = rows.get(stem) or {}
            # Ein Brett mit eigenem Massstab wird unter dem PROFIL bis zu 59 px daneben geschnitten.
            if row.get("board") and not usable_board(row, profile):
                raise ValueError(f"{sid}/{stem}: Brett hat einen anderen Massstab als sein Profil")
            board = cv2.imread(str(d / row["board"])) if row.get("board") else None
            if board is None:
                continue
            for square, idx in wanted:
                yield idx, crop_square(board, square, profile, wh)

    return write_crops(Path(img_path), crop_bytes, cuts())


def decode_crop(path: str, wh: tuple[int, int]) -> np.ndarray:
    """Eine Pool-Datei als RGB in Modellgroesse — die EINE Definition, die auch `write_pool_pack`
    bytegleich nutzt.
    """
    w, h = wh
    im = Image.open(path).convert("RGB")
    a = np.asarray(im, dtype=np.uint8)
    if a.shape != (h, w, 3):
        a = np.asarray(im.resize((w, h)), dtype=np.uint8)
    return a


def _decode_chunk(task) -> int:
    """Worker: Crops aus ihren Dateien lesen. Fuer alles, was keine schneidbare Quelle hat."""
    img_path, crop_bytes, wh, items = task

    def imgs():
        for idx, path in items:
            yield idx, decode_crop(path, wh)[:, :, ::-1]

    return write_crops(Path(img_path), crop_bytes, imgs())


def cut_plan(rows: list[dict]) -> tuple[list[tuple[int, str]], dict]:
    """Je Zeile die beste Quelle: echte Aufnahmen aus ihrem BRETT (ein Resample statt zwei, 8 000
    statt 420 000 Dateien), Kompositen und Synth aus ihrer Datei.
    """
    from ..session_store.recording import game_dir

    files: list[tuple[int, str]] = []
    at: dict[str, dict[str, list[tuple[str, int]]]] = {}
    has_boards: dict[str, bool] = {}
    for i, r in enumerate(rows):
        sid, sq, frame = r.get("session_id"), r.get("square"), r.get("frame")
        if sid and sq and frame is not None:
            if sid not in has_boards:
                d = game_dir(sid[3:] if sid.startswith("rg-") else sid)
                has_boards[sid] = (d / LOG_FILE).exists() and (d / BOARD_DIR).is_dir()
            if has_boards[sid]:
                at.setdefault(sid, {}).setdefault(str(frame), []).append((sq, i))
                continue
        files.append((i, r["path"]))
    return files, at


def pack_dataset(name: str, paths: config.Paths = config.DATA, workers: int | None = None,
                 out_size: tuple[int, int] | None = None) -> dict:
    """Decode every crop of dataset `name` once into one (N,H,W,3) uint8 memmap, at the MODEL's
    resolution (`out_size`): 128 px verbatim cost 22.6 GB against 9.5 and a resize per batch.
    """
    from multiprocessing import Pool

    from ..dataset_build import _read_yaml, dataset_dir

    dd = dataset_dir(name, paths)
    rows = _manifest_rows(dd)
    if not rows:
        raise ValueError(f"dataset '{name}' has an empty manifest")
    # Before the fused-synth check: only dataset.yaml tells the two `mm://` kinds apart.
    if _read_yaml(dd / "dataset.yaml").get(PACKS_KEY):
        raise ValueError(f"dataset '{name}' is built from session packs — it has no crop files; "
                         f"its pixels live in data/packs/…")
    if str(rows[0].get("path", "")).startswith("mm://"):
        # A fused build's memmap IS the source; re-packing would overwrite the pixels with garbage.
        raise ValueError(f"dataset '{name}' is a fused synth build — it is already packed and has "
                         f"no crop files. Re-create it with `chesslab dataset build-synth`.")
    w, h = out_size or (int(rows[0]["out_size"][0]), int(rows[0]["out_size"][1]))
    n = len(rows)
    img_path, meta_path = _packed_paths(dd)
    progress_path = meta_path.with_name("packed_progress.json")
    crop_bytes = h * w * 3
    total_bytes = n * crop_bytes

    # Allocated with plain I/O: a full-size w+ memmap reserves that much commit and fails with
    # WinError 1455 beyond RAM + pagefile.
    if not (img_path.exists() and img_path.stat().st_size == total_bytes):
        with open(img_path, "wb") as fh:
            fh.truncate(total_bytes)
        progress_path.unlink(missing_ok=True)

    # Un-publish the old meta BEFORE touching the pixels: its digest still matches, and a
    # half-rewritten file would be served as valid.
    meta_path.unlink(missing_ok=True)

    files, at = cut_plan(rows)
    if at:
        per = max(1, _PACK_CHUNK_BYTES // crop_bytes)
        tasks = [(str(img_path), crop_bytes, (w, h), sid, frames) for sid, frames in at.items()]
        tasks += [(str(img_path), crop_bytes, (w, h), files[i:i + per])
                  for i in range(0, len(files), per)]
        kinds = len(at)
        procs = min(workers or config.DEFAULT_NUM_WORKERS, len(tasks))
        # VOR dem Pixel-Durchlauf: danach gestempelt beglaubigte der Wachhund den Re-Slice, der
        # dazwischenfuhr.
        fingerprint = _crop_fingerprint([path for _, path in files])
        with Pool(procs) as pool:
            got = sum(pool.imap_unordered(_cut_session, tasks[:kinds]))
            got += sum(pool.imap_unordered(_decode_chunk, tasks[kinds:]))
        if got != n:
            raise RuntimeError(f"pixel pass incomplete: {got}/{n} crops")
        # Ueber die DATEI-Zeilen: Brett-Zeilen holen ihre Pixel aus `boards/`. Ein leerer Wachhund
        # hiesse "nie wieder pruefen".
        write_packed_meta(meta_path, rows, h, w, crop_fingerprint=fingerprint)
        progress_path.unlink(missing_ok=True)
        return {"n": n, "h": h, "w": w, "path": str(img_path),
                "gb": round(total_bytes / 1e9, 2), "source": f"boards+files ({n - len(files)}/{len(files)})"}

    csize = max(1, _PACK_CHUNK_BYTES // crop_bytes)
    starts = list(range(0, n, csize))

    # The digest makes resume SAFE: with only (n, h, w) an interrupted pack resumed onto a different
    # dataset of equal size — old pixels under new labels, exit 0.
    digest = _manifest_digest(rows)
    signature = {"n": n, "h": h, "w": w, "csize": csize, "digest": digest}
    done_starts: set[int] = set()
    prev: dict = {}
    if progress_path.exists():
        try:
            prev = json.loads(progress_path.read_text(encoding="utf-8"))
            if prev.get("signature") == signature:
                done_starts = set(prev.get("done", []))
        except (OSError, ValueError):
            prev, done_starts = {}, set()              # unreadable sidecar -> just redo the work
    if done_starts:
        print(f"[pack] resuming: {len(done_starts)}/{len(starts)} chunks already packed", flush=True)

    # Stamped BEFORE the first chunk, and a resume inherits the ORIGINAL stamp, or it would certify
    # exactly the re-slice the check exists to catch.
    started_at = time.time()
    fingerprint = prev.get("crop_fingerprint") if done_starts else _crop_fingerprint(
        [r["path"] for r in rows])
    if done_starts:
        started_at = prev.get("started_at", started_at)

    items = [(i, r["path"]) for i, r in enumerate(rows)]
    workers = workers or max(2, min(8, (os.cpu_count() or 4)))
    tasks = [(str(img_path), (n, h, w), items[k:k + csize]) for k in starts if k not in done_starts]

    done = sum(min(csize, n - k) for k in done_starts)
    with Pool(workers) as pool:
        for start, c in pool.imap_unordered(_pack_chunk, tasks):
            done += c
            done_starts.add(start)
            write_json(progress_path, {"signature": signature, "started_at": started_at,
                                       "crop_fingerprint": fingerprint,
                                       "done": sorted(done_starts)}, indent=None)
            print(f"[pack] {done}/{n} crops ({100.0 * done / n:.1f}%)", flush=True)

    # Never publish meta for a partial file: unwritten rows look like legitimately black crops.
    if done != n:
        raise RuntimeError(f"pack incomplete: {done}/{n} crops written — refusing to write "
                           f"{meta_path.name}. Re-run to resume from {progress_path.name}.")
    write_packed_meta(meta_path, rows, h, w, digest=digest, started_at=started_at,
                      crop_fingerprint=fingerprint)
    progress_path.unlink(missing_ok=True)              # complete -> sidecar no longer needed
    gb = n * h * w * 3 / 1e9
    print(f"[OK] packed {n} crops -> {img_path} ({gb:.1f} GB, {workers} workers)")
    return {"n": n, "h": h, "w": w, "path": str(img_path), "gb": round(gb, 1)}


def link_pack(name: str, owner: str, paths: config.Paths = config.DATA) -> dict:
    """Point `name` at `owner`'s memmap instead of copying (13 xval variants held 118 GB of one
    raster). Refuses unless every crop this manifest needs is in the owner's pack.
    """
    from ..dataset_build import dataset_dir

    own_img, own_meta = _packed_paths(dataset_dir(owner, paths))
    if not own_meta.exists():
        raise ValueError(f"owner '{owner}' has no pack to share.")
    ometa = json.loads(own_meta.read_text(encoding="utf-8"))
    # Before the file check: a link has no memmap, and the error must name the chain.
    if ometa.get("packed_from"):
        raise ValueError(f"owner '{owner}' is itself a link (-> {ometa['packed_from']}); "
                         f"link to '{ometa['packed_from']}' instead.")
    if not own_img.exists():
        raise ValueError(f"owner '{owner}' has no pack to share.")

    dd = dataset_dir(name, paths)
    rows = _manifest_rows(dd)
    missing = {r["path"] for r in rows} - set(ometa["paths"])
    if missing:
        raise ValueError(f"'{owner}' does not carry {len(missing)} of {len(rows)} crops "
                         f"'{name}' needs, e.g. {sorted(missing)[0]}")

    img_path, meta_path = _packed_paths(dd)
    link = {"n": ometa["n"], "h": ometa["h"], "w": ometa["w"], "digest": _manifest_digest(rows),
            "paths": ometa["paths"], "packed_from": owner}
    # Without the owner's reference every staleness check falls back to the unreliable file mtime;
    # `baked` too, or the loader computes CLAHE a second time.
    link.update({k: ometa[k] for k in ("started_at", "crop_fingerprint", "baked") if k in ometa})
    write_json(meta_path, link, indent=None)
    freed = img_path.stat().st_size if img_path.exists() else 0
    img_path.unlink(missing_ok=True)
    print(f"[OK] '{name}' now reads '{owner}' ({freed / 1e9:.2f} GB freed)")
    return {"name": name, "packed_from": owner, "freed_bytes": freed, "rows": len(rows)}
