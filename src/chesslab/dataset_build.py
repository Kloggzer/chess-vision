"""Stage 4 — named, curated datasets under `data/datasets/<name>/`: a session selection with dedup
and split policy over the crop pool or session packs.
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
from .ioutil import iter_jsonl, write_json

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


CLASS_MODES = ("pieces13", "pieces")


def class_list_for(class_mode: str) -> list[str]:
    """`pieces13` -> `config.IDENTITY_CLASSES` (default); `pieces` -> the historical 14 for old
    packs.
    """
    if class_mode == "pieces13":
        return config.IDENTITY_CLASSES
    if class_mode == "pieces":
        return config.CLASSES
    raise ValueError(f"unknown class mode {class_mode!r} ({' | '.join(CLASS_MODES)}).")


def collapse_labels(rows: list[dict], class_mode: str) -> list[dict]:
    """Narrow every row's `label` to the target class list; `pieces` returns the rows untouched.

    Metadata only: the crop path is the identity. `pieces13` DROPS `occluded` — coverage replaces
    it.
    """
    classes = class_list_for(class_mode)
    if "occluded" in classes:
        return rows
    kept = [r for r in rows if r["label"] != "occluded"]
    n_occluded = len(rows) - len(kept)
    if n_occluded:
        # Loud, not silent: renders with `--occlusion-p` produce `occluded` in bulk.
        print(f"[{class_mode}] dropped {n_occluded} `occluded` rows "
              f"({n_occluded / max(len(rows), 1) * 100:.1f}% of the pool) — no class fits.",
              flush=True)
    return kept


def dhash(img, size: int = 8) -> int:
    """Difference hash: (size+1 x size) gray, horizontal neighbour differences -> 64-bit (Krawetz
    dHash).
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


def dedup_metadata(rows: list[dict], cap: int | None, seed: int = config.SEED) -> list[dict]:
    """Keep max. `cap` crops per (session_id, square, label) (seeded). cap<=0/None -> all."""
    if not cap or cap <= 0:
        return list(rows)
    rng = random.Random(seed)
    groups: dict[tuple, list[dict]] = {}
    for r in rows:
        groups.setdefault((r["session_id"], r["square"], r["label"]), []).append(r)
    kept: list[dict] = []
    # Sortiert: derselbe Seed muss dieselben Crops behalten, egal in welcher Reihenfolge das
    # Manifest liefert.
    for key in sorted(groups):
        g = groups[key]
        if len(g) > cap:
            g = sorted(g, key=lambda r: str(r.get("frame", "")))
            g = rng.sample(g, cap)
        kept.extend(g)
    return kept


_HASH_BITS = 64                    # dhash() width; band splitting below assumes this


def _band_ranges(n_bands: int) -> list[tuple[int, int]]:
    """Partition `_HASH_BITS` into `n_bands` contiguous (shift, width) ranges covering all bits."""
    edges = [round(i * _HASH_BITS / n_bands) for i in range(n_bands + 1)]
    return [(edges[i], edges[i + 1] - edges[i]) for i in range(n_bands) if edges[i + 1] > edges[i]]


def dedup_phash(rows: list[dict], hamming: int) -> list[dict]:
    """Discard visually near-identical crops within each class (dhash, Hamming <= threshold).

    Not a leakage defence (the per-session split is), and off by default: hamming 6 dropped 54.8
    % of the corpus without one pixel-identical pair. LSH banding is exact by pigeonhole, not
    approximate."""
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
        seen: list[int] = []
        buckets: list[dict[int, list[int]]] = [{} for _ in bands]
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
                continue
            idx = len(seen)
            seen.append(h)
            for bucket, key in zip(buckets, keys, strict=True):
                bucket.setdefault(key, []).append(idx)
            kept.append(r)
    return kept


# Rotation augmentation runs on the fly at train time (`torch_data._RandomRot90`); materialised
# copies quadrupled disk for zero information.


def _preflight_disk_check(train_rows: list[dict], holdout: list[dict],
                          write_pack: bool,
                          paths: config.Paths | None = None, seed: int = config.SEED,
                          pack_size: tuple[int, int] | None = None) -> None:
    """Project the dataset's on-disk cost BEFORE writing anything; ValueError when it cannot fit.

    The packed memmap dominates (decoded h*w*3). `pack_size` is what will be written: measuring
    the 128 px crop file for an 80 px pack projected 2.56x too much.
    """
    import cv2

    n_final = len(train_rows) + len(holdout)
    if not write_pack:           # a pack-built dataset has no memmap, and no crop file to sample
        return

    # A seeded sample; the first readable crop gives the decoded byte count.
    pool = train_rows or holdout
    if not pool:
        return
    if pack_size is not None:
        _refuse_if_too_small(n_final, int(pack_size[1]) * int(pack_size[0]) * 3, paths)
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

    _refuse_if_too_small(n_final, crop_bytes, paths)


def _refuse_if_too_small(n_final: int, crop_bytes: int, paths: config.Paths | None) -> None:
    need = n_final * crop_bytes if n_final >= _PACK_MIN_CROPS else 0
    if not need:
        return
    # Measure the volume actually written to — `paths` may point at another drive.
    free = shutil.disk_usage(str((paths or config.DATA).root)).free
    log.info("preflight: %s final crops; ~%.1f GB memmap needed, %.1f GB free",
             f"{n_final:,}", need / 1e9, free / 1e9)
    if need > free * 0.9:
        raise ValueError(
            f"dataset would need ~{need / 1e9:.0f} GB but only {free / 1e9:.0f} GB are free. "
            f"Reduce it: write_pack=False skips the ~{need / 1e9:.0f} GB memmap; or lower per_cell_cap.")


# Auto-pack threshold (~0.1 GB of memmap). An unpacked 44 864-crop set read 8.7 GB with CPU and GPU
# idle before its first epoch: per-PNG `Image.open` is the whole wall clock.
_PACK_MIN_CROPS = 2_000


def _donor_policy(donor: str, paths: config.Paths) -> dict:
    """Everything about `donor` that decides which crops end up where — split AND balancing policy,
    or a rebuild of the same split trains on a third of the rows with inverted weights.
    """
    from .training import packs

    p = paths.datasets / _safe_name(donor) / "dataset.yaml"
    if not p.exists():
        raise ValueError(f"--like: dataset '{donor}' has no dataset.yaml at {p}")
    cfg = _read_yaml(p)
    d, s = cfg.get("dedup") or {}, cfg.get("split") or {}
    # Ein Spender ohne diese Bloecke sagt seine Politik NICHT; lauter `None` erbte heutige Vorgaben
    # plus `seed=None`. Wer nichts weiss, verweigert.
    blind = [k for k, block in (("dedup", d), ("split", s)) if not block]
    if blind:
        raise ValueError(
            f"--like: dataset '{donor}' has no {'/'.join(blind)} block in {p} — its policy is "
            f"unknown, and inheriting today's defaults would build a near-twin. Name the "
            f"parameters explicitly and build without --like.")
    return {
        "from_packs": bool(cfg.get(packs.PACKS_KEY)),
        "pack_size": _donor_pack_size(paths.datasets / _safe_name(donor), paths),
        "per_cell_cap": d.get("per_cell_cap"),
        # Absent on older datasets, where None is exactly what they did; `--like` must carry it too.
        "per_position": d.get("per_position"),
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


def _donor_pack_size(ds: Path, paths: config.Paths | None = None) -> tuple[int, int] | None:
    """(W, H) of the donor's rows — a 128 px donor silently produced an 80 px twin.

    Eine `mm://`-Zeile traegt das `out_size` ihres POOLS (`[128, 128]` auch in `-80`-Packs); fuer
    sie gilt das Meta des Packs.
    """
    manifest = ds / "manifest.jsonl"
    if not manifest.exists():
        return None
    for row in iter_jsonl(manifest):
        from_pack = _pack_row_size(str(row.get("path", "")), paths)
        if from_pack is not None:
            return from_pack
        size = row.get("out_size")
        return (int(size[0]), int(size[1])) if size else None
    return None


def _pack_row_size(path: str, paths: config.Paths | None) -> tuple[int, int] | None:
    """(W, H) des Packs, zu dem eine `mm://`-Zeile gehoert — oder None fuer jede andere Zeile."""
    from .training import packs

    if not path.startswith(packs.MM_PREFIX):
        return None
    meta = packs.pack_dir(packs.pack_name_of(path), paths or config.DATA) / "packed_meta.json"
    if not meta.is_file():
        return None
    m = json.loads(meta.read_text(encoding="utf-8"))
    return (int(m["w"]), int(m["h"]))


def _split_from(donor: str, have: set[str], paths: config.Paths,
                add_test: Sequence[str] = (),
                add_train: Sequence[str] = ()) -> dict[str, list[str]]:
    """The donor dataset's split, restricted to this build's sessions; a session the donor never
    placed is refused.

    `add_test` appends to TEST only, so train/val stay byte-identical and comparable. `add_train`
    changes what a model sees: a new corpus, comparable with the donor only on test."""
    p = paths.datasets / _safe_name(donor) / "split.json"
    if not p.exists():
        raise ValueError(f"--like: dataset '{donor}' has no split.json at {p}")
    donor_splits = dataset_mod.load_split(p).get("splits") or {}
    unknown = sorted({*add_test, *add_train} - have)
    if unknown:
        raise ValueError(
            f"--add-test/--add-train name session(s) this build has no crop for: "
            f"{', '.join(unknown)}. They would be accepted and then do nothing.")
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
    # Both directions, or a session the donor put in test would also be trained on.
    for flag, wanted, keep in (("--add-test", extra, "test"), ("--add-train", extra_train, "train")):
        clash = sorted(set(wanted) & {s for k, sids in donor_splits.items() if k != keep for s in sids})
        if clash:
            raise ValueError(
                f"{flag}: {', '.join(clash)} is already in another of {donor}'s splits. Moving a "
                f"session across would change what the donor's models were trained on or "
                f"evaluated against, which is the one thing --like exists to prevent.")
    out = {k: [s for s in sids if s in have] for k, sids in donor_splits.items()}
    out["test"] = out.get("test", []) + [s for s in extra if s not in out.get("test", [])]
    out["train"] = out.get("train", []) + [s for s in extra_train if s not in out.get("train", [])]
    return out


def keep_per_position(rows: list[dict], per_position: int) -> list[dict]:
    """Whole boards, `per_position` of them per distinct FEN, spread evenly over the interval.

    The corpus is 246 positions in 9 386 boards; 16 per position beat the full set on macro
    recall (0.79 vs 0.71).
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


def _ledger_hits(sdir: Path, rows: list[dict]) -> tuple[list[str], list[str]]:
    """Pack rows today's human ledgers contradict: `(locked unusable, relabelled)` as frame/square."""
    from .labeling import read_corrections, read_unusable_cells

    locked, relabel = read_unusable_cells(sdir), read_corrections(sdir)
    unusable: list[str] = []
    changed: list[str] = []
    for r in rows:
        key = (r["session_id"], str(r["frame"]), r["square"])
        if key in locked:
            unusable.append(f"{key[1]}/{key[2]}")
        elif key in relabel and relabel[key] != r["label"]:
            changed.append(f"{key[1]}/{key[2]}")
    return unusable, changed


def _ledger_dir(sid: str, paths: config.Paths) -> Path | None:
    """The directory holding `sid`'s human ledgers; None for a composite/turntable, which has none."""
    from .session_store.paths import session_dir

    try:
        return session_dir(sid, paths)[0]
    except (FileNotFoundError, ValueError):
        return None


def verdict_conflicts(rows: list[dict], splits: dict[str, list[str]],
                      paths: config.Paths | None = None, examples: int = 5) -> dict:
    """Rows of a FINISHED dataset that today's human ledgers contradict, counted per split.

    Reads each session's ledgers once and no crop. Counts rows, not cells: that is what trains.
    """
    paths = paths or config.DATA
    where = {s: k for k, sids in splits.items() for s in sids}
    by_sid: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        if r.get("session_id") and "frame" in r and "square" in r:
            by_sid[r["session_id"]].append(r)
    per: dict[str, dict] = {}
    unchecked = 0
    for sid, srows in sorted(by_sid.items()):
        sdir = _ledger_dir(sid, paths)
        if sdir is None:
            unchecked += 1
            continue
        unusable, changed = _ledger_hits(sdir, srows)
        if not (unusable or changed):
            continue
        k = per.setdefault(where.get(sid, "unsplit"),
                           {"unusable": 0, "relabelled": 0, "examples": []})
        k["unusable"] += len(unusable)
        k["relabelled"] += len(changed)
        k["examples"] += [f"{sid} {c} ({why})" for why, cs in (("unusable", unusable),
                                                                ("relabelled", changed))
                          for c in cs][:examples - len(k["examples"])]
    return {"rows": sum(v["unusable"] + v["relabelled"] for v in per.values()),
            "per_split": per, "sessions_without_ledger": unchecked}


def check_verdicts(rows: list[dict], splits: dict[str, list[str]], *, strict: bool,
                   paths: config.Paths | None = None) -> dict:
    """`train`/`eval` start: say out loud what a human overruled; `strict` refuses instead.

    No filtering — dropping rows would change the recipe and break comparison with the archive.
    """
    found = verdict_conflicts(rows, splits, paths)
    for split, v in sorted(found["per_split"].items()):
        print(f"[verdict] {split}: {v['unusable']} row(s) locked unusable, {v['relabelled']} "
              f"relabelled by a human after the dataset was built (e.g. {', '.join(v['examples'])})")
    if found["rows"] and strict:
        raise ValueError(f"{found['rows']} dataset row(s) contradict a human verdict "
                         f"(--strict-verdicts) — rebuild the dataset from recut packs.")
    if found["rows"]:
        print(f"[verdict] {found['rows']} row(s) used AS BUILT; recorded as `verdict_conflicts`.")
    return found


def _stale_packs(chosen: dict[str, tuple[str, list[dict]]], w: int, paths: config.Paths,
                 allow: bool) -> list[str]:
    """Refuse a pack a human verdict has overtaken since the cut; returns the ones `allow` let by.

    A matching `ledgers.json` stamp spares the read; an unstamped pack is checked by CONTENT.
    """
    from .provenance import same_file
    from .training import packs
    from .training.pack_session import LEDGER_STAMP, ledger_stamps

    stale: list[str] = []
    problems: list[str] = []
    for sid, (name, rows) in chosen.items():
        sdir = _ledger_dir(sid, paths)
        if sdir is None:
            continue
        try:
            then = json.loads((packs.pack_dir(name, paths) / LEDGER_STAMP)
                              .read_text(encoding="utf-8"))["ledgers"]
        except (OSError, ValueError, KeyError, TypeError):
            then = None
        if then is not None and all(same_file(then.get(n), s) for n, s in ledger_stamps(sdir).items()):
            continue
        unusable, changed = _ledger_hits(sdir, rows)
        if not (unusable or changed):
            continue
        stale.append(name)
        problems.append(
            f"pack {name}: {len(unusable)} cell(s) marked unusable and {len(changed)} cell(s) "
            f"relabelled by a human since it was cut (e.g. {(unusable + changed)[0]}) — recut "
            f"with `chesslab session pack --session {sid} --size {w} --replace`")
    if problems and not allow:
        raise ValueError("\n".join([f"{len(stale)} pack(s) contradict a human verdict and would "
                                    f"train on it:", *problems,
                                    "Only `allow_stale_packs=True` builds on them anyway."]))
    for line in problems:
        print(f"[stale] {line} — ALLOWED, recorded under `stale_packs`")
    return stale


def _pack_manifests(session_ids: Sequence[str], pack_size: tuple[int, int],
                    paths: config.Paths, allow_stale: bool = False) -> tuple[list[Path], list[str]]:
    """One pack manifest per requested session at `pack_size` (W, H). The session comes from the
    manifest's first row: Kotlin names packs `<sid>`, Python `<sid>-<W>`.
    """
    from .training import packs

    w, h = pack_size
    wanted = set(session_ids)
    found: dict[str, Path] = {}
    names: dict[str, str] = {}
    chosen: dict[str, tuple[str, list[dict]]] = {}
    for ref in packs.list_packs(paths):
        if (ref.shape[2], ref.shape[1]) != tuple(pack_size):
            continue
        mp = packs.pack_dir(ref.name, paths) / "manifest.jsonl"
        rows = dataset_mod.load_manifest(mp) if mp.exists() else []
        sid = str(rows[0]["session_id"]) if rows else None
        if sid not in wanted:
            continue
        # Sonst entschiede die Verzeichnis-SORTIERUNG, welche Pixel der Datensatz zitiert.
        if sid in found:
            raise ValueError(f"two {w}x{h} packs claim session {sid}: {names[sid]} and "
                             f"{ref.name} — delete the one this build must not cite.")
        found[sid], names[sid] = mp, ref.name
        chosen[sid] = (ref.name, rows)
    missing = [s for s in session_ids if s not in found]
    if missing:
        raise ValueError(
            f"no {w}x{h} pack for session(s) {', '.join(missing)} — write one with "
            f"`chesslab session pack --session {missing[0]} --size {w}`.")
    stale = _stale_packs(chosen, w, paths, allow_stale)
    return [found[s] for s in session_ids], stale


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
    write_pack: bool = True,
    pack_size: tuple[int, int] | None = None,
    from_packs: bool = False,
    #: Build on packs a later human verdict contradicts. Never a default: the rows would train on it.
    allow_stale_packs: bool = False,
    #: None means "unspecified": `--like` then supplies the donor's, otherwise it is `pieces`.
    class_mode: str | None = None,
) -> dict:
    """Build dataset <name> from `session_ids`: filter -> dedup -> manifest+split+stats.

    `from_packs` keeps `mm://` rows and decodes nothing. `like` builds the TWIN of a dataset
    (split, dedup and balancing verbatim): a split is not reproducible from its parameters, and
    defaults move."""
    name = _safe_name(name)
    # Resolved at runtime, not as a default arg: tests patch `config.DATA` after import.
    paths = paths or config.DATA
    if like:
        pol = _donor_policy(like, paths)
        # The donor's class list is a DEFAULT, unlike every other policy below: a 13-class twin is
        # the point of `--like` plus `--classes`.
        class_mode = class_mode or pol["class_mode"]
        per_cell_cap, phash_enabled = pol["per_cell_cap"], pol["phash_enabled"]
        per_position = pol["per_position"]
        phash_hamming, rotations = pol["phash_hamming"], pol["rotations"]
        val_frac, test_frac, seed = pol["val_frac"], pol["test_frac"], pol["seed"]
        max_empty_ratio, max_class_ratio = pol["max_empty_ratio"], pol["max_class_ratio"]
        # Where pixels are stored is not donor policy ("same rows, same split, packs instead"); a
        # pack donor still forces packs.
        from_packs = from_packs or pol["from_packs"]
        pack_size = pack_size or pol["pack_size"]
        print(f"[like] adopting {like}: classes={class_mode} cap={per_cell_cap} "
              f"phash={phash_enabled} max_empty_ratio={max_empty_ratio} seed={seed}")
    class_mode = class_mode or "pieces13"
    classes = class_list_for(class_mode)
    d = config.DEDUP
    per_cell_cap = d.per_cell_cap if per_cell_cap is None else per_cell_cap
    phash_enabled = d.phash_enabled if phash_enabled is None else phash_enabled
    phash_hamming = d.phash_hamming if phash_hamming is None else phash_hamming
    rotations = d.rotations if rotations is None else tuple(rotations)

    if from_packs:
        from .training import packs
        # Sonst zitierte der Bau Pack-Pixel, obwohl ein Pool benannt ist: ein still wirkungsloses
        # Flag.
        if source_manifest:
            raise ValueError("--from-packs and --source-manifest name two different sources; "
                             "the packs win and the pool would be silently ignored. Pick one.")
        pack_size = pack_size or (packs.DEFAULT_PACK_SIDE, packs.DEFAULT_PACK_SIDE)
        srcs, stale_packs = _pack_manifests(session_ids, pack_size, paths, allow_stale_packs)
    elif not source_manifest:
        srcs = [paths.crop_pool / "manifest.jsonl"]
    elif isinstance(source_manifest, (str, Path)):
        srcs = [Path(source_manifest)]
    else:
        srcs = [Path(p) for p in source_manifest]
    missing = [str(p) for p in srcs if not p.exists()]
    if missing:
        raise ValueError(f"source manifest(s) not found: {', '.join(missing)}")
    # A pool a slice is still filling gives a half-written manifest; the writer announces itself,
    # ask it. Packs are immutable.
    for src in ([] if from_packs else srcs):
        busy = locks.held_by(locks.pool_lock_path(src.parent))
        if busy:
            raise ValueError(f"crop pool {src.parent} is being written by {locks.describe(busy)} "
                             f"— wait for it to finish, then build.")

    wanted = set(session_ids)
    rows = [r for src in srcs for r in dataset_mod.load_manifest(src) if r["session_id"] in wanted]
    # Zwei Pools duerfen dieselbe Aufnahme fuehren; ohne den Schnitt traegt der Datensatz dasselbe
    # Crop mehrfach und verschiebt die Gewichtung still.
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
    # The pool side dropped a missing name silently while `dataset.yaml` still listed it.
    have_rows = {r["session_id"] for r in rows}
    barren = [s for s in dict.fromkeys(session_ids) if s not in have_rows]
    if barren:
        raise ValueError(
            f"{len(barren)} session(s) named in the build have no crop in "
            f"{', '.join(str(p.name) for p in srcs)}: {', '.join(barren)}. Drop them from "
            f"--sessions, or slice them into the pool first.")
    n_raw = len(rows)
    if per_position:
        rows = keep_per_position(rows, per_position)
        print(f"[position] {per_position} boards per position: {n_raw} -> {len(rows)} crops")
    if not rows:
        raise ValueError(
            f"no crops for the selected sessions in {', '.join(str(p.name) for p in srcs)} "
            f"(wrong --source-manifest? the default pool is crops/default, but `ingest --tag X "
            f"--no-build` writes crops/X/manifest.jsonl).")
    # Split on the RAW, COMPLETE data; dedup only on train, so val/test keep full 64-crop boards for
    # board_accuracy.
    sizes = Counter(r["session_id"] for r in rows)
    if like:
        splits = _split_from(like, set(sizes), paths, add_test, add_train)
    else:
        splits = dataset_mod.assign_sessions_to_splits(dict(sizes), val_frac, test_frac, seed,
                                                       force_train=force_train,
                                                       groups=dataset_mod.groups_of(rows))
    split_of = {s: name for name, sids in splits.items() for s in sids}
    train_raw = [r for r in rows if split_of.get(r["session_id"]) == "train"]
    holdout = [r for r in rows if split_of.get(r["session_id"]) in ("val", "test")]

    # phash FIRST, then the cap: the other order cut a cell to 4 crops before anything checked
    # whether they differ. Then the cap only limits genuine variety (cap 16: 1.78x rows, no
    # near-duplicates).
    train_rows = dedup_phash(train_raw, phash_hamming) if phash_enabled else list(train_raw)
    train_rows = dedup_metadata(train_rows, per_cell_cap, seed)
    n_dedup = len(train_rows) + len(holdout)

    # BEFORE touching the existing dataset: a refusal must not leave neither new nor old.
    _preflight_disk_check(train_rows, holdout, write_pack and not from_packs, paths=paths, seed=seed,
                          pack_size=pack_size)

    ds = paths.datasets / name
    if ds.exists():
        shutil.rmtree(ds)
    ds.mkdir(parents=True, exist_ok=True)
    rows = train_rows + holdout
    # Label collapse LAST: a narrowed build keeps exactly the rows a `pieces` build at this seed
    # keeps.
    rows = collapse_labels(rows, class_mode)
    # AFTER the collapse, or `counts.final` in dataset.yaml disagrees with the manifest.
    n_final = len(rows)

    priority_paths = dataset_mod.load_priority_paths(paths)
    if priority_paths:
        print(f"[i] hard-empty keep list: {len(priority_paths)} crops protected from the empty cap")
    split = dataset_mod.write_dataset_files(
        ds, rows, splits, val_frac=val_frac, test_frac=test_frac, max_empty_ratio=max_empty_ratio,
        seed=seed, max_class_ratio=max_class_ratio, classes=classes,
        allow_degenerate=allow_degenerate, force_train=force_train, priority_paths=priority_paths)

    cfg = {
        "name": name,
        "created_at": datetime.now(UTC).isoformat(),
        "class_mode": class_mode,
        "session_ids": list(session_ids),
        "variant_tag": variant_tag,
        "source_manifest": [p.as_posix() for p in srcs],
        # `per_position` belongs here: unrecorded, a `--like` twin carried 1.54x the rows.
        "dedup": {"per_cell_cap": per_cell_cap, "per_position": per_position,
                  "phash_enabled": bool(phash_enabled), "phash_hamming": phash_hamming},
        "rotations": list(rotations),
        # Persisted so a rebuild keeps them.
        "force_train": sorted(force_train) if force_train else [],
        "split": {"val_frac": val_frac, "test_frac": test_frac, "max_empty_ratio": max_empty_ratio,
                  "max_class_ratio": max_class_ratio, "seed": seed},
        "counts": {"raw": n_raw, "after_dedup": n_dedup, "final": n_final},
    }
    if from_packs:
        from .training import packs
        cfg[packs.PACKS_KEY] = list(dict.fromkeys(packs.pack_name_of(r["path"]) for r in rows))
        if stale_packs:
            cfg["stale_packs"] = stale_packs
    import yaml
    (ds / "dataset.yaml").write_text(yaml.safe_dump(cfg, sort_keys=False, allow_unicode=True),
                                     encoding="utf-8")
    # Best-effort memmap: a pack failure falls back to the per-PNG loader. Disk-backed, not in RAM.
    packed_info = None
    if write_pack and not from_packs and n_final >= _PACK_MIN_CROPS:
        try:
            from .training.pack_dataset import pack_dataset
            packed_info = pack_dataset(name, paths, out_size=pack_size)
        except Exception as e:  # noqa: BLE001 — packing is an optimization, never fail the build
            print(f"  ! packing skipped ({e}); training will use the per-PNG loader.")
    return {"name": name, "counts": cfg["counts"], "split_counts": split["counts"],
            "warnings": split.get("warnings", []), "packed": packed_info,
            "hard_empty_protected": len(priority_paths or ()),
            "force_train": sorted(force_train) if force_train else []}


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
        split_counts = dataset_mod.load_split(sp).get("counts", {}) if sp.exists() else {}
        out.append({
            "name": cfg.get("name", d.name),
            "n_sessions": len(cfg.get("session_ids", [])),
            "rotations": cfg.get("rotations", []),
            "counts": cfg.get("counts", {}),
            "split_counts": split_counts,
            "created_at": cfg.get("created_at"),
        })
    return out


def _frozen_sessions(paths: config.Paths = config.DATA) -> list[str]:
    """Aufnahmen, die kein Fold trainieren darf (`data/TEST-USED.json`), aus BEIDEN Listen: ein Fold
    legt jede Aufnahme in k-1 Trainingssaetze.
    """
    f = paths.root / "TEST-USED.json"
    if not f.is_file():
        return []
    doc = json.loads(f.read_text(encoding="utf-8"))
    return sorted({*(doc.get("frozen") or []), *(doc.get("benchmark") or [])})


def make_folds(name: str, k: int = 4, *, seed: int | None = None, val_frac: float | None = None,
               prefix: str = "split-f", dry_run: bool = False, force: bool = False,
               allow_asymmetric: bool = False, include_frozen: bool = False,
               paths: config.Paths = config.DATA) -> dict:
    """Write k session-grouped `<prefix><i>.json` beside the dataset's own split (out-of-fold
    audit).

    Fold models train on sessions the main split holds out: audit instruments, not release
    candidates."""
    dd = dataset_dir(name, paths)
    cfg = _read_yaml(dd / "dataset.yaml")
    if not cfg:
        raise ValueError(f"dataset '{name}' has no dataset.yaml at {dd / 'dataset.yaml'}")
    rows = dataset_mod.load_manifest(dd / "manifest.jsonl")
    if k < 2:
        raise ValueError(f"-k must be at least 2, got {k}")

    # Eine eingefrorene Aufnahme darf in KEINEN Fold: sie laege in allen anderen im Training.
    frozen = set(_frozen_sessions(paths)) & {r["session_id"] for r in rows}
    if frozen and not include_frozen:
        rows = [r for r in rows if r["session_id"] not in frozen]
        print(f"[i] {len(frozen)} gesperrte Aufnahme(n) aus dem Fold-Schnitt genommen: "
              f"{', '.join(sorted(frozen))}")
    elif frozen:
        print(f"[WARN] --include-frozen: {', '.join(sorted(frozen))} landet im Training anderer "
              f"Folds und ist danach als Test wertlos.")

    # `build_dataset` dedups TRAIN only; a fold moving such a session into test measures incomplete
    # boards.
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
        # val comes from the NEXT fold: from this one it would leak into its own test.
        test = sorted(s for g in fold for s in members[g])
        pool = [g for g in folds[(i + 1) % k] if g not in fold]
        val_target, val_groups, got = val_frac * len(rows), [], 0
        for g in sorted(pool, key=lambda g: (-gsizes[g], g)):
            # Only while it moves CLOSER (like `assign_sessions_to_splits` rule 2): filling to the
            # target overshot 15 % to 19 %, straight out of train.
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
    # Erst pruefen, dann schreiben: sonst blieben k Folds liegen, und der zweite Versuch scheiterte
    # an "exists".
    if errors:
        raise ValueError("\n".join(errors))
    if not dry_run:
        for out, split in pending:
            write_json(out, split)


    seen = [s for f in folds for g in f for s in members[g]]
    assert len(seen) == len(set(seen)), "folds overlap — out-of-fold would be a lie"
    if not dry_run:
        print("[OK] " + " ".join(written))
        for i in range(k):
            print(f"  chesslab train --dataset {name} --split {prefix}{i}.json")
        print("  (all folds read the same pack — no re-packing)")
    return {"dataset": name, "k": k, "folds": written, "crops_per_fold": loads,
            "pinned_groups": sorted(force_groups)}
