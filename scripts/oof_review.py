"""Den ganzen Korpus out-of-fold durchsehen: jede Aufnahme von dem Modell, das sie NIE sah.

Vier Fold-Modelle, vier `split-f<i>.json`. Aufnahme X liegt in genau einem Fold im TEST, und
dessen Modell hat sie nicht trainiert — nur diese Lesart ist ein Zeuge. Verglichen wird gegen das
LETZTE Wort des Menschen (`scripts/sync_labels.py` haelt Packs und Datensaetze darauf).

Schon beurteilte Zellen fallen raus. Am 2026-09-18 waren 105 von 106 "Funden" Zellen, die der
Nutzer laengst entschieden hatte — wer sie wieder vorlegt, misst das Modell und nicht die Labels.

    uv run python scripts/oof_review.py --dataset real13-mix-v7-128 --out data/reports/oof.jsonl
"""

from __future__ import annotations

import argparse
import collections
import json
from pathlib import Path

from chesslab.ioutil import read_jsonl, write_rows

RECORDINGS = Path("data/recordings")
MODELS = Path("data/models")


def judged() -> set[tuple[str, str, str]]:
    out: set[tuple[str, str, str]] = set()
    for rec in sorted(RECORDINGS.iterdir()):
        if not rec.is_dir():
            continue
        for name in ("reviewed.jsonl", "corrections.jsonl"):
            path = rec / name
            if path.is_file():
                out.update((r["session_id"], str(r["frame"]), str(r["square"]))
                           for r in read_jsonl(path))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dataset", default="real13-mix-v7-128")
    ap.add_argument("--folds", default="_fold0128v7/rot-s42,_fold1128v7/rot-s42,"
                                       "_fold2128v7/rot-s42,_fold3128v7/rot-s42")
    ap.add_argument("--out", default="data/reports/oof-review.jsonl")
    args = ap.parse_args()

    import torch
    from torch.utils.data import DataLoader

    from chesslab.dataset_build import dataset_dir
    from chesslab.training.boardnet import CELLS
    from chesslab.training.engine import get_device
    from chesslab.training.evaluate import _load_run
    from chesslab.training.occlusion import classification_eligible
    from chesslab.training.packs import cfg_for_pack, resolve_dataset_packs
    from chesslab.training.torch_data import PackedBoardDataset, eval_transform_for

    dd = dataset_dir(args.dataset)
    all_rows = read_jsonl(dd / "manifest.jsonl")
    device = get_device(require_gpu=False)
    seen = judged()
    print(f"{len(all_rows)} Zeilen, {len(seen)} Zellen tragen schon ein Urteil")

    found: list[dict] = []
    covered: set[str] = set()
    for run in args.folds.split(","):
        run_dir = MODELS / run
        model, cfg = _load_run(run_dir)
        model = model.to(device).eval()
        split = json.loads((dd / cfg["split_file"]).read_text(encoding="utf-8"))["splits"]
        # NUR der Test-Teil: alles andere hat dieses Modell trainiert.
        mine = set(split["test"])
        covered |= mine
        rows = [r for r in all_rows if r.get("session_id") in mine]
        if not rows:
            print(f"   {run}: keine Zeilen im Test-Teil")
            continue
        packed = resolve_dataset_packs(args.dataset, manifest_rows=all_rows)
        tf = eval_transform_for(cfg_for_pack(cfg, args.dataset, packed))
        ds = PackedBoardDataset(rows, cfg["classes"], tf, packed)
        rows = getattr(ds, "rows", None) or rows
        loader = DataLoader(ds, batch_size=max(1, 256 // CELLS), shuffle=False,
                            num_workers=2, collate_fn=getattr(ds, "collate_fn", None))
        preds: list[int] = []
        with torch.no_grad():
            for x, y in loader:
                logits = model(x.to(device))
                if y.dim() == 2:
                    logits = logits[:, :-1]
                preds.extend(logits.argmax(1).cpu().tolist())
        names = cfg["classes"]
        hits = 0
        for row, p in zip(rows, preds, strict=True):
            key = (str(row.get("session_id")), str(row.get("frame")), str(row.get("square")))
            if key in seen or not classification_eligible(row):
                continue
            if names[p] == row["label"]:
                continue
            found.append({"session_id": key[0], "frame": key[1], "square": key[2],
                          "fen_label": row["label"], "predicted": names[p],
                          "prob": 1.0, "margin": 1.0, "model_cov": row.get("coverage"),
                          "fold": run, "model": f"out-of-fold {run}"})
            hits += 1
        print(f"   {run}: {len(mine)} Sessions, {len(rows)} Zellen, {hits} Widersprueche")

    print(f"\n{len(covered)} Sessions out-of-fold gelesen")
    print(f"{len(found)} ungeurteilte Zellen, auf denen das ungesehene Modell widerspricht")
    for (a, b), n in collections.Counter((f["fen_label"], f["predicted"])
                                         for f in found).most_common(10):
        print(f"   {a:6s} -> {b:6s} {n:6d}x")
    write_rows(Path(args.out), found)
    print(f"[OK] {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
