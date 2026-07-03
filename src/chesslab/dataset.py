"""Stufe 4 — Datensatz-Management.

Aus den gelabelten Crops einen trainierbaren Datensatz machen: Statistik, Klassenbalance,
**sessionbasierter** Split (gegen Data Leakage) und eine Augmentation-Policy. Die reinen
Funktionen sind headless getestet; die CLI-Wrapper lösen Pfade aus `config`.
"""

from __future__ import annotations

import json
import random
from collections import Counter
from pathlib import Path

from . import config

CLASSES = config.CLASSES


# --- Manifest laden -------------------------------------------------------------------

def load_manifest(path: Path) -> list[dict]:
    from .ioutil import read_jsonl

    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Manifest nicht gefunden: {path}. Erst `chesslab slice` ausführen.")
    return read_jsonl(path)


# --- stats ----------------------------------------------------------------------------

def compute_stats(rows: list[dict], min_samples: int = config.MIN_CLASS_SAMPLES) -> dict:
    counts = dict.fromkeys(CLASSES, 0)
    light = dict.fromkeys(CLASSES, 0)
    dark = dict.fromkeys(CLASSES, 0)
    per_session: Counter = Counter()

    for r in rows:
        lab = r["label"]
        counts[lab] = counts.get(lab, 0) + 1
        if r.get("square_color") == "light":
            light[lab] += 1
        else:
            dark[lab] += 1
        per_session[r["session_id"]] += 1

    warnings: list[str] = []
    for c in CLASSES:
        if c in config.OPTIONAL_CLASSES:    # empty/occluded dürfen fehlen (nicht aus FEN)
            continue
        n = counts[c]
        if n == 0:
            warnings.append(f"Klasse {c}: 0 Beispiele.")
        elif n < min_samples:
            warnings.append(f"Klasse {c}: nur {n} (< {min_samples}).")
        if n > 0 and (light[c] == 0 or dark[c] == 0):
            only = "dunkel" if light[c] == 0 else "hell"
            warnings.append(f"Klasse {c}: nur auf {only}en Feldern vorhanden.")

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
        f"Crops gesamt: {stats['total']}  |  Sessions: {stats['num_sessions']}",
        f"{'Klasse':<7}{'count':>8}{'hell':>8}{'dunkel':>8}",
    ]
    for c in CLASSES:
        lines.append(f"{c:<7}{stats['counts'][c]:>8}{stats['light'][c]:>8}{stats['dark'][c]:>8}")
    if stats["warnings"]:
        lines.append("Warnungen:")
        lines.extend(f"  ! {w}" for w in stats["warnings"])
    else:
        lines.append("Keine Warnungen.")
    return "\n".join(lines)


# --- Klassenbalance -------------------------------------------------------------------

def subsample_classes(rows: list[dict], max_empty_ratio: float | None = None,
                      max_class_ratio: float | None = None, seed: int = config.SEED) -> list[dict]:
    """Überrepräsentierte Klassen seeded herunterregeln, um die Verteilung auszugleichen.

    - `max_class_ratio R`: jede **Figuren**klasse auf höchstens R * kleinste Figurenklasse
      begrenzen (regelt z.B. die Bauern zu den seltenen Figuren herunter).
    - `max_empty_ratio R`: `empty` auf R * größte (gedeckelte) Figurenklasse begrenzen.
    Reihenfolge: erst Figuren deckeln, dann `empty` relativ zur neuen größten Figurenklasse.
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
            empties = rng.sample(empties, empty_cap)
    kept.extend(empties)
    return kept


def subsample_empty(rows: list[dict], max_empty_ratio: float | None, seed: int) -> list[dict]:
    """Nur `empty` deckeln (Kompatibilitäts-Wrapper um subsample_classes)."""
    return subsample_classes(rows, max_empty_ratio=max_empty_ratio, max_class_ratio=None, seed=seed)


def compute_class_weights(counts: dict) -> dict:
    """Invers zur Häufigkeit. Größte Klasse -> kleinstes Gewicht. Absente Klassen -> 0.0."""
    present = {c: n for c, n in counts.items() if n > 0}
    weights = dict.fromkeys(CLASSES, 0.0)
    if not present:
        return weights
    total = sum(present.values())
    k = len(present)
    for c, n in present.items():
        weights[c] = round(total / (k * n), 4)
    return weights


# --- Split (sessionbasiert) -----------------------------------------------------------

def assign_sessions_to_splits(sizes: dict, val_frac: float, test_frac: float, seed: int,
                              force_train=None) -> dict:
    """Ganze Sessions greedy (größte zuerst) auf train/val/test verteilen, um die
    Crop-Anteile zu treffen. Niemals eine Session aufteilen. `force_train`: Session-IDs, die fix in
    train müssen (z.B. die vollständigste bei wenig Sessions, damit val keine ungesehene Klasse hat)."""
    force_train = set(force_train or ())
    total = sum(sizes.values())
    target_val = val_frac * total
    target_test = test_frac * total
    rng = random.Random(seed)
    items = list(sizes.items())
    rng.shuffle(items)                       # deterministischer Tiebreak
    items.sort(key=lambda kv: kv[1], reverse=True)

    splits = {"train": [s for s in sizes if s in force_train], "val": [], "test": []}
    val_sum = test_sum = 0
    for sid, sz in items:
        if sid in force_train:
            continue
        need_val = target_val - val_sum
        need_test = target_test - test_sum
        if need_val <= 0 and need_test <= 0:
            splits["train"].append(sid)
        elif need_val >= need_test:
            splits["val"].append(sid)
            val_sum += sz
        else:
            splits["test"].append(sid)
            test_sum += sz
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
) -> dict:
    # Sessions zuteilen. `precomputed_splits` (von build_dataset auf den ROHEN, vollständigen Daten
    # bestimmt) gewinnt -> so wird Train gedupt/augmentiert, Val/Test bleiben vollständig.
    if precomputed_splits is not None:
        splits = {k: list(precomputed_splits.get(k, [])) for k in ("train", "val", "test")}
    else:
        sizes = Counter(r["session_id"] for r in rows)
        splits = assign_sessions_to_splits(dict(sizes), val_frac, test_frac, seed, force_train=force_train)
    split_of = {s: name for name, sids in splits.items() for s in sids}

    # Subsampling NUR auf train; val/test bleiben vollständig (echte Board-Accuracy).
    train_full = [r for r in rows if split_of.get(r["session_id"]) == "train"]
    train_kept = subsample_classes(train_full, max_empty_ratio, max_class_ratio, seed)
    val_rows = [r for r in rows if split_of.get(r["session_id"]) == "val"]
    test_rows = [r for r in rows if split_of.get(r["session_id"]) == "test"]
    counts_split = {"train": len(train_kept), "val": len(val_rows), "test": len(test_rows)}

    # Klassenverteilung + Gewichte aus dem (balancierten) TRAIN-Set.
    train_counts = dict.fromkeys(CLASSES, 0)
    for r in train_kept:
        train_counts[r["label"]] += 1

    class_sessions: dict[str, set] = {c: set() for c in CLASSES}
    labels_in = {name: set() for name in splits}
    for r in rows:
        class_sessions[r["label"]].add(r["session_id"])
        labels_in[split_of[r["session_id"]]].add(r["label"])

    warnings: list[str] = []
    for c in CLASSES:
        if c in config.OPTIONAL_CLASSES or len(class_sessions[c]) == 0:
            continue
        if len(class_sessions[c]) == 1:
            warnings.append(f"Klasse {c} nur in einer Session -> saubere Evaluierung unmöglich.")
        for name in ("val", "test"):
            if c not in labels_in[name]:
                warnings.append(f"Klasse {c} fehlt im {name}-Split.")
    if counts_split["val"] == 0:
        warnings.append("val-Split ist leer (zu wenige Sessions).")
    if counts_split["test"] == 0:
        warnings.append("test-Split ist leer (zu wenige Sessions).")

    return {
        "seed": seed,
        "val_frac": val_frac,
        "test_frac": test_frac,
        "max_empty_ratio": max_empty_ratio,
        "max_class_ratio": max_class_ratio,
        "classes": list(CLASSES),
        "class_weights": compute_class_weights(train_counts),
        "splits": splits,
        "counts": counts_split,
        "train_class_counts": train_counts,
        "train_subsample": {"max_empty_ratio": max_empty_ratio,
                            "max_class_ratio": max_class_ratio, "seed": seed},
        "warnings": warnings,
    }


def validate_split(split: dict, rows: list[dict]) -> tuple[list[str], list[str]]:
    """(errors, warnings). Errors = degeneriert, saubere Evaluierung unmöglich."""
    errors: list[str] = []
    warnings: list[str] = []

    split_of = {s: name for name, sids in split["splits"].items() for s in sids}

    # Session-Menge pro Klasse
    class_sessions: dict[str, set] = {c: set() for c in CLASSES}
    for r in rows:
        class_sessions[r["label"]].add(r["session_id"])

    # Global vorhandene Klassen
    global_present = {c for c in CLASSES if class_sessions[c]}
    # occluded nur prüfen, wenn global vorhanden
    check_classes = [c for c in CLASSES if c != "occluded" or "occluded" in global_present]

    for c in check_classes:
        n_sessions = len(class_sessions[c])
        if n_sessions == 0:
            continue
        if n_sessions == 1:
            sid = next(iter(class_sessions[c]))
            errors.append(
                f"Klasse {c} existiert nur in Session {sid} — "
                "neue Session mit zufälliger Figur-Linien-Zuordnung aufnehmen, "
                "oder --allow-degenerate setzen."
            )

    # Test/Val leer
    if split["counts"]["test"] == 0:
        errors.append("Test-Split ist leer — mindestens 3 Sessions nötig (sessionbasierter Split).")
    if split["counts"]["val"] == 0:
        errors.append("Val-Split ist leer — mindestens 3 Sessions nötig (sessionbasierter Split).")

    # Warnings aus make_split übernehmen (Klasse fehlt in Val/Test)
    for w in split.get("warnings", []):
        if w not in errors:                   # kein doppeltes Reporting
            warnings.append(w)

    return errors, warnings


# --- verify ---------------------------------------------------------------------------

def verify(rows: list[dict], *, split: dict | None = None, check_files: bool = True) -> list[str]:
    import cv2

    problems: list[str] = []
    for r in rows:
        if r["label"] not in CLASSES:
            problems.append(f"unbekanntes Label {r['label']!r} ({r.get('path')}).")
        if check_files:
            p = Path(r["path"])
            if not p.exists():
                problems.append(f"Datei fehlt: {p}")
                continue
            img = cv2.imread(str(p))
            if img is None:
                problems.append(f"Datei nicht ladbar: {p}")
                continue
            w, h = r["out_size"]
            if (img.shape[0], img.shape[1]) != (h, w):
                problems.append(f"out_size {img.shape[1]}x{img.shape[0]} != erwartet {w}x{h} ({p}).")

    if split:
        seen: dict[str, str] = {}
        for name, sids in split["splits"].items():
            for s in sids:
                if s in seen:
                    problems.append(f"Session {s} in '{seen[s]}' UND '{name}'.")
                else:
                    seen[s] = name
    return problems


# --- Augmentation-Policy als Konfig ---------------------------------------------------

def write_augment_yaml(path: Path) -> Path:
    import yaml

    a = config.AUGMENT
    policy = {
        "allowed": {
            "brightness": a.brightness, "contrast": a.contrast, "gamma": list(a.gamma),
            "blur_sigma_max": a.blur_sigma_max, "jitter_translate": a.jitter_translate,
            "jitter_scale": a.jitter_scale, "color_jitter": a.color_jitter,
        },
        "forbidden": {"flip": not a.allow_flip, "rotate90_180": not a.allow_rotate90},
        "val_test": "nur deterministisches Resize + Normalize",
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        yaml.safe_dump(policy, fh, sort_keys=False, allow_unicode=True)
    return path


# --- CLI-Ebene ------------------------------------------------------------------------

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
    print(f"[OK] split.json: train={split['counts']['train']} (balanciert) val={split['counts']['val']} test={split['counts']['test']}")
    print(f"     Sessions: train={len(split['splits']['train'])} val={len(split['splits']['val'])} test={len(split['splits']['test'])}")
    print(f"     max_empty_ratio={max_empty_ratio} max_class_ratio={max_class_ratio}")
    print("     TRAIN-Verteilung (nach Balancing):")
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
        print(f"[OK] {len(rows)} Crops verifiziert, keine Probleme.")
        return 0
    print(f"[FAIL] {len(problems)} Problem(e):")
    for p in problems[:50]:
        print(f"  - {p}")
    if len(problems) > 50:
        print(f"  … und {len(problems) - 50} weitere.")
    return 1
