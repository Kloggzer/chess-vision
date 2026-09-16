"""Writing side of a session pack — `packs.py` reads and stays frozen.

A session with a directory is cut from its BOARDS (`write_session_pack`), one without — composite,
turntable — from its crop pool, which is all it has (`write_pool_pack`). `import_pack` adopts what
the Kotlin writers produce. Why each takes the source it takes: `docs/session-packs.md`."""

from __future__ import annotations

import json
import shutil
import time
from pathlib import Path

import numpy as np

from .. import config
from ..ioutil import read_jsonl
from . import packs
from .pack import decode_crop


def _gb(n: int, h: int, w: int) -> float:
    return round(n * h * w * 3 / 1e9, 2)


def write_session_pack(session_id: str, size: int = packs.DEFAULT_PACK_SIDE, *,
                       paths: config.Paths = config.DATA, profile: str | None = None,
                       pad_side: float | None = None,
                       replace: bool = False) -> dict:
    """Cut every crop of `session_id` at `size` px into `data/packs/<session_id>-<size>/`."""
    from ..labeling import _profile_for_session, iter_session_crops, read_session_meta
    from ..sessions import session_dir

    name = f"{session_id}-{size}"
    session_path, _ = session_dir(session_id, paths)
    prof = _profile_for_session(read_session_meta(session_path), profile)
    crops = ((crop[:, :, ::-1], row) for crop, row in
             iter_session_crops(session_path, profile=prof, pad_side=pad_side,
                                out_size=(size, size)))
    return _cut(name, size, crops, f"session {session_id}", paths, replace)


def write_pool_pack(session_id: str, size: int = packs.DEFAULT_PACK_SIDE, *, pool: str,
                    paths: config.Paths = config.DATA, replace: bool = False) -> dict:
    """Pack `session_id` from crop pool `pool` — the way for a session with no directory.

    The pool file IS the source for these, and `decode_crop` is what read it into the monolithic
    pack, so the bytes match. It also freezes whatever the slice resampled (`docs/session-packs.md`).
    `pool` stays explicit: 54 composites sit in two pools at once."""
    from ..dataset import load_manifest

    name = f"{session_id}-{size}"
    rows = [r for r in load_manifest(paths.crops / pool / "manifest.jsonl")
            if r["session_id"] == session_id]
    crops = ((decode_crop(r["path"], (size, size)), r) for r in rows)
    return _cut(name, size, crops, f"session {session_id} in pool {pool}", paths, replace)


def _cut(name: str, size: int, crops, what: str, paths: config.Paths, replace: bool) -> dict:
    """`_write_rows` into a fresh directory; with `replace`, over an existing pack.

    The old pack is only removed once the new one is complete — an interrupted rewrite must never
    leave the session without pixels, because the datasets that cite it would all break at once.
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
    """Consume `(RGB crop, row)` into the pack at `out_dir`; the row's `mm://` path is set here.

    The image is written under `.partial` and renamed last, so an interrupted cut leaves a
    directory `read_pack` refuses instead of a pack that is short of rows.
    """
    partial = out_dir / (packs._IMAGE + ".partial")
    rows: list[dict] = []
    h = w = size
    shape: tuple[int, int] | None = None
    with partial.open("wb") as fh:
        for crop, row in crops:
            row["path"] = f"{packs.MM_PREFIX}{name}/{row['frame']}/{row['square']}"
            h, w = crop.shape[:2]
            # Der Pack veroeffentlicht EINE Geometrie fuer alle Zeilen. Zwei Formen gleicher
            # Pixelzahl (2x3 gegen 3x2) rutschen sonst durch und jede fruehere Zeile wird
            # spaeter mit der Form der letzten gelesen.
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
    packs.write_meta(out_dir, rows, h, w)
    partial.rename(out_dir / packs._IMAGE)
    return {"pack": name, "n": len(rows), "h": h, "w": w, "gb": _gb(len(rows), h, w)}


def import_pack(src: Path, *, paths: config.Paths = config.DATA) -> dict:
    """Move a pack the Kotlin writers produced (`labeled-video-pack`) under `data/packs/`.

    Its rows name the pack — a Kotlin one says `mm://<session_id>/…` and keeps the plain id here.
    Validated at the SOURCE, so a truncated image is refused before anything moves."""
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
