"""Sitzt der Schnitt auf den Rillen? Das Raster auf die gespeicherten Bretter gezeichnet.

`check_alignment.py` beantwortet dieselbe Frage genauer, braucht dafuer aber die QUELL-Frames —
und die sind seit dem Brett-Store weg (96 GB -> 4,5 GB). Dieses Blatt arbeitet auf dem, was
heute daliegt: das Brett ist rektifiziert und geradegezogen, also ist das nominale Achtelraster
genau die Linie, an der `slice` schneidet. Weicht eine Rille davon ab, sieht man es.

    uv run python scripts/board_grid_probe.py --out data/reports/ausrichtung.png
"""

from __future__ import annotations

import argparse
import statistics as st
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

from chesslab.session_store.log import ExportInterrupted, read_log_rows

REC = Path("data/recordings")
TILE, PAD, BAR = 280, 8, 16


def one_board(d: Path) -> tuple[np.ndarray, dict, float] | None:
    """Ein sauberes Brett der Aufnahme, seine Zeile, und der Median ihrer Ausrichtung."""
    rows, align = [], []
    for r in read_log_rows(d):
        if r.get("align_worst_px") is not None:
            align.append(float(r["align_worst_px"]))
        if r.get("board") and r.get("grid_lines") and not r.get("dirty"):
            rows.append(r)
    if not rows:
        return None
    row = rows[len(rows) // 2]
    img = cv2.imread(str(d / "boards" / Path(str(row["board"])).name))
    return (img, row, st.median(align) if align else float("nan")) if img is not None else None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--sessions", default="", help="Kommagetrennt; leer heisst: die schlechtesten.")
    ap.add_argument("--max", type=int, default=6)
    ap.add_argument("--cols", type=int, default=3)
    ap.add_argument("--out", default="data/reports/ausrichtung.png")
    args = ap.parse_args()

    names = [s.strip() for s in args.sessions.split(",") if s.strip()]
    found = []
    for d in sorted(REC.iterdir()):
        if not (d / "log.jsonl").is_file() or (names and d.name not in names):
            continue
        try:
            got = one_board(d)
        except ExportInterrupted as exc:
            print(f"[i] {d.name}: uebersprungen — {exc}")
            continue
        if got:
            found.append((d.name, *got))
    found.sort(key=lambda x: -x[3])
    show = found[:args.max]
    if not show:
        print("[FAIL] keine Aufnahme mit Brett und Mesh gefunden")
        return 1

    cols = min(args.cols, len(show))
    grid = (len(show) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (TILE + PAD) + PAD, grid * (TILE + BAR + PAD) + PAD),
                      (18, 20, 24))
    dr = ImageDraw.Draw(sheet)
    for i, (name, img, row, med) in enumerate(show):
        bs, b = int(row["board_size"]), int(row.get("board_border") or 0)
        tile = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)).resize((TILE, TILE),
                                                                            Image.LANCZOS)
        d2 = ImageDraw.Draw(tile)
        # Das nominale Achtelraster IM Brett-Koordinatensystem, auf die Kachel skaliert: genau
        # die Linien, an denen `crop_square` schneidet (`labeling.py:169-171`).
        k = TILE / img.shape[1]
        for n in range(9):
            v = (b + n * bs / 8) * k
            d2.line([(v, 0), (v, TILE)], fill=(90, 220, 255), width=1)
            d2.line([(0, v), (TILE, v)], fill=(90, 220, 255), width=1)
        sheet.paste(tile, (PAD + (i % cols) * (TILE + PAD), PAD + (i // cols) * (TILE + BAR + PAD)))
        dr.text((PAD + (i % cols) * (TILE + PAD) + 2,
                 PAD + (i // cols) * (TILE + BAR + PAD) + TILE + 2),
                f"{name}  Ausrichtung {med:.2f} px  ply {row.get('ply')}", fill=(210, 215, 225))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(f"[OK] {len(show)} Aufnahmen -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
