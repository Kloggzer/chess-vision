"""Level 4 — Dataset management.

From labeled crops create a trainable dataset: statistics, class balance,
**session-based** split (against data leakage) and an augmentation policy. The pure
functions are tested headless; the CLI wrappers resolve paths from `config`.
"""

from __future__ import annotations

import json
import random
from collections import Counter
from pathlib import Path

from . import config

CLASSES = config.CLASSES


def optional_classes(classes: list[str]) -> set[str]:
    """Classes that may legitimately be absent from a dataset.

    For the 14-class piece list that is `config.OPTIONAL_CLASSES` (`empty`/`occluded`
    never come from a FEN). For the 2-class occupancy list it is **empty**: a set missing
    either `empty` or `occupied` is degenerate, not merely unbalanced.
    """
    if list(classes) == config.OCCUPANCY_CLASSES:
        return set()
    return config.OPTIONAL_CLASSES


# --- Load manifest -------------------------------------------------------------------

def load_manifest(path: Path) -> list[dict]:
    from .ioutil import read_jsonl

    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Manifest not found: {path}. Run `chesslab slice` first.")
    return read_jsonl(path)


# --- stats ----------------------------------------------------------------------------

def compute_stats(rows: list[dict], min_samples: int = config.MIN_CLASS_SAMPLES,
                  classes: list[str] | None = None) -> dict:
    CLASSES = classes or config.CLASSES
    counts = dict.fromkeys(CLASSES, 0)
    light = dict.fromkeys(CLASSES, 0)
    dark = dict.fromkeys(CLASSES, 0)
    per_session: Counter = Counter()

    for r in rows:
        lab = r["label"]
        # `.get` on all three, not just `counts`: an occupancy dataset's rows say `occupied`,
        # which is not in the 14-class `config.CLASSES` a caller gets by default. `counts` was
        # already tolerant and the other two were not, so `/datasets/<occ-set>/stats` died with
        # `KeyError: 'occupied'` while the same call for a piece dataset worked.
        counts[lab] = counts.get(lab, 0) + 1
        if r.get("square_color") == "light":
            light[lab] = light.get(lab, 0) + 1
        else:
            dark[lab] = dark.get(lab, 0) + 1
        per_session[r["session_id"]] += 1

    warnings: list[str] = []
    optional = optional_classes(CLASSES)
    for c in CLASSES:
        if c in optional:                   # empty/occluded may be missing (not from FEN)
            continue
        n = counts[c]
        if n == 0:
            warnings.append(f"Class {c}: 0 samples.")
        elif n < min_samples:
            warnings.append(f"Class {c}: only {n} (< {min_samples}).")
        if n > 0 and (light[c] == 0 or dark[c] == 0):
            only = "dark" if light[c] == 0 else "light"
            warnings.append(f"Class {c}: only on {only} squares.")

    return {
        "total": len(rows),
        "num_sessions": len(per_session),
        "per_session": dict(per_session),
        "counts": counts,
        "light": light,
        "dark": dark,
        "warnings": warnings,
    }


def render_stats(stats: dict) -> str:
    lines = [
        f"Crops total: {stats['total']}  |  Sessions: {stats['num_sessions']}",
        f"{'Class':<9}{'count':>8}{'light':>8}{'dark':>8}",
    ]
    for c in stats["counts"]:               # the stats' own class list, not the module default
        lines.append(f"{c:<9}{stats['counts'][c]:>8}{stats['light'][c]:>8}{stats['dark'][c]:>8}")
    if stats["warnings"]:
        lines.append("Warnings:")
        lines.extend(f"  ! {w}" for w in stats["warnings"])
    else:
        lines.append("No warnings.")
    return "\n".join(lines)


# --- Class balance -------------------------------------------------------------------

def subsample_classes(rows: list[dict], max_empty_ratio: float | None = None,
                      max_class_ratio: float | None = None, seed: int = config.SEED,
                      priority_paths: set[str] | None = None) -> list[dict]:
    """Seed-downsample overrepresented classes to balance distribution.

    - `max_class_ratio R`: cap each **piece** class to at most R * smallest piece class
      (e.g. reduces pawns down to the rare pieces).
    - `max_empty_ratio R`: cap `empty` to R * largest (capped) piece class.
    Order: first cap pieces, then `empty` relative to the new largest piece class.

    `priority_paths`: crop paths that must SURVIVE the `empty` cap — the mined hard
    negatives (`scripts/mine_hard_empty.py`: real empty squares the model confidently
    misreads, e.g. dark corner squares / pad_up neighbour bleed). A random cap throws
    away exactly these rare hard cases; here they are kept first and only the REST of
    the cap budget is filled by random sampling. If there are more hard empties than
    the cap allows, all of them are kept (deliberate overshoot — they are the point).
    """
    rng = random.Random(seed)
    by_label: dict[str, list] = {}
    for r in rows:
        by_label.setdefault(r["label"], []).append(r)

    piece_counts = {c: len(v) for c, v in by_label.items() if c != "empty"}
    piece_cap = None
    if max_class_ratio is not None and piece_counts:
        piece_cap = int(round(max_class_ratio * min(piece_counts.values())))

    kept: list[dict] = []
    eff_piece: dict[str, int] = {}
    for c, v in by_label.items():
        if c == "empty":
            continue
        if piece_cap is not None and len(v) > piece_cap:
            v = rng.sample(v, piece_cap)
        eff_piece[c] = len(v)
        kept.extend(v)

    empties = by_label.get("empty", [])
    if max_empty_ratio is not None and eff_piece:
        empty_cap = int(round(max_empty_ratio * max(eff_piece.values())))
        if len(empties) > empty_cap:
            if priority_paths:
                hard = [r for r in empties if r.get("path") in priority_paths]
                rest = [r for r in empties if r.get("path") not in priority_paths]
                fill = max(0, empty_cap - len(hard))
                empties = hard + (rng.sample(rest, fill) if len(rest) > fill else rest)
            else:
                empties = rng.sample(empties, empty_cap)
    kept.extend(empties)
    return kept


def subsample_empty(rows: list[dict], max_empty_ratio: float | None, seed: int) -> list[dict]:
    """Only cap `empty` (compatibility wrapper around subsample_classes)."""
    return subsample_classes(rows, max_empty_ratio=max_empty_ratio, max_class_ratio=None, seed=seed)


def compute_class_weights(counts: dict, classes: list[str] | None = None) -> dict:
    """Inverse frequency. Largest class -> smallest weight. Absent classes -> 0.0."""
    CLASSES = classes or config.CLASSES
    present = {c: n for c, n in counts.items() if n > 0}
    weights = dict.fromkeys(CLASSES, 0.0)
    if not present:
        return weights
    total = sum(present.values())
    k = len(present)
    for c, n in present.items():
        weights[c] = round(total / (k * n), 4)
    return weights


# --- Split (session-based) -----------------------------------------------------------

def assign_sessions_to_splits(sizes: dict, val_frac: float, test_frac: float, seed: int,
                              force_train=None) -> dict:
    """Greedily assign WHOLE sessions to train/val/test to hit the crop ratios.

    Never splits a session — frames within one are near-identical, so splitting one leaks.
    That constraint is what makes this awkward: with a corpus like (4992, 3520, 1600, 1024,
    1024, 832, 384) no subset hits 15 % exactly, and the rule for handling the mismatch is
    what decides whether the split is usable at all.

    `force_train`: session IDs pinned to train (e.g. an all-empty lighting capture, which in
    val/test would distort board metrics).

    Two rules, each fixing a way the old largest-first greedy went wrong:

    1. Targets are computed over the pool ACTUALLY AVAILABLE to fill val/test (total minus
       `force_train`). Sizing them off the full total inflated both targets while only the
       remainder could fill them, so pinning the two big sessions to train made train
       *smaller* — the opposite of what the caller asked for.
    2. A session joins val/test only if it moves that split CLOSER to its target
       (`|need - sz| < need`, i.e. `sz < 2 * need`). Without this a session larger than the
       entire target lands in holdout regardless: that is how a 15/15 split put 84 % of the
       corpus into val+test and left train with 1,611 crops.

    Rule 2 can starve val/test when every session is oversized, so a final pass pulls one
    session back from train — the one closest to that split's target — rather than emitting
    an empty holdout.

    Targeting deliberately uses RAW crop counts, not post-dedup "effective" sizes, even
    though `dataset_build` dedups train only. Measured on the real corpus, weighting by
    unique content is *worse*: it gives train 1,434 unique crops instead of 1,719 and doubles
    holdout to 10,944 raw rows. The reason is that train-only dedup makes a redundancy-heavy
    session nearly free in train (4,992 raw collapses to 245) but full price in holdout, so
    "oversized sessions go to train" is already the right policy — which is what rule 2 does.
    """
    force_train = set(force_train or ())
    rng = random.Random(seed)
    items = [(k, v) for k, v in sizes.items() if k not in force_train]
    rng.shuffle(items)                       # deterministic tiebreak
    items.sort(key=lambda kv: kv[1], reverse=True)

    available = sum(sz for _, sz in items)                  # rule 1
    target = {"val": val_frac * available, "test": test_frac * available}

    splits = {"train": [s for s in sizes if s in force_train], "val": [], "test": []}
    got = {"val": 0.0, "test": 0.0}
    for sid, sz in items:
        need_val = target["val"] - got["val"]
        need_test = target["test"] - got["test"]
        name = "val" if need_val >= need_test else "test"   # feed the hungrier split
        need = max(need_val, need_test)
        if need > 0 and abs(need - sz) < need:              # rule 2
            splits[name].append(sid)
            got[name] += sz
        else:
            splits["train"].append(sid)

    for name in ("val", "test"):                            # never emit an empty holdout
        if splits[name] or len(splits["train"]) <= 1:
            continue
        movable = [s for s in splits["train"] if s not in force_train]
        if not movable:
            continue
        pick = min(movable, key=lambda s: (abs(target[name] - sizes[s]), s))
        splits["train"].remove(pick)
        splits[name].append(pick)
    return splits


def make_split(
    rows: list[dict],
    val_frac: float = config.DEFAULT_VAL_FRAC,
    test_frac: float = config.DEFAULT_TEST_FRAC,
    max_empty_ratio: float | None = config.DEFAULT_MAX_EMPTY_RATIO,
    seed: int = config.SEED,
    max_class_ratio: float | None = None,
    force_train=None,
    precomputed_splits=None,
    priority_paths: set[str] | None = None,
    classes: list[str] | None = None,
) -> dict:
    CLASSES = classes or config.CLASSES
    # Assign sessions. `precomputed_splits` (determined by build_dataset on the RAW, complete data)
    # wins -> this way Train gets duped/augmented, Val/Test stay complete.
    if precomputed_splits is not None:
        splits = {k: list(precomputed_splits.get(k, [])) for k in ("train", "val", "test")}
    else:
        sizes = Counter(r["session_id"] for r in rows)
        splits = assign_sessions_to_splits(dict(sizes), val_frac, test_frac, seed, force_train=force_train)
    split_of = {s: name for name, sids in splits.items() for s in sids}

    # Subsampling ONLY on train; val/test stay complete (real board accuracy).
    train_full = [r for r in rows if split_of.get(r["session_id"]) == "train"]
    train_kept = subsample_classes(train_full, max_empty_ratio, max_class_ratio, seed,
                                   priority_paths=priority_paths)
    val_rows = [r for r in rows if split_of.get(r["session_id"]) == "val"]
    test_rows = [r for r in rows if split_of.get(r["session_id"]) == "test"]
    counts_split = {"train": len(train_kept), "val": len(val_rows), "test": len(test_rows)}

    # Class distribution + weights from the (balanced) TRAIN set.
    train_counts = dict.fromkeys(CLASSES, 0)
    for r in train_kept:
        train_counts[r["label"]] += 1

    class_sessions: dict[str, set] = {c: set() for c in CLASSES}
    labels_in = {name: set() for name in splits}
    for r in rows:
        class_sessions[r["label"]].add(r["session_id"])
        labels_in[split_of[r["session_id"]]].add(r["label"])

    warnings: list[str] = []
    optional = optional_classes(CLASSES)
    for c in CLASSES:
        if c in optional or len(class_sessions[c]) == 0:
            continue
        if len(class_sessions[c]) == 1:
            warnings.append(f"Class {c} only in one session -> clean evaluation impossible.")
        for name in ("val", "test"):
            if c not in labels_in[name]:
                warnings.append(f"Class {c} missing in {name} split.")
    if counts_split["val"] == 0:
        warnings.append("val split is empty (too few sessions).")
    if counts_split["test"] == 0:
        warnings.append("test split is empty (too few sessions).")

    return {
        "seed": seed,
        "val_frac": val_frac,
        "test_frac": test_frac,
        "max_empty_ratio": max_empty_ratio,
        "max_class_ratio": max_class_ratio,
        "classes": list(CLASSES),
        "class_weights": compute_class_weights(train_counts, CLASSES),
        "splits": splits,
        "counts": counts_split,
        "train_class_counts": train_counts,
        "train_subsample": {"max_empty_ratio": max_empty_ratio,
                            "max_class_ratio": max_class_ratio, "seed": seed},
        "warnings": warnings,
    }


def validate_split(split: dict, rows: list[dict],
                   classes: list[str] | None = None) -> tuple[list[str], list[str]]:
    """(errors, warnings). Errors = degenerate, clean evaluation impossible.

    The class list comes from the split itself (`split["classes"]`) when present — the
    dataset declares its own class list (14-class pieces or 2-class occupancy) and this
    check obeys it. For the 2-class list an ABSENT class is an error: a set with no
    `occupied` rows (or no `empty` rows) cannot train an occupancy model at all.
    """
    CLASSES = classes or split.get("classes") or config.CLASSES
    errors: list[str] = []
    warnings: list[str] = []

    # Session set per class
    class_sessions: dict[str, set] = {c: set() for c in CLASSES}
    for r in rows:
        class_sessions.setdefault(r["label"], set()).add(r["session_id"])

    # Globally present classes
    global_present = {c for c in CLASSES if class_sessions[c]}
    # only check occluded if present globally
    check_classes = [c for c in CLASSES if c != "occluded" or "occluded" in global_present]

    if list(CLASSES) == config.OCCUPANCY_CLASSES:
        for c in CLASSES:
            if not class_sessions[c]:
                errors.append(f"Occupancy class {c} has 0 rows — degenerate 2-class dataset.")

    for c in check_classes:
        n_sessions = len(class_sessions[c])
        if n_sessions == 0:
            continue
        if n_sessions == 1:
            sid = next(iter(class_sessions[c]))
            errors.append(
                f"Class {c} exists only in session {sid} — "
                "record a new session with random piece-line assignment, "
                "or set --allow-degenerate."
            )

    # Test/Val empty
    if split["counts"]["test"] == 0:
        errors.append("Test split is empty — at least 3 sessions needed (session-based split).")
    if split["counts"]["val"] == 0:
        errors.append("Val split is empty — at least 3 sessions needed (session-based split).")

    # Adopt warnings from make_split (class missing in Val/Test)
    for w in split.get("warnings", []):
        if w not in errors:                   # no duplicate reporting
            warnings.append(w)

    return errors, warnings


# --- verify ---------------------------------------------------------------------------

def verify(rows: list[dict], *, split: dict | None = None, check_files: bool = True,
           classes: list[str] | None = None) -> list[str]:
    import cv2

    CLASSES = classes or (split or {}).get("classes") or config.CLASSES
    problems: list[str] = []
    for r in rows:
        if r["label"] not in CLASSES:
            problems.append(f"unknown label {r['label']!r} ({r.get('path')}).")
        if check_files:
            if str(r["path"]).startswith("mm://"):
                continue        # fused build: crops live in the packed memmap, not as files
            p = Path(r["path"])
            if not p.exists():
                problems.append(f"file missing: {p}")
                continue
            img = cv2.imread(str(p))
            if img is None:
                problems.append(f"file not loadable: {p}")
                continue
            w, h = r["out_size"]
            if (img.shape[0], img.shape[1]) != (h, w):
                problems.append(f"out_size {img.shape[1]}x{img.shape[0]} != expected {w}x{h} ({p}).")

    if split:
        seen: dict[str, str] = {}
        for name, sids in split["splits"].items():
            for s in sids:
                if s in seen:
                    problems.append(f"Session {s} in '{seen[s]}' AND '{name}'.")
                else:
                    seen[s] = name
    return problems


# --- Augmentation policy as config ---------------------------------------------------

def write_augment_yaml(path: Path) -> Path:
    import yaml

    a = config.AUGMENT
    # Mirror the FULL policy: an incomplete dump silently under-reports what training does,
    # and a stale copy on disk is worse than none (it misleads the next reader into tuning
    # against numbers that are no longer in effect).
    policy = {
        "allowed": {
            "brightness": a.brightness, "contrast": a.contrast, "gamma": list(a.gamma),
            "blur_sigma_max": a.blur_sigma_max, "jitter_translate": a.jitter_translate,
            "jitter_scale": a.jitter_scale, "color_jitter": a.color_jitter,
            "noise_std": a.noise_std,
            "erase_p": a.erase_p, "erase_scale": list(a.erase_scale),
            "bg_p": a.bg_p, "bg_keep_w": a.bg_keep_w, "bg_keep_h": a.bg_keep_h,
            "bg_procedural_frac": a.bg_procedural_frac, "bg_pool_size": a.bg_pool_size,
        },
        "forbidden": {"flip": not a.allow_flip, "rotate90_180": not a.allow_rotate90},
        "val_test": "only deterministic resize + normalize",
        "note": "generated from config.AUGMENT — edit the dataclass, not this file",
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        yaml.safe_dump(policy, fh, sort_keys=False, allow_unicode=True)
    return path


# --- CLI level ------------------------------------------------------------------------

def run_stats(manifest: str | None = None, json_out: bool = False) -> int:
    path = Path(manifest) if manifest else config.DATA.manifests / "squares.jsonl"
    try:
        rows = load_manifest(path)
    except FileNotFoundError as e:
        print(f"[FAIL] {e}")
        return 1
    stats = compute_stats(rows)
    print(render_stats(stats))
    if json_out:
        print(json.dumps(stats, ensure_ascii=False, indent=2))
    return 0


def run_split(val_frac: float, test_frac: float, max_empty_ratio: float, seed: int,
              max_class_ratio: float | None = None, allow_degenerate: bool = False) -> int:
    manifest_path = config.DATA.manifests / "squares.jsonl"
    try:
        rows = load_manifest(manifest_path)
    except FileNotFoundError as e:
        print(f"[FAIL] {e}")
        return 1
    split = make_split(rows, val_frac=val_frac, test_frac=test_frac, max_empty_ratio=max_empty_ratio,
                       seed=seed, max_class_ratio=max_class_ratio)
    errors, warnings = validate_split(split, rows)
    if errors:
        if allow_degenerate:
            split["degenerate_errors"] = errors
            for e in errors:
                print(f"[WARN] {e}")
        else:
            for e in errors:
                print(f"[FAIL] {e}")
            return 1
    out = config.DATA.manifests / "split.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(split, ensure_ascii=False, indent=2), encoding="utf-8")
    write_augment_yaml(config.DATA.manifests / "augment.yaml")
    print(f"[OK] split.json: train={split['counts']['train']} (balanced) val={split['counts']['val']} test={split['counts']['test']}")
    print(f"     Sessions: train={len(split['splits']['train'])} val={len(split['splits']['val'])} test={len(split['splits']['test'])}")
    print(f"     max_empty_ratio={max_empty_ratio} max_class_ratio={max_class_ratio}")
    print("     TRAIN distribution (after balancing):")
    tcc = split["train_class_counts"]
    for c in CLASSES:
        if tcc[c]:
            print(f"       {c:<7}{tcc[c]:>6}")
    for w in warnings:
        print(f"     ! {w}")
    return 0


def run_verify() -> int:
    manifest_path = config.DATA.manifests / "squares.jsonl"
    split_path = config.DATA.manifests / "split.json"
    try:
        rows = load_manifest(manifest_path)
    except FileNotFoundError as e:
        print(f"[FAIL] {e}")
        return 1
    split = json.loads(split_path.read_text(encoding="utf-8")) if split_path.exists() else None
    problems = verify(rows, split=split)
    if not problems:
        print(f"[OK] {len(rows)} Crops verified, no problems.")
        return 0
    print(f"[FAIL] {len(problems)} problem(s):")
    for p in problems[:50]:
        print(f"  - {p}")
    if len(problems) > 50:
        print(f"  … and {len(problems) - 50} more.")
    return 1
