"""Die Occlusion-Schwelle aus einem Verlustverhaeltnis ableiten, statt sie zu setzen.

Ein Read ist Evidenz, wenn er mehr nuetzt als schadet. Kostet eine Erfindung lambda-mal so viel
wie ein Treffer nuetzt, lohnt er ab p(richtig) >= lambda/(1+lambda). Die Regel gilt PRO ZELLE, also
zaehlt die Trefferquote im schmalen Band um die Schwelle, nicht der Schnitt darunter.

Gemessen wird gegen die SAM-Matte (Wahrheit) und gebuendelt nach der VORHERGESAGTEN Coverage —
das ist die Groesse, die zur Laufzeit vorliegt (`P_OCCLUDED_THR` in Taint.kt).

    uv run python scripts/occlusion_gate.py <reads-datei> [<sessions...>]
"""
import math
import sys
from pathlib import Path

from chesslab.ioutil import read_jsonl

ROOT = Path("data/recordings")
EDGES = [0.0, 0.02, 0.05, 0.10, 0.15, 0.25, 0.35, 0.50, 0.70, 1.01]
LAMBDAS = (1, 2, 3, 5)


def wilson_lower(k, n, z=1.96):
    """Untere Grenze des Wilson-Intervalls — bei n=120 ist der Punktwert allein wertlos."""
    if n == 0:
        return 0.0
    p = k / n
    d = 1 + z * z / n
    centre = p + z * z / (2 * n)
    margin = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return max(0.0, (centre - margin) / d)


def collect(reads_name, sessions):
    """(vorhergesagte Coverage, richtig) je Figur-Read mit Matte-Wahrheit."""
    out = []
    for s in sessions:
        reads = ROOT / s / reads_name
        matte = ROOT / s / "matte.jsonl"
        if not reads.is_file() or not matte.is_file():
            continue
        truth = {}
        for r in read_jsonl(matte):
            # `is not None`, nicht truthy: eine LEERE Coverage ist "gemessen, nichts
            # verdeckt" und gehoert als Wahrheit dazu — truthy warf sie heraus und die
            # Schwelle entstuende nur auf Frames, auf denen SAM etwas fand.
            if r.get("coverage") is not None:
                truth[r["frame"]] = r["coverage"]
        for r in read_jsonl(reads):
            if "square" not in r or not r["probs"] or r["fen_label"] == "empty":
                continue
            # Ein fehlendes Feld heisst "der Frame ist gar nicht gemessen", nie "dieses Feld
            # nicht": `coverage_of` zippt alle 64 unter `strict=True`
            # (`tests/test_coverage_is_dense.py`).
            if truth.get(r["frame"], {}).get(r["square"]) is None:
                continue
            # Ohne Occlusion-Kopf schreibt `read_session` kein `cov`. Als 0,0 gelesen fiele
            # jeder Read ins unterste Band und das Skript leitete eine Schwelle aus nichts ab.
            cov = r.get("model_cov", r.get("cov"))   # `cov`: Schreibweise vor 2026-09-16
            if cov is None:
                continue
            out.append((cov, max(r["probs"], key=r["probs"].get) == r["fen_label"]))
    return out


def main():
    reads_name = sys.argv[1] if len(sys.argv) > 1 else "model-reads.jsonl"
    sessions = sys.argv[2:] or ["2026-08-08-00-39-57", "2026-08-08-11-55-19"]
    rows = collect(reads_name, sessions)
    if not rows:
        print(f"[FAIL] {reads_name}: keine Zeile traegt `cov` — der Lauf hat keinen "
              f"Occlusion-Kopf, hier ist nichts abzuleiten.")
        return 1
    print(f"{reads_name}: {len(rows)} Figuren-Reads aus {len(sessions)} Sessions\n")
    print(f"{'Band (vorhergesagte cov)':<26} {'n':>7} {'richtig':>9} {'95%-Untergrenze':>16}")
    bands = []
    for lo, hi in zip(EDGES, EDGES[1:], strict=False):
        sel = [ok for c, ok in rows if lo <= c < hi]
        if not sel:
            continue
        p = sum(sel) / len(sel)
        lower = wilson_lower(sum(sel), len(sel))
        bands.append((lo, hi, len(sel), p, lower))
        print(f"{lo:.2f}-{hi:<21.2f} {len(sel):>7} {100*p:>8.1f}% {100*lower:>15.1f}%")
    print()
    for lam in LAMBDAS:
        need = lam / (1 + lam)
        # Der ZUSAMMENHAENGENDE Lauf ab 0 — ein spaeteres gutes Band rettet kein
        # durchgefallenes davor. Gewertet wird die Untergrenze: duenne Baender sollen die
        # Schwelle nicht aufweichen.
        good = []
        for b in bands:
            if b[4] < need:
                break
            good.append(b)
        edge = f"{good[-1][1]:.2f}" if good else "-"
        kept = sum(b[2] for b in good)
        print(f"lambda {lam}: braucht {100*need:.0f} % -> Schwelle {edge:>5}"
              f"   ({kept} von {len(rows)} Reads bleiben, {100*kept/len(rows):.0f} %)")


if __name__ == "__main__":
    main()
