"""Die Faelle aus `matte_audit.py` als Kontaktbogen — ganzes Brett, geflaggte Felder markiert.

Die Zahl sagt nur, dass zwei Sensoren sich widersprechen. Ob wirklich eine Hand im Bild ist,
entscheidet das Auge, also zeigt das Blatt das Brett und nicht die Zelle.

    uv run python scripts/matte_audit_montage.py [--max 36]
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw

from chesslab.calibration import _square_to_col_row
from chesslab.ioutil import read_jsonl
from chesslab.labeling import _profile_for_session, read_log, read_session_meta

TILE, PAD, BAR = 232, 6, 30


def board_path(rec: Path, frame: str) -> Path | None:
    for sub in ("dirty", "boards"):
        p = rec / sub / f"{frame}.webp"
        if p.exists():
            return p
    return None


def cell_box(square: str, entry: dict, white_pov: bool, tile: int) -> tuple[float, float, float]:
    """`(x, y, Zellweite)` im Kachelbild — mit Rand und Blickrichtung aus Log-Zeile und Profil.

    Wie `matte_audit` vor 2026-09-21: `tile / 8` ueber das ganze Bild ignoriert den mitgespeicherten
    Rand, und ohne `white_pov` markiert das Blatt bei Schwarz unten die gespiegelten Felder.
    """
    scale = tile / (entry["board_size"] + 2 * entry["board_border"])
    cell = entry["board_size"] / 8 * scale
    col, row = _square_to_col_row(square, white_pov)
    offset = entry["board_border"] * scale
    return offset + col * cell, offset + row * cell, cell


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--audit", default="data/reports/matte-audit.jsonl")
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--max", type=int, default=36)
    ap.add_argument("--out", default="data/reports/matte-audit.png")
    args = ap.parse_args()

    cases = read_jsonl(Path(args.audit))
    cases.sort(key=lambda c: -len(c["squares"]))
    cases = cases[:args.max]
    if not cases:
        print("[--] keine Faelle")
        return 1

    rows = (len(cases) + args.cols - 1) // args.cols
    sheet = Image.new("RGB", (args.cols * (TILE + PAD) + PAD, rows * (TILE + BAR + PAD) + PAD), (18, 20, 24))
    dr = ImageDraw.Draw(sheet)
    sessions: dict[str, tuple] = {}
    unplaced = 0
    for i, c in enumerate(cases):
        rec = Path("data/recordings") / c["session"]
        if c["session"] not in sessions:
            sessions[c["session"]] = (_profile_for_session(read_session_meta(rec), None).white_pov,
                                      {Path(r["frame"]).stem: r for r in read_log(rec)})
        white_pov, log = sessions[c["session"]]
        entry = log.get(c["frame"], {})
        p = board_path(rec, c["frame"])
        if p is None or "board_size" not in entry or "board_border" not in entry:
            unplaced += 1
            continue
        x = PAD + (i % args.cols) * (TILE + PAD)
        y = PAD + (i // args.cols) * (TILE + BAR + PAD)
        board = Image.open(p).convert("RGB").resize((TILE, TILE), Image.LANCZOS)
        mark = ImageDraw.Draw(board)
        for sq in c["squares"]:
            fx, fy, cell = cell_box(sq, entry, white_pov, TILE)
            mark.rectangle([fx, fy, fx + cell - 1, fy + cell - 1], outline=(255, 90, 90), width=2)
        sheet.paste(board, (x, y))
        dr.text((x + 2, y + TILE + 2), f"{c['session'][-8:]} {c['frame']} ply={c['ply']}", fill=(200, 200, 210))
        dr.text((x + 2, y + TILE + 15), f"{len(c['squares'])}x {' '.join(c['squares'][:8])}", fill=(240, 140, 130))
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"[OK] {len(cases) - unplaced} von {len(cases)} Faellen -> {out}"
          + (f" ({unplaced} ohne Brett oder Rasterangabe, nicht gezeichnet)" if unplaced else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
