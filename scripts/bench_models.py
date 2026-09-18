"""Mehrere Modelle in EINEM Durchgang messen: ein Loader, alle Netze gleichzeitig auf der GPU.

Sechs Modelle nacheinander gegen `test-v1` zu messen liest 213 093 Crops sechsmal von der Platte
und rechnet die Vorverarbeitung sechsmal — bei 6,7 MMAC je Crop ist der Vorwaertspass der
billigste Teil davon. Dieses Skript gruppiert die Laeufe nach ihrer EINGABE (Groesse, CLAHE,
Normalisierung, Kanalform) und faehrt je Gruppe einen Durchgang, in dem jeder Batch durch alle
Modelle der Gruppe geht.

Die Gruppierung ist keine Bequemlichkeit, sondern die Bedingung: zwei Modelle duerfen sich einen
Batch nur teilen, wenn sie ihn auch gleich vorverarbeitet haetten.

    uv run python scripts/bench_models.py --dataset real13-test-v1-128 --runs a,b,c
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from chesslab.ioutil import write_json

METRIC_FILE = "bench-{dataset}.json"


def signature(cfg: dict) -> tuple:
    """Alles, was `eval_transform_for` liest. Was hier gleich ist, darf einen Batch teilen."""
    return (
        tuple(cfg["out_size"]),
        float(cfg.get("clahe_clip", 0.0)), int(cfg.get("clahe_tile", 8)),
        float(cfg.get("clahe_min_mean", 0.0)), float(cfg.get("clahe_max_mean", 255.0)),
        str(cfg.get("clahe_denoise", "off")),
        json.dumps(cfg.get("normalize", {}), sort_keys=True),
        str(cfg.get("input_repr")),
        tuple(cfg["classes"]),
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--split", default="test")
    ap.add_argument("--runs", required=True, help="Komma-Liste von Lauf-Verzeichnissen.")
    ap.add_argument("--split-file", default=None)
    args = ap.parse_args()

    import torch

    from chesslab.dataset_build import dataset_dir
    from chesslab.training.boardnet import CELLS
    from chesslab.training.data import occupancy_board_acc, occupancy_piece_breakdown
    from chesslab.training.engine import get_device
    from chesslab.training.evaluate import _load_run, load_manifest, load_split
    from chesslab.training.occlusion import classification_eligible
    from chesslab.training.pack import resolve_dataset_packs
    from chesslab.training.torch_data import PackedBoardDataset, eval_transform_for

    dd = dataset_dir(args.dataset)
    rows_all = load_manifest(dd / "manifest.jsonl")
    split = load_split(dd / (args.split_file or "split.json"))
    keep = set(split["splits"][args.split])
    device = get_device(require_gpu=False)

    loaded = {}
    for run in args.runs.split(","):
        model, cfg = _load_run(Path(run))
        loaded[run] = (model.to(device).eval(), cfg)
    groups: dict[tuple, list[str]] = {}
    for run, (_m, cfg) in loaded.items():
        groups.setdefault(signature(cfg), []).append(run)
    print(f"{len(loaded)} Modelle in {len(groups)} Eingabe-Gruppen")

    results: dict[str, dict] = {}
    for sig, runs in groups.items():
        cfg = loaded[runs[0]][1]
        packed = resolve_dataset_packs(args.dataset, manifest_rows=rows_all)
        rows = [r for r in rows_all if r.get("session_id") in keep]
        ds = PackedBoardDataset(rows, cfg["classes"], eval_transform_for(cfg), packed)
        rows = getattr(ds, "rows", None) or rows
        print(f"\nGruppe size={sig[0]} clahe={sig[1]}: {len(runs)} Modelle, {len(rows)} Zellen")
        from torch.utils.data import DataLoader
        loader = DataLoader(ds, batch_size=max(1, 256 // CELLS), shuffle=False,
                            num_workers=2, collate_fn=getattr(ds, "collate_fn", None))
        trues: list[int] = []
        preds: dict[str, list[int]] = {r: [] for r in runs}
        with torch.no_grad():
            for i, (x, y) in enumerate(loader):
                x = x.to(device)
                # Die Wahrheit haengt am Batch, nicht am Modell: einmal einsammeln reicht.
                yy = y[:, 0].long() if y.dim() == 2 else y
                trues.extend(yy.reshape(-1).cpu().tolist())
                for run in runs:
                    logits = loaded[run][0](x)
                    if y.dim() == 2:
                        logits = logits[:, :-1]
                    preds[run].extend(logits.argmax(1).cpu().tolist())
                if i and i % 200 == 0:
                    print(f"   {i * loader.batch_size} Bretter", flush=True)
        vis = [i for i, r in enumerate(rows) if classification_eligible(r)]
        for run in runs:
            p = preds[run]
            bd = occupancy_piece_breakdown(cfg["classes"], [trues[i] for i in vis],
                                           [p[i] for i in vis])
            results[run] = {
                "visible_piece_acc": bd["piece_acc"],
                "visible_occupied_acc": bd["occupied_acc"],
                "visible_occupied_board_acc": occupancy_board_acc(
                    [rows[i] for i in vis], cfg["classes"],
                    [trues[i] for i in vis], [p[i] for i in vis]),
                "visible_n": len(vis),
            }

    print(f"\n{'Lauf':46s}{'piece':>9}{'occ':>9}{'board':>9}{'Fehler':>9}")
    for run, m in sorted(results.items(), key=lambda kv: -kv[1]["visible_piece_acc"]):
        wrong = (1 - m["visible_piece_acc"]) * m["visible_n"]
        print(f"{run[-46:]:46s}{m['visible_piece_acc']:>9.4f}{m['visible_occupied_acc']:>9.4f}"
              f"{m['visible_occupied_board_acc']:>11.4f}{wrong:>9.0f}")
    out = dd / METRIC_FILE.format(dataset=args.dataset)
    write_json(out, results)
    print(f"\n[OK] {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
