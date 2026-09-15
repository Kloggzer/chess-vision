"""Das SESSION-PACK (`docs/pack-arten.md`), nicht das Datensatz-Pack in `pack.py` daneben.

Eine Aufnahme EINMAL nach `data/packs/<session>-<size>/`: `packed_images.u8` (N, H, W, 3) uint8
RGB, `packed_meta.json`, `manifest.jsonl` aus `mm://<pack>/…`. Kotlins `labeled-video-pack` auch.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .. import config
from .pack import _manifest_digest

log = logging.getLogger("chesslab.packs")

MM_PREFIX = "mm://"
DEFAULT_PACK_SIDE = 80
PACKS_KEY = "packs"

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


def read_pack(name: str, paths: config.Paths = config.DATA, *, dir_: Path | None = None) -> PackRef:
    """Read a pack's meta and check it against the image file. `dir_` overrides `pack_dir(name)`."""
    d = pack_dir(name, paths) if dir_ is None else dir_
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
    # Jede Zeile, nicht nur die nullte: ein Pack, dessen spaetere Zeilen einen anderen Pack
    # nennen, liest sonst fremde Pixel unter dem eigenen Namen.
    foreign = next((p for p in pack_paths if pack_name_of(p) != name), None)
    if foreign is not None:
        raise ValueError(f"pack {name}: its rows say {pack_name_of(foreign)} "
                         f"({foreign}) — the directory name IS the pack name")
    _check_digest(name, d, meta)
    return PackRef(name=name, image=img_path, shape=(n, h, w), paths=pack_paths)


def _check_digest(name: str, d: Path, meta: dict) -> None:
    """Der Pack gegen das Manifest, aus dem er geschnitten wurde — der Monolith-Pfad nennt das
    "the one failure mode that produces a plausible-looking but wrong model". Ohne Digest
    unpruefbar, nicht falsch.
    """
    want = meta.get("digest")
    manifest = d / "manifest.jsonl"
    if want is None or not manifest.is_file():
        return
    from ..ioutil import read_jsonl

    got = _manifest_digest(list(read_jsonl(manifest)))
    if got != want:
        raise ValueError(f"pack {name}: manifest digest {got} does not match the packed "
                         f"{want} — the manifest moved on, re-cut before it feeds a run")


def list_packs(paths: config.Paths = config.DATA) -> list[PackRef]:
    """Every readable pack under `paths.packs`. A broken one is named and skipped, never raised."""
    out = []
    for d in sorted(p for p in paths.packs.glob("*") if p.is_dir()):
        try:
            out.append(read_pack(d.name, paths))
        except (OSError, ValueError, KeyError) as exc:
            log.warning("skipping pack %s: %s", d.name, exc)
    return out


def resolve_packs(rows: list[dict], paths: config.Paths = config.DATA) -> MultiPack:
    """Map manifest rows onto `(pack_no, row_no)`, packs numbered in first-seen order."""
    order: list[PackRef] = []
    number: dict[str, int] = {}
    lookup: list[dict[str, int]] = []
    idx = np.empty((len(rows), 2), dtype=np.int64)
    for i, row in enumerate(rows):
        name = pack_name_of(row["path"])
        if name not in number:
            ref = read_pack(name, paths)
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


def write_meta(dir_: Path, rows: list[dict], h: int, w: int) -> None:
    (dir_ / _META).write_text(json.dumps({"n": len(rows), "h": h, "w": w,
                                          "digest": _manifest_digest(rows),
                                          "paths": [r["path"] for r in rows]}), encoding="utf-8")


def packed_shape(packed) -> tuple[int, int, int]:
    """`(n, h, w)` of a MultiPack or of `load_packed`'s legacy `(path, shape, path2idx)` tuple."""
    if isinstance(packed, MultiPack):
        h, w = packed.hw()
        return packed.n, h, w
    _, shape, _ = packed
    return tuple(shape)
