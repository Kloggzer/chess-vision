"""Writing side of a session pack: from its BOARDS, or from its crop pool when there is no directory
(composite, turntable); `import_pack` adopts Kotlin's (`docs/packs.md`).
"""

from __future__ import annotations

import json
import shutil
import time
from pathlib import Path

import numpy as np

from .. import config
from ..ioutil import read_jsonl, write_json
from ..session_store.names import CORRECTIONS_FILE, UNUSABLE_CELLS_FILE
from . import packs
from .pack_dataset import decode_crop, write_packed_meta

#: The human ledgers a pack freezes at cut time; `dataset_build` compares this stamp before it cites.
LEDGERS = (UNUSABLE_CELLS_FILE, CORRECTIONS_FILE)
LEDGER_STAMP = "ledgers.json"


def ledger_stamps(session_path: Path) -> dict[str, str | None]:
    from ..provenance import file_stamp

    return {n: file_stamp(session_path / n) for n in LEDGERS}


def write_meta(dir_: Path, rows: list[dict], h: int, w: int) -> None:
    """Ohne `crop_fingerprint`, also bytegleich zu vorher; `synth_build` schreibt fuer
    `mm://`-Zeilen ein leeres dict (siehe TODO.md).
    """
    write_packed_meta(dir_ / packs._META, rows, h, w)


def _gb(n: int, h: int, w: int) -> float:
    return round(n * h * w * 3 / 1e9, 2)


def write_session_pack(session_id: str, size: int = packs.DEFAULT_PACK_SIDE, *,
                       paths: config.Paths = config.DATA, profile: str | None = None,
                       pad_side: float | None = None,
                       replace: bool = False) -> dict:
    """Cut every crop of `session_id` at `size` px into `data/packs/<session_id>-<size>/`."""
    from ..labeling import _profile_for_session, iter_session_crops, read_session_meta
    from ..session_store.paths import session_dir

    name = f"{session_id}-{size}"
    session_path, _ = session_dir(session_id, paths)
    prof = _profile_for_session(read_session_meta(session_path), profile)
    # BEFORE the cut: a verdict written meanwhile reads as a mismatch, never as frozen.
    stamp = {"ledgers": ledger_stamps(session_path)}
    crops = ((crop[:, :, ::-1], row) for crop, row in
             iter_session_crops(session_path, profile=prof, pad_side=pad_side,
                                out_size=(size, size)))
    return _cut(name, size, crops, f"session {session_id}", paths, replace, stamp)


def write_pool_pack(session_id: str, size: int = packs.DEFAULT_PACK_SIDE, *, pool: str,
                    paths: config.Paths = config.DATA, replace: bool = False) -> dict:
    """Pack `session_id` from crop pool `pool`, the way for a session with no directory,
    byte-identical via `decode_crop`. `pool` stays explicit: composites sit in two pools.
    """
    from ..dataset import load_manifest

    name = f"{session_id}-{size}"
    rows = [r for r in load_manifest(paths.crops / pool / "manifest.jsonl")
            if r["session_id"] == session_id]
    crops = ((decode_crop(r["path"], (size, size)), r) for r in rows)
    return _cut(name, size, crops, f"session {session_id} in pool {pool}", paths, replace)


def _cut(name: str, size: int, crops, what: str, paths: config.Paths, replace: bool,
         stamp: dict | None = None) -> dict:
    """`_write_rows` into a fresh directory; with `replace`, the old pack goes only once the new one
    is complete — every citing dataset would break at once.
    """
    out_dir = packs.pack_dir(name, paths)
    old = None
    if out_dir.exists():
        if not replace:
            raise ValueError(f"pack {name} already exists at {out_dir} — a pack is immutable, "
                             f"delete it to cut the session again")
        old = out_dir.with_name(f"{out_dir.name}.superseded-{time.strftime('%Y%m%d-%H%M%S')}")
        out_dir.rename(old)
    out_dir.mkdir(parents=True)
    try:
        res = _write_rows(name, out_dir, size, crops, what)
        if stamp is not None:
            write_json(out_dir / LEDGER_STAMP, stamp)
    except BaseException:
        shutil.rmtree(out_dir, ignore_errors=True)
        if old:
            old.rename(packs.pack_dir(name, paths))
        raise
    if old:
        shutil.rmtree(old)
        res["replaced"] = True
    return res


def _write_rows(name: str, out_dir: Path, size: int, crops, what: str) -> dict:
    """Consume `(RGB crop, row)` into the pack, setting the `mm://` path; written as `.partial` and
    renamed last, so an interrupted cut is refused by `read_pack`.
    """
    partial = out_dir / (packs._IMAGE + ".partial")
    rows: list[dict] = []
    h = w = size
    shape: tuple[int, int] | None = None
    with partial.open("wb") as fh:
        for crop, row in crops:
            row["path"] = packs.mm_path(name, str(row["frame"]), str(row["square"]))
            h, w = crop.shape[:2]
            # EINE Geometrie fuer alle Zeilen: zwei Formen gleicher Pixelzahl (2x3, 3x2) rutschten
            # sonst durch.
            if shape is None:
                shape = (h, w)
            elif (h, w) != shape:
                raise ValueError(f"{what}: crop {row['frame']}/{row['square']} is {h}x{w}, the "
                                 f"pack already holds {shape[0]}x{shape[1]} — one pack, one shape")
            fh.write(np.ascontiguousarray(crop).tobytes())
            rows.append(row)
    if not rows:
        shutil.rmtree(out_dir)
        raise ValueError(f"{what} yields no crops — nothing to pack")
    if len({r["path"] for r in rows}) != len(rows):
        shutil.rmtree(out_dir)
        raise ValueError(f"{what}: frame+square is not unique, rows would collide under one "
                         f"`mm://` path — the pack can only hold one of them")

    (out_dir / "manifest.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")
    write_meta(out_dir, rows, h, w)
    partial.rename(out_dir / packs._IMAGE)
    return {"pack": name, "n": len(rows), "h": h, "w": w, "gb": _gb(len(rows), h, w)}


def import_pack(src: Path, *, paths: config.Paths = config.DATA) -> dict:
    """Move a Kotlin-written pack under `data/packs/`, validated at the SOURCE so a truncated image
    is refused before anything moves.
    """
    src = Path(src)
    rows = read_jsonl(src / "manifest.jsonl")
    if not rows:
        raise ValueError(f"{src} has no manifest rows — not a pack")
    name = packs.pack_name_of(rows[0]["path"])
    n, h, w = packs.read_pack(name, paths, dir_=src).shape
    dst = packs.pack_dir(name, paths)
    if dst.exists():
        raise ValueError(f"pack {name} already exists at {dst} — a pack is immutable, "
                         f"delete it to import this one")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return {"pack": name, "n": n, "h": h, "w": w, "gb": _gb(n, h, w)}
