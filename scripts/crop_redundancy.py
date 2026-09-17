"""Wie viel von einer Partie ist dieselbe Figur zweimal? Und was bringt kluges Auswaehlen?

Die Frage des Nutzers (2026-09-17): "figuren aus einer partie die 20 FEN nicht bewegt wurden
tragen wenig bei ... relevant sind licht und schatten und ggf wurde die figur leicht bewegt,
sonst ist das nur ein extra gewicht."

Gemessen wird je STANDZEIT — (Feld, Figur, ununterbrochene Ply-Strecke), also genau die Menge,
in der sich nichts bewegt haben SOLL.

Verdeckte Zellen bleiben DRAUSSEN: eine Hand ueber der Figur ist keine Licht-Variation, und sie
blaeht die Spannweite so auf, dass jede Auswahl gut aussieht (gemessen: 51 statt 95).

Zwei Masse, weil das erste allein ein Selbstlob waere: Farthest-Point optimiert die SPANNWEITE
direkt. `Deckung` misst stattdessen, wie weit ein durchschnittlicher Crop noch vom naechsten
BEHALTENEN entfernt ist — kleiner ist besser, und das optimiert die Auswahl nicht direkt.

    uv run python scripts/crop_redundancy.py --pack rg-2026-09-15-16-54-44-128
    uv run python scripts/crop_redundancy.py --all
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

import numpy as np

from chesslab.ioutil import read_jsonl
from chesslab.training.occlusion import PIECE_VISIBLE_MAX

PACKS = Path("data/packs")
#: Auf diese Kantenlaenge heruntergerechnet verglichen — Pose und Licht bleiben, das Rauschen geht.
THUMB = 16
BUDGETS = (2, 4, 8, 16)


def runs_of(rows: list[dict]) -> dict[tuple, list[dict]]:
    """Standzeit = (Feld, Figur, ununterbrochene Strecke). Ein Zug beendet sie."""
    per_square: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        per_square[str(row.get("square"))].append(row)
    out: dict[tuple, list[dict]] = defaultdict(list)
    for square, group in per_square.items():
        group.sort(key=lambda r: (int(r.get("ply") or 0), str(r.get("frame"))))
        run_id, last = 0, None
        for row in group:
            here = str(row.get("label"))
            if last is not None and here != last:
                run_id += 1
            out[(square, here, run_id)].append(row)
            last = here
    return out


def thumbs(pack: Path, rows: list[dict]) -> np.ndarray:
    """Alle Crops als kleine Graustufen-Bilder, aus der Memmap gelesen."""
    meta = json.loads((pack / "packed_meta.json").read_text(encoding="utf-8"))
    n, h, w = meta["n"], meta["h"], meta["w"]
    mm = np.memmap(pack / "packed_images.u8", dtype=np.uint8, mode="r", shape=(n, h, w, 3))
    step = h // THUMB
    out = np.empty((len(rows), THUMB * THUMB), dtype=np.float32)
    for i, row in enumerate(rows):
        # Kastenmittel statt Interpolation: billig, und die Kante interessiert hier nicht.
        out[i] = mm[row["_i"]].reshape(THUMB, step, THUMB, step, 3).mean(axis=(1, 3, 4)).ravel()
    return out


def farthest_point(dist: np.ndarray, k: int) -> list[int]:
    """k Crops, die moeglichst weit auseinander liegen — der erste ist der erste Frame."""
    chosen = [0]
    while len(chosen) < min(k, dist.shape[0]):
        near = dist[chosen].min(axis=0)
        near[chosen] = -1.0
        chosen.append(int(near.argmax()))
    return chosen


def measure(pack: Path, dup: float, min_run: int, with_hands: bool) -> dict | None:
    rows = [r | {"_i": i} for i, r in enumerate(read_jsonl(pack / "manifest.jsonl"))]
    hidden = 0
    if not with_hands:
        before = len(rows)
        rows = [r for r in rows if float(r.get("coverage") or 0.0) <= PIECE_VISIBLE_MAX]
        hidden = before - len(rows)
    if not rows:
        return None

    total = dupes = counted = 0
    sizes: list[int] = []
    cover_first = np.zeros(len(BUDGETS))
    cover_far = np.zeros(len(BUDGETS))
    for group in runs_of(rows).values():
        if len(group) < min_run:
            continue
        flat = thumbs(pack, group)
        raw = np.abs(flat[:, None, :] - flat[None, :, :]).mean(axis=2)
        dist = raw.copy()
        np.fill_diagonal(dist, np.inf)
        total += len(group)
        dupes += int((dist.min(axis=1) <= dup).sum())
        sizes.append(len(group))
        counted += 1
        for j, k in enumerate(BUDGETS):
            k = min(k, len(group))
            cover_first[j] += raw[list(range(k))].min(axis=0).mean()
            cover_far[j] += raw[farthest_point(raw, k)].min(axis=0).mean()
    if not counted:
        return None
    return {
        "name": pack.name, "crops": total, "hidden": hidden, "runs": counted,
        "median_run": int(np.median(sizes)), "dupes": dupes,
        "dup_share": 100.0 * dupes / total,
        "cover_first": cover_first / counted, "cover_far": cover_far / counted,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pack", help="Ein Pack-Verzeichnis unter data/packs/.")
    ap.add_argument("--all", action="store_true", help="Jede Aufnahme (rg-*) mit einem Pack.")
    ap.add_argument("--size", type=int, default=128, help="Nur Packs dieser Kantenlaenge.")
    ap.add_argument("--dup", type=float, default=2.0,
                    help="Ab hier gilt ein Paar als Dublette (mittlerer Pixelabstand 0..255).")
    ap.add_argument("--min-run", type=int, default=3, help="Standzeiten unter so vielen Crops "
                                                           "ueberspringen — da gibt es nichts zu waehlen.")
    ap.add_argument("--with-hands", action="store_true",
                    help="Verdeckte Zellen mitzaehlen (Vorgabe: raus).")
    ap.add_argument("--json", help="Die Zeilen zusaetzlich hierhin schreiben.")
    args = ap.parse_args()

    if args.all:
        targets = sorted(p for p in PACKS.glob(f"rg-*-{args.size}")
                         if (p / "packed_meta.json").is_file())
    elif args.pack:
        targets = [PACKS / args.pack]
    else:
        print("--pack oder --all")
        return 1

    head = (f"{'Aufnahme':30s}{'Crops':>8}{'verdeckt':>10}{'Standz.':>9}{'Median':>8}"
            f"{'Dubletten':>11}")
    print(head + "".join(f"{f'k={k}':>16}" for k in BUDGETS))
    print("-" * (len(head) + 16 * len(BUDGETS)))
    got = []
    for pack in targets:
        res = measure(pack, args.dup, args.min_run, args.with_hands)
        if res is None:
            print(f"{pack.name:30s}  keine Standzeit mit genug Crops")
            continue
        got.append(res)
        cells = "".join(f"{f'{a:.1f} / {b:.1f}':>16}"
                        for a, b in zip(res["cover_first"], res["cover_far"], strict=True))
        short = res["name"].removeprefix("rg-").removesuffix(f"-{args.size}")
        print(f"{short:30s}{res['crops']:>8}{res['hidden']:>10}{res['runs']:>9}"
              f"{res['median_run']:>8}{res['dup_share']:>10.1f}%" + cells, flush=True)

    if got:
        crops = sum(r["crops"] for r in got)
        dupes = sum(r["dupes"] for r in got)
        weight = np.array([r["crops"] for r in got], dtype=float)
        first = (np.stack([r["cover_first"] for r in got]) * weight[:, None]).sum(0) / weight.sum()
        far = (np.stack([r["cover_far"] for r in got]) * weight[:, None]).sum(0) / weight.sum()
        cells = "".join(f"{f'{a:.1f} / {b:.1f}':>16}" for a, b in zip(first, far, strict=True))
        print("-" * (len(head) + 16 * len(BUDGETS)))
        print(f"{'GESAMT (nach Crops gewichtet)':30s}{crops:>8}"
              f"{sum(r['hidden'] for r in got):>10}{sum(r['runs'] for r in got):>9}"
              f"{'':>8}{100 * dupes / crops:>10.1f}%" + cells)
        print("\nje Zelle: Deckung `die ERSTEN k / k per Farthest-Point` (klein ist besser)")
        print(f"nicht-redundante Crops gesamt: {crops - dupes}")
    if args.json and got:
        Path(args.json).write_text(
            "".join(json.dumps({k: (list(v) if isinstance(v, np.ndarray) else v)
                                for k, v in r.items()}) + "\n" for r in got), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
