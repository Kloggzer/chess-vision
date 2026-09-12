"""Die Faelle aus `matte_audit.py` als Kontaktbogen — ganzes Brett, geflaggte Felder markiert.

Die Zahl sagt nur, dass zwei Sensoren sich widersprechen. Ob wirklich eine Hand im Bild ist,
entscheidet das Auge, also zeigt das Blatt das Brett und nicht die Zelle.

    uv run python scripts/matte_audit_montage.py [--max 36]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

TILE, PAD, BAR = 232, 6, 30
FILES = "abcdefgh"


def board_path(rec: Path, frame: str) -> Path | None:
    for sub in ("dirty", "boards"):
        p = rec / sub / f"{frame}.webp"
        if p.exists():
            return p
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--audit", default="data/reports/matte-audit.jsonl")
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--max", type=int, default=36)
    ap.add_argument("--out", default="data/reports/matte-audit.png")
    args = ap.parse_args()

    cases = [json.loads(x) for x in Path(args.audit).read_text(encoding="utf-8").splitlines() if x.strip()]
    cases.sort(key=lambda c: -len(c["squares"]))
    cases = cases[:args.max]
    if not cases:
        print("[--] keine Faelle")
        return 1

    rows = (len(cases) + args.cols - 1) // args.cols
    sheet = Image.new("RGB", (args.cols * (TILE + PAD) + PAD, rows * (TILE + BAR + PAD) + PAD), (18, 20, 24))
    dr = ImageDraw.Draw(sheet)
    for i, c in enumerate(cases):
        p = board_path(Path("data/recordings") / c["session"], c["frame"])
        if p is None:
            continue
        x = PAD + (i % args.cols) * (TILE + PAD)
        y = PAD + (i // args.cols) * (TILE + BAR + PAD)
        board = Image.open(p).convert("RGB").resize((TILE, TILE), Image.LANCZOS)
        mark = ImageDraw.Draw(board)
        cell = TILE / 8
        for sq in c["squares"]:
            fx = FILES.index(sq[0]) * cell
            fy = (8 - int(sq[1])) * cell            # a1 unten links, wie der Sensor es liest
            mark.rectangle([fx, fy, fx + cell - 1, fy + cell - 1], outline=(255, 90, 90), width=2)
        sheet.paste(board, (x, y))
        dr.text((x + 2, y + TILE + 2), f"{c['session'][-8:]} {c['frame']} ply={c['ply']}", fill=(200, 200, 210))
        dr.text((x + 2, y + TILE + 15), f"{len(c['squares'])}x {' '.join(c['squares'][:8])}", fill=(240, 140, 130))
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"[OK] {len(cases)} Faelle -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
