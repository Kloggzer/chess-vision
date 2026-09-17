"""Wie viel von einer Partie ist dieselbe Figur zweimal? Und was bringt kluges Auswaehlen?

Die Frage des Nutzers (2026-09-17): "figuren aus einer partie die 20 FEN nicht bewegt wurden
tragen wenig bei ... relevant sind licht und schatten und ggf wurde die figur leicht bewegt,
sonst ist das nur ein extra gewicht."

Gemessen wird je STANDZEIT — (Feld, Figur, ununterbrochene Ply-Strecke), also genau die Menge,
in der sich nichts bewegt haben SOLL. Innerhalb davon:

  1. Wie nah liegen die Crops beieinander? (mittlerer absoluter Pixelabstand, 0..255)
  2. Wie viele sind Dubletten unter einer Schwelle?
  3. Was kostet es, k davon zu behalten — die ERSTEN k gegen k per Farthest-Point?

Verdeckte Zellen bleiben DRAUSSEN: eine Hand ueber der Figur ist keine Licht-Variation, und sie
bläht die Spannweite so auf, dass jede Auswahl gut aussieht.

Zwei Masse, weil das erste allein ein Selbstlob waere: Farthest-Point optimiert die SPANNWEITE
direkt. `Deckung` misst stattdessen, wie weit ein durchschnittlicher Crop noch vom naechsten
BEHALTENEN entfernt ist — kleiner ist besser, und das optimiert die Auswahl nicht direkt.

`--phash` ist bewusst NICHT der Weg: perceptual-hash-Dedup verwarf 54,8 % des Korpus, nichts
davon pixelgleich, und kostete 42 Fehltreffer gegen 17 (config.DedupDefaults). Hier wird nicht
verworfen, sondern GEMESSEN, wie viel Spannweite eine Auswahl behaelt.

    uv run python scripts/crop_redundancy.py --pack rg-2026-09-15-16-54-44-128
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from pathlib import Path

import numpy as np

from chesslab.ioutil import read_jsonl
from chesslab.training.occlusion import PIECE_VISIBLE_MAX

PACKS = Path("data/packs")
#: Auf diese Kantenlaenge heruntergerechnet verglichen — Pose und Licht bleiben, das Rauschen geht.
THUMB = 16


def thumbs(pack: Path, rows: list[dict]) -> np.ndarray:
    """Alle Crops als kleine Graustufen-Bilder, aus der Memmap gelesen."""
    import json

    meta = json.loads((pack / "packed_meta.json").read_text(encoding="utf-8"))
    n, h, w = meta["n"], meta["h"], meta["w"]
    mm = np.memmap(pack / "packed_images.u8", dtype=np.uint8, mode="r", shape=(n, h, w, 3))
    step = h // THUMB
    out = np.empty((len(rows), THUMB, THUMB), dtype=np.float32)
    for i, row in enumerate(rows):
        img = mm[row["_i"]]
        # Kastenmittel statt Interpolation: billig, und die Kante interessiert hier nicht.
        small = img.reshape(THUMB, step, THUMB, step, 3).mean(axis=(1, 3, 4))
        out[i] = small
    return out


def farthest_point(dist: np.ndarray, k: int) -> list[int]:
    """k Crops, die moeglichst weit auseinander liegen — der erste ist der erste Frame."""
    chosen = [0]
    while len(chosen) < min(k, dist.shape[0]):
        near = dist[chosen].min(axis=0)
        near[chosen] = -1.0
        chosen.append(int(near.argmax()))
    return chosen


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pack", required=True, help="Pack-Verzeichnis unter data/packs/.")
    ap.add_argument("--dup", type=float, default=2.0,
                    help="Ab hier gilt ein Paar als Dublette (mittlerer Pixelabstand 0..255).")
    ap.add_argument("--keep", type=int, default=4, help="Wie viele je Standzeit behalten?")
    ap.add_argument("--min-run", type=int, default=3, help="Standzeiten unter so vielen Crops "
                                                           "ueberspringen — da gibt es nichts zu waehlen.")
    ap.add_argument("--with-hands", action="store_true",
                    help="Verdeckte Zellen mitzaehlen (Vorgabe: raus).")
    args = ap.parse_args()

    pack = PACKS / args.pack
    rows = [r | {"_i": i} for i, r in enumerate(read_jsonl(pack / "manifest.jsonl"))]
    if not args.with_hands:
        before = len(rows)
        rows = [r for r in rows if float(r.get("coverage") or 0.0) <= PIECE_VISIBLE_MAX]
        print(f"{before - len(rows)} verdeckte Crops ausgelassen (Hand ist keine Licht-Variation)")
    if not rows:
        print(f"{args.pack}: keine Zeilen")
        return 1

    # Standzeit = (Feld, Figur, ununterbrochene Ply-Strecke). Ein Zug beendet sie.
    runs: dict[tuple, list[dict]] = defaultdict(list)
    per_square: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        per_square[str(row.get("square"))].append(row)
    for square, group in per_square.items():
        group.sort(key=lambda r: (int(r.get("ply") or 0), str(r.get("frame"))))
        run_id, last = 0, None
        for row in group:
            here = str(row.get("label"))
            if last is not None and here != last:
                run_id += 1
            runs[(square, here, run_id)].append(row)
            last = here

    print(f"{args.pack}: {len(rows)} Crops in {len(runs)} Standzeiten "
          f"(Feld + Figur + ununterbrochene Strecke)\n")

    total = dup = kept_first = kept_far = spread_total = 0.0
    cover_first = cover_far = 0.0
    counted = 0
    sizes = []
    for _key, group in sorted(runs.items()):
        if len(group) < args.min_run:
            continue
        small = thumbs(pack, group)
        flat = small.reshape(len(group), -1)
        # Mittlerer absoluter Abstand je Paar — ein Mass in Graustufen, nicht in Einheiten.
        dist = np.abs(flat[:, None, :] - flat[None, :, :]).mean(axis=2)
        np.fill_diagonal(dist, np.inf)
        nearest = dist.min(axis=1)
        total += len(group)
        dup += int((nearest <= args.dup).sum())
        sizes.append(len(group))
        span = float(dist[np.isfinite(dist)].max()) if len(group) > 1 else 0.0
        spread_total += span
        counted += 1
        k = min(args.keep, len(group))
        first = dist[:k, :k]
        kept_first += float(first[np.isfinite(first)].max()) if k > 1 else 0.0
        far = farthest_point(np.where(np.isfinite(dist), dist, 0.0), k)
        sub = dist[np.ix_(far, far)]
        kept_far += float(sub[np.isfinite(sub)].max()) if k > 1 else 0.0
        # Deckung: wie weit ist ein Crop im Mittel vom naechsten BEHALTENEN? Klein ist gut.
        raw_dist = np.where(np.isfinite(dist), dist, 0.0)
        cover_first += float(raw_dist[list(range(k))].min(axis=0).mean())
        cover_far += float(raw_dist[far].min(axis=0).mean())

    if not counted:
        print("keine Standzeit mit genug Crops")
        return 0
    print(f"{counted} Standzeiten mit >= {args.min_run} Crops, {int(total)} Crops darin")
    print(f"   Median der Standzeit-Laenge: {int(np.median(sizes))} Crops, laengste {max(sizes)}")
    print(f"   DUBLETTEN (naechster Nachbar <= {args.dup}): {int(dup)} "
          f"({100 * dup / total:.1f} %)\n")
    print(f"   Spannweite je Standzeit, im Mittel:      {spread_total / counted:6.2f}")
    print(f"   davon behalten die ERSTEN {args.keep}:            {kept_first / counted:6.2f} "
          f"({100 * kept_first / max(1e-9, spread_total):.0f} %)")
    print(f"   davon behalten {args.keep} per Farthest-Point:    {kept_far / counted:6.2f} "
          f"({100 * kept_far / max(1e-9, spread_total):.0f} %)")
    print("\n   Deckung — mittlerer Abstand zum naechsten BEHALTENEN (klein ist gut):")
    print(f"      die ERSTEN {args.keep}:        {cover_first / counted:6.2f}")
    print(f"      {args.keep} per Farthest-Point: {cover_far / counted:6.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
