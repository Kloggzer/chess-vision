"""Steht auf dem Brett die Stellung, die geplant war?

`plan_setups.py` sagt, welche Aufstellung dem Korpus fehlt; danach baut ein Mensch sie auf und
filmt. Diese Pruefung liest die geschnittenen Bretter mit dem Modell und haelt sie gegen die
geplante FEN — sie faengt also den Aufbaufehler, nicht den Labelfehler.

Die Grenze ist das Modell: `visible_piece_acc` liegt je nach Session zwischen 0,58 und 0,99, ein
einzelnes abweichendes Feld sagt also wenig. Gemeldet wird deshalb, wo das Modell ueber MEHRERE
Bretter hinweg stabil widerspricht — das ist ein Aufbaufehler, ein wackelndes Feld ist Rauschen.

    uv run python scripts/check_setup_video.py --tag check-p1 --fen "8/8/..."
"""
import argparse
import collections
from pathlib import Path

import cv2

from chesslab import occluded_model
from chesslab.ioutil import read_jsonl
from chesslab.training.occlusion import PIECE_VISIBLE_MAX as VMAX


def board_of(fen: str) -> dict[str, str]:
    out, ranks = {}, fen.split()[0].split("/")
    for ri, row in enumerate(ranks):
        f = 0
        for ch in row:
            if ch.isdigit():
                for _ in range(int(ch)):
                    out[f"{'abcdefgh'[f]}{8 - ri}"] = "empty"
                    f += 1
            else:
                out[f"{'abcdefgh'[f]}{8 - ri}"] = ("w" if ch.isupper() else "b") + ch.upper()
                f += 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tag", required=True)
    ap.add_argument("--fen", required=True)
    ap.add_argument("--run", default="data/models/_ab/c8d1-seed42")
    ap.add_argument("--min-share", type=float, default=0.6,
                    help="Anteil der Bretter, die widersprechen muessen")
    args = ap.parse_args()

    man = Path("data/crops") / args.tag / "manifest.jsonl"
    rows = read_jsonl(man)
    want = board_of(args.fen)
    boards = len({r.get("frame") for r in rows})
    # `composite` klebt synthetische Haende auf; unter denen kann das Modell nichts lesen.
    total = len(rows)
    rows = [r for r in rows if float(r.get("coverage") or 0.0) <= VMAX]
    print(f"{args.tag}: {len(rows)} sichtbare von {total} Crops aus {boards} Brettern")

    said = collections.defaultdict(collections.Counter)
    for i in range(0, len(rows), 512):
        ch = rows[i:i + 512]
        imgs = [cv2.imread(r["path"]) for r in ch]
        keep = [(r, im) for r, im in zip(ch, imgs, strict=True) if im is not None]
        for (r, _), rd in zip(keep, occluded_model.all_reads(
                Path(args.run), [im for _, im in keep]), strict=True):
            said[r["square"]][rd["pred_label"]] += 1

    # Null gelesene Bretter sind kein bestandener Aufbau-Check: ohne Vergleich faellt die
    # Schleife unten leer aus und das alte `[OK]` bestaetigte eine FEN, die niemand gesehen hat.
    if not said:
        raise SystemExit(f"[FAIL] {args.tag}: kein einziges Crop gelesen "
                         f"({len(rows)} sichtbare von {total}) — nichts verglichen")

    bad = []
    for sq, counter in sorted(said.items()):
        n = sum(counter.values())
        top, hits = counter.most_common(1)[0]
        if top != want.get(sq) and hits / n >= args.min_share:
            bad.append((sq, want.get(sq), top, hits, n))
    if not bad:
        print("  [OK] kein Feld widerspricht stabil — die Stellung passt zur FEN")
        return
    print(f"  [!!] {len(bad)} Felder widersprechen ueber die Mehrheit der Bretter:")
    for sq, plan, got, hits, n in bad:
        print(f"       {sq}: geplant {plan:<6} gelesen {got:<6} ({hits}/{n} Bretter)")


if __name__ == "__main__":
    main()
