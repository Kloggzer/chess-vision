"""Auswertung je VERWEIL-EPISODE statt je Zelle — Phase 0.3 des 99-%-Plans.

Eine Verweil-Episode ist ein zusammenhaengender Ply-Lauf einer Figur auf einem Feld. Solange sie
steht, liefert jeder Frame dieselbe Entscheidung noch einmal: der Val-Satz loest ~876 unabhaengige
Platzierungen auf, nicht 9 028 Zellen (`docs/plan-98/02-fehleranalyse.md`). Auf Zellen gerechnet
zaehlt eine lange Verweildauer als viele Belege, und ein einziges Ansichtsproblem sieht aus wie
ein allgemeiner Genauigkeitsmangel.

    uv run python scripts/episode_eval.py --run data/models/_acc128v7/rot-s42 --split val
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from pathlib import Path

from chesslab.ioutil import write_json, write_rows


def episodes(rows: list[dict]) -> list[list[int]]:
    """Zeilenindizes je Episode: (Aufnahme, Feld), nach Ply sortiert, neu bei Labelwechsel."""
    by_square: dict[tuple[str, str], list[int]] = defaultdict(list)
    for i, r in enumerate(rows):
        by_square[(r["session_id"], r["square"])].append(i)
    out: list[list[int]] = []
    for idxs in by_square.values():
        idxs.sort(key=lambda i: (int(rows[i].get("ply") or 0), str(rows[i]["frame"])))
        run: list[int] = []
        label = None
        for i in idxs:
            if rows[i]["label"] != label:
                if run:
                    out.append(run)
                run, label = [], rows[i]["label"]
            run.append(i)
        if run:
            out.append(run)
    return out


def score(rows: list[dict], correct: list[bool]) -> dict:
    """Zellen-, Episoden- und Mehrheitsgenauigkeit, plus wie stark die Fehler klumpen."""
    eps = episodes(rows)
    n_cells = len(rows)
    errs = sum(1 for c in correct if not c)
    per_ep = [sum(1 for i in ep if not correct[i]) for ep in eps]
    clean = sum(1 for e in per_ep if e == 0)
    # Was eine zeitliche Mehrheit auf dem Geraet holen wuerde: die Episode zaehlt richtig, solange
    # mehr als die Haelfte ihrer sichtbaren Zellen stimmt.
    majority = sum(1 for ep, e in zip(eps, per_ep, strict=True) if e * 2 <= len(ep))
    top = sorted(per_ep, reverse=True)
    return {
        "cells": n_cells, "cell_acc": 1 - errs / n_cells if n_cells else 0.0, "errors": errs,
        "episodes": len(eps), "episodes_clean": clean,
        "episode_acc": clean / len(eps) if eps else 0.0,
        "majority_acc": majority / len(eps) if eps else 0.0,
        "share_top1": top[0] / errs if errs and top else 0.0,
        "share_top12": sum(top[:12]) / errs if errs and top else 0.0,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--run", required=True)
    ap.add_argument("--split", default="val")
    ap.add_argument("--sessions", help="Nur diese Aufnahmen (kommagetrennt).")
    ap.add_argument("--json", help="Ergebnis zusaetzlich hierhin schreiben.")
    ap.add_argument("--dump", help="Je Episode eine Zeile (JSONL) - die Einheit, ueber die ein "
                                   "Bootstrap ziehen darf. Zellen sind es nicht.")
    args = ap.parse_args()

    import torch

    from chesslab.dataset_build import dataset_dir
    from chesslab.training.boardnet import CELLS
    from chesslab.training.data import filter_rows_by_split, load_manifest, load_split
    from chesslab.training.engine import evaluate_dataset
    from chesslab.training.evaluate import _load_run
    from chesslab.training.occlusion import PIECE_VISIBLE_MAX
    from chesslab.training.pack import load_packed, resolve_dataset_packs
    from chesslab.training.torch_data import PackedBoardDataset, eval_transform_for

    run_dir = Path(args.run)
    model, cfg = _load_run(run_dir)
    model.eval()
    ds_name, classes = cfg["dataset"], cfg["classes"]
    dd = dataset_dir(ds_name)
    split_file = cfg.get("split_file") or "split.json"
    rows = filter_rows_by_split(load_manifest(dd / "manifest.jsonl"),
                                load_split(dd / split_file), args.split)
    if args.sessions:
        want = {s.strip() for s in args.sessions.split(",") if s.strip()}
        rows = [r for r in rows if r["session_id"] in want]
    if not rows:
        print("[FAIL] keine Zeilen")
        return 1

    packed = resolve_dataset_packs(ds_name, manifest_rows=rows) or load_packed(ds_name)
    ds = PackedBoardDataset(rows, classes, eval_transform_for(cfg), packed)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    res = evaluate_dataset(model, ds, device, batch_size=max(1, 256 // CELLS), keep_workers=False)
    trues, preds = res["trues"].tolist(), res["preds"].tolist()

    # Nur sichtbare Zellen: alles ueber PIECE_VISIBLE_MAX ist aus dem Klassifikationsverlust
    # maskiert, seine Fehler sagen ueber die Figurenerkennung nichts.
    keep = [i for i, r in enumerate(ds.rows) if float(r.get("coverage") or 0.0) <= PIECE_VISIBLE_MAX]
    vis_rows = [ds.rows[i] for i in keep]
    ok = [trues[i] == preds[i] for i in keep]

    per_session = {}
    for sid in sorted({r["session_id"] for r in vis_rows}):
        sel = [j for j, r in enumerate(vis_rows) if r["session_id"] == sid]
        per_session[sid] = score([vis_rows[j] for j in sel], [ok[j] for j in sel])
    total = score(vis_rows, ok)

    print(f"{args.run}  split={args.split}  ({split_file})")
    print(f"{'Aufnahme':36s} {'Zellen':>7} {'Zell-Acc':>9} {'Episoden':>9} {'Ep-Acc':>8} {'Mehrheit':>9}")
    for sid, s in sorted(per_session.items(), key=lambda kv: kv[1]["episode_acc"]):
        print(f"{sid:36s} {s['cells']:7d} {s['cell_acc']:9.4f} {s['episodes']:9d} "
              f"{s['episode_acc']:8.4f} {s['majority_acc']:9.4f}")
    print(f"{'GESAMT':36s} {total['cells']:7d} {total['cell_acc']:9.4f} {total['episodes']:9d} "
          f"{total['episode_acc']:8.4f} {total['majority_acc']:9.4f}")
    worst = min((s["episode_acc"] for s in per_session.values()), default=0.0)
    print(f"schlechteste Aufnahme auf Episodenebene: {worst:.4f}   "
          f"groesste Episode traegt {total['share_top1']:.0%} aller Fehler, "
          f"die zwoelf groessten {total['share_top12']:.0%}")
    if args.dump:
        eps = episodes(vis_rows)
        write_rows(Path(args.dump),
                   [{"session_id": vis_rows[ep[0]]["session_id"],
                     "square": vis_rows[ep[0]]["square"],
                     "label": vis_rows[ep[0]]["label"], "ply": vis_rows[ep[0]].get("ply"),
                     "cells": len(ep), "errors": sum(1 for i in ep if not ok[i])}
                    for ep in eps])
        print(f"[OK] {len(eps)} Episoden -> {args.dump}")
    if args.json:
        write_json(Path(args.json), {"run": args.run, "split": args.split,
                                     "total": total, "per_session": per_session}, indent=1)
        print(f"[OK] {args.json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
