"""Ein Feld ueber die Frames seines Ply-Intervalls — klassisch, ohne Modell.

Fuer die Frage, ob ein Label `stale` ist: laeuft die Figur im Lauf des Intervalls aus dem Feld,
traegt der FEN des Commits sie noch, und jede spaetere Zeile ist falsch gelabelt. Der
Intervall-Check der Aufnahme nennt die bewegten Felder bereits (`moved`), hier wird es sichtbar.

    uv run python scripts/move_strip.py --session 2026-09-06-20-27-33 --ply 26 --square d1
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from chesslab.dataset_build import dataset_dir
from chesslab.ioutil import read_jsonl
from chesslab.training.pack import load_packed

CELL, PAD, BAR = 104, 5, 26


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--session", required=True, help="Ordnername unter data/recordings/.")
    ap.add_argument("--dataset", default="real13-mix-v6-128")
    ap.add_argument("--ply", type=int, required=True)
    ap.add_argument("--square", required=True)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    sid = f"rg-{args.session}"
    dd = dataset_dir(args.dataset)
    manifest = read_jsonl(dd / "manifest.jsonl")
    img, (n, h, w), p2i = load_packed(args.dataset, manifest_rows=manifest)
    index = p2i or {r["path"]: r["_packed_idx"] for r in manifest if "_packed_idx" in r}
    mm = np.memmap(img, dtype=np.uint8, mode="r", shape=(n, h, w, 3))

    rows = sorted((r for r in manifest
                   if r["session_id"] == sid and r.get("ply") == args.ply
                   and r["square"] == args.square and r["path"] in index),
                  key=lambda r: r["frame"])
    if not rows:
        print("[--] keine Zeilen fuer diese Kombination")
        return 1

    iv = {r["ply"]: r for r in
          read_jsonl(Path("data/recordings") / args.session / "interval-check.jsonl")}
    moved = (iv.get(args.ply, {}).get("moved") or []) + (iv.get(args.ply + 1, {}).get("moved") or [])
    print(f"{len(rows)} Frames, Label {rows[0]['label']}, "
          f"moved({args.ply})={iv.get(args.ply, {}).get('moved')} "
          f"moved({args.ply + 1})={iv.get(args.ply + 1, {}).get('moved')} "
          f"-> {args.square} {'IST bewegt' if args.square in moved else 'nicht als bewegt gefuehrt'}")

    sheet = Image.new("RGB", (len(rows) * (CELL + PAD) + PAD, CELL + BAR + 2 * PAD), (18, 20, 24))
    dr = ImageDraw.Draw(sheet)
    for i, r in enumerate(rows):
        x = PAD + i * (CELL + PAD)
        sheet.paste(Image.fromarray(np.asarray(mm[index[r["path"]]])).resize((CELL, CELL), Image.NEAREST), (x, PAD))
        dr.text((x + 2, PAD + CELL + 2), r["frame"], fill=(200, 200, 210))
        dr.text((x + 2, PAD + CELL + 13),
                f"{r['label']} cov={float(r.get('coverage') or 0):.2f}", fill=(120, 230, 140))
    out = Path(args.out or f"data/reports/move-{args.session}-p{args.ply}-{args.square}.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"[OK] -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
