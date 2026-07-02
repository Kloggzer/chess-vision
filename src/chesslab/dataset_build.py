"""Stufe 4 — benannte, kuratierte Datensätze.

Ein **Datensatz** ist eine Sicht auf den globalen Crop-Pool (`data/manifests/squares.jsonl`):
eine Auswahl von Sessions + Dedup- und Split-Policy. Bauen erzeugt unter
`data/datasets/<name>/` ein gefiltertes, dedupliziertes `manifest.jsonl`, einen
sessionbasierten `split.json` und `stats.json`. Crops für rot=0 referenzieren den globalen
Pool (kein Kopieren); nur rotations-augmentierte Crops werden im Datensatz-Ordner materialisiert.

Dedup gegen den Aufnahme-bedingten Überschuss fast identischer Crops (nie bewegte Figuren bei
fixer Kamera):
  1. Metadaten-Cap pro `(session_id, square, label)` — schnell, deterministisch.
  2. Perceptual-Hash (dhash) — verwirft visuell fast gleiche innerhalb einer Klasse.

Rotations-Augmentation (90/180/270°) ist optional und bewusst NACH dem Dedup (4x die
*kuratierten* Crops). Sie widerspricht der Fixkamera-Annahme (CLAUDE.md) und ist als Toggle
gedacht. Headless testbar: alle Funktionen nehmen `paths=config.DATA`.
"""

from __future__ import annotations

import json
import random
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from . import config
from . import dataset as dataset_mod

_ROT_CODES = {90: 0, 180: 1, 270: 2}  # cv2.ROTATE_90_CLOCKWISE / 180 / 90_COUNTERCLOCKWISE


def _safe_name(name: str) -> str:
    n = (name or "").strip()
    if not n or "/" in n or "\\" in n or ".." in n:
        raise ValueError(f"ungültiger Datensatz-Name: {name!r}")
    return n


def dataset_dir(name: str, paths: config.Paths | None = None) -> Path:
    return (paths or config.DATA).datasets / _safe_name(name)


# --- Perceptual hash (dhash, 64-bit) --------------------------------------------------

def dhash(img, size: int = 8) -> int:
    """Difference-Hash: Bild auf (size+1 x size) grau, horizontale Nachbardifferenzen -> 64-bit."""
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
    """Max. `cap` Crops je (session_id, square, label) behalten (seeded). cap<=0/None -> alle."""
    if not cap or cap <= 0:
        return list(rows)
    rng = random.Random(seed)
    groups: dict[tuple, list[dict]] = {}
    for r in rows:
        groups.setdefault((r["session_id"], r["square"], r["label"]), []).append(r)
    kept: list[dict] = []
    for g in groups.values():
        if len(g) > cap:
            g = sorted(g, key=lambda r: str(r.get("frame", "")))   # deterministisch
            g = rng.sample(g, cap)
        kept.extend(g)
    return kept


def dedup_phash(rows: list[dict], hamming: int) -> list[dict]:
    """Innerhalb jeder Klasse visuell fast gleiche Crops verwerfen (dhash, Hamming <= Schwelle)."""
    import cv2

    if hamming is None or hamming < 0:
        return list(rows)
    by_label: dict[str, list[dict]] = {}
    for r in rows:
        by_label.setdefault(r["label"], []).append(r)
    kept: list[dict] = []
    for g in by_label.values():
        seen: list[int] = []
        for r in sorted(g, key=lambda r: (str(r.get("session_id")), str(r.get("frame")), r.get("square", ""))):
            img = cv2.imread(r["path"])
            if img is None:
                kept.append(r)                  # nicht lesbar -> behalten, nicht still verlieren
                continue
            h = dhash(img)
            if any(_hamming(h, s) <= hamming for s in seen):
                continue                        # zu ähnlich -> verwerfen
            seen.append(h)
            kept.append(r)
    return kept


# --- Rotation-Augmentation ------------------------------------------------------------

def _apply_rotations(rows: list[dict], rotations: tuple[int, ...], squares_dir: Path) -> list[dict]:
    """Je Crop die gewünschten Drehungen erzeugen. rot=0 referenziert das Original (kein Kopieren);
    90/180/270 werden als neue Dateien unter `squares_dir/<label>/` materialisiert."""
    import cv2

    degs = [d % 360 for d in (rotations or (0,))]
    if not degs:
        degs = [0]
    out: list[dict] = []
    for r in rows:
        for deg in degs:
            nr = dict(r)
            if deg == 0:
                nr["rot"] = 0
                out.append(nr)
                continue
            img = cv2.imread(r["path"])
            if img is None:
                continue
            rimg = cv2.rotate(img, _ROT_CODES[deg])
            dst = squares_dir / r["label"] / f"{Path(r['path']).stem}_r{deg}.png"
            dst.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(dst), rimg)
            nr["rot"] = deg
            nr["path"] = dst.as_posix()
            out.append(nr)
    return out


# --- Build ----------------------------------------------------------------------------

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
    source_manifest: Path | None = None,
    variant_tag: str | None = None,
    allow_degenerate: bool = False,
    force_train=None,
) -> dict:
    """Datensatz <name> aus `session_ids` bauen: filtern -> dedup -> rotation -> manifest+split+stats.

    `source_manifest`: Crop-Pool, aus dem gefiltert wird (Default `data/manifests/squares.jsonl`).
    Für den Bake-Off zeigt jede Variante auf ihr eigenes `squares__<tag>.jsonl`; bei identischen
    `session_ids`+`seed` ist der sessionbasierte Split byte-identisch über alle Varianten.
    """
    name = _safe_name(name)
    # Auflösung zur Laufzeit (nicht als Default-Arg): Default-Args binden beim Import und
    # ignorieren ein später gepatchtes/geändertes config.DATA (Testbarkeit).
    paths = paths or config.DATA
    d = config.DEDUP
    per_cell_cap = d.per_cell_cap if per_cell_cap is None else per_cell_cap
    phash_enabled = d.phash_enabled if phash_enabled is None else phash_enabled
    phash_hamming = d.phash_hamming if phash_hamming is None else phash_hamming
    rotations = d.rotations if rotations is None else tuple(rotations)

    src = Path(source_manifest) if source_manifest else (paths.manifests / "squares.jsonl")
    manifest = dataset_mod.load_manifest(src)
    wanted = set(session_ids)
    rows = [r for r in manifest if r["session_id"] in wanted]
    n_raw = len(rows)
    if not rows:
        raise ValueError("keine Crops für die gewählten Sessions (erst slicen?).")

    # Split-Zuteilung auf den ROHEN, VOLLSTÄNDIGEN Daten bestimmen (vollständige 64er-Boards). Dedup +
    # Rotation danach NUR auf Train — Val/Test bleiben komplett (genau 64 Crops/Frame, rot 0), sonst
    # rechnet board_accuracy auf unvollständigen/duplizierten Boards (Bug).
    sizes = Counter(r["session_id"] for r in rows)
    splits = dataset_mod.assign_sessions_to_splits(dict(sizes), val_frac, test_frac, seed,
                                                   force_train=force_train)
    split_of = {s: name for name, sids in splits.items() for s in sids}
    train_raw = [r for r in rows if split_of.get(r["session_id"]) == "train"]
    holdout = [r for r in rows if split_of.get(r["session_id"]) in ("val", "test")]  # vollständig, rot 0

    train_rows = dedup_metadata(train_raw, per_cell_cap, seed)
    if phash_enabled:
        train_rows = dedup_phash(train_rows, phash_hamming)
    n_dedup = len(train_rows) + len(holdout)

    ds = paths.datasets / name
    if ds.exists():
        shutil.rmtree(ds)                       # sauberer Rebuild (alte Rotationen weg)
    ds.mkdir(parents=True, exist_ok=True)
    train_rows = _apply_rotations(train_rows, rotations, ds / "squares")   # Rotation NUR auf Train
    rows = train_rows + holdout
    n_final = len(rows)

    (ds / "manifest.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + ("\n" if rows else ""),
        encoding="utf-8")
    split = dataset_mod.make_split(rows, val_frac, test_frac, max_empty_ratio, seed, max_class_ratio,
                                   force_train=force_train, precomputed_splits=splits)
    errors, _warnings = dataset_mod.validate_split(split, rows)
    if errors:
        if not allow_degenerate:
            shutil.rmtree(ds, ignore_errors=True)   # kein halbfertiger Zombie-Datensatz
            raise ValueError("\n".join(errors))
        split["degenerate_errors"] = errors          # bewusst zugelassen -> im Split dokumentieren
    (ds / "split.json").write_text(json.dumps(split, ensure_ascii=False, indent=2), encoding="utf-8")
    stats = dataset_mod.compute_stats(rows)
    (ds / "stats.json").write_text(json.dumps(stats, ensure_ascii=False), encoding="utf-8")

    cfg = {
        "name": name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "session_ids": list(session_ids),
        "variant_tag": variant_tag,
        "source_manifest": str(src.as_posix()),
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
    return {"name": name, "counts": cfg["counts"], "split_counts": split["counts"],
            "warnings": split.get("warnings", [])}


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
        raise FileNotFoundError(f"Datensatz '{name}' nicht gefunden.")
    cfg = _read_yaml(d / "dataset.yaml")
    stats = json.loads((d / "stats.json").read_text(encoding="utf-8")) if (d / "stats.json").exists() else {}
    split = json.loads((d / "split.json").read_text(encoding="utf-8")) if (d / "split.json").exists() else {}
    return {"config": cfg, "stats": stats,
            "split": {k: split.get(k) for k in ("splits", "counts", "warnings", "class_weights")}}


def delete_dataset(name: str, paths: config.Paths | None = None) -> dict:
    d = dataset_dir(name, paths)
    if not d.exists():
        raise FileNotFoundError(f"Datensatz '{name}' nicht gefunden.")
    shutil.rmtree(d)
    return {"name": _safe_name(name), "deleted": True}
