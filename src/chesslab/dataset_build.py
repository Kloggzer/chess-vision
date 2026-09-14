"""Stage 4 — named, curated datasets.

A **dataset** is a view on the default crop pool (`data/crops/default/manifest.jsonl`):
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
from collections import Counter, defaultdict
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path

from . import config, locks
from . import dataset as dataset_mod

log = logging.getLogger("chesslab.dataset_build")

_WINDOWS_DEVICE_NAMES = frozenset(
    ["CON", "PRN", "AUX", "NUL"]
    + [f"{stem}{i}" for stem in ("COM", "LPT") for i in range(1, 10)])


def _safe_name(name: str) -> str:
    n = (name or "").strip()
    # Windows loest `CON`/`NUL`/`COM1` auf ein GERAET auf und schneidet Punkte am Ende ab: beides
    # traefe ein anderes Ziel als der Name sagt.
    if (not n or "/" in n or "\\" in n or ".." in n or n.endswith(".")
            or n.split(".")[0].upper() in _WINDOWS_DEVICE_NAMES):
        raise ValueError(f"invalid dataset name: {name!r}")
    return n


def dataset_dir(name: str, paths: config.Paths | None = None) -> Path:
    return (paths or config.DATA).datasets / _safe_name(name)


# --- Class mode: 13-class identity (default), or the historical 14 for reading old packs ---

CLASS_MODES = ("pieces13", "pieces")


def class_list_for(class_mode: str) -> list[str]:
    """`pieces13` -> `config.IDENTITY_CLASSES` (the default); `pieces` -> the historical 14, which
    only reads packs built before `occluded` stopped being a class."""
    if class_mode == "pieces13":
        return config.IDENTITY_CLASSES
    if class_mode == "pieces":
        return config.CLASSES
    raise ValueError(f"unknown class mode {class_mode!r} ({' | '.join(CLASS_MODES)}).")


def collapse_labels(rows: list[dict], class_mode: str) -> list[dict]:
    """Narrow every row's `label` to the target class list. `pieces` returns the rows untouched
    (same objects), so the default build stays bit-identical.

    A metadata mapping, nothing else: crop FILES keep their path and their `data/crops/default/wB/`
    directory — the path is the identity, the label is metadata.

    `pieces13` DROPS `occluded` rather than binning it — it has no such output, and the
    hand-painted corrections are exactly what the measured coverage replaces.
    """
    classes = class_list_for(class_mode)        # the one gate: an unknown mode raises here
    if "occluded" in classes:
        return rows
    kept = [r for r in rows if r["label"] != "occluded"]
    n_occluded = len(rows) - len(kept)
    if n_occluded:
        # Loud, not silent: this used to raise, which was right while a hand label was the only
        # source. Renders with `--occlusion-p` produce them in bulk, so the count is printed
        # instead — that is what the guard was really protecting.
        print(f"[{class_mode}] dropped {n_occluded} `occluded` rows "
              f"({n_occluded / max(len(rows), 1) * 100:.1f}% of the pool) — no class fits.",
              flush=True)
    return kept                                 # labels already are the 13-class list


# --- Perceptual hash (dhash, 64-bit) --------------------------------------------------

def dhash(img, size: int = 8) -> int:
    """Difference hash: image to (size+1 x size) gray, horizontal neighbor differences -> 64-bit.

    Neal Krawetz's dHash (docs/references.md#krawetz-2013 — note that the primary source did not
    fetch in the session that added this reference; the attribution rests on two secondary
    sources). The 9x8 resize, the horizontal-neighbour comparison and the 64 bits match the
    original form; common variants also hash the columns for 128 bits, which doubles the evidence
    per crop and would collide less readily than this one does.
    """
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
    # Sortiert, nicht in Einfuegereihenfolge: derselbe Seed muss dieselben Crops behalten, egal in
    # welcher Reihenfolge das Manifest die Gruppen liefert.
    for key in sorted(groups):
        g = groups[key]
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

    Note what this is NOT for: leakage between splits. Near-duplicates spanning a train/test
    boundary are the expensive kind of duplicate (docs/references.md#barz-2019), and this project
    removes them structurally by splitting per session, not by hashing. What runs here is curation
    within one split — and it is off by default, because at hamming 6 it discarded 54.8% of the
    corpus without a single pixel-identical pair among 3,432 collisions (docs/data-pipeline.md
    §5.13).

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
    if not pack:                 # a pack-built dataset has no memmap, and no crop file to sample
        return

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

# Auto-pack (build_dataset) kicks in above this crop count. It used to be 100 000, on the claim
# that "below it the per-PNG loader is fine" — measured false on 2026-07-31: `occ-real6a`, 44 864
# crops and therefore unpacked, had read 8.7 GB from disk against 57 s of CPU time before the first
# epoch line appeared, with both CPU and GPU idle. 45 000 separate `Image.open` calls per epoch are
# not fine; they are the whole wall clock. At 128x128x3 the memmap costs ~50 KB per crop, so this
# threshold is ~0.1 GB of disk — cheap enough that the only sets worth excluding are the toy ones
# in the test suite, and those pass `pack=False` explicitly anyway.
_PACK_MIN_CROPS = 2_000


def _donor_policy(donor: str, paths: config.Paths) -> dict:
    """Everything about `donor` that decides which crops end up where.

    The split assignment is only half of what makes two datasets comparable. `occ-real6` was built
    with `per_cell_cap 256` and `max_empty_ratio 3.0`; today's defaults are 4 and 1.5, so a rebuild
    with the same sessions and the same split still produced a third of the training rows and
    almost inverted class weights. Both halves have to come from the donor or neither does.
    """
    from .training import packs

    p = paths.datasets / _safe_name(donor) / "dataset.yaml"
    if not p.exists():
        raise ValueError(f"--like: dataset '{donor}' has no dataset.yaml at {p}")
    cfg = _read_yaml(p)
    d, s = cfg.get("dedup") or {}, cfg.get("split") or {}
    return {
        "from_packs": bool(cfg.get(packs.PACKS_KEY)),
        "per_cell_cap": d.get("per_cell_cap"),
        "phash_enabled": d.get("phash_enabled"),
        "phash_hamming": d.get("phash_hamming"),
        "rotations": tuple(cfg.get("rotations") or (0,)),
        "val_frac": s.get("val_frac"),
        "test_frac": s.get("test_frac"),
        "max_empty_ratio": s.get("max_empty_ratio"),
        "max_class_ratio": s.get("max_class_ratio"),
        "seed": s.get("seed"),
        "class_mode": cfg.get("class_mode"),
    }


def _split_from(donor: str, have: set[str], paths: config.Paths,
                add_test: Sequence[str] = (),
                add_train: Sequence[str] = ()) -> dict[str, list[str]]:
    """The donor dataset's split, restricted to the sessions this build actually has.

    Refuses on a session the donor never placed, rather than quietly dropping it into train: an
    unplaced session is either a typo or a genuinely new session, and both deserve a decision
    instead of a default. Sessions the donor has and this build does not are simply absent — that
    is the normal case when the twin is built from a narrower selection.

    `add_test` is that decision, made explicitly: sessions appended to the TEST split on top of the
    donor's assignment. Train and val stay byte-identical, so every model trained against the donor
    stays comparable — a bigger test set does not change what anything was trained on. This is how a
    session recorded purely to evaluate against gets in.

    `add_train` is the other half, and it is not symmetric in consequence: it CHANGES what a model
    sees, so the result is a new corpus rather than a twin, and numbers from it are not comparable
    with the donor's on the training side. Only the test split stays comparable. Use it when the
    point is to teach the model something new and then check, against the donor's own test
    sessions, that the new material did not cost anything on the old ones.
    """
    p = paths.datasets / _safe_name(donor) / "split.json"
    if not p.exists():
        raise ValueError(f"--like: dataset '{donor}' has no split.json at {p}")
    donor_splits = json.loads(p.read_text(encoding="utf-8")).get("splits") or {}
    extra = [s for s in add_test if s in have]
    extra_train = [s for s in add_train if s in have]
    both = sorted(set(extra) & set(extra_train))
    if both:
        raise ValueError(f"--add-train and --add-test name the same session(s): {', '.join(both)}")
    placed = {s for sids in donor_splits.values() for s in sids} | set(extra) | set(extra_train)
    missing = sorted(have - placed)
    if missing:
        raise ValueError(
            f"--like {donor}: {len(missing)} session(s) are not in that split and would be "
            f"placed silently: {', '.join(missing)}. Drop them from --sessions, name them in "
            f"--add-test, or build without --like and accept a different assignment.")
    clash = sorted(set(extra) & {s for k, sids in donor_splits.items() if k != "test" for s in sids})
    if clash:
        raise ValueError(
            f"--add-test: {', '.join(clash)} is already in {donor}'s train or val. Moving a session "
            f"into test would change what the donor's models were trained on, which is the one "
            f"thing --like exists to prevent.")
    out = {k: [s for s in sids if s in have] for k, sids in donor_splits.items()}
    out["test"] = out.get("test", []) + [s for s in extra if s not in out.get("test", [])]
    out["train"] = out.get("train", []) + [s for s in extra_train if s not in out.get("train", [])]
    return out


def keep_per_position(rows: list[dict], per_position: int) -> list[dict]:
    """Whole boards, `per_position` of them per distinct FEN, spread evenly over the interval.

    The corpus is 246 positions over 9 386 boards — 38 near-identical takes each, because the rig
    records every 0.1 s while the board stands still. Measured: 16 per position beats the full set
    on macro recall (0.79 vs 0.71). Frames, never single crops, so boards stay complete.
    """
    groups: dict[tuple[str, str], set[str]] = defaultdict(set)
    for r in rows:
        placement = (str(r.get("fen") or "").split() or [""])[0]
        groups[(r["session_id"], placement)].add(str(r["frame"]))
    keep: dict[str, set[str]] = defaultdict(set)
    for (sid, _fen), frames in groups.items():
        f = sorted(frames)
        step = (len(f) - 1) / (per_position - 1) if per_position > 1 and len(f) > per_position else 0
        keep[sid] |= ({f[round(i * step)] for i in range(per_position)} if step
                      else set(f[:per_position]))
    return [r for r in rows if str(r["frame"]) in keep[r["session_id"]]]


def _pack_manifests(session_ids: Sequence[str], pack_size: tuple[int, int],
                    paths: config.Paths) -> list[Path]:
    """One pack manifest per requested session, at `pack_size` (W, H).

    `list_packs` owns the layout, so a pack's session comes from its manifest's first row rather
    than from the directory name — a Kotlin-written pack is named `<session_id>`, a Python-written
    one `<session_id>-<W>`, and nothing renames either.
    """
    from .training import packs

    found: dict[str, Path] = {}
    for ref in packs.list_packs(paths):
        if (ref.shape[2], ref.shape[1]) != tuple(pack_size):
            continue
        mp = packs.pack_dir(ref.name, paths) / "manifest.jsonl"
        rows = dataset_mod.load_manifest(mp) if mp.exists() else []
        if rows:
            found.setdefault(str(rows[0]["session_id"]), mp)
    w, h = pack_size
    missing = [s for s in session_ids if s not in found]
    if missing:
        raise ValueError(
            f"no {w}x{h} pack for session(s) {', '.join(missing)} — write one with "
            f"`chesslab session pack --session {missing[0]} --size {w}`.")
    return [found[s] for s in session_ids]


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
    per_position: int | None = None,
    seed: int = config.SEED,
    paths: config.Paths | None = None,
    source_manifest: Path | str | Sequence[Path | str] | None = None,
    variant_tag: str | None = None,
    allow_degenerate: bool = False,
    force_train=None,
    like: str | None = None,
    add_test: Sequence[str] = (),
    add_train: Sequence[str] = (),
    pack: bool = True,
    pack_size: tuple[int, int] | None = None,
    from_packs: bool = False,
    #: None means "unspecified": `--like` then supplies the donor's, otherwise it is `pieces`.
    class_mode: str | None = None,
) -> dict:
    """Build dataset <name> from `session_ids`: filter -> dedup -> rotation -> manifest+split+stats.

    `from_packs`: take the sessions from `data/packs/` instead of a crop pool. The rows keep their
    `mm://` paths, nothing is decoded, and `dataset.yaml` names the packs the loader must open.

    `source_manifest`: crop pool(s) to filter — one path, or several when the sessions were
    ingested under different tags (`ingest --tag X --no-build` writes `crops/X/manifest.jsonl`).
    Default: `data/crops/default/manifest.jsonl`.
    For the bake-off, each variant points to its own pool manifest; with identical
    `session_ids`+`seed`, the session-based split is byte-identical across all variants.

    `like`: build the TWIN of an existing dataset — its session split, its dedup policy and its
    class-balancing policy, all taken verbatim and **overriding** the corresponding arguments. Use
    it whenever the point of the build is to compare against a model trained on that dataset.
    Neither half is recoverable otherwise: a split is not reproducible from its own recorded
    parameters (same seed, fractions and pool return a different assignment; verified 2026-07-31 on
    `occ-real5nd`, recorded 11/3/1 against the assigner's 12/1/2), and the defaults move over time
    (`occ-real6` was built at `per_cell_cap 256` / `max_empty_ratio 3.0`, today's defaults are 4 and
    1.5 — same sessions, same split, a third of the training rows).
    """
    name = _safe_name(name)
    # Resolution at runtime (not as default arg): default args bind at import time and
    # ignore a later patched/changed config.DATA (testability).
    paths = paths or config.DATA
    if like:
        pol = _donor_policy(like, paths)
        # The donor's class list is a DEFAULT here, not an override — every other policy below is
        # an override. Building `occ-warm`'s 13-class twin is the whole reason to say `--like` and
        # `--classes` in one breath, and this line used to silently produce a second 2-class copy
        # under a name that said otherwise.
        class_mode = class_mode or pol["class_mode"]
        per_cell_cap, phash_enabled = pol["per_cell_cap"], pol["phash_enabled"]
        phash_hamming, rotations = pol["phash_hamming"], pol["rotations"]
        val_frac, test_frac, seed = pol["val_frac"], pol["test_frac"], pol["seed"]
        max_empty_ratio, max_class_ratio = pol["max_empty_ratio"], pol["max_class_ratio"]
        # The second exception after `class_mode`: where the pixels are stored is not part of the
        # donor's policy, and the migration off the monolithic memmaps is exactly "same rows, same
        # split, packs instead" (`docs/session-packs.md`). A pack donor still forces packs.
        from_packs = from_packs or pol["from_packs"]
        print(f"[like] adopting {like}: classes={class_mode} cap={per_cell_cap} "
              f"phash={phash_enabled} max_empty_ratio={max_empty_ratio} seed={seed}")
    # 13 + coverage since 2026-08-18: `occluded` is a regression target now, not a class, and the
    # pipeline measures it per square instead of a human painting it (`docs/frame-scan.md`).
    class_mode = class_mode or "pieces13"
    classes = class_list_for(class_mode)
    d = config.DEDUP
    per_cell_cap = d.per_cell_cap if per_cell_cap is None else per_cell_cap
    phash_enabled = d.phash_enabled if phash_enabled is None else phash_enabled
    phash_hamming = d.phash_hamming if phash_hamming is None else phash_hamming
    rotations = d.rotations if rotations is None else tuple(rotations)

    # One or several crop pools. Several matter when sessions were ingested under different tags
    # (each `ingest --no-build` writes its own crops/<tag>/manifest.jsonl) — without this the caller had
    # to concatenate them into one file by hand first.
    if from_packs:
        from .training import packs
        pack_size = pack_size or (packs.DEFAULT_PACK_SIDE, packs.DEFAULT_PACK_SIDE)
        srcs = _pack_manifests(session_ids, pack_size, paths)
    elif not source_manifest:
        srcs = [paths.crop_pool / "manifest.jsonl"]
    elif isinstance(source_manifest, (str, Path)):
        srcs = [Path(source_manifest)]
    else:
        srcs = [Path(p) for p in source_manifest]
    missing = [str(p) for p in srcs if not p.exists()]
    if missing:
        raise ValueError(f"source manifest(s) not found: {', '.join(missing)}")
    # Reading a pool that a slice is still filling is how 2026-08-21 went: the build took a
    # half-written manifest, packed for 19 minutes against crops that kept changing, and the pack
    # was correctly thrown away afterwards. The writer already announces itself — ask it.
    # A pack is immutable and has no crop pool, so there is nothing to wait for.
    for src in ([] if from_packs else srcs):
        busy = locks.held_by(locks.pool_lock_path(src.parent))
        if busy:
            raise ValueError(f"crop pool {src.parent} is being written by {locks.describe(busy)} "
                             f"— wait for it to finish, then build.")

    wanted = set(session_ids)
    rows = [r for src in srcs for r in dataset_mod.load_manifest(src) if r["session_id"] in wanted]
    # Zwei Pools duerfen dieselbe Aufnahme fuehren (54 liegen in zweien). Ohne diesen Schnitt
    # traegt der Datensatz dasselbe physische Crop mehrfach — das verschiebt die Gewichtung
    # still und zaehlt Zeilen, die es nur einmal gibt.
    seen: set[str] = set()
    deduped = []
    for r in rows:
        if r["path"] not in seen:
            seen.add(r["path"])
            deduped.append(r)
    if len(deduped) < len(rows):
        print(f"[source] {len(rows) - len(deduped)} rows listed by more than one source "
              f"manifest — kept once each")
    rows = deduped
    n_raw = len(rows)
    if per_position:
        rows = keep_per_position(rows, per_position)
        print(f"[position] {per_position} boards per position: {n_raw} -> {len(rows)} crops")
    if not rows:
        raise ValueError(
            f"no crops for the selected sessions in {', '.join(str(p.name) for p in srcs)} "
            f"(wrong --source-manifest? the default pool is crops/default, but `ingest --tag X "
            f"--no-build` writes crops/X/manifest.jsonl).")
    # Determine split assignment on the RAW, COMPLETE data (full 64-square boards). Dedup +
    # rotation afterwards ONLY on train — val/test remain complete (exactly 64 crops/frame, rot 0), otherwise
    # board_accuracy would compute on incomplete/duplicated boards (bug).
    # board_accuracy would compute on incomplete/duplicated boards (bug).
    sizes = Counter(r["session_id"] for r in rows)
    if like:
        splits = _split_from(like, set(sizes), paths, add_test, add_train)
    else:
        splits = dataset_mod.assign_sessions_to_splits(dict(sizes), val_frac, test_frac, seed,
                                                       force_train=force_train,
                                                       groups=dataset_mod.groups_of(rows))
    split_of = {s: name for name, sids in splits.items() for s in sids}
    train_raw = [r for r in rows if split_of.get(r["session_id"]) == "train"]
    holdout = [r for r in rows if split_of.get(r["session_id"]) in ("val", "test")]  # complete, rot 0

    # phash FIRST, then the cap. The other order threw away 227 crops of a cell down to 4 before
    # anything looked at whether they differ, so the visual filter only ever saw the survivors —
    # and it cannot be told apart from "the piece never moved" that a changing light makes every
    # one of those 227 genuinely different.
    #
    # MEASURED on the 49,856-row real pool (2026-07-29): only 14,807 crops (29.7 %) are visually
    # distinct at all, so the filter does real work either way. But with it running first the cap
    # stops being the duplicate defence and only limits genuine variety, which means it can be
    # raised: cap 4 -> 4,827 rows (1.16x today's 4,172), cap 16 -> 7,422 (1.78x), and not one
    # near-identical pair among them. Under the old order a high cap would simply have re-admitted
    # duplicates.
    #
    # It costs one full pass of the hash over the uncapped train split — 41 s for the whole real
    # pool, once per build.
    train_rows = dedup_phash(train_raw, phash_hamming) if phash_enabled else list(train_raw)
    train_rows = dedup_metadata(train_rows, per_cell_cap, seed)
    n_dedup = len(train_rows) + len(holdout)

    # BEFORE touching the existing dataset: a refusal must not leave the caller with neither the
    # new dataset nor the old one.
    _preflight_disk_check(train_rows, holdout, pack and not from_packs, paths=paths, seed=seed)

    ds = paths.datasets / name
    if ds.exists():
        shutil.rmtree(ds)                       # clean rebuild
    ds.mkdir(parents=True, exist_ok=True)
    rows = train_rows + holdout                 # rotation happens on-the-fly at train time
    # Label collapse is the LAST step before the manifest: filtering, dedup and the
    # session->split assignment above ran on the original 14-class labels, so a narrowed
    # build keeps exactly the rows a `pieces` build at the same seed would keep.
    rows = collapse_labels(rows, class_mode)
    # AFTER the collapse: it drops `occluded`, so counting before it puts a `counts.final` in
    # dataset.yaml that does not match the manifest. Zero on the real corpus, but renders with
    # `--occlusion-p` produce occluders in bulk.
    n_final = len(rows)

    (ds / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + ("\n" if rows else ""),
        encoding="utf-8")
    # Mined hard-negative empties (scripts/mine_hard_empty.py) survive the empty cap:
    # a random cap throws away exactly the rare hard cases (dark corner squares,
    # neighbour bleed) that the deployed model confidently misreads.
    priority_paths = dataset_mod.load_priority_paths(paths)
    if priority_paths:
        print(f"[i] hard-empty keep list: {len(priority_paths)} crops protected from the empty cap")
    split = dataset_mod.make_split(rows, val_frac, test_frac, max_empty_ratio, seed, max_class_ratio,
                                   force_train=force_train, precomputed_splits=splits,
                                   priority_paths=priority_paths, classes=classes)
    errors, _warnings = dataset_mod.validate_split(split, rows, classes=classes)
    if errors:
        if not allow_degenerate:
            shutil.rmtree(ds, ignore_errors=True)   # no half-finished zombie dataset
            raise ValueError("\n".join(errors))
        split["degenerate_errors"] = errors          # intentionally allowed -> document in split
    (ds / "split.json").write_text(json.dumps(split, ensure_ascii=False, indent=2), encoding="utf-8")
    stats = dataset_mod.compute_stats(rows, classes=classes)
    (ds / "stats.json").write_text(json.dumps(stats, ensure_ascii=False), encoding="utf-8")

    cfg = {
        "name": name,
        "created_at": datetime.now(UTC).isoformat(),
        "class_mode": class_mode,
        "session_ids": list(session_ids),
        "variant_tag": variant_tag,
        "source_manifest": [p.as_posix() for p in srcs],
        "dedup": {"per_cell_cap": per_cell_cap, "phash_enabled": bool(phash_enabled),
                  "phash_hamming": phash_hamming},
        "rotations": list(rotations),
        # Sessions pinned to the train split (e.g. all-empty lighting captures — in
        # val/test they would distort board metrics). Persisted so Rebuild keeps them.
        "force_train": sorted(force_train) if force_train else [],
        "split": {"val_frac": val_frac, "test_frac": test_frac, "max_empty_ratio": max_empty_ratio,
                  "max_class_ratio": max_class_ratio, "seed": seed},
        "counts": {"raw": n_raw, "after_dedup": n_dedup, "final": n_final},
    }
    if from_packs:
        from .training import packs
        cfg[packs.PACKS_KEY] = list(dict.fromkeys(packs.pack_name_of(r["path"]) for r in rows))
    import yaml
    (ds / "dataset.yaml").write_text(yaml.safe_dump(cfg, sort_keys=False, allow_unicode=True),
                                     encoding="utf-8")
    # Pack crops into one memmap so `train` reads from it instead of 1M per-item Image.open (the
    # I/O bottleneck). Best-effort: a pack failure just means training falls back to the per-PNG
    # loader (load_packed returns None). The memmap is disk-backed — it does NOT load into RAM.
    packed_info = None
    if pack and not from_packs and n_final >= _PACK_MIN_CROPS:   # small sets load fine per-PNG
        try:
            from .training.pack import pack_dataset
            packed_info = pack_dataset(name, paths, out_size=pack_size)
        except Exception as e:  # noqa: BLE001 — packing is an optimization, never fail the build
            print(f"  ! packing skipped ({e}); training will use the per-PNG loader.")
    return {"name": name, "counts": cfg["counts"], "split_counts": split["counts"],
            "warnings": split.get("warnings", []), "packed": packed_info,
            "hard_empty_protected": len(priority_paths or ()),
            "force_train": sorted(force_train) if force_train else []}


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


def _frozen_sessions(paths: config.Paths = config.DATA) -> list[str]:
    """Aufnahmen, die genau einmal ausgewertet werden — `data/TEST-USED.json`, Schluessel `frozen`."""
    f = paths.root / "TEST-USED.json"
    if not f.is_file():
        return []
    return list(json.loads(f.read_text(encoding="utf-8")).get("frozen") or [])


def make_folds(name: str, k: int = 4, *, seed: int | None = None, val_frac: float | None = None,
               prefix: str = "split-f", dry_run: bool = False, force: bool = False,
               allow_asymmetric: bool = False, include_frozen: bool = False,
               paths: config.Paths = config.DATA) -> dict:
    """Write k session-grouped `<prefix><i>.json` beside the dataset's own split.

    Out-of-fold prediction is what `docs/cross-labeling-literature.md` settles on for finding
    mislabeled cells (k = 4, Northcutt et al.), and `train --split` plus `check_not_circular`
    were already built for it — nothing wrote the files. All folds read the SAME pack.

    Fold models train on sessions the main split holds out, so their metrics are not comparable
    with the main model's. They are audit instruments, not release candidates.
    """
    dd = dataset_dir(name, paths)
    cfg = _read_yaml(dd / "dataset.yaml")
    if not cfg:
        raise ValueError(f"dataset '{name}' has no dataset.yaml at {dd / 'dataset.yaml'}")
    rows = dataset_mod.load_manifest(dd / "manifest.jsonl")
    if k < 2:
        raise ValueError(f"-k must be at least 2, got {k}")

    # Eine eingefrorene Aufnahme darf in KEINEN Fold: sie liegt in genau einem als Test und in
    # allen anderen im Training, und damit ist sie verbrannt. `TEST-USED.json` ist die Sperre.
    frozen = set(_frozen_sessions(paths)) & {r["session_id"] for r in rows}
    if frozen and not include_frozen:
        rows = [r for r in rows if r["session_id"] not in frozen]
        print(f"[i] {len(frozen)} eingefrorene Aufnahme(n) aus dem Fold-Schnitt genommen: "
              f"{', '.join(sorted(frozen))}")
    elif frozen:
        print(f"[WARN] --include-frozen: {', '.join(sorted(frozen))} landet im Training anderer "
              f"Folds und ist danach als Test wertlos.")

    # `build_dataset` dedups TRAIN only, so a session the main split held out carries every crop
    # and one it trained on carries a thinned selection. A fold that moves such a session into
    # test measures board accuracy on boards that are missing squares.
    d = cfg.get("dedup") or {}
    if (d.get("per_cell_cap") or 0) > 0 or d.get("phash_enabled"):
        if not allow_asymmetric:
            raise ValueError(
                f"'{name}' was deduped train-only (per_cell_cap={d.get('per_cell_cap')}, "
                f"phash={d.get('phash_enabled')}), so its rows are asymmetric across the split "
                f"and folds would measure thinned boards. Rebuild with --cap 0 --no-phash, or "
                f"pass --allow-asymmetric.")
        print(f"[WARN] '{name}' is deduped train-only — fold test sets are thinned boards.")

    sp = cfg.get("split") or {}
    seed = sp.get("seed", config.SEED) if seed is None else seed
    val_frac = sp.get("val_frac", config.DEFAULT_VAL_FRAC) if val_frac is None else val_frac
    classes = class_list_for(cfg.get("class_mode") or "pieces13")
    force_train = set(cfg.get("force_train") or [])

    groups = dataset_mod.groups_of(rows)
    force_groups = {groups[s] for s in force_train if s in groups}
    members: dict[str, list[str]] = {}
    for sid, g in groups.items():
        members.setdefault(g, []).append(sid)
    sizes = Counter(r["session_id"] for r in rows)
    gsizes = {g: sum(sizes[s] for s in ss) for g, ss in members.items()}
    folds = dataset_mod.fold_groups(gsizes, k, seed, force_train=force_groups)

    if force_groups:
        pinned = sum(gsizes[g] for g in force_groups)
        print(f"[i] {len(force_groups)} group(s) / {pinned} crops are pinned to train — they get "
              f"no fold, so nothing ever predicts them out of sample.")
    loads = [sum(gsizes[g] for g in f) for f in folds]
    if min(loads) == 0:
        raise ValueError(f"k={k} is larger than this corpus can fill: {len(gsizes)} groups, "
                         f"fold sizes {loads}. Use a smaller k.")
    print(f"[i] fold crop counts {loads} (largest/smallest {max(loads) / max(1, min(loads)):.2f}x)")

    priority_paths = dataset_mod.load_priority_paths(paths)
    written, errors, pending = [], [], []
    for i, fold in enumerate(folds):
        # val comes from the NEXT fold, filled to val_frac: one group misses the quota badly
        # (4.6 % where 15 % was asked), and taking it from this fold would leak into its own test.
        test = sorted(s for g in fold for s in members[g])
        pool = [g for g in folds[(i + 1) % k] if g not in fold]
        val_target, val_groups, got = val_frac * len(rows), [], 0
        for g in sorted(pool, key=lambda g: (-gsizes[g], g)):
            # Only while it moves CLOSER, like `assign_sessions_to_splits` rule 2: filling until
            # the target is reached overshot 15 % to 19 % here, and every crop over the mark comes
            # straight out of train, which is the whole point of k folds instead of two halves.
            if val_groups and abs(val_target - got - gsizes[g]) >= abs(val_target - got):
                continue
            val_groups.append(g)
            got += gsizes[g]
        val = sorted(s for g in val_groups for s in members[g])
        train = sorted(set(sizes) - set(test) - set(val))
        split = dataset_mod.make_split(
            rows, val_frac, 1 / k, sp.get("max_empty_ratio"), seed, sp.get("max_class_ratio"),
            force_train=force_train, precomputed_splits={"train": train, "val": val, "test": test},
            priority_paths=priority_paths, classes=classes)
        split.update({"fold": i, "k": k, "of_dataset": name})
        errs, _w = dataset_mod.validate_split(split, rows, classes=classes)
        errors += [f"{prefix}{i}: {e}" for e in errs]
        out = dd / f"{prefix}{i}.json"
        if out.exists() and not (force or dry_run):
            raise ValueError(f"{out} exists — pass --force to overwrite.")
        pending.append((out, split))
        written.append(out.name)
        c = split["counts"]
        print(f"[fold {i}] train {c['train']} / val {c['val']} / test {c['test']} crops · "
              f"test sessions: {', '.join(test)}")
    # Erst pruefen, dann schreiben: ein verworfener Satz liess sonst k Folds liegen, und
    # der zweite Versuch scheiterte an "exists" statt am eigentlichen Grund.
    if errors:
        raise ValueError("\n".join(errors))
    if not dry_run:
        for out, split in pending:
            out.write_text(json.dumps(split, ensure_ascii=False, indent=2), encoding="utf-8")


    seen = [s for f in folds for g in f for s in members[g]]
    assert len(seen) == len(set(seen)), "folds overlap — out-of-fold would be a lie"
    if not dry_run:
        print("[OK] " + " ".join(written))
        for i in range(k):
            print(f"  chesslab train --dataset {name} --split {prefix}{i}.json")
        print("  (all folds read the same pack — no re-packing)")
    return {"dataset": name, "k": k, "folds": written, "crops_per_fold": loads,
            "pinned_groups": sorted(force_groups)}
