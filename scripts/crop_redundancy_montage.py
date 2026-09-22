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
from pathlib import Path

import cv2
import numpy as np

from chesslab.ioutil import read_jsonl

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


def sharpness(pack: Path, rows: list[dict]) -> np.ndarray:
    """Laplace-Varianz je Crop — der billigste Unschaerfe-Melder, den es gibt.

    Nur INNERHALB einer Standzeit vergleichbar: die Zahl haengt an der Quelle (4K 1359, 1080p 521
    im Median, `sharpness nur je Aufloesungsklasse`), aber eine Standzeit hat nur eine Quelle.
    """
    mm, _ = base.open_pack(pack)
    out = np.empty(len(rows), dtype=np.float32)
    for i, row in enumerate(rows):
        grey = cv2.cvtColor(np.asarray(mm[row["_i"]]), cv2.COLOR_BGR2GRAY)
        out[i] = cv2.Laplacian(grey, cv2.CV_64F).var()
    return out


def crops(pack: Path, rows: list[dict], side: int) -> np.ndarray:
    mm, _ = base.open_pack(pack)
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
    ap.add_argument("--trim", type=float, default=0.10,
                    help="Anteil der vom Median entferntesten Crops, der VOR dem Spreizen "
                         "wegfaellt — dort sitzen Haende und Wackler.")
    ap.add_argument("--sharp-frac", type=float, default=0.6,
                    help="Crops unter diesem Anteil der Median-Schaerfe der Standzeit fliegen "
                         "raus, BEVOR Farthest-Point waehlt.")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    pack = PACKS / args.pack
    # `coverage is None` heisst NICHT GEMESSEN, nicht "frei" — das ist die Coverage Matte Trap
    # aus CLAUDE.md, und 49 % der Crops dieser Aufnahme tragen sie. Genau daraus kamen die Haende,
    # die Farthest-Point als "Vielfalt" auflas.
    rows = base.learnable([r | {"_i": i} for i, r in enumerate(read_jsonl(pack / "manifest.jsonl"))],
                          measured_only=True)
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
        sharp = sharpness(pack, group)
        keep = np.flatnonzero(sharp >= args.sharp_frac * float(np.median(sharp)))
        if len(keep) >= args.k:
            sub = raw[np.ix_(keep, keep)]
            clean = [int(keep[i]) for i in base.farthest_point(sub, args.k)]
        else:
            clean = far
        imgs_first = crops(pack, [group[i] for i in first], TILE)
        imgs_far = crops(pack, [group[i] for i in far], TILE)
        imgs_clean = crops(pack, [group[i] for i in clean], TILE)
        head = f"{key[0]} {key[1]} / {len(group)} Crops, Spannweite {span:.0f}"
        blocks.append(strip(imgs_first, f"{head}   |   die ERSTEN {args.k}"))
        blocks.append(strip(imgs_far, f"{'':{len(head)}s}   |   {args.k} Farthest-Point"))
        blocks.append(strip(imgs_clean, f"{'':{len(head)}s}   |   {args.k} Farthest-Point NACH "
                                        f"Schaerfe-Filter ({len(group) - len(keep)} verworfen)"))
        # Kern statt Rand: die vom Median der Strecke am weitesten entfernten Crops sind die
        # Haende und Wackler. Erst das oberste Zehntel abschneiden, DANN spreizen.
        to_median = raw.mean(axis=1)
        core = np.flatnonzero(to_median <= np.quantile(to_median, 1.0 - args.trim))
        if len(core) >= args.k:
            sub = raw[np.ix_(core, core)]
            trimmed = [int(core[i]) for i in base.farthest_point(sub, args.k)]
        else:
            trimmed = far
        blocks.append(strip(crops(pack, [group[i] for i in trimmed], TILE),
                            f"{'':{len(head)}s}   |   {args.k} Farthest-Point im KERN "
                            f"(oberste {args.trim:.0%} abgeschnitten)"))
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
