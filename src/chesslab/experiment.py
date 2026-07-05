"""Stage 7 — Geometry×Photometry Bake-Off Runner.

Empirically proves which preprocessing combination yields the best board accuracy
for THIS data. A **variant** = (geometry, photometry, piece_height_cells). Per variant:

  slice (variant-tagged) -> build_dataset (same session-based split) -> train -> eval

Fairness: identical `session_ids` + `seed` ⇒ identical split across all variants; dedup only via
the deterministic metadata cap (phash OFF — it compares pixels, which differ per variant
and would unfairly deduplicate differently); no rotation augmentation. Only
the pixels (geometry/photometry) differ.

Resumable: completed stages (crops/dataset/best.pt) are skipped without `--force`.
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

# Per-class recall columns in the comparison table (the bottlenecks: queens/kings).
_RECALL_COLS = ("wQ", "bQ", "wK", "bK")


@dataclass(frozen=True)
class Variant:
    geometry: str
    photometry: str
    head: str = "combined"
    piece_height_cells: float = config.EXP_PIECE_HEIGHT_CELLS

    @property
    def data_tag(self) -> str:
        """Identity of the CROPS/data — only geometry×photometry (the head does NOT change the data,
        therefore head variants share crops + dataset)."""
        return f"{self.geometry}-{self.photometry}"

    @property
    def tag(self) -> str:
        """Identity of the model RUN — including head."""
        return f"{self.geometry}-{self.photometry}-{self.head}"

    @property
    def dataset_name(self) -> str:
        return f"{config.EXP_PREFIX}__{self.data_tag}"

    @property
    def run_dir(self) -> Path:
        return config.DATA.models / f"exp-{self.tag}"


def variant_grid(geometries, photometries, heads=("combined",)) -> list[Variant]:
    """Full cross product geometry×photometry×head (baseline `warp-none-combined` included)."""
    return [Variant(g, p, h) for g in geometries for p in photometries for h in heads]


def session_profile_map(session_ids: list[str]) -> dict[str, str]:
    """{session_id: profile/camera} from session.yaml — basis of per-camera robustness."""
    out: dict[str, str] = {}
    for sid in session_ids:
        try:
            out[sid] = read_session_meta(config.DATA.sessions / sid).get("profile", "?")
        except Exception:  # noqa: BLE001
            out[sid] = "?"
    return out


# --- Stages -----------------------------------------------------------------------------

def slice_variant(v: Variant, session_ids: list[str], *, force: bool = False) -> dict:
    """Slice all sessions with variant tagging. Returns crops/fallback statistics."""
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
        if sid in have:   # already sliced (idempotent resume) -> count crops, don't re-slice
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
    """Build dataset for the variant — phash OFF + no rotation (identical crop count per variant)."""
    if dataset_dir(v.dataset_name).exists() and not force:
        return
    manifest_path, _ = variant_paths(v.data_tag)
    n = len(session_ids)
    force_train = None
    if 2 <= n < 3:
        # <3 sessions: no clean 3-way split -> 1 session each in train/val (no test fold).
        # The MOST COMPLETE session (most classes) must be in train, otherwise val would have unseen
        # classes (e.g. pawns) -> board_acc=0 everywhere, no signal.
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
    """Train variant (same hyperparameters). Skips if best.pt exists (resume)."""
    from .training.train import run_train

    if (v.run_dir / "best.pt").exists() and not force:
        print(f"[skip] {v.tag}: best.pt exists (--force to retrain).")
        return 0
    return run_train(
        backbone=backbone, epochs=epochs, batch_size=config.DEFAULT_BATCH_SIZE, lr=config.DEFAULT_LR,
        no_amp=False, seed=seed, out=str(v.run_dir), patience=config.DEFAULT_PATIENCE,
        dataset=v.dataset_name, head=v.head)


def fallback_rate_from_manifest(manifest_path: Path) -> float:
    """Fraction of box3d crops with failed pose (pose_ok=False) in the variant manifest. 0 for warp."""
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
    """Test metrics: board-acc, macro-F1, per-class recall, per-session/-camera spread."""
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
    bd = occupancy_piece_breakdown(classes, trues, preds)   # WHERE are the errors: occ vs type vs color
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


# --- Orchestration ---------------------------------------------------------------------

def run_experiment(session_ids: list[str], geometries, photometries, heads=("combined",), *,
                   epochs: int, seed: int, backbone: str, eval_split: str = "test",
                   force: bool = False) -> int:
    """Full grid geometry×photometry×head: per variant slice->build->train->eval(`eval_split`),
    then write comparison table."""
    from . import doctor

    ok, checks = doctor.validate_gpu()
    if not ok:
        print(doctor.render(checks))
        print("[FAIL] No usable ROCm GPU — bake-off needs training. `chesslab doctor --gpu`.")
        return 1
    if not session_ids:
        print("[FAIL] no sessions given.")
        return 1

    sp = session_profile_map(session_ids)
    variants = variant_grid(geometries, photometries, heads)
    print(f"[OK] {len(variants)} variants over {len(session_ids)} sessions "
          f"({len(set(sp.values()))} camera(s)); eval-split='{eval_split}'.")

    results: list[dict] = []
    for v in variants:
        print(f"\n=== Variant {v.tag} (piece_height={v.piece_height_cells}) ===")
        s = slice_variant(v, session_ids, force=force)   # idempotent per data_tag (head shares crops)
        print(f"  slice: {s['crops']} crops, fallback_rate {s['fallback_rate']:.3f}")
        build_variant(v, session_ids, seed=seed, force=force)
        if train_variant(v, epochs=epochs, seed=seed, backbone=backbone, force=force) != 0:
            print(f"[FAIL] Training {v.tag} failed — variant skipped.")
            continue
        m = collect_metrics(v, sp, split_name=eval_split)
        results.append(m)
        print(f"  {eval_split}-board_acc {m['board_acc']:.4f} | macro_f1 {m['macro_f1']:.4f} "
              f"| cam_spread {m['cam_spread']:.4f}")

    if not results:
        print("[FAIL] no variant succeeded.")
        return 1
    write_comparison(results, session_ids, geometries, photometries, heads, eval_split=eval_split)
    return 0


def rebuild_table(session_ids: list[str], geometries, photometries, heads=("combined",),
                  eval_split: str = "test") -> int:
    """Rewrite comparison table from already trained runs — without re-training (eval only, CPU)."""
    sp = session_profile_map(session_ids)
    results = []
    for v in variant_grid(geometries, photometries, heads):
        if not (v.run_dir / "best.pt").exists():
            print(f"[skip] {v.tag}: not trained.")
            continue
        results.append(collect_metrics(v, sp, split_name=eval_split))
    if not results:
        print("[FAIL] no trained variants found.")
        return 1
    write_comparison(results, session_ids, geometries, photometries, heads, eval_split=eval_split)
    return 0


def variant_status(session_ids: list[str], geometries, photometries, heads=("combined",)) -> int:
    """Status per variant: sliced / dataset built / trained / evaluated."""
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
    """Worst-case board-acc across cameras (robustness sorting criterion)."""
    pc = m.get("per_camera") or {}
    return min(pc.values()) if pc else m["board_acc"]


def write_comparison(results: list[dict], session_ids, geometries, photometries, heads=("combined",),
                     out_dir: Path | None = None, eval_split: str = "test") -> Path:
    """Write comparison.md/.csv/variants.json; sorted by board-acc (on `eval_split`) descending."""
    out_dir = out_dir or (config.DATA.experiments / config.EXP_PREFIX)
    out_dir.mkdir(parents=True, exist_ok=True)
    # Board-acc primary; macro_f1 as tiebreaker (with sparse data board_acc is often 0 -> otherwise no ranking).
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
    note = (f"_Eval on **{eval_split}**; {len(session_ids)} session(s). "
            + ("With 2 sessions no test fold (train+val); same line-up → "
               "position overfitting possible, numbers optimistic._" if len(session_ids) < 3
               else "_"))
    md = [f"# Bake-Off — {len(results)} variants, {len(session_ids)} session(s)", "", note, "",
          f"**Best board-acc ({eval_split}):** `{best}`  |  **Most robust (worst-case across cameras):** "
          f"`{robust}`"
          + ("  |  Head axis: " + " vs ".join(sorted(set(heads))) if multi else ""), "",
          "| " + " | ".join(cols) + " |", "|" + "|".join(["---"] * len(cols)) + "|"]
    for m in ranked:
        mark = "  <- best" if m["variant"] == best else ""
        md.append("| " + " | ".join(cell(m, c) for c in cols) + " |" + mark)
    md += ["", "## Per-Camera Board-Accuracy", ""]
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
    print(f"\n[OK] Comparison: {out_dir / 'comparison.md'} (best={best}, robust={robust})")
    return out_dir / "comparison.md"
