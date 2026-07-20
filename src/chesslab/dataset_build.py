"""Stage 4 — named, curated datasets.

A **dataset** is a view on the global crop pool (`data/manifests/squares.jsonl`):
a selection of sessions + dedup and split policy. Building creates under
`data/datasets/<name>/` a filtered, deduplicated `manifest.jsonl`, a
session-based `split.json` and `stats.json`. Crops for rot=0 reference the global
pool (no copying); only rotation-augmented crops are materialized in the dataset folder.

Dedup against the recording-induced surplus of nearly identical crops (never-moved pieces on
fixed camera):
  1. Metadata cap per `(session_id, square, label)` — fast, deterministic.
  2. Perceptual hash (dhash) — discards visually near-duplicates within a class.

Rotation augmentation (90/180/270°) is optional and deliberately AFTER dedup (4x the
*curated* crops). It contradicts the fixed-camera assumption (CLAUDE.md) and is a toggle.
Testable headless: all functions take `paths=config.DATA`.
"""

from __future__ import annotations

import json
import logging
import random
import shutil
from collections import Counter
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path

from . import config
from . import dataset as dataset_mod

log = logging.getLogger("chesslab.dataset_build")



def _safe_name(name: str) -> str:
    n = (name or "").strip()
    if not n or "/" in n or "\\" in n or ".." in n:
        raise ValueError(f"invalid dataset name: {name!r}")
    return n


def dataset_dir(name: str, paths: config.Paths | None = None) -> Path:
    return (paths or config.DATA).datasets / _safe_name(name)


# --- Perceptual hash (dhash, 64-bit) --------------------------------------------------

def dhash(img, size: int = 8) -> int:
    """Difference hash: image to (size+1 x size) gray, horizontal neighbor differences -> 64-bit."""
    import cv2

    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img
    r = cv2.resize(g, (size + 1, size), interpolation=cv2.INTER_AREA)
    diff = r[:, 1:] > r[:, :-1]
    bits = 0
    for v in diff.flatten():
        bits = (bits << 1) | int(bool(v))
    return bits


def _hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


# --- Dedup ----------------------------------------------------------------------------

def dedup_metadata(rows: list[dict], cap: int | None, seed: int = config.SEED) -> list[dict]:
    """Keep max. `cap` crops per (session_id, square, label) (seeded). cap<=0/None -> all."""
    if not cap or cap <= 0:
        return list(rows)
    rng = random.Random(seed)
    groups: dict[tuple, list[dict]] = {}
    for r in rows:
        groups.setdefault((r["session_id"], r["square"], r["label"]), []).append(r)
    kept: list[dict] = []
    for g in groups.values():
        if len(g) > cap:
            g = sorted(g, key=lambda r: str(r.get("frame", "")))   # deterministic
            g = rng.sample(g, cap)
        kept.extend(g)
    return kept


_HASH_BITS = 64                    # dhash() width; band splitting below assumes this


def _band_ranges(n_bands: int) -> list[tuple[int, int]]:
    """Partition `_HASH_BITS` into `n_bands` contiguous (shift, width) ranges covering all bits."""
    edges = [round(i * _HASH_BITS / n_bands) for i in range(n_bands + 1)]
    return [(edges[i], edges[i + 1] - edges[i]) for i in range(n_bands) if edges[i + 1] > edges[i]]


def dedup_phash(rows: list[dict], hamming: int) -> list[dict]:
    """Discard visually nearly identical crops within each class (dhash, Hamming <= threshold).

    Candidates are found via LSH banding rather than by scanning every previously kept hash:
    if two 64-bit hashes differ in at most `hamming` bits, then across `hamming + 1` disjoint
    bands at least one band must be identical (pigeonhole), so only crops sharing a band need
    a real comparison. The result is IDENTICAL to a full pairwise scan — banding only narrows
    the candidate set, it never hides a true near-duplicate.

    Why this matters: the previous naive scan compared each crop against all kept hashes of its
    class, i.e. O(n^2). On synthetic sets (~1M crops per class, nearly all unique because every
    render has its own position/camera/lighting) that meant hours to days. Callers building
    synthetic datasets usually want `phash_enabled=False` outright — there are no near-duplicates
    to remove there, and `per_cell_cap` already bounds repeats.
    """
    import cv2

    if hamming is None or hamming < 0:
        return list(rows)
    if hamming >= _HASH_BITS:                   # everything within range -> keep one per class
        hamming = _HASH_BITS - 1
    bands = _band_ranges(max(1, int(hamming) + 1))

    by_label: dict[str, list[dict]] = {}
    for r in rows:
        by_label.setdefault(r["label"], []).append(r)

    kept: list[dict] = []
    for g in by_label.values():
        seen: list[int] = []                                    # kept hashes, index-addressed
        buckets: list[dict[int, list[int]]] = [{} for _ in bands]   # per band: value -> hash indices
        for r in sorted(g, key=lambda r: (str(r.get("session_id")), str(r.get("frame")), r.get("square", ""))):
            img = cv2.imread(r["path"])
            if img is None:
                kept.append(r)                  # not readable -> keep, don't silently lose
                continue
            h = dhash(img)
            keys = [(h >> shift) & ((1 << width) - 1) for shift, width in bands]
            candidates: set[int] = set()
            for bucket, key in zip(buckets, keys, strict=True):
                candidates.update(bucket.get(key, ()))
            if any(_hamming(h, seen[i]) <= hamming for i in candidates):
                continue                        # too similar -> discard
            idx = len(seen)
            seen.append(h)
            for bucket, key in zip(buckets, keys, strict=True):
                bucket.setdefault(key, []).append(idx)
            kept.append(r)
    return kept


# --- Rotation-Augmentation ------------------------------------------------------------

# Rotation augmentation is applied ON-THE-FLY at train time (torch_data._RandomRot90) when the
# dataset was built with non-trivial `rotations`. Materializing rotated copies (the previous
# `_apply_rotations`) quadrupled both the crop PNGs on disk and the packed memmap for zero
# information gain — the rotated pixels are a pure function of the originals.


def _preflight_disk_check(train_rows: list[dict], holdout: list[dict],
                          pack: bool,
                          paths: config.Paths | None = None, seed: int = config.SEED) -> None:
    """Project the dataset's on-disk cost BEFORE writing anything, and refuse to start if it
    cannot fit.

    The dominant term is the packed memmap: it stores every final crop DECODED (h*w*3 bytes),
    so it dwarfs the source pngs. (Rotation augmentation no longer materializes files — it runs
    on-the-fly at train time.) Raises ValueError with the concrete numbers rather than filling
    the disk over ~an hour.
    """
    import cv2

    n_final = len(train_rows) + len(holdout)

    # A seeded sample of rows, first readable one wins — all crops share one out_size, we only
    # need the decoded byte count (the compressed-png-size median of the old check died with the
    # rotated-png term).
    pool = train_rows or holdout
    if not pool:
        return
    rng = random.Random(seed)
    sample_rows = pool if len(pool) <= 32 else rng.sample(pool, 32)
    crop_bytes = None
    for r in sample_rows:
        img = cv2.imread(r["path"])
        if img is None:
            continue
        crop_bytes = int(img.shape[0]) * int(img.shape[1]) * 3
        break
    if crop_bytes is None:
        log.warning("preflight: could not read any sample crop — skipping the disk projection.")
        return

    need = n_final * crop_bytes if pack and n_final >= _PACK_MIN_CROPS else 0
    if not need:
        return
    # Measure the volume the dataset is actually written to, not the module-global default —
    # `paths` may point at another drive (test isolation, multi-drive setups).
    free = shutil.disk_usage(str((paths or config.DATA).root)).free
    log.info("preflight: %s final crops (train %s + holdout %s); ~%.1f GB memmap needed, "
             "%.1f GB free", f"{n_final:,}", f"{len(train_rows):,}", f"{len(holdout):,}",
             need / 1e9, free / 1e9)
    if need > free * 0.9:
        raise ValueError(
            f"dataset would need ~{need / 1e9:.0f} GB but only {free / 1e9:.0f} GB are free. "
            f"Reduce it: pack=False skips the ~{need / 1e9:.0f} GB memmap; or lower per_cell_cap.")


# --- Build ----------------------------------------------------------------------------

# Auto-pack (build_dataset) only kicks in above this crop count — below it the per-PNG loader is
# fine and a 53 GB memmap / a multiprocessing pack pool would be wasteful (also keeps tests light).
_PACK_MIN_CROPS = 100_000


def build_dataset(
    name: str,
    session_ids: list[str],
    *,
    per_cell_cap: int | None = None,
    phash_enabled: bool | None = None,
    phash_hamming: int | None = None,
    rotations: tuple[int, ...] | None = None,
    val_frac: float = config.DEFAULT_VAL_FRAC,
    test_frac: float = config.DEFAULT_TEST_FRAC,
    max_empty_ratio: float | None = config.DEFAULT_MAX_EMPTY_RATIO,
    max_class_ratio: float | None = None,
    seed: int = config.SEED,
    paths: config.Paths | None = None,
    source_manifest: Path | str | Sequence[Path | str] | None = None,
    variant_tag: str | None = None,
    allow_degenerate: bool = False,
    force_train=None,
    pack: bool = True,
) -> dict:
    """Build dataset <name> from `session_ids`: filter -> dedup -> rotation -> manifest+split+stats.

    `source_manifest`: crop pool(s) to filter — one path, or several when the sessions were
    ingested under different tags (`ingest --tag X --no-build` writes `squares__X.jsonl`).
    Default: `data/manifests/squares.jsonl`.
    For the bake-off, each variant points to its own `squares__<tag>.jsonl`; with identical
    `session_ids`+`seed`, the session-based split is byte-identical across all variants.
    """
    name = _safe_name(name)
    # Resolution at runtime (not as default arg): default args bind at import time and
    # ignore a later patched/changed config.DATA (testability).
    paths = paths or config.DATA
    d = config.DEDUP
    per_cell_cap = d.per_cell_cap if per_cell_cap is None else per_cell_cap
    phash_enabled = d.phash_enabled if phash_enabled is None else phash_enabled
    phash_hamming = d.phash_hamming if phash_hamming is None else phash_hamming
    rotations = d.rotations if rotations is None else tuple(rotations)

    # One or several crop pools. Several matter when sessions were ingested under different tags
    # (each `ingest --no-build` writes its own squares__<tag>.jsonl) — without this the caller had
    # to concatenate them into one file by hand first.
    if not source_manifest:
        srcs = [paths.manifests / "squares.jsonl"]
    elif isinstance(source_manifest, (str, Path)):
        srcs = [Path(source_manifest)]
    else:
        srcs = [Path(p) for p in source_manifest]
    missing = [str(p) for p in srcs if not p.exists()]
    if missing:
        raise ValueError(f"source manifest(s) not found: {', '.join(missing)}")

    wanted = set(session_ids)
    rows = [r for src in srcs for r in dataset_mod.load_manifest(src) if r["session_id"] in wanted]
    n_raw = len(rows)
    if not rows:
        raise ValueError(
            f"no crops for the selected sessions in {', '.join(str(p.name) for p in srcs)} "
            f"(wrong --source-manifest? the default pool is squares.jsonl, but `ingest --tag X "
            f"--no-build` writes squares__X.jsonl).")
    # Determine split assignment on the RAW, COMPLETE data (full 64-square boards). Dedup +
    # rotation afterwards ONLY on train — val/test remain complete (exactly 64 crops/frame, rot 0), otherwise
    # board_accuracy would compute on incomplete/duplicated boards (bug).
    # board_accuracy would compute on incomplete/duplicated boards (bug).
    sizes = Counter(r["session_id"] for r in rows)
    splits = dataset_mod.assign_sessions_to_splits(dict(sizes), val_frac, test_frac, seed,
                                                   force_train=force_train)
    split_of = {s: name for name, sids in splits.items() for s in sids}
    train_raw = [r for r in rows if split_of.get(r["session_id"]) == "train"]
    holdout = [r for r in rows if split_of.get(r["session_id"]) in ("val", "test")]  # complete, rot 0

    train_rows = dedup_metadata(train_raw, per_cell_cap, seed)
    if phash_enabled:
        train_rows = dedup_phash(train_rows, phash_hamming)
    n_dedup = len(train_rows) + len(holdout)

    # BEFORE touching the existing dataset: a refusal must not leave the caller with neither the
    # new dataset nor the old one.
    _preflight_disk_check(train_rows, holdout, pack, paths=paths, seed=seed)

    ds = paths.datasets / name
    if ds.exists():
        shutil.rmtree(ds)                       # clean rebuild
    ds.mkdir(parents=True, exist_ok=True)
    rows = train_rows + holdout                 # rotation happens on-the-fly at train time
    n_final = len(rows)

    (ds / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + ("\n" if rows else ""),
        encoding="utf-8")
    split = dataset_mod.make_split(rows, val_frac, test_frac, max_empty_ratio, seed, max_class_ratio,
                                   force_train=force_train, precomputed_splits=splits)
    errors, _warnings = dataset_mod.validate_split(split, rows)
    if errors:
        if not allow_degenerate:
            shutil.rmtree(ds, ignore_errors=True)   # no half-finished zombie dataset
            raise ValueError("\n".join(errors))
        split["degenerate_errors"] = errors          # intentionally allowed -> document in split
    (ds / "split.json").write_text(json.dumps(split, ensure_ascii=False, indent=2), encoding="utf-8")
    stats = dataset_mod.compute_stats(rows)
    (ds / "stats.json").write_text(json.dumps(stats, ensure_ascii=False), encoding="utf-8")

    cfg = {
        "name": name,
        "created_at": datetime.now(UTC).isoformat(),
        "session_ids": list(session_ids),
        "variant_tag": variant_tag,
        "source_manifest": [p.as_posix() for p in srcs],
        "dedup": {"per_cell_cap": per_cell_cap, "phash_enabled": bool(phash_enabled),
                  "phash_hamming": phash_hamming},
        "rotations": list(rotations),
        "split": {"val_frac": val_frac, "test_frac": test_frac, "max_empty_ratio": max_empty_ratio,
                  "max_class_ratio": max_class_ratio, "seed": seed},
        "counts": {"raw": n_raw, "after_dedup": n_dedup, "final": n_final},
    }
    import yaml
    (ds / "dataset.yaml").write_text(yaml.safe_dump(cfg, sort_keys=False, allow_unicode=True),
                                     encoding="utf-8")
    # Pack crops into one memmap so `train` reads from it instead of 1M per-item Image.open (the
    # I/O bottleneck). Best-effort: a pack failure just means training falls back to the per-PNG
    # loader (load_packed returns None). The memmap is disk-backed — it does NOT load into RAM.
    packed_info = None
    if pack and n_final >= _PACK_MIN_CROPS:            # only big sets — small ones load fine per-PNG
        try:
            from .training.pack import pack_dataset
            packed_info = pack_dataset(name, paths)
        except Exception as e:  # noqa: BLE001 — packing is an optimization, never fail the build
            print(f"  ! packing skipped ({e}); training will use the per-PNG loader.")
    return {"name": name, "counts": cfg["counts"], "split_counts": split["counts"],
            "warnings": split.get("warnings", []), "packed": packed_info}


# --- CRUD -----------------------------------------------------------------------------

def _read_yaml(p: Path) -> dict:
    import yaml
    if not p.exists():
        return {}
    with p.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def list_datasets(paths: config.Paths | None = None) -> list[dict]:
    root = (paths or config.DATA).datasets
    if not root.exists():
        return []
    out: list[dict] = []
    for d in sorted(root.iterdir()):
        if not (d / "dataset.yaml").exists():
            continue
        cfg = _read_yaml(d / "dataset.yaml")
        sp = d / "split.json"
        split_counts = json.loads(sp.read_text(encoding="utf-8")).get("counts", {}) if sp.exists() else {}
        out.append({
            "name": cfg.get("name", d.name),
            "n_sessions": len(cfg.get("session_ids", [])),
            "rotations": cfg.get("rotations", []),
            "counts": cfg.get("counts", {}),
            "split_counts": split_counts,
            "created_at": cfg.get("created_at"),
        })
    return out


def get_dataset(name: str, paths: config.Paths | None = None) -> dict:
    d = dataset_dir(name, paths)
    if not (d / "dataset.yaml").exists():
        raise FileNotFoundError(f"dataset '{name}' not found.")
    cfg = _read_yaml(d / "dataset.yaml")
    stats = json.loads((d / "stats.json").read_text(encoding="utf-8")) if (d / "stats.json").exists() else {}
    split = json.loads((d / "split.json").read_text(encoding="utf-8")) if (d / "split.json").exists() else {}
    return {"config": cfg, "stats": stats,
            "split": {k: split.get(k) for k in ("splits", "counts", "warnings", "class_weights")}}


def delete_dataset(name: str, paths: config.Paths | None = None) -> dict:
    d = dataset_dir(name, paths)
    if not d.exists():
        raise FileNotFoundError(f"dataset '{name}' not found.")
    shutil.rmtree(d)
    return {"name": _safe_name(name), "deleted": True}
