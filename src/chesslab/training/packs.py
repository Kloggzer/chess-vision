"""Pack-Zugriff (`docs/packs.md`): die EINE Leseschicht fuer Session-Packs
(`data/packs/<session>-<size>/`, auch von Kotlin) und Datensatz-Packs (eine Memmap unter
`data/datasets/<name>/`).
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import NamedTuple

import numpy as np

from .. import config
from ..ioutil import mtime_size
from ..work_audit import measure

log = logging.getLogger("chesslab.packs")

MM_PREFIX = "mm://"
DEFAULT_PACK_SIDE = 80
PACKS_KEY = "packs"

_IMAGE = "packed_images.u8"
_META = "packed_meta.json"


def _packed_paths(dd: Path) -> tuple[Path, Path]:
    return dd / _IMAGE, dd / _META


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


def mm_path(pack: str, *parts: str) -> str:
    """`mm://<pack>/<teil>/…`: Vertrag ist NUR das erste Segment
    (`tests/test_mm_path_contract.py`).
    """
    if not pack or "/" in pack:
        raise ValueError(f"pack name must be one segment: {pack!r}")
    if not parts or any(not t for t in parts):
        raise ValueError(f"mm path needs a non-empty tail: {parts!r}")
    return MM_PREFIX + "/".join((pack, *parts))


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
    img_path, meta_path = _packed_paths(d)
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
    # Jede Zeile, nicht nur die nullte: sonst liest ein Pack fremde Pixel unter dem eigenen Namen.
    foreign = next((p for p in pack_paths if pack_name_of(p) != name), None)
    if foreign is not None:
        raise ValueError(f"pack {name}: its rows say {pack_name_of(foreign)} "
                         f"({foreign}) — the directory name IS the pack name")
    _check_digest(name, d, meta)
    return PackRef(name=name, image=img_path, shape=(n, h, w), paths=pack_paths)


def _check_digest(name: str, d: Path, meta: dict) -> None:
    """Der Pack gegen das Manifest, aus dem er geschnitten wurde; ohne Digest unpruefbar, nicht
    falsch.
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


def packed_shape(packed) -> tuple[int, int, int]:
    """`(n, h, w)` of a MultiPack or of `load_packed`'s legacy `(path, shape, path2idx)` tuple."""
    if isinstance(packed, MultiPack):
        h, w = packed.hw()
        return packed.n, h, w
    _, shape, _ = packed
    return tuple(shape)


class PackedIndex(NamedTuple):
    """Was `load_packed` zurueckgibt, mit Namen; bleibt ein Tupel fuer positionale Altaufrufer.
    Mehrere Packs gehen ueber `resolve_dataset_packs`.
    """

    image: str
    shape: tuple[int, int, int]
    path2idx: dict[str, int] | None


def _manifest_digest(rows: list[dict]) -> str:
    """Fingerprint of a manifest: which crops, in which order, with which labels. NOT covered:
    pixels rewritten under an unchanged path — `_rewritten_since_pack` samples for that.
    """
    h = hashlib.sha256()
    for r in rows:
        # One encode/update instead of six; the byte stream, and so every stored digest, stays
        # identical.
        h.update((f'{r["path"]}\0{r.get("label", "")}\0{r.get("out_size", "")}\n')
                 .encode())
    return h.hexdigest()[:32]


def _manifest_rows(dd: Path) -> list[dict]:
    from ..dataset import load_manifest

    return load_manifest(dd / "manifest.jsonl")


#: How many rows `_rewritten_since_pack` stats: 256 spread evenly cost ~1 ms and miss a re-slice of
#: 5 % of the rows with probability 2e-6; a stat per row costs tens of seconds per load.
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
            continue
        out[p] = [st.st_mtime, st.st_size]
    return out


def _rewritten_since_pack(crop_paths: list[str], img_path: Path,
                          fingerprint: dict[str, list] | None) -> bool:
    """True if a sampled crop differs from what it was when the pack STARTED (inequality, no clock,
    so an OLDER restored mtime is caught). Old packs fall back to the memmap mtime, which Windows
    leaves anywhere.
    """
    if fingerprint is not None:
        for p, (mtime, size) in fingerprint.items():
            try:
                st = Path(p).stat()
            except OSError:
                continue
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
            continue
    return False


def resolve_dataset_packs(name: str, paths: config.Paths = config.DATA,
                          manifest_rows: list[dict] | None = None):
    """None for a classic dataset; a MultiPack when dataset.yaml carries `packs:`. Rows keep their
    `(pack_no, row_no)` on `_pack_at`, since datasets are built from split subsets.
    """
    import yaml

    from ..dataset_build import dataset_dir

    dd = dataset_dir(name, paths)
    cfg = dd / "dataset.yaml"
    if not (cfg.exists() and (yaml.safe_load(cfg.read_text(encoding="utf-8")) or {}).get(PACKS_KEY)):
        return None
    rows = manifest_rows if manifest_rows is not None else _manifest_rows(dd)
    mp = resolve_packs(rows, paths)
    for row, at in zip(rows, mp.idx, strict=True):
        row["_pack_at"] = (int(at[0]), int(at[1]))
    return mp


def open_dataset_pack(name: str | None, paths: config.Paths | None = None,
                      manifest_rows: list[dict] | None = None,
                      split_rows: list[dict] | None = None):
    # Der EINE Weg fuer train, eval, gradcam. Der Digest eines Monolithen braucht das GANZE
    # Manifest.
    if not name:
        return None
    paths = paths or config.DATA
    multi = resolve_dataset_packs(name, paths,
                                  manifest_rows=split_rows if split_rows is not None else manifest_rows)
    return multi if multi is not None else load_packed(name, paths, manifest_rows=manifest_rows)


def load_packed(name: str, paths: config.Paths = config.DATA,
                manifest_rows: list[dict] | None = None):
    """Load and validate one packed dataset index; `manifest_rows` reuses rows the caller already
    parsed.
    """
    from ..dataset_build import dataset_dir

    # The legacy 3-tuple is unpacked positionally at ten sites; a pack-built dataset is refused by
    # name.
    if resolve_dataset_packs(name, paths, manifest_rows) is not None:
        raise ValueError(f"dataset '{name}' is built from session packs — its pixels live in "
                         "data/packs/…; use training.packs.open_dataset_pack (train/eval do)")

    dd = dataset_dir(name, paths)
    manifest = dd / "manifest.jsonl"
    meta = dd / "packed_meta.json"
    fingerprint = tuple(
        mtime_size(p) if p.exists() else None
        for p in (manifest, meta)
    )
    with measure("packed dataset index loads", (dd.resolve(), fingerprint),
                 processed_bytes=manifest.stat().st_size if manifest.exists() else 0):
        return _load_packed(name, paths, manifest_rows)


def open_packed_rows(name: str, manifest_rows: list[dict],
                     paths: config.Paths = config.DATA) -> tuple[np.memmap, dict[str, int]]:
    """`(Memmap, {Crop-Pfad: Zeile})` fuer Analyse-Skripte — die EINE Aufloesung. NICHT fuer
    DataLoader-Worker: eine offene Memmap uebersteht das Windows-Spawn-Pickling nicht.
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
    """Return (packed_file_path, (N,H,W), {crop_path: index}) or None. No open memmap: np.memmap
    does not survive pickling to Windows spawn workers (`pickle data was truncated`).
    """
    from ..dataset_build import dataset_dir

    dd = dataset_dir(name, paths)
    img_path, meta_path = _packed_paths(dd)
    if not meta_path.exists():
        return None
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    # A row-selecting variant reads the owner's pixels (`link_pack`); the digest still comes from
    # THIS manifest.
    if meta.get("packed_from"):
        img_path, _ = _packed_paths(dataset_dir(meta["packed_from"], paths))
    if not img_path.exists():
        return None
    n, h, w = int(meta["n"]), int(meta["h"]), int(meta["w"])

    # A pack not matching the CURRENT manifest pairs images with the wrong labels — a
    # plausible-looking, wrong model. Packs without a digest fall back to the per-PNG loader.
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

    # Marking the live row dicts costs one int per row; linked packs address an owner's superset and
    # still need the path lookup.
    path2idx = None
    if manifest_rows is not None and not meta.get("packed_from") and len(rows) == n:
        for i, row in enumerate(rows):
            row["_packed_idx"] = i
    else:
        path2idx = {p: i for i, p in enumerate(meta["paths"])}
    return PackedIndex(str(img_path), (n, h, w), path2idx)


class _PreadRows:
    """Die Memmap-Schnittstelle ueber `seek`+`read`: eine Memmap haelt jede beruehrte Seite im
    Arbeitssatz, ein Lesevorgang laesst sie im Systemcache — 1 482 MB gegen 109 MB.
    """

    def __init__(self, path: str, shape) -> None:
        self._n, self._h, self._w = shape
        self._row = self._h * self._w * 3
        self._f = open(path, "rb", buffering=0)

    def __getitem__(self, i):
        # Ein Schnitt ist EIN Lesevorgang statt 64 Seeks, und dieser Reader laeuft gerade, wenn
        # jeder Seek die Platte trifft.
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
    """pread, sobald der Pack gross gegen den RAM ist: warm ist die Memmap 3x schneller, kalt
    pread.
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


#: What the packed datasets accept: `load_packed`'s legacy `(path, shape, path2idx)` or a MultiPack.
PackedArg = tuple[str, tuple[int, int, int], dict | None] | MultiPack


def _pack_index(rows, packed: PackedArg) -> tuple[list[tuple[str, tuple[int, int, int]]],
                                                  np.ndarray]:
    """`(files, idx)` for both packed forms — the ONE place a row's memmap position is resolved, per
    ROW (split rows are a subset, board datasets re-sort).
    """
    if isinstance(packed, MultiPack):
        return packed.files, _multi_index(rows, packed)
    path, shape, path2idx = packed
    idx = np.zeros((len(rows), 2), dtype=np.int64)
    idx[:, 1] = [r["_packed_idx"] if path2idx is None else path2idx[r["path"]] for r in rows]
    return [(path, shape)], idx


def _multi_index(rows, packed: MultiPack) -> np.ndarray:
    """`_pack_at` when `resolve_dataset_packs` marked the rows, else the packs' own path lists."""
    if rows and "_pack_at" in rows[0]:
        return np.array([r["_pack_at"] for r in rows], dtype=np.int64).reshape(len(rows), 2)
    lookup: dict[str, tuple[int, int]] = {}
    for no, (file, _) in enumerate(packed.files):
        d = Path(file).parent
        lookup.update({p: (no, j) for j, p in enumerate(read_pack(d.name, dir_=d).paths)})
    return np.array([lookup[r["path"]] for r in rows], dtype=np.int64).reshape(len(rows), 2)


def baked_of(name: str, paths: config.Paths = config.DATA) -> dict | None:
    """Die eingebackene Transformation eines Datensatzes, oder `None` fuer einen rohen Pack."""
    from ..dataset_build import dataset_dir

    _, meta_path = _packed_paths(dataset_dir(name, paths))
    if not meta_path.exists():
        return None
    return json.loads(meta_path.read_text(encoding="utf-8")).get("baked")


def clahe_params(cfg: dict) -> dict:
    """Die CLAHE-Einstellung eines Laufs, so wie `build_transform` sie liest."""
    return {"clip": float(cfg.get("clahe_clip", 0.0)), "tile": int(cfg.get("clahe_tile", 8)),
            "min_mean": float(cfg.get("clahe_min_mean", 0.0)),
            "max_mean": float(cfg.get("clahe_max_mean", 255.0)),
            "denoise": str(cfg.get("clahe_denoise", "off"))}


def cfg_for_pack(cfg: dict, ds_name: str | None, packed, out_size=None) -> dict:
    """`cfg` fuer Pixel aus `packed`, wie `run_eval` ihn baut: CLAHE raus, wenn er schon drin ist."""
    baked = baked_of(ds_name, config.DATA) if ds_name and packed is not None else None
    if not skip_baked(baked, clahe_params(cfg), out_size or cfg["out_size"],
                      packed_shape(packed)[1:] if baked else None):
        return cfg
    print(f"[bake] CLAHE steckt im Pack ({baked['from']}) — hier wird er nicht noch einmal gerechnet")
    return {**cfg, "clahe_clip": 0.0}


def skip_baked(baked: dict | None, params: dict, out_size, pack_hw) -> bool:
    """Darf der Loader CLAHE auslassen? Still doppelt oder still gar nicht gerechnet waere beides
    ein anderer Operator, als `config.json` behauptet.
    """
    if not baked:
        return False
    if baked.get("op") != "clahe":
        raise ValueError(f"Pack traegt eine unbekannte eingebackene Transformation: {baked!r}")
    want = {k: params[k] for k in ("clip", "tile", "min_mean", "max_mean", "denoise")}
    have = {k: baked.get(k) for k in want}
    if want["clip"] <= 0:
        raise ValueError(f"Der Pack ist mit CLAHE gebacken ({have}), der Lauf trainiert ohne — "
                         "nimm den rohen Datensatz oder setze --clahe-clip.")
    if have != want:
        raise ValueError(f"CLAHE des Packs {have} != CLAHE des Laufs {want} — der gebackene Pack "
                         "gehoert zu einem anderen Rezept.")
    if tuple(out_size) != (int(pack_hw[1]), int(pack_hw[0])):
        raise ValueError(f"--input-size {tuple(out_size)} passt nicht zum gebackenen Pack "
                         f"{(int(pack_hw[1]), int(pack_hw[0]))}: CLAHE wurde auf der Packgroesse "
                         "gerechnet, ein Resize davor macht daraus einen anderen Operator.")
    return True
