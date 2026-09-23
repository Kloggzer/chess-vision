"""Kauft der Cooldown Unabhaengigkeit? Fehlerkorrelation gegen den zeitlichen Abstand, innerhalb
einer Stellung: zwei Stimmen sind nur zwei, wenn der Fehler vergisst.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

from chesslab.ioutil import read_jsonl

ROOT = Path("data/recordings")
LAGS = [1, 2, 3, 5, 8, 12, 20, 30, 45]     # in Frames; 21 Frames = 0,7 s


def fps_for(sessions: list[str]) -> float:
    """Die gemeinsame Zeitbasis der Aufnahmen, nie eine erfundene: zehn laufen auf ~15 fps, und die
    Tabelle poolt ueber alle.
    """
    rates = {}
    for s in sessions:
        cand = ROOT / s / "candidate.json"
        clock = json.loads(cand.read_text(encoding="utf-8-sig")).get("clock") if cand.is_file() else {}
        fps = (clock or {}).get("fps")
        if not fps:
            raise SystemExit(f"{s}: keine `clock.fps` in candidate.json — ohne Zeitbasis ist "
                             f"kein Abstand in Sekunden zu rechnen")
        rates[s] = float(fps)
    if not rates:
        raise SystemExit("keine Aufnahme mit Lesungen uebergeben — nichts zu messen")
    if max(rates.values()) - min(rates.values()) > 0.5:
        raise SystemExit("verschiedene Zeitbasis, die Tabelle poolt aber: "
                         + ", ".join(f"{s} {v:.2f} fps" for s, v in sorted(rates.items())))
    return sum(rates.values()) / len(rates)


def main():
    # Erst die beitragenden Aufnahmen, dann ihre Zeitbasis.
    live = [s for s in sys.argv[1:] if (ROOT / s / "model-reads.jsonl").is_file()]
    pairs = defaultdict(lambda: [0, 0, 0, 0])   # lag -> a,b,c,d
    with_cov = 0
    for s in live:
        p = ROOT / s / "model-reads.jsonl"
        rows = defaultdict(dict)
        for r in read_jsonl(p):
            if "square" not in r or not r["probs"]:
                continue
            # Ohne Occlusion-Kopf fehlt der Schluessel; als 0,0 gelesen galt jede verdeckte Zelle
            # als sichtbar.
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
    fps = fps_for(live)
    print(f"Zeitbasis {fps:.2f} fps")
    print(f"{'Abstand':>10} {'Sekunden':>9} {'Paare':>9} {'P(err|err)':>11} {'P(err|ok)':>10} {'rho':>7}")
    for lag in LAGS:
        a, b, c, d = pairs[lag]
        if c + d < 200 or a + b < 200:
            continue
        pee, peo = d / (c + d), b / (a + b)
        print(f"{lag:>10} {lag/fps:>9.2f} {a+b+c+d:>9} {pee:>11.3f} {peo:>10.4f} {pee-peo:>7.3f}")


if __name__ == "__main__":
    main()
