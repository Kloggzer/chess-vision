"""Das DATENSATZ-PACK (`docs/packs.md`), nicht das Session-Pack in `packs.py` daneben.

Eines gebauten Datensatzes Crops in EINEM memory-mapped uint8-Array. Loading 1M+ individual PNGs
per epoch (``Image.open`` per item in ``SquareDataset``) is the training bottleneck on this
project — random small-file opens on Windows dominate and the GPU starves. Packing all crops into
a single ``packed_images.u8`` memmap turns 1M random file opens into slice reads from one file:
the first epoch warms the OS page cache, later epochs are effectively RAM-speed.
``PackedSquareDataset`` (in ``torch_data``) reads from this instead of the filesystem.

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
import time
from contextlib import contextmanager
from pathlib import Path
from typing import NamedTuple

import numpy as np
from PIL import Image

from .. import config
from ..ioutil import write_json
from ..work_audit import measure

log = logging.getLogger("chesslab.pack")


class PackedIndex(NamedTuple):
    """Was `load_packed` zurueckgibt, mit Namen statt Positionen.

    Bleibt ein Tupel, also packt jede aeltere Stelle es weiter positional aus. Fuer MEHRERE Packs
    reicht es nicht — dafuer ist `resolve_dataset_packs`, und `load_packed` weist solche
    Datensaetze beim Namen ab statt hier etwas hineinzuzwaengen.
    """

    image: str
    shape: tuple[int, int, int]
    path2idx: dict[str, int] | None


def _packed_paths(dd: Path) -> tuple[Path, Path]:
    return dd / "packed_images.u8", dd / "packed_meta.json"


def write_packed_meta(meta_path: Path, rows: list[dict], h: int, w: int, *,
                      digest: str | None = None,
                      crop_fingerprint: dict[str, list] | None = None,
                      started_at: float | None = None) -> None:
    """Der EINE Schreiber von `packed_meta.json`.

    `crop_fingerprint` unterscheidet drei Faelle, und der Unterschied steuert
    `_rewritten_since_pack`: `None` heisst NICHT GERECHNET (Altpack, Mtime-Weg), ein leeres dict
    heisst GERECHNET und nichts zu vergleichen (`mm://`-Zeilen haben keine Datei).
    """
    meta: dict = {"n": len(rows), "h": h, "w": w,
                  "digest": _manifest_digest(rows) if digest is None else digest,
                  "paths": [r["path"] for r in rows]}
    if started_at is not None:
        meta["started_at"] = started_at
    if crop_fingerprint is not None:
        meta["crop_fingerprint"] = crop_fingerprint
    write_json(meta_path, meta, indent=None)


def _manifest_digest(rows: list[dict]) -> str:
    """Fingerprint of a manifest: which crops, in which order, with which labels, are packed.

    Row count and crop size are not enough to tell two datasets apart — see the resume guard in
    ``pack_dataset``. Path + label + out_size covers reordering, substitution and relabelling,
    and is cheap next to decoding a million PNGs.

    What it deliberately does NOT cover: a crop file whose PIXELS changed while keeping the same
    path (a re-slice at different pads, a synth re-render writing over itself). Catching
    that would need a stat() or hash per row. Callers that rewrite crops in place must re-pack;
    ``build_dataset`` does so implicitly because it rmtree's the dataset dir first.
    """
    h = hashlib.sha256()
    for r in rows:
        # One encode/update instead of six. The byte stream stays identical, so all existing
        # packed_meta digests remain valid.
        h.update((f'{r["path"]}\0{r.get("label", "")}\0{r.get("out_size", "")}\n')
                 .encode())
    return h.hexdigest()[:32]


def _manifest_rows(dd: Path) -> list[dict]:
    from .data import load_manifest

    return load_manifest(dd / "manifest.jsonl")


# Target bytes per pack chunk. Small on purpose: a worker maps exactly one chunk at a time, so
# this — not the dataset size — bounds peak commit charge. It also sets the resume granularity
# (an interrupt costs at most one chunk of redone work) and how often progress is reported.
_PACK_CHUNK_BYTES = 256 * 1024 ** 2


@contextmanager
def row_window(mm_path, hw: tuple[int, int], indices):
    """Ein Schreibfenster ueber NUR die eigenen Zeilen — `put(row_index, rgb)`.

    Die ganze Datei je Worker zu mappen liess jeden die volle Groesse reservieren und sprengte
    jenseits ~100 GB das Commit-Limit (WinError 1455), egal wie frei die Platte war. Worker
    schreiben disjunkte Bereiche, darum ist gleichzeitiges `r+` sicher.
    """
    h, w = hw
    lo, hi = min(indices), max(indices)
    mm = np.memmap(mm_path, dtype=np.uint8, mode="r+", shape=(hi - lo + 1, h, w, 3),
                   offset=lo * h * w * 3)
    try:
        yield lambda row, rgb: mm.__setitem__(row - lo, rgb)
    finally:
        mm.flush()          # die Abbildung faellt mit dem Rahmen


def _pack_chunk(task) -> tuple[int, int]:
    """Worker: decode a contiguous run of crops and write them into the shared memmap.

    Multiple workers write DISJOINT index ranges of the same on-disk memmap concurrently — the
    read+decode of 1M small PNGs is the bottleneck (I/O-bound, ~15% CPU single-threaded), so
    overlapping it across cores/disk-queue is the win. Module-level so it pickles to spawn workers.
    """
    mm_path, shape, items = task
    _n, h, w = shape
    start = items[0][0]                    # `items` is a contiguous index run (see pack_dataset)
    with row_window(mm_path, (h, w), [i for i, _ in items]) as put:
        for idx, p in items:
            im = Image.open(p).convert("RGB")
            a = np.asarray(im, dtype=np.uint8)
            if a.shape != (h, w, 3):                   # guard against odd edge crops
                a = np.asarray(im.resize((w, h)), dtype=np.uint8)
            put(idx, a)
    return start, len(items)


def write_crops(img_path: Path, crop_bytes: int, items) -> int:
    """`(index, BGR-Bild)` an ihren Platz im Memmap schreiben.

    `seek` statt Memmap-Fenster: nach dem Split liegen die Zeilen einer Aufnahme verstreut, ein
    Fenster ueber min..max waere fast die ganze Datei. Indizes sind disjunkt, also duerfen mehrere
    Prozesse gleichzeitig in dieselbe Datei schreiben — dasselbe Argument wie in [_pack_chunk].
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
    from ..realgames import game_dir

    d = game_dir(sid[3:] if sid.startswith("rg-") else sid)
    profile = load_profile(read_session_meta(d)["profile"])
    rows = {Path(x["frame"]).stem: x for x in read_log(d)}

    def cuts():
        for stem, wanted in frames.items():
            row = rows.get(stem) or {}
            # Dieselbe Wache wie bei jedem anderen Brettleser: `crop_square` leitet den Rand aus
            # dem PROFIL ab, ein Brett mit eigenem Massstab wird sonst bis zu 59 px daneben
            # geschnitten — und das sind die Pixel, aus denen das Modell lernt.
            if row.get("board") and not usable_board(row, profile):
                raise ValueError(f"{sid}/{stem}: Brett hat einen anderen Massstab als sein Profil")
            board = cv2.imread(str(d / row["board"])) if row.get("board") else None
            if board is None:
                continue
            for square, idx in wanted:
                yield idx, crop_square(board, square, profile, wh)

    return write_crops(Path(img_path), crop_bytes, cuts())


def decode_crop(path: str, wh: tuple[int, int]) -> np.ndarray:
    """Eine Pool-Datei als RGB in Modellgroesse. Die EINE Definition dieses Wegs.

    `training.pack_session.write_pool_pack` schneidet daraus den Pack einer Aufnahme ohne
    Verzeichnis — bytegleich zum Monolithen, weil es dieselbe Funktion ist und nicht dieselbe Idee.
    """
    w, h = wh
    im = Image.open(path).convert("RGB")
    a = np.asarray(im, dtype=np.uint8)
    if a.shape != (h, w, 3):                           # 128er Pool auf Modellgroesse
        a = np.asarray(im.resize((w, h)), dtype=np.uint8)
    return a


def _decode_chunk(task) -> int:
    """Worker: Crops aus ihren Dateien lesen. Fuer alles, was keine schneidbare Quelle hat."""
    img_path, crop_bytes, wh, items = task

    def imgs():
        for idx, path in items:
            yield idx, decode_crop(path, wh)[:, :, ::-1]   # `write_crops` dreht wieder auf RGB

    return write_crops(Path(img_path), crop_bytes, imgs())


def cut_plan(rows: list[dict]) -> tuple[list[tuple[int, str]], dict]:
    """Je Zeile die beste Quelle: `(aus Dateien, nach Aufnahme gruppiert)`.

    Eine echte Aufnahme wird aus ihrem BRETT geschnitten — ein Resample statt zwei, und 8 000
    Brett-Dateien statt 420 000 Crop-Dateien (`docs/data-pipeline.md` 3.1). Alles ohne Brett
    (Kompositen, Synth) kommt weiter aus seiner Datei; neu zu rendern waere teurer als der Umweg.
    """
    from ..realgames import game_dir

    files: list[tuple[int, str]] = []
    at: dict[str, dict[str, list[tuple[str, int]]]] = {}
    has_boards: dict[str, bool] = {}
    for i, r in enumerate(rows):
        sid, sq, frame = r.get("session_id"), r.get("square"), r.get("frame")
        if sid and sq and frame is not None:
            if sid not in has_boards:
                d = game_dir(sid[3:] if sid.startswith("rg-") else sid)
                has_boards[sid] = (d / "log.jsonl").exists() and (d / "boards").is_dir()
            if has_boards[sid]:
                at.setdefault(sid, {}).setdefault(str(frame), []).append((sq, i))
                continue
        files.append((i, r["path"]))
    return files, at


def pack_dataset(name: str, paths: config.Paths = config.DATA, workers: int | None = None,
                 out_size: tuple[int, int] | None = None) -> dict:
    """Decode every crop of dataset ``name`` once into a single (N,H,W,3) uint8 memmap (parallel).

    ``out_size`` (W, H) packs at the MODEL's resolution instead of the file's. The two stopped
    being the same thing when the crop store went to 128 px for the label view: packing that
    verbatim cost 22.6 GB where the 80 px recipe needs 9.5, and every batch then paid a
    128 -> 80 resize (+9 % measured). The scaling happens once, here.
    """
    from multiprocessing import Pool

    from ..dataset_build import _read_yaml, dataset_dir
    from . import packs

    dd = dataset_dir(name, paths)
    rows = _manifest_rows(dd)
    if not rows:
        raise ValueError(f"dataset '{name}' has an empty manifest")
    # Before the fused-synth check below: both kinds carry `mm://` rows, and only dataset.yaml
    # tells them apart.
    if _read_yaml(dd / "dataset.yaml").get(packs.PACKS_KEY):
        raise ValueError(f"dataset '{name}' is built from session packs — it has no crop files; "
                         f"its pixels live in data/packs/…")
    if str(rows[0].get("path", "")).startswith("mm://"):
        # Fused build (dataset build-synth): the memmap IS the source of truth, there are no crop
        # files to decode — re-packing would overwrite the pixels with garbage.
        raise ValueError(f"dataset '{name}' is a fused synth build — it is already packed and has "
                         f"no crop files. Re-create it with `chesslab dataset build-synth`.")
    w, h = out_size or (int(rows[0]["out_size"][0]), int(rows[0]["out_size"][1]))   # [W, H]
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

    # Composite-Zeilen tragen ihre Herkunft — dann schneidet der Pixel-Pass aus der Quelle
    # statt den 128er Pool auf die Modellgroesse zu skalieren. Ein Resample statt zwei
    # (`docs/data-pipeline.md` 3.1).
    # Nur wenn die Zielgroesse von der Dateigroesse abweicht — sonst waeren die Dateien
    # schon exakt und das Dekodieren ist der kuerzere Weg.
    # Nur wenn die Zielgroesse von der Dateigroesse abweicht: sonst waeren die Crops schon exakt und
    # das Dekodieren ist der kuerzere Weg. Kompositen tragen ihre Herkunft, echte Aufnahmen ihr
    # Brett — erst wenn JEDE Zeile eine Quelle hat, faellt der Dateiweg weg.
    files, at = cut_plan(rows)
    if at:
        per = max(1, _PACK_CHUNK_BYTES // crop_bytes)
        tasks = [(str(img_path), crop_bytes, (w, h), sid, frames) for sid, frames in at.items()]
        tasks += [(str(img_path), crop_bytes, (w, h), files[i:i + per])
                  for i in range(0, len(files), per)]
        kinds = len(at)
        procs = min(workers or config.DEFAULT_NUM_WORKERS, len(tasks))
        # VOR dem Pixel-Durchlauf, wie im Zweig darunter: danach gestempelt beglaubigt der
        # Wachhund genau den Re-Slice, der waehrend des Packens dazwischenfuhr.
        fingerprint = _crop_fingerprint([path for _, path in files])
        with Pool(procs) as pool:
            got = sum(pool.imap_unordered(_cut_session, tasks[:kinds]))
            got += sum(pool.imap_unordered(_decode_chunk, tasks[kinds:]))
        if got != n:
            raise RuntimeError(f"pixel pass incomplete: {got}/{n} crops")
        # Ueber die DATEI-Zeilen, nicht ueber alle: die Brett-Zeilen holen ihre Pixel aus
        # `boards/`, ihre Crop-Datei sagt also nichts ueber den Pack. Ein leerer Wachhund war
        # kein "nichts zu pruefen", sondern "nie wieder pruefen" — `_rewritten_since_pack`
        # lief durch eine leere Schleife und meldete jeden Re-Slice als frisch.
        write_packed_meta(meta_path, rows, h, w, crop_fingerprint=fingerprint)
        progress_path.unlink(missing_ok=True)
        return {"n": n, "h": h, "w": w, "path": str(img_path),
                "gb": round(total_bytes / 1e9, 2), "source": f"boards+files ({n - len(files)}/{len(files)})"}

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

    # Stamped BEFORE the first chunk, and a resume inherits the ORIGINAL stamp: chunks written
    # before a re-slice hold the old pixels, so re-stamping now would certify exactly what
    # `_rewritten_since_pack` exists to catch. A sidecar without one falls back to the file mtime.
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

    # Never publish meta for a partially written file: load_packed would happily serve it and the
    # unwritten rows are indistinguishable from legitimately black crops.
    if done != n:
        raise RuntimeError(f"pack incomplete: {done}/{n} crops written — refusing to write "
                           f"{meta_path.name}. Re-run to resume from {progress_path.name}.")
    write_packed_meta(meta_path, rows, h, w, digest=digest, started_at=started_at,
                      crop_fingerprint=fingerprint)
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


def _sampled_paths(crop_paths: list[str]) -> list[str]:
    step = max(1, len(crop_paths) // _STALE_SAMPLE)
    return crop_paths[::step]


def _crop_fingerprint(crop_paths: list[str]) -> dict[str, list]:
    """(mtime, size) of the sampled crops, read BEFORE the first chunk is written."""
    out: dict[str, list] = {}
    for p in _sampled_paths(crop_paths):
        try:
            st = Path(p).stat()
        except OSError:
            continue                       # `mm://` rows and absent files simply carry no entry
        out[p] = [st.st_mtime, st.st_size]
    return out


def _rewritten_since_pack(crop_paths: list[str], img_path: Path,
                          fingerprint: dict[str, list] | None) -> bool:
    """True if a sampled crop differs from what it was when the pack STARTED — i.e. it is stale.

    Comparing on inequality needs no clock, so exFAT's 2 s and SMB's server time stop mattering,
    and a crop restored with an OLDER mtime (a `_parked/` restore, a copy preserving timestamps)
    is caught too. Packs from before the fingerprint fall back to the memmap's own mtime — the
    reference they were written under, which Windows leaves anywhere between prealloc and last
    flush: on `comp13-occ-80-v2` it stood on the prealloc 2.5 h before the pack finished.
    """
    if fingerprint is not None:
        for p, (mtime, size) in fingerprint.items():
            try:
                st = Path(p).stat()
            except OSError:
                continue                   # a crop that vanished does not unmake the packed pixels
            if st.st_mtime != mtime or st.st_size != size:
                return True
        return False
    try:
        packed_at = img_path.stat().st_mtime
    except OSError:
        return False
    for p in _sampled_paths(crop_paths):
        try:
            if Path(p).stat().st_mtime > packed_at:
                return True
        except OSError:
            continue                        # a missing crop is the per-PNG loader's problem, not ours
    return False


def resolve_dataset_packs(name: str, paths: config.Paths = config.DATA,
                          manifest_rows: list[dict] | None = None):
    """None for a classic dataset; a MultiPack when its dataset.yaml carries `packs:`.

    Every resolved row keeps its `(pack_no, row_no)` on `_pack_at`, the way `_load_packed` marks
    `_packed_idx`: train and eval resolve the whole manifest but build datasets from SPLIT rows,
    and only the row itself carries the pair into that subset.
    """
    import yaml  # local, like the imports below: `packs.py` imports this module at module level

    from ..dataset_build import dataset_dir
    from .packs import PACKS_KEY, resolve_packs

    dd = dataset_dir(name, paths)
    cfg = dd / "dataset.yaml"
    if not (cfg.exists() and (yaml.safe_load(cfg.read_text(encoding="utf-8")) or {}).get(PACKS_KEY)):
        return None
    rows = manifest_rows if manifest_rows is not None else _manifest_rows(dd)
    mp = resolve_packs(rows, paths)                # KeyError/ValueError propagate — never None
    for row, at in zip(rows, mp.idx, strict=True):
        row["_pack_at"] = (int(at[0]), int(at[1]))
    return mp


def load_packed(name: str, paths: config.Paths = config.DATA,
                manifest_rows: list[dict] | None = None):
    """Audit-aware entry point for loading and validating one packed dataset index.

    ``manifest_rows`` lets callers that already parsed the dataset manifest reuse those rows.
    Training always has them in memory before it resolves the pack; parsing the same large JSONL
    a second time used to dominate startup and building a path dictionary duplicated its strings.
    """
    from ..dataset_build import dataset_dir

    # The legacy 3-tuple is unpacked positionally at ten sites (train, gradcam, eight scripts);
    # several memmaps cannot be squeezed into it, so a pack-built dataset is refused by name.
    if resolve_dataset_packs(name, paths, manifest_rows) is not None:
        raise ValueError(f"dataset '{name}' is built from session packs — its pixels live in "
                         "data/packs/…; use training.pack.resolve_dataset_packs (train/eval do)")

    dd = dataset_dir(name, paths)
    manifest = dd / "manifest.jsonl"
    meta = dd / "packed_meta.json"
    fingerprint = tuple(
        (p.stat().st_mtime_ns, p.stat().st_size) if p.exists() else None
        for p in (manifest, meta)
    )
    with measure("packed dataset index loads", (dd.resolve(), fingerprint),
                 processed_bytes=manifest.stat().st_size if manifest.exists() else 0):
        return _load_packed(name, paths, manifest_rows)


def open_packed_rows(name: str, manifest_rows: list[dict],
                     paths: config.Paths = config.DATA) -> tuple[np.memmap, dict[str, int]]:
    """`(Memmap, {Crop-Pfad: Zeile})` fuer Analyse-Skripte — die EINE Aufloesung.

    Zehn Skripte bauten sie woertlich nach (`p2i or {…"_packed_idx"…}` plus `np.memmap`), keines
    mehrpack-faehig. NICHT fuer DataLoader-Worker: eine offene Memmap uebersteht das Pickling nach
    Windows-Spawn nicht, dafuer ist [_load_packed] da.
    """
    packed = load_packed(name, paths, manifest_rows=manifest_rows)
    if not packed:
        raise FileNotFoundError(f"{name} hat keine Memmap — erst `chesslab dataset pack`")
    n, h, w = packed.shape
    index = (packed.path2idx
             or {r["path"]: r["_packed_idx"] for r in manifest_rows if "_packed_idx" in r})
    return np.memmap(packed.image, dtype=np.uint8, mode="r", shape=(n, h, w, 3)), index


def _load_packed(name: str, paths: config.Paths = config.DATA,
                 manifest_rows: list[dict] | None = None):
    """Return (packed_file_path, (N,H,W), {crop_path: index}) or None if not packed.

    Deliberately does NOT return an open memmap: an np.memmap doesn't survive pickling to Windows
    spawn DataLoader workers (`pickle data was truncated`). PackedSquareDataset opens the memmap
    lazily inside each worker from the path+shape instead, and keeps only a small int index array.
    """
    from ..dataset_build import dataset_dir

    dd = dataset_dir(name, paths)
    img_path, meta_path = _packed_paths(dd)
    if not meta_path.exists():
        return None
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    # A variant that only re-selects ROWS reads the owner's pixels (`link_pack`). Every guard below
    # then checks the owner's file, which is what it should check — the digest still comes from THIS
    # dataset's own manifest, so a mismatched selection is caught exactly as before.
    if meta.get("packed_from"):
        img_path, _ = _packed_paths(dataset_dir(meta["packed_from"], paths))
    if not img_path.exists():
        return None
    n, h, w = int(meta["n"]), int(meta["h"]), int(meta["w"])

    # Refuse a pack that does not belong to the CURRENT manifest. Training reads this by index, so
    # a mismatch means images silently paired with the wrong labels — the one failure mode that
    # produces a plausible-looking but wrong model. Packs written before digests existed have no
    # entry; treat them as unverifiable and fall back to the (slow but correct) per-PNG loader.
    rows = manifest_rows if manifest_rows is not None else _manifest_rows(dd)
    expected = _manifest_digest(rows)
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

    if _rewritten_since_pack(meta["paths"], img_path, meta.get("crop_fingerprint")):
        log.warning("crops of '%s' were rewritten after it was packed — ignoring the pack. "
                    "Re-run `chesslab dataset pack %s`.", name, name)
        return None

    # A direct pack has exactly the manifest's row order.  Marking those already-live row dicts
    # costs one compact integer per row (~6 MiB for the current 241k corpus), while the old
    # 241k-entry path dictionary retained another copy of every key and cost tens of MiB.  Linked
    # packs address an owner's superset and therefore still need the general path lookup.
    path2idx = None
    if manifest_rows is not None and not meta.get("packed_from") and len(rows) == n:
        for i, row in enumerate(rows):
            row["_packed_idx"] = i
    else:
        path2idx = {p: i for i, p in enumerate(meta["paths"])}
    return PackedIndex(str(img_path), (n, h, w), path2idx)


def link_pack(name: str, owner: str, paths: config.Paths = config.DATA) -> dict:
    """Point `name` at `owner`'s memmap instead of copying pixels it already holds.

    A dataset whose manifest is a SUBSET of another's packed the identical bytes a second time:
    13 xval variants held 8.89 GB each of one raster, 118 GB for 17 differing row selections.
    Refuses unless every crop this manifest needs is in the owner's pack, so the link can only
    replace a copy that was valid.
    """
    from ..dataset_build import dataset_dir

    own_img, own_meta = _packed_paths(dataset_dir(owner, paths))
    if not own_meta.exists():
        raise ValueError(f"owner '{owner}' has no pack to share.")
    ometa = json.loads(own_meta.read_text(encoding="utf-8"))
    # Before the file check: a link HAS no memmap, so testing the file first would blame the
    # absent pixels instead of naming the chain, and the caller would relink to the same gap.
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
    # A link has no memmap of its own, so without the owner's reference every staleness check
    # would fall back to the owner FILE's mtime — the unreliable one. `baked` travels for the same
    # reason: the operator sits in the pixels this link reads, and a link that stays silent about
    # it makes the loader compute CLAHE a second time.
    link.update({k: ometa[k] for k in ("started_at", "crop_fingerprint", "baked") if k in ometa})
    write_json(meta_path, link, indent=None)
    freed = img_path.stat().st_size if img_path.exists() else 0
    img_path.unlink(missing_ok=True)
    print(f"[OK] '{name}' now reads '{owner}' ({freed / 1e9:.2f} GB freed)")
    return {"name": name, "packed_from": owner, "freed_bytes": freed, "rows": len(rows)}


class _PreadRows:
    """Dieselbe `reader[i] -> (H, W, 3)`-Schnittstelle wie die Memmap, aber ueber `seek`+`read`.

    Der Unterschied ist, WO die Bytes liegen bleiben: eine Memmap behaelt jede beruehrte Seite im
    Arbeitssatz des Workers, ein Datei-Lesevorgang laesst sie im Systemcache — geteilt und
    verwerfbar. Gemessen ueber 30 000 zufaellige Crops: 1 482 MB gegen 109 MB, also 13,6x weniger.
    """

    def __init__(self, path: str, shape) -> None:
        self._n, self._h, self._w = shape
        self._row = self._h * self._w * 3
        self._f = open(path, "rb", buffering=0)

    def __getitem__(self, i):
        # Ein Schnitt ist EIN Lesevorgang statt 64 Suchlaeufen — und dieser Reader wird gerade
        # dann gewaehlt, wenn der Pack nicht in den RAM passt, also jeder Seek die Platte trifft.
        if isinstance(i, slice):
            start, stop, step = i.indices(self._n)
            if step != 1:
                raise ValueError(f"nur zusammenhaengende Schnitte, nicht step={step}")
            self._f.seek(start * self._row)
            buf = self._f.read(max(0, stop - start) * self._row)
            return np.frombuffer(buf, np.uint8).reshape(-1, self._h, self._w, 3)
        self._f.seek(int(i) * self._row)
        return np.frombuffer(self._f.read(self._row), np.uint8).reshape(self._h, self._w, 3)


def _pread_wanted(path: str) -> bool:
    """pread, sobald der Pack gross gegen den Arbeitsspeicher ist — sonst die schnellere Memmap.

    Auf warmen Seiten ist die Memmap 3x schneller, auf kalten ist pread es. Passt der Pack nicht
    in den RAM, sind fast alle Seiten kalt, und die Memmap kauft ihren Vorsprung mit Auslagerung.
    """
    override = os.environ.get("CHESSLAB_PACK_READER")
    if override:
        return override == "pread"
    total = _total_ram()
    if not total:
        log.info("[pack] RAM-Groesse unbekannt — bleibe bei der Memmap.")
        return False
    return os.path.getsize(path) > 0.5 * total


def _total_ram() -> int:
    """Physischer Arbeitsspeicher in Bytes, 0 wenn unbekannt. `psutil` ist keine Abhaengigkeit."""
    import ctypes

    class _Status(ctypes.Structure):
        _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]

    try:
        st = _Status()
        st.dwLength = ctypes.sizeof(_Status)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(st)):
            return int(st.ullTotalPhys)
    except (AttributeError, OSError):
        pass
    try:
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")
    except (AttributeError, ValueError, OSError):
        return 0


def open_packed_memmap(path: str, shape, *, low_memory: bool = False):
    """Read-only reader of the packed crops, shape (N, H, W, 3). Called lazily per worker."""
    if low_memory or _pread_wanted(path):
        return _PreadRows(path, shape)
    n, h, w = shape
    return np.memmap(path, dtype=np.uint8, mode="r", shape=(n, h, w, 3))
