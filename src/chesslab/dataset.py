"""Level 4 — dataset management: statistics, class balance, session-based split, augmentation
policy.
"""

from __future__ import annotations

import json
import math
import random
from collections import Counter
from pathlib import Path

from . import config
from .ioutil import read_jsonl, write_json


def load_manifest(path: Path) -> list[dict]:
    from .ioutil import mtime_size
    from .work_audit import measure

    p = Path(path)
    if not p.exists():
        # A missing manifest is a hard error, not an empty dataset that silently "trains" on
        # nothing.
        raise FileNotFoundError(f"Manifest not found: {p}. Run `chesslab slice` first.")
    version = mtime_size(p)
    with measure("manifest loads", (p.resolve(), *version), processed_bytes=version[1]):
        return read_jsonl(p)


def load_split(path: Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def compute_stats(rows: list[dict], min_samples: int = config.MIN_CLASS_SAMPLES,
                  classes: list[str] | None = None) -> dict:
    CLASSES = classes or config.CLASSES
    counts = dict.fromkeys(CLASSES, 0)
    light = dict.fromkeys(CLASSES, 0)
    dark = dict.fromkeys(CLASSES, 0)
    per_session: Counter = Counter()

    for r in rows:
        lab = r["label"]
        # `.get` on all three: rows outside the default `config.CLASSES` (e.g. `occupied`) must not
        # KeyError.
        counts[lab] = counts.get(lab, 0) + 1
        if r.get("square_color") == "light":
            light[lab] = light.get(lab, 0) + 1
        else:
            dark[lab] = dark.get(lab, 0) + 1
        per_session[r["session_id"]] += 1

    warnings: list[str] = []
    optional = config.OPTIONAL_CLASSES
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
    lines.extend(f"{c:<9}{stats['counts'][c]:>8}"
                 f"{stats['light'].get(c, 0):>8}{stats['dark'].get(c, 0):>8}"
                 for c in stats["counts"])
    if stats["warnings"]:
        lines.append("Warnings:")
        lines.extend(f"  ! {w}" for w in stats["warnings"])
    else:
        lines.append("No warnings.")
    return "\n".join(lines)


def load_priority_paths(paths=None) -> set[str] | None:
    """Mined hard-negative empty crops (`scripts/mine_hard_empty.py`) that must survive the cap.

    Read at build AND train time: `run_train` re-runs `subsample_classes`, so a build-only
    keep-list would be re-drawn away. None when nothing was mined.
    """
    p = (paths or config.DATA).reports / "hard_empty.jsonl"
    if not p.exists():
        return None
    return {r["path"] for r in read_jsonl(p)}


def subsample_classes(rows: list[dict], max_empty_ratio: float | None = None,
                      max_class_ratio: float | None = None, seed: int = config.SEED,
                      priority_paths: set[str] | None = None) -> list[dict]:
    """Seed-downsample: pieces to R * smallest piece class, `empty` to R * largest (capped) piece
    class.

    `priority_paths` (mined hard empties) survive the `empty` cap first. Undersampling is for
    disk/I/O."""
    rng = random.Random(seed)
    by_label: dict[str, list] = {}
    for r in rows:
        by_label.setdefault(r["label"], []).append(r)

    # `occluded` ist ein Sehzustand, keine Identitaet: als Minimum zoege es jede Figurenklasse
    # herunter.
    piece_counts = {c: len(v) for c, v in by_label.items() if c not in ("empty", "occluded")}
    piece_cap = None
    if max_class_ratio is not None and piece_counts:
        piece_cap = int(round(max_class_ratio * min(piece_counts.values())))

    kept: list[dict] = []
    eff_piece: dict[str, int] = {}
    # Sortiert: EIN `rng` zieht je Klasse der Reihe nach, unsortiert haengt die Auswahl am Manifest
    # statt am Seed — derselbe Seed behielt 54 von 62 anderen Crops.
    for c in sorted(by_label):
        v = by_label[c]
        if c == "empty":
            continue
        if piece_cap is not None and len(v) > piece_cap:
            v = rng.sample(sorted(v, key=lambda r: str(r.get("path"))), piece_cap)
        eff_piece[c] = len(v)
        kept.extend(v)

    empties = sorted(by_label.get("empty", []), key=lambda r: str(r.get("path")))
    if max_empty_ratio is not None and eff_piece:
        # `occluded` auch hier heraus: die Kappe fuer leere Felder gehoert an die groesste
        # FIGURENklasse.
        real = [n for c, n in eff_piece.items() if c != "occluded"] or list(eff_piece.values())
        empty_cap = int(round(max_empty_ratio * max(real)))
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


def compute_class_weights(counts: dict, classes: list[str] | None = None,
                          cap: float | None = None) -> dict:
    """Inverse frequency. Largest class -> smallest weight. Absent classes -> 0.0.

    `cap` glaettet mit einem Exponenten (w ~ 1/n^a) statt die Raender abzuschneiden; `cap=1`
    heisst a = 0, keine Gewichtung. Compounds with `max_empty_ratio` — both act on the same
    imbalance."""
    CLASSES = classes or config.CLASSES
    present = {c: n for c, n in counts.items() if n > 0}
    weights = dict.fromkeys(CLASSES, 0.0)
    if not present:
        return weights
    total = sum(present.values())
    alpha = 1.0
    if cap is not None and len(present) > 1:
        if cap < 1.0:
            raise ValueError(f"weight cap must be >= 1 (1 = uniform, no weighting), got {cap}")
        spread = max(present.values()) / min(present.values())
        if spread > cap:
            alpha = math.log(cap) / math.log(spread)
    raw = {c: n ** -alpha for c, n in present.items()}
    # sum(w*n) == total, damit die effektive Lernrate nicht mit der Gewichtung wandert.
    scale = total / sum(raw[c] * n for c, n in present.items())
    for c in present:
        weights[c] = round(raw[c] * scale, 4)
    return weights


def assign_sessions_to_splits(sizes: dict, val_frac: float, test_frac: float, seed: int,
                              force_train=None, groups: dict | None = None) -> dict:
    """Greedily assign WHOLE sessions (or `groups`) to train/val/test to hit the crop ratios.

    A session joins val/test only if it moves that split CLOSER to its target (else 84 % went to
    holdout); targets come from the pool left after `force_train`. Raw counts, not deduped sizes.
    """
    force_train = set(force_train or ())
    if groups:
        return _assign_by_group(sizes, val_frac, test_frac, seed, force_train, groups)
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

    # Never an empty holdout — EXCEPT where the caller asked for none (frac 0).
    for name, frac in (("val", val_frac), ("test", test_frac)):
        if frac <= 0 or splits[name] or len(splits["train"]) <= 1:
            continue
        movable = [s for s in splits["train"] if s not in force_train]
        if not movable:
            continue
        pick = min(movable, key=lambda s: (abs(target[name] - sizes[s]), s))
        splits["train"].remove(pick)
        splits[name].append(pick)
    return splits


def fold_groups(gsizes: dict, k: int, seed: int, force_train=None) -> list[list[str]]:
    """Partition GROUPS into k folds of roughly equal crop count (largest-processing-time first).

    k calls of `assign_sessions_to_splits` would overlap their test sets. `force_train` groups
    get no fold, and the caller has to say so.
    """
    force_train = set(force_train or ())
    rng = random.Random(seed)
    items = [(g, sz) for g, sz in gsizes.items() if g not in force_train]
    rng.shuffle(items)                       # deterministic tiebreak
    items.sort(key=lambda kv: kv[1], reverse=True)
    folds: list[list[str]] = [[] for _ in range(k)]
    load = [0] * k
    for g, sz in items:
        i = min(range(k), key=lambda j: (load[j], j))
        folds[i].append(g)
        load[i] += sz
    return [sorted(f) for f in folds]


def groups_of(rows: list[dict]) -> dict:
    """session -> `split_group` the producer declared, falling back to the session itself."""
    return {r["session_id"]: r.get("split_group", r["session_id"]) for r in rows}


def _assign_by_group(sizes: dict, val_frac: float, test_frac: float, seed: int,
                     force_train: set, groups: dict) -> dict:
    """Run the session greedy over GROUPS, then expand each group back to its sessions.

    Pseudo-sessions of one clip must share a split, or val measures train. A group inherits
    `force_train` from any member.
    """
    members: dict = {}
    for sid in sizes:
        members.setdefault(groups.get(sid, sid), []).append(sid)
    gsizes = {g: sum(sizes[s] for s in ss) for g, ss in members.items()}
    gforce = {g for g, ss in members.items() if any(s in force_train for s in ss)}
    gsplits = assign_sessions_to_splits(gsizes, val_frac, test_frac, seed, force_train=gforce)
    return {name: [s for g in gs for s in sorted(members[g])] for name, gs in gsplits.items()}


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
    # `precomputed_splits` (from the RAW, complete data) wins, so train gets deduped, val/test stay
    # whole.
    if precomputed_splits is not None:
        splits = {k: list(precomputed_splits.get(k, [])) for k in ("train", "val", "test")}
    else:
        sizes = Counter(r["session_id"] for r in rows)
        splits = assign_sessions_to_splits(dict(sizes), val_frac, test_frac, seed,
                                           force_train=force_train, groups=groups_of(rows))
    split_of = {s: name for name, sids in splits.items() for s in sids}

    train_full = [r for r in rows if split_of.get(r["session_id"]) == "train"]
    train_kept = subsample_classes(train_full, max_empty_ratio, max_class_ratio, seed,
                                   priority_paths=priority_paths)
    val_rows = [r for r in rows if split_of.get(r["session_id"]) == "val"]
    test_rows = [r for r in rows if split_of.get(r["session_id"]) == "test"]
    counts_split = {"train": len(train_kept), "val": len(val_rows), "test": len(test_rows)}

    train_counts = dict.fromkeys(CLASSES, 0)
    for r in train_kept:
        train_counts[r["label"]] += 1

    class_sessions: dict[str, set] = {c: set() for c in CLASSES}
    labels_in = {name: set() for name in splits}
    for r in rows:
        class_sessions[r["label"]].add(r["session_id"])
        labels_in[split_of[r["session_id"]]].add(r["label"])

    warnings: list[str] = []
    optional = config.OPTIONAL_CLASSES
    for c in CLASSES:
        if c in optional or len(class_sessions[c]) == 0:
            continue
        if len(class_sessions[c]) == 1:
            warnings.append(f"Class {c} only in one session -> clean evaluation impossible.")
        warnings.extend(f"Class {c} missing in {name} split."
                        for name in ("val", "test") if c not in labels_in[name])
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
    """(errors, warnings). Errors = degenerate, clean evaluation impossible. Classes from
    `split["classes"]`.
    """
    CLASSES = classes or split.get("classes") or config.CLASSES
    errors: list[str] = []
    warnings: list[str] = []

    # Eine Aufnahme in zwei Splits: die mengenbasierten Loader legen ihre Zeilen in beide — Leckage,
    # laut verweigert.
    split_names = list(split.get("splits", {}))
    for i, a in enumerate(split_names):
        for b in split_names[i + 1:]:
            both = sorted(set(split["splits"][a]) & set(split["splits"][b]))
            errors.extend(f"Session {sid} is in {a} and {b} — a session belongs to exactly "
                          "one split, otherwise its rows are evaluated on and trained on."
                          for sid in both)

    class_sessions: dict[str, set] = {c: set() for c in CLASSES}
    for r in rows:
        class_sessions.setdefault(r["label"], set()).add(r["session_id"])

    global_present = {c for c in CLASSES if class_sessions[c]}
    check_classes = [c for c in CLASSES if c != "occluded" or "occluded" in global_present]

    # In den Worten von `make_split`: sonst stand jeder Fund zweimal da, als Fehler und als Warnung.
    said: set[str] = set()
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
            said.add(f"Class {c} only in one session -> clean evaluation impossible.")

    for name in ("test", "val"):
        if split["counts"][name] == 0:
            errors.append(f"{name.capitalize()} split is empty — at least 3 sessions needed "
                          "(session-based split).")
            said.add(f"{name} split is empty (too few sessions).")

    warnings.extend(w for w in split.get("warnings", []) if w not in said)

    return errors, warnings


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


def write_augment_yaml(path: Path) -> Path:
    import yaml

    a = config.AUGMENT
    # Mirror the FULL policy: a stale or partial dump misleads the next reader into tuning dead
    # numbers.
    policy = {
        "allowed": {
            "brightness": a.brightness, "contrast": a.contrast, "gamma": list(a.gamma),
            "blur_sigma_max": a.blur_sigma_max, "jitter_translate": a.jitter_translate,
            "jitter_scale": a.jitter_scale, "color_jitter": a.color_jitter,
            "noise_std": a.noise_std,
            "erase_p": a.erase_p, "erase_scale": list(a.erase_scale),
            "neighbour_pool_size": a.neighbour_pool_size,
        },
        "forbidden": {"flip": not a.allow_flip, "rotate90_180": not a.allow_rotate90},
        "val_test": "only deterministic resize + normalize",
        "note": "generated from config.AUGMENT — edit the dataclass, not this file",
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        yaml.safe_dump(policy, fh, sort_keys=False, allow_unicode=True)
    return path


def run_stats(manifest: str | None = None, json_out: bool = False) -> int:
    path = Path(manifest) if manifest else config.DATA.crop_pool / "manifest.jsonl"
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
    manifest_path = config.DATA.crop_pool / "manifest.jsonl"
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
    out = config.DATA.reports / "split.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    write_json(out, split)
    write_augment_yaml(config.DATA.reports / "augment.yaml")
    print(f"[OK] split.json: train={split['counts']['train']} (balanced) val={split['counts']['val']} test={split['counts']['test']}")
    print(f"     Sessions: train={len(split['splits']['train'])} val={len(split['splits']['val'])} test={len(split['splits']['test'])}")
    print(f"     max_empty_ratio={max_empty_ratio} max_class_ratio={max_class_ratio}")
    print("     TRAIN distribution (after balancing):")
    tcc = split["train_class_counts"]
    for c in config.CLASSES:
        if tcc[c]:
            print(f"       {c:<7}{tcc[c]:>6}")
    for w in warnings:
        print(f"     ! {w}")
    return 0


def run_verify() -> int:
    manifest_path = config.DATA.crop_pool / "manifest.jsonl"
    split_path = config.DATA.reports / "split.json"
    try:
        rows = load_manifest(manifest_path)
    except FileNotFoundError as e:
        print(f"[FAIL] {e}")
        return 1
    split = load_split(split_path) if split_path.exists() else None
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
