"""Die Fehler des besten Laufs als Kontaktbogen — Crop, Label, Antwort, Konfidenz.

Die Frage dahinter ist nicht "wie viele", sondern "sind das echte Fehler oder schlechte Labels".
Das entscheidet nur das Auge, also zeigt das Blatt den Crop, nicht die Zahl.

    uv run python scripts/show_errors.py --run data/models/_arch128v6/rot-s42
"""

from __future__ import annotations

import argparse
import collections
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageDraw

from chesslab.dataset_build import dataset_dir
from chesslab.training.boardnet import CELLS
from chesslab.training.engine import evaluate_dataset
from chesslab.training.occlusion import PIECE_VISIBLE_MAX as VMAX
from chesslab.training.packs import (
    cfg_for_pack,
    load_packed,
    open_packed_rows,
    resolve_dataset_packs,
)
from chesslab.training.torch_data import PackedBoardDataset, eval_transform_for

CELL, PAD, BAR = 112, 6, 28


def cov_str(cov) -> str:
    """`—` statt `0.00`, wenn nie gemattet wurde — sonst liest sich blind wie frei."""
    return "   —" if cov is None else f"{float(cov):.2f}"


def collect_wrong(rows, trues, preds, conf, classes):
    """Die falschen Zellen, die Zahl der beurteilten und der UNGEMESSENEN: `coverage is None` wird
    gezaehlt und genannt, nicht aussortiert.
    """
    wrong, seen, blind = [], 0, 0
    for r, t, p_, c in zip(rows, trues, preds, conf, strict=False):
        cov = r.get("coverage")
        if cov is None:
            blind += 1
        elif float(cov) > VMAX:
            continue
        seen += 1
        if t != p_:
            wrong.append({**r, "pred": classes[p_], "conf": c})
    return wrong, seen, blind


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--run", required=True)
    ap.add_argument("--split", default="val")
    ap.add_argument("--cols", type=int, default=8)
    ap.add_argument("--max", type=int, default=48)
    ap.add_argument("--exclude-dirty", action="store_true",
                    help="Frames aus `dirty/` der Aufnahme verwerfen.")
    ap.add_argument("--kind", choices=("empty", "farbe", "typ"), default=None,
                    help="Nur diese Fehlerart zeigen.")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    from chesslab.dataset import load_manifest, load_split
    from chesslab.training.data import filter_rows_by_split
    from chesslab.training.evaluate import _load_run

    run_dir = Path(args.run)
    model, cfg = _load_run(run_dir)
    model.eval()
    classes = cfg["classes"]
    ds_name = cfg["dataset"]
    dd = dataset_dir(ds_name)
    # Genau die Maschinerie von `chesslab eval`: selbstgebaute Vorverarbeitung meldete 5,64 % statt
    # 0,64 %.
    manifest = load_manifest(dd / "manifest.jsonl")
    rows = filter_rows_by_split(
        manifest, load_split(dd / (cfg.get("split_file") or "split.json")), args.split)
    if args.exclude_dirty:
        # `dirty/` ist die Pile, `boards/` der saubere Stock; je FRAME gefiltert, Bretter bleiben
        # vollstaendig.
        before = len(rows)
        keep = []
        cache: dict[str, set] = {}
        for r in rows:
            sid = r["session_id"]
            if sid not in cache:
                rec = Path("data/recordings") / sid.removeprefix("rg-")
                d = rec / "dirty"
                cache[sid] = {f.stem for f in d.iterdir()} if d.is_dir() else set()
            if r["frame"] not in cache[sid]:
                keep.append(r)
        rows = keep
        print(f"[clean] {len(rows)} von {before} Zeilen "
              f"({100 * (before - len(rows)) / max(1, before):.1f} % aus dirty/ verworfen)")
    packed = resolve_dataset_packs(ds_name, manifest_rows=rows) or load_packed(ds_name)
    ds = PackedBoardDataset(rows, classes, eval_transform_for(cfg_for_pack(cfg, ds_name, packed)),
                            packed)
    rows = ds.rows

    mm, index = open_packed_rows(ds_name, manifest)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    res = evaluate_dataset(model, ds, device, batch_size=max(1, 256 // CELLS), keep_workers=False)
    trues, preds = res["trues"].tolist(), res["preds"].tolist()
    conf = res.get("conf")
    conf = list(conf) if conf is not None else [float("nan")] * len(trues)

    wrong, seen, blind = collect_wrong(rows, trues, preds, conf, classes)

    def kind_of(true: str, pred: str) -> str:
        """`empty` sind Zug-Momente, Farbkonflikte sind der teuerste Fehler im Tracker."""
        if "empty" in (true, pred):
            return "empty"
        return "farbe" if true[0] != pred[0] else "typ"

    for r in wrong:
        r["kind"] = kind_of(r["label"], r["pred"])
    counts = collections.Counter(r["kind"] for r in wrong)
    print("   Art: " + "  ".join(f"{k} {v}" for k, v in counts.most_common()))
    if args.kind:
        wrong = [r for r in wrong if r["kind"] == args.kind]
        print(f"   gefiltert auf '{args.kind}': {len(wrong)}")
    wrong.sort(key=lambda r: -r["conf"])
    print(f"{len(wrong)} falsche von {seen} nicht verdeckten Zellen "
          f"({100 * len(wrong) / max(1, seen):.2f} %)"
          + (f", davon {blind} ohne gemessene Coverage" if blind else ""))
    per = collections.Counter(f"{r['label']}->{r['pred']}" for r in wrong)
    print("   " + "  ".join(f"{k} {v}" for k, v in per.most_common(10)))

    for r in wrong[:20]:
        print(f"    {r['session_id'][-8:]} ply={r.get('ply')} frame={r.get('frame')} "
              f"{r['square']} {r['label']}->{r['pred']} conf={r['conf']:.2f} "
              f"cov={cov_str(r.get('coverage'))} settle={r.get('settle_dev')}")
    show = wrong[:args.max]
    if not show:
        return 0
    cols = args.cols
    grid = (len(show) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (CELL + PAD) + PAD, grid * (CELL + BAR + PAD) + PAD), (18, 20, 24))
    dr = ImageDraw.Draw(sheet)
    for i, r in enumerate(show):
        x = PAD + (i % cols) * (CELL + PAD)
        y = PAD + (i // cols) * (CELL + BAR + PAD)
        sheet.paste(Image.fromarray(np.asarray(mm[index[r["path"]]])).resize((CELL, CELL), Image.NEAREST), (x, y))
        dr.text((x + 2, y + CELL + 2), f"{r['session_id'][-8:]} {r['square']} = {r['label']}", fill=(120, 230, 140))
        dr.text((x + 2, y + CELL + 14), f"-> {r['pred']}  {r['conf']:.2f}  [{r['kind']}]", fill=(240, 140, 130))
    out = Path(args.out or (run_dir / f"errors_{args.split}{'_clean' if args.exclude_dirty else ''}"
                                  f"{'_' + args.kind if args.kind else ''}.png"))
    sheet.save(out)
    print(f"[OK] {len(show)} Faelle -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
