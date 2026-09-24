"""Wie viel Figur liegt ausserhalb des gespeicherten Bretts? Die Figur neigt sich radial nach
aussen, auf den Grundreihen faellt ihr Kopf aus dem 12-px-Rand. Warpt EIN Frame mit grossem Rand
daneben.

    uv run python scripts/border_probe.py [--session 2026-08-08-00-39-57] [--pad 220]"""
import argparse
from pathlib import Path

import cv2
import numpy as np

from chesslab import config
from chesslab.calibration import load_profile, warp_padded
from chesslab.ioutil import read_jsonl
from chesslab.realgames import decode as rg_decode
from chesslab.session_store import recording as store_rec
from chesslab.session_store.paths import read_session_meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--session", default="2026-08-08-00-39-57")
    ap.add_argument("--pad", type=int, default=220, help="Rand in px (heute 12).")
    ap.add_argument("--out", default="data/reports/lean")
    a = ap.parse_args()

    sdir = config.DATA.recordings / a.session
    profile = load_profile(read_session_meta(sdir)["profile"])
    rows = read_jsonl(sdir / "log.jsonl")
    row = next((r for r in rows if r.get("board") and r.get("frame") and not r.get("dirty")), None)
    if row is None:
        raise SystemExit("kein sauberes Brett mit Frame-Nummer")
    idx = int(Path(str(row["frame"])).stem)
    # Vorwaerts dekodiert wie der Export: ein Seek landet NEBEN dem Index.
    video = store_rec.video_path(a.session)
    rotation = rg_decode.detect_rotation(video, store_rec.load_candidate(a.session), {idx})
    frame = next((f for _, f in rg_decode.stream_frames(video, [row], rotation)), None)
    if frame is None:
        raise SystemExit(f"Frame {idx} nicht lesbar")
    print(f"[i] Frame {idx} aus {a.session}, Quelle {frame.shape[1]}x{frame.shape[0]}")

    wide = warp_padded(frame, profile, row["corners"], a.pad)
    bs, pad = profile.board_size, a.pad
    Path(a.out).mkdir(parents=True, exist_ok=True)
    # Der heutige Ausschnitt als Rahmen ins weite Bild: was ausserhalb liegt, ist verloren.
    marked = wide.copy()
    old = row["board_border"]
    cv2.rectangle(marked, (pad - old, pad - old), (pad + bs + old, pad + bs + old),
                  (60, 220, 255), 3)
    cv2.putText(marked, f"gespeichert: board_size {bs} + border {old}", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (60, 220, 255), 2)
    cv2.imwrite(f"{a.out}/border-wide.png", marked)
    print(f"[OK] {a.out}/border-wide.png  ({wide.shape[1]}x{wide.shape[0]})")

    cell = bs / 8.0
    tiles = []
    for sq, col, rank in (("a8", 0, 8), ("d8", 3, 8), ("h8", 7, 8),
                          ("a1", 0, 1), ("d1", 3, 1), ("h1", 7, 1)):
        cx = pad + int((col + 0.5) * cell)
        cy = pad + int((8 - rank + 0.5) * cell)
        r = int(cell * 1.6)
        tile = wide[max(0, cy - r):cy + r, max(0, cx - r):cx + r].copy()
        h_, w_ = tile.shape[:2]
        c = int(cell / 2)
        cv2.rectangle(tile, (w_ // 2 - c, h_ // 2 - c), (w_ // 2 + c, h_ // 2 + c),
                      (60, 220, 255), 2)
        tiles.append((sq, cv2.resize(tile, (240, 240))))
    sheet = np.full((2 * 262, 3 * 248, 3), 22, np.uint8)
    for i, (sq, t) in enumerate(tiles):
        y, x = (i // 3) * 262 + 8, (i % 3) * 248 + 8
        sheet[y:y + 240, x:x + 240] = t
        cv2.putText(sheet, sq, (x, y + 256), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (150, 220, 255), 1)
    cv2.imwrite(f"{a.out}/border-cells.png", sheet)
    print(f"[OK] {a.out}/border-cells.png")


if __name__ == "__main__":
    main()
