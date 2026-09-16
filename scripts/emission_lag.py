"""Kauft der Cooldown Unabhaengigkeit? Fehlerkorrelation als Funktion des zeitlichen Abstands.

Zwei Bestaetigungsstimmen 0,7 s auseinander sind nur dann zwei Stimmen, wenn der Fehler in dieser
Zeit vergisst. Gemessen INNERHALB einer Stellung — ueber den Zug hinweg aendert sich das Bild
ohnehin.
"""
import sys
from collections import defaultdict
from pathlib import Path

from chesslab.ioutil import read_jsonl

ROOT = Path("data/recordings")
FPS = 30.0
LAGS = [1, 2, 3, 5, 8, 12, 20, 30, 45]     # in Frames; 21 Frames = 0,7 s


def main():
    pairs = defaultdict(lambda: [0, 0, 0, 0])   # lag -> a,b,c,d
    with_cov = 0
    for s in sys.argv[1:]:
        p = ROOT / s / "model-reads.jsonl"
        if not p.is_file():
            continue
        rows = defaultdict(dict)
        for r in read_jsonl(p):
            if "square" not in r or not r["probs"]:
                continue
            # TODO(bug-hunt 2026-09-16f): ohne Occlusion-Kopf fehlt der Schluessel; als 0,0
            # gelesen galt jede verdeckte Zelle als sichtbar und ging in die Korrelation ein.
            cov = r.get("model_cov", r.get("cov"))
            if cov is None:
                continue
            with_cov += 1
            rows[int(r["frame"])][r["square"]] = (
                max(r["probs"], key=r["probs"].get), r["fen_label"], cov)
        frames = sorted(rows)
        board = {f: tuple(sorted((sq, v[1]) for sq, v in rows[f].items())) for f in frames}
        err = defaultdict(dict)                 # square -> frame -> 0/1
        for f in frames:
            for sq, (top, lab, cov) in rows[f].items():
                if cov <= 0.15:
                    err[sq][f] = int(top != lab)
        for series in err.values():
            fs = sorted(series)
            for f in fs:
                for lag in LAGS:
                    g = f + lag
                    # nur INNERHALB derselben Stellung, und nur wenn beide Frames gelesen wurden
                    if g not in series or board.get(g) != board.get(f):
                        continue
                    pairs[lag][series[f] * 2 + series[g]] += 1

    if not with_cov:
        print("[FAIL] keine Zeile traegt `model_cov` — der Lauf hat keinen Occlusion-Kopf, "
              "und verdeckte Zellen waeren nicht auszunehmen.")
        return
    print(f"{'Abstand':>10} {'Sekunden':>9} {'Paare':>9} {'P(err|err)':>11} {'P(err|ok)':>10} {'rho':>7}")
    for lag in LAGS:
        a, b, c, d = pairs[lag]
        if c + d < 200 or a + b < 200:
            continue
        pee, peo = d / (c + d), b / (a + b)
        print(f"{lag:>10} {lag/FPS:>9.2f} {a+b+c+d:>9} {pee:>11.3f} {peo:>10.4f} {pee-peo:>7.3f}")


if __name__ == "__main__":
    main()
