"""Writing side of a session pack: cut a session once at model size, or adopt a Kotlin pack.

`packs.py` is the reader and stays frozen. Here a session goes through
`labeling.iter_session_crops` straight into `data/packs/<session_id>-<size>/`, which saves the
128 px pool detour and its second resample (`docs/data-pipeline.md` 3.1).
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np

from .. import config
from . import packs


def _gb(n: int, h: int, w: int) -> float:
    return round(n * h * w * 3 / 1e9, 2)


def write_session_pack(session_id: str, size: int = packs.DEFAULT_PACK_SIDE, *,
                       paths: config.Paths = config.DATA, profile: str | None = None,
                       pad_side: float | None = None, pad_up: float | None = None) -> dict:
    """Cut every crop of `session_id` at `size` px into `data/packs/<session_id>-<size>/`."""
    from ..labeling import _profile_for_session, iter_session_crops, read_session_meta
    from ..sessions import session_dir

    name = f"{session_id}-{size}"
    out_dir = packs.pack_dir(name, paths)
    if out_dir.exists():
        raise ValueError(f"pack {name} already exists at {out_dir} — a pack is immutable, "
                         f"delete it to cut the session again")
    session_path, _ = session_dir(session_id, paths)
    prof = _profile_for_session(read_session_meta(session_path), profile)

    out_dir.mkdir(parents=True)
    # The image is written under `.partial` and renamed last, so an interrupted cut leaves a
    # directory `read_pack` refuses instead of a pack that is short of rows.
    partial = out_dir / (packs._IMAGE + ".partial")
    rows: list[dict] = []
    h = w = size
    with partial.open("wb") as fh:
        for crop, row in iter_session_crops(session_path, profile=prof, pad_up=pad_up,
                                            pad_side=pad_side, out_size=(size, size)):
            row["path"] = f"{packs.MM_PREFIX}{name}/{row['frame']}/{row['square']}"
            h, w = crop.shape[:2]
            fh.write(np.ascontiguousarray(crop[:, :, ::-1]).tobytes())
            rows.append(row)
    if not rows:
        shutil.rmtree(out_dir)
        raise ValueError(f"session {session_id} yields no crops — nothing to pack")

    (out_dir / "manifest.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")
    packs.write_meta(out_dir, rows, h, w)
    partial.rename(out_dir / packs._IMAGE)
    return {"pack": name, "n": len(rows), "h": h, "w": w, "gb": _gb(len(rows), h, w)}


def import_pack(src: Path, *, paths: config.Paths = config.DATA) -> dict:
    """Move a pack the Kotlin writers produced (`labeled-video-pack`) under `data/packs/`.

    Its rows name the pack, and the directory has to answer to that name — a Kotlin pack says
    `mm://<session_id>/…` and keeps the plain id here. Validated at the SOURCE, so a truncated
    image is refused before anything moves.
    """
    src = Path(src)
    text = (src / "manifest.jsonl").read_text(encoding="utf-8")
    rows = [json.loads(line) for line in text.splitlines() if line.strip()]
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
