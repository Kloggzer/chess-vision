"""Was in der Audit-Lane wirklich liegt — Crop, Flag und die Coverage der Matte nebeneinander.

Der Nutzer meldete „fast nur Haende" (2026-08-26). Die Lane filtert bereits auf
`MATTE_DIRTY` = 0,15, also waere das kein Filterfehler sondern ein MESSfehler: die Matte sagt
sichtbar, wo eine Hand liegt. Diese Probe schreibt beides ins Bild, damit die Frage entscheidbar
ist statt geglaubt.

    uv run python scripts/audit_lane_probe.py [--max 40] [--label empty]
"""
import argparse
import collections
from pathlib import Path

import cv2
from PIL import Image, ImageDraw

from chesslab import config
from chesslab.calibration import load_profile
from chesslab.ioutil import read_jsonl
from chesslab.labeling import (
    all_squares,
    board_source,
    crops_for_frame,
    read_matte,
    read_session_meta,
)

CELL, PAD, BAR = 104, 6, 26


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--flags", default="data/reports/audit-flags.jsonl")
    ap.add_argument("--label", default="empty", help="Nur Flags mit diesem FEN-Label, '' = alle.")
    ap.add_argument("--max", type=int, default=40)
    ap.add_argument("--cols", type=int, default=10)
    ap.add_argument("--out", default="data/reports/audit-lane-probe.png")
    args = ap.parse_args()

    flags = read_jsonl(Path(args.flags))
    if args.label:
        flags = [f for f in flags if f["fen_label"] == args.label]
    # Ueber die Sessions streuen: 40 Flags aus einer Aufnahme beantworten die Frage nicht.
    by_sess = collections.defaultdict(list)
    for f in flags:
        by_sess[f["session_id"]].append(f)
    picked, i = [], 0
    while len(picked) < args.max and any(len(v) > i for v in by_sess.values()):
        for s in sorted(by_sess):
            if len(by_sess[s]) > i and len(picked) < args.max:
                picked.append(by_sess[s][i])
        i += 1

    cols = args.cols
    rows_n = (len(picked) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (CELL + PAD) + PAD, rows_n * (CELL + BAR + PAD) + PAD),
                      (18, 20, 24))
    dr = ImageDraw.Draw(sheet)
    squares = all_squares()
    cache: dict[str, tuple] = {}
    n_hand = n_blind = n_shown = 0
    for i, f in enumerate(picked):
        sess = f["session_id"]
        sdir = config.DATA.recordings / sess.replace("rg-", "", 1)
        if sess not in cache:
            meta = read_session_meta(sdir)
            log = {}
            for r in read_jsonl(sdir / "log.jsonl"):
                key = Path(str(r.get("frame") or "")).stem
                if key:
                    log[key] = r
            cache[sess] = (load_profile(meta["profile"]), log, read_matte(sdir))
        profile, log, matte = cache[sess]
        row = log.get(f["frame"])
        if row is None:
            continue
        rel, stored = board_source(row, profile)
        img = cv2.imread(str(sdir / rel))
        if img is None:
            continue
        cells = (crops_for_frame(None, row["corners"], profile, board=img) if stored
                 else crops_for_frame(img, row["corners"], profile))
        crop = cells[squares.index(f["square"])]
        # TODO(bug-hunt 2026-09-16f): ein Frame ohne Matte-Zeile ist nicht gemessen; als 0,0
        # gelesen sank die Quote, die hier die Frage "fast nur Haende?" beantworten soll.
        cells = matte.get(f["frame"])
        n_blind += cells is None
        n_shown += 1
        cov = float((cells or {}).get(f["square"], 0.0))
        n_hand += cov > 0.0
        x = PAD + (i % cols) * (CELL + PAD)
        y = PAD + (i // cols) * (CELL + BAR + PAD)
        sheet.paste(Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)).resize((CELL, CELL)),
                    (x, y))
        dr.text((x + 1, y + CELL + 2), f"{f['square']} {f['fen_label']}", fill=(120, 230, 140))
        dr.text((x + 1, y + CELL + 13), f"-> {f['predicted']} {f['prob']:.2f}  cov {cov:.2f}",
                fill=(240, 140, 130))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(f"[OK] {len(picked)} Flags aus {len(by_sess)} Sessions -> {args.out}")
    print(f"     davon mit Matte > 0: {n_hand} von {n_shown} gezeichneten "
          f"({100 * n_hand / max(1, n_shown):.0f} %), ohne Matte: {n_blind}")


if __name__ == "__main__":
    main()
