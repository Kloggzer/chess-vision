"""Pack-Zugriff (`docs/packs.md`): die EINE Leseschicht fuer beide Pack-Arten.

SESSION-PACK: eine Aufnahme EINMAL nach `data/packs/<session>-<size>/` (`packed_images.u8`
(N, H, W, 3) uint8 RGB, `packed_meta.json`, `manifest.jsonl` aus `mm://<pack>/…`), auch von
Kotlins `labeled-video-pack`. DATENSATZ-PACK: die Crops eines gebauten Datensatzes in EINER
Memmap unter `data/datasets/<name>/`. Geschrieben wird in `pack_dataset`, `pack_session`, `pack_bake`.
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
    """`mm://<pack>/<teil>/…`. Vertrag ist NUR das erste Segment; der Rumpf unterscheidet sich je
    Schreiber (`tests/test_mm_path_contract.py`). Gelesen wird der Kopf von [pack_name_of]."""
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


def packed_shape(packed) -> tuple[int, int, int]:
    """`(n, h, w)` of a MultiPack or of `load_packed`'s legacy `(path, shape, path2idx)` tuple."""
    if isinstance(packed, MultiPack):
        h, w = packed.hw()
        return packed.n, h, w
    _, shape, _ = packed
    return tuple(shape)


# --- Datensatz-Pack --------------------------------------------------------------------------

class PackedIndex(NamedTuple):
    """Was `load_packed` zurueckgibt, mit Namen statt Positionen.

    Bleibt ein Tupel, also packt jede aeltere Stelle es weiter positional aus. Fuer MEHRERE Packs
    reicht es nicht — dafuer ist `resolve_dataset_packs`, und `load_packed` weist solche
    Datensaetze beim Namen ab statt hier etwas hineinzuzwaengen.
    """

    image: str
    shape: tuple[int, int, int]
    path2idx: dict[str, int] | None


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
    from ..dataset import load_manifest

    return load_manifest(dd / "manifest.jsonl")


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
    import yaml

    from ..dataset_build import dataset_dir

    dd = dataset_dir(name, paths)
    cfg = dd / "dataset.yaml"
    if not (cfg.exists() and (yaml.safe_load(cfg.read_text(encoding="utf-8")) or {}).get(PACKS_KEY)):
        return None
    rows = manifest_rows if manifest_rows is not None else _manifest_rows(dd)
    mp = resolve_packs(rows, paths)                # KeyError/ValueError propagate — never None
    for row, at in zip(rows, mp.idx, strict=True):
        row["_pack_at"] = (int(at[0]), int(at[1]))
    return mp


def open_dataset_pack(name: str | None, paths: config.Paths | None = None,
                      manifest_rows: list[dict] | None = None,
                      split_rows: list[dict] | None = None):
    # Der EINE Weg fuer train, eval, gradcam: Session-Packs, sonst die eigene Memmap, sonst None.
    # `split_rows` markiert nur die Zeilen des Aufrufers; der Digest eines Monolithen braucht das
    # GANZE Manifest (`manifest_rows`).
    if not name:
        return None
    paths = paths or config.DATA
    multi = resolve_dataset_packs(name, paths,
                                  manifest_rows=split_rows if split_rows is not None else manifest_rows)
    return multi if multi is not None else load_packed(name, paths, manifest_rows=manifest_rows)


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


# --- Zeile -> Memmap-Position ----------------------------------------------------------------

#: What the packed datasets accept: `load_packed`'s legacy `(path, shape, path2idx)` or a MultiPack.
PackedArg = tuple[str, tuple[int, int, int], dict | None] | MultiPack


def _pack_index(rows, packed: PackedArg) -> tuple[list[tuple[str, tuple[int, int, int]]],
                                                  np.ndarray]:
    """`(files, idx)` for both packed forms — the ONE place a row's memmap position is resolved.

    `idx[i]` is `(pack_no, row_no)`, a legacy pack being pack 0. Resolution is per ROW, never by
    position: split rows are a subset of the manifest and the board dataset re-sorts its own.
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


# --- Eingebackene Transformation -------------------------------------------------------------

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
    """Darf der Loader CLAHE auslassen? Sonst FLIEGT es: still doppelt oder still gar nicht
    gerechnet sind beide ein anderer Operator als der, den `config.json` behauptet."""
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
