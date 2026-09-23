"""Die Verdachtsfaelle als Bild — sitzt der Crop daneben oder ist das Material hart?

`audit_sessions.py` findet Situationen, in denen das Modell in jedem Frame dieselbe falsche
Antwort mit hoher Konfidenz gibt. Das trennt konsistent von wackelig, aber nicht Labelfehler von
schwerer Figur. Das entscheidet nur das Auge, also: Crop, Label, Antwort, Konfidenz.

    uv run python scripts/audit_montage.py [--rank 8] [--out data/reports/audit-rank8.png]
"""
import argparse
import collections
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from chesslab.cell_rule import classification_eligible
from chesslab.dataset_build import dataset_dir
from chesslab.ioutil import read_jsonl
from chesslab.training.pack import open_packed_rows

CELL, PAD, BAR = 96, 6, 26


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="real13-straight-80-v3-c8d1")
    ap.add_argument("--audit", default="data/reports/session-audit.json")
    ap.add_argument("--rank", default="8", help="Nur diese Reihe, oder 'alle'.")
    ap.add_argument("--cols", type=int, default=10)
    ap.add_argument("--max", type=int, default=40)
    ap.add_argument("--out", default="data/reports/audit-rank8.png")
    args = ap.parse_args()

    audit = json.loads(Path(args.audit).read_text(encoding="utf-8"))
    cases = [(s, f) for s, v in audit.items() for f in v["faelle"]
             if args.rank == "alle" or f["square"][1] == args.rank]
    cases.sort(key=lambda sf: -sf[1]["conf"])
    cases = cases[:args.max]
    if not cases:
        print(f"[--] keine Faelle auf Reihe {args.rank}")
        return

    dd = dataset_dir(args.dataset)
    man = read_jsonl(dd / "manifest.jsonl")
    mm, index = open_packed_rows(args.dataset, man)
    # Ein Beispielcrop je (Session, Feld, Label) — die Situation ist ueber die Frames dieselbe.
    # Nur gemessen sichtbare Zellen: `or 0.0` zeigte ein ungemattetes Brett als freies Beispiel.
    pick: dict[tuple, str] = {}
    for r in man:
        k = (r["session_id"], r["square"], r["label"])
        if (k not in pick and r["path"] in index and r.get("coverage") is not None
                and classification_eligible(r)):
            pick[k] = r["path"]

    cols = args.cols
    rows = (len(cases) + cols - 1) // cols
    W = cols * (CELL + PAD) + PAD
    H = rows * (CELL + BAR + PAD) + PAD
    sheet = Image.new("RGB", (W, H), (18, 20, 24))
    dr = ImageDraw.Draw(sheet)
    for i, (sess, f) in enumerate(cases):
        p = pick.get((sess, f["square"], f["label"]))
        if p is None:
            continue
        x = PAD + (i % cols) * (CELL + PAD)
        y = PAD + (i // cols) * (CELL + BAR + PAD)
        crop = Image.fromarray(np.array(mm[index[p]])).resize((CELL, CELL), Image.NEAREST)
        sheet.paste(crop, (x, y))
        dr.text((x + 1, y + CELL + 2),
                f"{f['square']} {f['label']}", fill=(120, 230, 140))
        dr.text((x + 1, y + CELL + 13),
                f"-> {f['model']} {f['conf']:.2f} x{f['n']}", fill=(240, 140, 130))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    per = collections.Counter(f"{f['label']}->{f['model']}" for _s, f in cases)
    print(f"[OK] {len(cases)} Faelle -> {args.out}")
    print("   " + "  ".join(f"{k} {v}" for k, v in per.most_common(8)))


if __name__ == "__main__":
    main()
