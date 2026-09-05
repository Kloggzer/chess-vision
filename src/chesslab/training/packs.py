"""Session packs: where a pack lives, what its meta says, and how an `mm://` row resolves.

A pack holds one session's crops once — `packed_images.u8` (N, H, W, 3) uint8 RGB, a slice
`manifest.jsonl` whose rows carry `mm://<pack>/<frame>/<square>` paths, and `packed_meta.json`.
The Kotlin `labeled-video-pack` output is a valid pack when its `id=` equals the directory name.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .. import config
from .pack import _manifest_digest

MM_PREFIX = "mm://"

_IMAGE = "packed_images.u8"
_META = "packed_meta.json"


@dataclass(frozen=True)
class PackRef:
    """One pack on disk — path and shape only: a mapped array dies on the way to a spawn worker."""

    name: str
    image: Path
    shape: tuple[int, int, int]
    paths: list[str]


@dataclass(frozen=True)
class MultiPack:
    """Rows of one dataset spread over several packs: `idx[i]` is `[pack_no, row_no]`."""

    files: list[tuple[str, tuple[int, int, int]]]
    idx: np.ndarray

    @property
    def n(self) -> int:
        return len(self.idx)

    def hw(self) -> tuple[int, int]:
        _, h, w = self.files[0][1]
        return h, w

    def __iter__(self):
        # 11 scripts/*.py and gradcam.py unpack load_packed's legacy 3-tuple positionally.
        raise TypeError("dataset is built from session packs — read MultiPack.files/idx, "
                        "not a (path, shape, path2idx) tuple")


def pack_dir(name: str, paths: config.Paths = config.DATA) -> Path:
    return paths.packs / name


def pack_name_of(mm_path: str) -> str:
    """`mm://<pack>/<rest>` -> `<pack>`. Anything else is not a packed row."""
    if not mm_path.startswith(MM_PREFIX):
        raise ValueError(f"not a packed path: {mm_path!r}")
    name, _, rest = mm_path[len(MM_PREFIX):].partition("/")
    if not name or not rest:
        raise ValueError(f"packed path without a pack name: {mm_path!r}")
    return name


def load_pack(name: str, paths: config.Paths = config.DATA, *, dir: Path | None = None) -> PackRef:
    """Read a pack's meta and check it against the image file. `dir` overrides `pack_dir(name)`."""
    d = pack_dir(name, paths) if dir is None else dir
    meta_path, img_path = d / _META, d / _IMAGE
    if not meta_path.exists():
        raise FileNotFoundError(f"pack {name}: no {_META} in {d}")
    if not img_path.exists():
        raise FileNotFoundError(f"pack {name}: no {_IMAGE} in {d}")
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    n, h, w = int(meta["n"]), int(meta["h"]), int(meta["w"])
    want = n * h * w * 3
    got = img_path.stat().st_size
    if got != want:
        raise ValueError(f"pack {name}: {_IMAGE} is {got} bytes, meta says {want} ({n}x{h}x{w}x3)")
    pack_paths = list(meta["paths"])
    if len(pack_paths) != n:
        raise ValueError(f"pack {name}: meta lists {len(pack_paths)} paths for n={n}")
    for p in pack_paths:
        if pack_name_of(p) != name:
            raise ValueError(f"pack {name}: row {p!r} belongs to another pack")
    return PackRef(name=name, image=img_path, shape=(n, h, w), paths=pack_paths)


def resolve_packs(rows: list[dict], paths: config.Paths = config.DATA) -> MultiPack:
    """Map manifest rows onto `(pack_no, row_no)`, packs numbered in first-seen order."""
    order: list[PackRef] = []
    number: dict[str, int] = {}
    lookup: list[dict[str, int]] = []
    idx = np.empty((len(rows), 2), dtype=np.int64)
    for i, row in enumerate(rows):
        name = pack_name_of(row["path"])
        if name not in number:
            ref = load_pack(name, paths)
            if order and ref.shape[1:] != order[0].shape[1:]:
                raise ValueError(f"pack {name} holds {ref.shape[1:]} crops, "
                                 f"pack {order[0].name} holds {order[0].shape[1:]}")
            number[name] = len(order)
            order.append(ref)
            lookup.append({p: j for j, p in enumerate(ref.paths)})
        no = number[name]
        where = lookup[no].get(row["path"])
        if where is None:
            raise KeyError(f"{row['path']} is not in pack {name}")
        idx[i] = (no, where)
    return MultiPack(files=[(str(r.image), r.shape) for r in order], idx=idx)


def write_meta(dir: Path, rows: list[dict], h: int, w: int) -> None:
    """`crop_fingerprint` stays empty so `pack._rewritten_since_pack` treats it as fingerprinted."""
    (dir / _META).write_text(json.dumps({"n": len(rows), "h": h, "w": w,
                                         "digest": _manifest_digest(rows),
                                         "crop_fingerprint": {},
                                         "paths": [r["path"] for r in rows]}), encoding="utf-8")
