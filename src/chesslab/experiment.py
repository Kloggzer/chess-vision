"""Stufe 7 — Geometrie×Photometrie Bake-Off-Runner.

Beweist empirisch, welche Preprocessing-Kombination für DIESE Daten die beste Board-Accuracy
liefert. Eine **Variante** = (geometry, photometry, piece_height_cells). Je Variante:

  slice (variantengetaggt) -> build_dataset (gleicher session-basierter Split) -> train -> eval

Fairness: identische `session_ids` + `seed` ⇒ identischer Split über alle Varianten; Dedup nur über
den deterministischen Metadaten-Cap (phash AUS — der vergleicht Pixel, die sich je Variante
unterscheiden, und würde unfair unterschiedlich deduplizieren); keine Rotations-Augmentation. Nur
die Pixel (Geometrie/Photometrie) unterscheiden sich.

Resümierbar: fertige Stages (Crops/Dataset/best.pt) werden ohne `--force` übersprungen.
"""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path

from . import config
from .calibration import load_profile
from .dataset_build import build_dataset, dataset_dir
from .labeling import load_corrections, read_session_meta, slice_session, variant_paths
from .training.data import (
    board_acc_spread,
    board_accuracy,
    filter_rows_by_split,
    grouped_board_acc,
    load_manifest,
    load_split,
    macro_f1,
    occupancy_board_acc,
    occupancy_piece_breakdown,
)

# Per-Klassen-Recall-Spalten in der Vergleichstabelle (die Engpässe: Damen/Könige).
_RECALL_COLS = ("wQ", "bQ", "wK", "bK")


@dataclass(frozen=True)
class Variant:
    geometry: str
    photometry: str
    head: str = "combined"
    piece_height_cells: float = config.EXP_PIECE_HEIGHT_CELLS

    @property
    def data_tag(self) -> str:
        """Identität der CROPS/Daten — nur Geometrie×Photometrie (der Kopf ändert die Daten NICHT,
        daher teilen sich Kopf-Varianten Crops + Dataset)."""
        return f"{self.geometry}-{self.photometry}"

    @property
    def tag(self) -> str:
        """Identität des Modell-LAUFS — inkl. Kopf."""
        return f"{self.geometry}-{self.photometry}-{self.head}"

    @property
    def dataset_name(self) -> str:
        return f"{config.EXP_PREFIX}__{self.data_tag}"

    @property
    def run_dir(self) -> Path:
        return config.DATA.models / f"exp-{self.tag}"


def variant_grid(geometries, photometries, heads=("combined",)) -> list[Variant]:
    """Volles Kreuzprodukt Geometrie×Photometrie×Kopf (Baseline `warp-none-combined` enthalten)."""
    return [Variant(g, p, h) for g in geometries for p in photometries for h in heads]


def session_profile_map(session_ids: list[str]) -> dict[str, str]:
    """{session_id: profil/kamera} aus session.yaml — Basis der per-Kamera-Robustheit."""
    out: dict[str, str] = {}
    for sid in session_ids:
        try:
            out[sid] = read_session_meta(config.DATA.sessions / sid).get("profile", "?")
        except Exception:  # noqa: BLE001
            out[sid] = "?"
    return out


# --- Stages -----------------------------------------------------------------------------

def slice_variant(v: Variant, session_ids: list[str], *, force: bool = False) -> dict:
    """Alle Sessions variantengetaggt slicen. Gibt Crops/Fallback-Statistik zurück."""
    manifest_path, squares_root = variant_paths(v.data_tag)
    corrections = load_corrections(config.DATA.corrections)
    have = set()
    if manifest_path.exists() and not force:
        for line in manifest_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                have.add(json.loads(line)["session_id"])
    fallback = crops = 0
    for sid in session_ids:
        sdir = config.DATA.sessions / sid
        meta = read_session_meta(sdir)
        prof = load_profile(meta["profile"])
        if sid in have:   # schon gesliced (idempotenter Resume) -> Crops zählen, nicht neu schneiden
            crops += sum(1 for line in manifest_path.read_text(encoding="utf-8").splitlines()
                         if line.strip() and json.loads(line)["session_id"] == sid)
            continue
        stats = slice_session(
            sdir, profile=prof, manifest_path=manifest_path, squares_root=squares_root,
            label_overrides=corrections, geometry_mode=v.geometry, photometry=v.photometry,
            piece_height_cells=v.piece_height_cells)
        fallback += stats.get("fallback", 0)
        crops += stats["crops"]
    return {"manifest": manifest_path, "fallback": fallback, "crops": crops,
            "fallback_rate": fallback / max(crops, 1)}


def build_variant(v: Variant, session_ids: list[str], *, seed: int, force: bool = False) -> None:
    """Datensatz der Variante bauen — phash AUS + keine Rotation (identische Crop-Menge je Variante)."""
    if dataset_dir(v.dataset_name).exists() and not force:
        return
    manifest_path, _ = variant_paths(v.data_tag)
    n = len(session_ids)
    force_train = None
    if 2 <= n < 3:
        # <3 Sessions: kein sauberer 3-Wege-Split -> je 1 Session in Train/Val (kein Test-Fold).
        # Die VOLLSTÄNDIGSTE Session (meiste Klassen) muss in Train, sonst hätte val ungesehene
        # Klassen (z.B. Bauern) -> Board-Acc=0 überall, kein Signal.
        labels_per: dict[str, set] = {}
        for line in manifest_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line)
                labels_per.setdefault(r["session_id"], set()).add(r["label"])
        if labels_per:
            force_train = {max(session_ids, key=lambda s: len(labels_per.get(s, set())))}
    val_frac = config.DEFAULT_VAL_FRAC if n >= 3 else (0.25 if n >= 2 else 0.0)
    test_frac = config.DEFAULT_TEST_FRAC if n >= 3 else 0.0
    build_dataset(
        v.dataset_name, session_ids, source_manifest=manifest_path, variant_tag=v.data_tag, seed=seed,
        phash_enabled=False, rotations=(0,), val_frac=val_frac, test_frac=test_frac,
        force_train=force_train)


def train_variant(v: Variant, *, epochs: int, seed: int, backbone: str, force: bool = False) -> int:
    """Variante trainieren (gleiche Hyperparameter). Skippt, wenn best.pt existiert (Resume)."""
    from .training.train import run_train

    if (v.run_dir / "best.pt").exists() and not force:
        print(f"[skip] {v.tag}: best.pt existiert (--force zum Neutrainieren).")
        return 0
    return run_train(
        backbone=backbone, epochs=epochs, batch_size=config.DEFAULT_BATCH_SIZE, lr=config.DEFAULT_LR,
        no_amp=False, seed=seed, out=str(v.run_dir), patience=config.DEFAULT_PATIENCE,
        dataset=v.dataset_name, head=v.head)


def fallback_rate_from_manifest(manifest_path: Path) -> float:
    """Anteil box3d-Crops mit fehlgeschlagener Pose (pose_ok=False) im Varianten-Manifest. 0 für warp."""
    if not manifest_path.exists():
        return 0.0
    n = fb = 0
    for line in manifest_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        r = json.loads(line)
        if r.get("geometry") == "box3d":
            n += 1
            if not r.get("pose_ok", True):
                fb += 1
    return fb / max(n, 1)


def collect_metrics(v: Variant, session_profile: dict[str, str], split_name: str = "test") -> dict:
    """Test-Metriken: Board-Acc, macro-F1, per-Klassen-Recall, per-Session/-Kamera-Spread."""
    from .training.engine import confusion_matrix, evaluate_dataset, get_device, per_class_recall
    from .training.evaluate import _load_run
    from .training.torch_data import SquareDataset, build_transform

    model, cfg = _load_run(v.run_dir)
    classes = cfg["classes"]
    out_size = tuple(cfg["out_size"])
    dd = dataset_dir(cfg["dataset"])
    manifest = load_manifest(dd / "manifest.jsonl")
    split = load_split(dd / "split.json")
    rows = filter_rows_by_split(manifest, split, split_name)
    if not rows:
        return {"variant": v.tag, "geometry": v.geometry, "photometry": v.photometry, "head": v.head,
                "split": split_name, "board_acc": 0.0, "macro_f1": 0.0, "recall": {},
                "session_spread": 0.0, "cam_spread": 0.0, "per_camera": {}, "fallback_rate": 0.0,
                "n_test": 0}

    device = get_device(require_gpu=False)
    model.to(device)
    ds = SquareDataset(rows, classes, build_transform(out_size, train=False))
    res = evaluate_dataset(model, ds, device, batch_size=256, num_workers=0)
    trues = [int(t) for t in res["trues"]]
    preds = [int(p) for p in res["preds"]]

    items = [{"session_id": r["session_id"], "frame": str(r["frame"]),
              "camera": session_profile.get(r["session_id"], "?"), "correct": t == p}
              for r, t, p in zip(rows, trues, preds, strict=False)]
    board = board_accuracy([((it["session_id"], it["frame"]), it["correct"]) for it in items])
    cm = confusion_matrix(res["trues"], res["preds"], len(classes))
    recall = {c: float(x) for c, x in zip(classes, per_class_recall(cm), strict=False)}
    per_session = grouped_board_acc(items, "session_id")
    per_camera = grouped_board_acc(items, "camera")
    bd = occupancy_piece_breakdown(classes, trues, preds)   # WO sitzen die Fehler: Occ vs Typ vs Farbe
    occ_bacc = occupancy_board_acc(rows, classes, trues, preds)
    manifest_path, _ = variant_paths(v.data_tag)
    return {
        "variant": v.tag,
        "geometry": v.geometry,
        "photometry": v.photometry,
        "head": v.head,
        "split": split_name,
        "board_acc": board,
        "macro_f1": macro_f1(trues, preds, len(classes)),
        "occ_acc": bd["occ_acc"],
        "occ_board_acc": occ_bacc,
        "piece_acc": bd["piece_acc"],
        "type_err": bd["type_err"],
        "color_err": bd["color_err"],
        "recall": recall,
        "session_spread": board_acc_spread(per_session),
        "cam_spread": board_acc_spread(per_camera),
        "per_camera": per_camera,
        "fallback_rate": fallback_rate_from_manifest(manifest_path),
        "n_test": len(rows),
    }


# --- Orchestrierung ---------------------------------------------------------------------

def run_experiment(session_ids: list[str], geometries, photometries, heads=("combined",), *,
                   epochs: int, seed: int, backbone: str, eval_split: str = "test",
                   force: bool = False) -> int:
    """Volles Grid Geometrie×Photometrie×Kopf: je Variante slice->build->train->eval(`eval_split`),
    dann Vergleichstabelle schreiben."""
    from . import doctor

    ok, checks = doctor.validate_gpu()
    if not ok:
        print(doctor.render(checks))
        print("[FAIL] Keine nutzbare ROCm-GPU — Bake-Off braucht Training. `chesslab doctor --gpu`.")
        return 1
    if not session_ids:
        print("[FAIL] keine Sessions angegeben.")
        return 1

    sp = session_profile_map(session_ids)
    variants = variant_grid(geometries, photometries, heads)
    print(f"[OK] {len(variants)} Varianten über {len(session_ids)} Sessions "
          f"({len(set(sp.values()))} Kamera(s)); Eval-Split='{eval_split}'.")

    results: list[dict] = []
    for v in variants:
        print(f"\n=== Variante {v.tag} (piece_height={v.piece_height_cells}) ===")
        s = slice_variant(v, session_ids, force=force)   # idempotent je data_tag (Kopf teilt Crops)
        print(f"  slice: {s['crops']} Crops, fallback_rate {s['fallback_rate']:.3f}")
        build_variant(v, session_ids, seed=seed, force=force)
        if train_variant(v, epochs=epochs, seed=seed, backbone=backbone, force=force) != 0:
            print(f"[FAIL] Training {v.tag} fehlgeschlagen — Variante übersprungen.")
            continue
        m = collect_metrics(v, sp, split_name=eval_split)
        results.append(m)
        print(f"  {eval_split}-board_acc {m['board_acc']:.4f} | macro_f1 {m['macro_f1']:.4f} "
              f"| cam_spread {m['cam_spread']:.4f}")

    if not results:
        print("[FAIL] keine Variante erfolgreich.")
        return 1
    write_comparison(results, session_ids, geometries, photometries, heads, eval_split=eval_split)
    return 0


def rebuild_table(session_ids: list[str], geometries, photometries, heads=("combined",),
                  eval_split: str = "test") -> int:
    """Vergleichstabelle aus bereits trainierten Runs neu schreiben — ohne Re-Training (nur Eval, CPU)."""
    sp = session_profile_map(session_ids)
    results = []
    for v in variant_grid(geometries, photometries, heads):
        if not (v.run_dir / "best.pt").exists():
            print(f"[skip] {v.tag}: nicht trainiert.")
            continue
        results.append(collect_metrics(v, sp, split_name=eval_split))
    if not results:
        print("[FAIL] keine trainierten Varianten gefunden.")
        return 1
    write_comparison(results, session_ids, geometries, photometries, heads, eval_split=eval_split)
    return 0


def variant_status(session_ids: list[str], geometries, photometries, heads=("combined",)) -> int:
    """Status je Variante: sliced / dataset gebaut / trainiert / evaluiert."""
    for v in variant_grid(geometries, photometries, heads):
        manifest_path, _ = variant_paths(v.data_tag)
        sliced = manifest_path.exists()
        built = dataset_dir(v.dataset_name).exists()
        trained = (v.run_dir / "best.pt").exists()
        evaled = (v.run_dir / "eval_test.json").exists()
        def mark(b):  # noqa: E306
            return "x" if b else " "
        print(f"  [{mark(sliced)}] slice  [{mark(built)}] dataset  [{mark(trained)}] train  "
              f"[{mark(evaled)}] eval   {v.tag}")
    return 0


def _worst_cam(m: dict) -> float:
    """Worst-Case-Board-Acc über Kameras (Robustheits-Sortierkriterium)."""
    pc = m.get("per_camera") or {}
    return min(pc.values()) if pc else m["board_acc"]


def write_comparison(results: list[dict], session_ids, geometries, photometries, heads=("combined",),
                     out_dir: Path | None = None, eval_split: str = "test") -> Path:
    """comparison.md/.csv/variants.json schreiben; sortiert nach Board-Acc (auf `eval_split`) absteigend."""
    out_dir = out_dir or (config.DATA.experiments / config.EXP_PREFIX)
    out_dir.mkdir(parents=True, exist_ok=True)
    # Board-Acc primär; macro_f1 als Tiebreaker (bei dünnen Daten ist board_acc oft 0 -> sonst kein Ranking).
    ranked = sorted(results, key=lambda m: (m["board_acc"], _worst_cam(m), m["macro_f1"]), reverse=True)
    best = ranked[0]["variant"] if ranked else None
    robust = max(results, key=_worst_cam)["variant"] if results else None

    cols = ["variant", "geometry", "photometry", "head", "board_acc", "macro_f1",
            "occ_acc", "occ_board_acc", "piece_acc", "type_err", "color_err",
            *[f"recall_{c}" for c in _RECALL_COLS],
            "session_spread", "cam_spread", "fallback_rate", "n_test"]

    def cell(m: dict, c: str):
        if c.startswith("recall_"):
            return f"{m['recall'].get(c[len('recall_'):], 0.0):.3f}"
        v = m.get(c, 0.0)
        return f"{v:.4f}" if isinstance(v, float) else str(v)

    multi = len(set(heads)) > 1
    note = (f"_Eval auf **{eval_split}**; {len(session_ids)} Session(s). "
            + ("Bei 2 Sessions kein Test-Fold (Train+Val); gleiche Linien-Aufstellung → "
               "Positions-Overfitting möglich, Zahlen optimistisch._" if len(session_ids) < 3
               else "_"))
    md = [f"# Bake-Off — {len(results)} Varianten, {len(session_ids)} Session(s)", "", note, "",
          f"**Beste Board-Acc ({eval_split}):** `{best}`  |  **Robusteste (Worst-Case über Kameras):** "
          f"`{robust}`"
          + ("  |  Kopf-Achse: " + " vs ".join(sorted(set(heads))) if multi else ""), "",
          "| " + " | ".join(cols) + " |", "|" + "|".join(["---"] * len(cols)) + "|"]
    for m in ranked:
        mark = "  <- best" if m["variant"] == best else ""
        md.append("| " + " | ".join(cell(m, c) for c in cols) + " |" + mark)
    md += ["", "## Per-Kamera-Board-Accuracy", ""]
    for m in ranked:
        pc = ", ".join(f"{k}={x:.3f}" for k, x in sorted((m.get("per_camera") or {}).items()))
        md.append(f"- `{m['variant']}`: {pc or '-'}")
    (out_dir / "comparison.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    # CSV
    with (out_dir / "comparison.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(cols)
        for m in ranked:
            w.writerow([cell(m, c) for c in cols])

    (out_dir / "variants.json").write_text(json.dumps({
        "session_ids": list(session_ids), "geometries": list(geometries),
        "photometries": list(photometries), "heads": list(heads), "eval_split": eval_split,
        "best": best, "robust": robust, "results": ranked,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n[OK] Vergleich: {out_dir / 'comparison.md'} (best={best}, robust={robust})")
    return out_dir / "comparison.md"
