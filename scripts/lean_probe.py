"""Wie weit ragt eine Figur ueber ihr eigenes Feld hinaus?

Der Crop ist das Feld plus 5 % zur Seite. Bei einer stehenden Figur und einer Kamera ueber dem
Brett faellt der KOPF — das einzige, was Springer von Laeufer von Turm trennt — in ein
Nachbarfeld. Das waere die Erklaerung dafuer, dass 98 % der Fehler Typfehler sind und die
Grundreihen die schlimmsten sind.

Zeichnet das Zellraster auf ein rektifiziertes Brett und daneben dieselbe Zelle bei wachsendem
`pad_side`.

    uv run python scripts/lean_probe.py [--session ...] [--square d8]
"""
import argparse
from pathlib import Path

import cv2
import numpy as np

from chesslab import config
from chesslab.calibration import load_profile, square_to_crop_box
from chesslab.ioutil import read_jsonl
from chesslab.labeling import read_session_meta, usable_board


def cut(board, x0: int, y0: int, x1: int, y1: int):
    """Die Box aus dem berandeten Brett, ueberstehendes schwarz — wie `labeling.crop_square`.

    `clamp=True` machte aus der Randzelle eine KLEINERE Box (d8 wurde 128x122) und stauchte sie
    beim Skalieren: genau die Reihe, deren Ueberhang diese Sonde messen soll.
    """
    h, w = board.shape[:2]
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(w, x1), min(h, y1)
    return cv2.copyMakeBorder(board[ya:yb, xa:xb], ya - y0, y1 - yb, xa - x0, x1 - xb,
                              cv2.BORDER_CONSTANT, value=(0, 0, 0))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--session", default="rg-2026-08-16-20-41-33")
    ap.add_argument("--squares", default="a8,d8,h8,a1,d1,h1,d4,d5")
    ap.add_argument("--pads", default="0.0,0.3,0.6,1.0")
    ap.add_argument("--out", default="data/reports/lean")
    a = ap.parse_args()

    sdir = config.DATA.recordings / a.session.replace("rg-", "", 1)
    profile = load_profile(read_session_meta(sdir)["profile"])
    row = None
    for r in read_jsonl(sdir / "log.jsonl"):
        # Ein Brett aus der Grundstellung: da stehen alle hohen Figuren auf Reihe 1 und 8.
        # `usable_board`, nicht `r.get("board")`: nur ein Brett, das unter DIESEM Profil
        # geschrieben wurde, traegt das Rastermass, mit dem hier geschnitten wird.
        if usable_board(r, profile) and not r.get("dirty") and str(r.get("ply", 0)) in ("0", "1", "2"):
            row = r
            break
    if row is None:
        raise SystemExit("kein sauberes Brett aus der Eroeffnung gefunden")
    board = cv2.imread(str(sdir / row["board"]))
    # Rastermass aus der ZEILE, nicht aus dem Profil oder der Bildform: das gespeicherte Brett
    # traegt seinen Rand mit (952 px bei `board_size` 928), und das Raster bei 0 zu beginnen
    # verschob jede Zelle um 12 px — ein Zehntel Zelle, auf der Grundreihe zusaetzlich
    # abgeschnitten. Dieselbe Wurzel wie in `matte_audit` (2026-09-21).
    bs, border = int(row["board_size"]), int(row["board_border"])
    if board.shape[:2] != (bs + 2 * border, bs + 2 * border):
        raise SystemExit(f"{row['board']} misst {board.shape[1]}x{board.shape[0]}, die Zeile "
                         f"sagt {bs}+2*{border}")
    grid = board.copy()
    cell = bs / 8.0
    for i in range(9):
        p = border + int(round(i * cell))
        cv2.line(grid, (p, border), (p, border + bs), (60, 220, 255), 1)
        cv2.line(grid, (border, p), (border + bs, p), (60, 220, 255), 1)
    Path(a.out).mkdir(parents=True, exist_ok=True)
    cv2.imwrite(f"{a.out}/board-grid.png", grid)
    print(f"[OK] {a.out}/board-grid.png   ply={row.get('ply')}  board_size={bs}")

    pads = [float(x) for x in a.pads.split(",")]
    squares = a.squares.split(",")
    CELLPX = 150
    sheet = np.full((len(squares) * (CELLPX + 22) + 10,
                     len(pads) * (CELLPX + 8) + 10, 3), 22, np.uint8)
    for r_i, sq in enumerate(squares):
        for c_i, pu in enumerate(pads):
            prof = load_profile(read_session_meta(sdir)["profile"])
            object.__setattr__(prof.crop, "pad_side", pu)
            x0, y0, x1, y1 = square_to_crop_box(sq, prof, clamp=False)
            crop = cv2.resize(cut(board, x0 + border, y0 + border, x1 + border, y1 + border),
                              (CELLPX, CELLPX))
            y = 10 + r_i * (CELLPX + 22)
            x = 10 + c_i * (CELLPX + 8)
            sheet[y:y + CELLPX, x:x + CELLPX] = crop
            cv2.putText(sheet, f"{sq} pad_side {pu}", (x, y + CELLPX + 14),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (150, 220, 255), 1)
    cv2.imwrite(f"{a.out}/pad-side.png", sheet)
    print(f"[OK] {a.out}/pad-side.png")


if __name__ == "__main__":
    main()
