"""Die Redundanz zum Ansehen: dieselbe Figur als Dublettenreihe und als Auswahl.

Zahlen ueberzeugen nicht bei einer Frage, die das Auge beantworten kann. Je Standzeit zwei
Reihen aus DENSELBEN Crops:

  oben   acht aufeinanderfolgende — was das Training heute bekommt
  unten  acht per Farthest-Point — die Spannweite derselben Strecke

Steht oben achtmal dasselbe Bild und unten acht verschiedene, ist die Frage beantwortet.

    uv run python scripts/crop_redundancy_montage.py --pack rg-2026-09-15-16-54-44-128
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np

from chesslab.ioutil import read_jsonl
from chesslab.training.occlusion import PIECE_VISIBLE_MAX

PACKS = Path("data/packs")
THUMB = 16
#: So gross wird eine Kachel in der Montage.
TILE = 96
PAD = 4


def _sub(script: str):
    import importlib.util
    import sys

    spec = importlib.util.spec_from_file_location("_redundancy", Path(__file__).with_name(script))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


base = _sub("crop_redundancy.py")


def crops(pack: Path, rows: list[dict], side: int) -> np.ndarray:
    meta = json.loads((pack / "packed_meta.json").read_text(encoding="utf-8"))
    n, h, w = meta["n"], meta["h"], meta["w"]
    mm = np.memmap(pack / "packed_images.u8", dtype=np.uint8, mode="r", shape=(n, h, w, 3))
    out = np.empty((len(rows), side, side, 3), dtype=np.uint8)
    for i, row in enumerate(rows):
        out[i] = cv2.resize(np.asarray(mm[row["_i"]]), (side, side), interpolation=cv2.INTER_AREA)
    return out


def strip(images: np.ndarray, label: str) -> np.ndarray:
    """Eine Reihe Kacheln mit einer Beschriftung links."""
    k = len(images)
    row = np.full((TILE + 2 * PAD, k * (TILE + PAD) + PAD, 3), 24, np.uint8)
    for i, img in enumerate(images):
        x = PAD + i * (TILE + PAD)
        row[PAD:PAD + TILE, x:x + TILE] = img[:, :, ::-1]
    banner = np.full((22, row.shape[1], 3), 24, np.uint8)
    cv2.putText(banner, label, (PAD, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (230, 230, 230), 1,
                cv2.LINE_AA)
    return np.vstack([banner, row])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pack", required=True)
    ap.add_argument("--k", type=int, default=8, help="Kacheln je Reihe.")
    ap.add_argument("--runs", type=int, default=3, help="Wie viele Standzeiten zeigen?")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    pack = PACKS / args.pack
    rows = [r | {"_i": i} for i, r in enumerate(read_jsonl(pack / "manifest.jsonl"))
            if float(r.get("coverage") or 0.0) <= PIECE_VISIBLE_MAX]
    runs = base.runs_of(rows)

    picks = []
    for key, group in sorted(runs.items()):
        if key[1] == "empty" or len(group) < 60:
            continue
        flat = base.thumbs(pack, group)
        raw = np.abs(flat[:, None, :] - flat[None, :, :]).mean(axis=2)
        picks.append((float(raw.max()), key, group, raw))
    if not picks:
        print("keine Standzeit mit einer Figur und genug Crops")
        return 1
    # Die mit der groessten Spannweite zuerst: dort ist am meisten zu SEHEN, und genau dort
    # faellt auf, dass acht aufeinanderfolgende davon nichts zeigen.
    picks.sort(key=lambda p: -p[0])

    blocks = []
    for span, key, group, raw in picks[:args.runs]:
        far = base.farthest_point(raw, args.k)
        first = list(range(min(args.k, len(group))))
        imgs_first = crops(pack, [group[i] for i in first], TILE)
        imgs_far = crops(pack, [group[i] for i in far], TILE)
        head = f"{key[0]} {key[1]} / {len(group)} Crops, Spannweite {span:.0f}"
        blocks.append(strip(imgs_first, f"{head}   |   die ERSTEN {args.k} (was das Training kriegt)"))
        blocks.append(strip(imgs_far, f"{'':{len(head)}s}   |   {args.k} per Farthest-Point"))
        blocks.append(np.full((10, blocks[-1].shape[1], 3), 12, np.uint8))

    width = max(b.shape[1] for b in blocks)
    canvas = np.vstack([
        np.pad(b, ((0, 0), (0, width - b.shape[1]), (0, 0)), constant_values=12) for b in blocks])
    out = Path(args.out or f"{args.pack}-montage.png")
    cv2.imwrite(str(out), canvas)
    print(f"geschrieben: {out}  ({canvas.shape[1]}x{canvas.shape[0]})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
