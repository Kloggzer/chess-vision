"""Die Occlusion-Schwelle aus einem Verlustverhaeltnis: kostet eine Erfindung lambda Treffer, lohnt
ein Read ab p(richtig) >= lambda/(1+lambda) — PRO ZELLE, also im Band um die Schwelle.

Gegen die SAM-Matte, gebuendelt nach der VORHERGESAGTEN Coverage, die zur Laufzeit vorliegt.

    uv run python scripts/occlusion_gate.py <reads-datei> [<sessions...>]"""
import math
import sys
from pathlib import Path

from chesslab.ioutil import read_jsonl
from chesslab.labeling import read_matte

ROOT = Path("data/recordings")
EDGES = [0.0, 0.02, 0.05, 0.10, 0.15, 0.25, 0.35, 0.50, 0.70, 1.01]
LAMBDAS = (1, 2, 3, 5)


def wilson_lower(k, n, z=1.96):
    """Untere Grenze des Wilson-Intervalls; bei n=120 ist der Punktwert wertlos."""
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
        truth = read_matte(ROOT / s)
        for r in read_jsonl(reads):
            if "square" not in r or not r["probs"] or r["fen_label"] == "empty":
                continue
            # Ein fehlendes Feld heisst "Frame nicht gemessen": `coverage_of` zippt alle 64 strikt.
            if truth.get(r["frame"], {}).get(r["square"]) is None:
                continue
            # Ohne Occlusion-Kopf gibt es kein `cov`; als 0,0 leitete das Skript eine Schwelle aus
            # nichts ab.
            cov = r.get("model_cov", r.get("cov"))  # `cov`: alte Schreibweise
            if cov is None:
                continue
            out.append((cov, max(r["probs"], key=r["probs"].get) == r["fen_label"]))
    return out


def schwelle(bands, need):
    """Die Baender der Schwelle: der ZUSAMMENHAENGENDE Lauf ab 0, gewertet nach Wilson-Untergrenze.
    Ein spaeteres gutes Band rettet kein durchgefallenes davor.
    """
    good = []
    for b in bands:
        if b[4] < need:
            break
        good.append(b)
    return good


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
        good = schwelle(bands, need)
        edge = f"{good[-1][1]:.2f}" if good else "-"
        kept = sum(b[2] for b in good)
        print(f"lambda {lam}: braucht {100*need:.0f} % -> Schwelle {edge:>5}"
              f"   ({kept} von {len(rows)} Reads bleiben, {100*kept/len(rows):.0f} %)")
    return 0


if __name__ == "__main__":
    # Sonst gab die `[FAIL]`-Absage 1 zurueck und der Prozess trotzdem 0.
    raise SystemExit(main())
