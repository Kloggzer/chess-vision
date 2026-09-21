"""Wie oft sind sich die beiden Verdeckungs-Arme einig?

    uv run python scripts/occlusion_arms.py --dir tmp/batch/occl-reserve

Der Tracker hat zwei unabhaengige Zeugen fuer eine Hand: den Coverage-Kopf des Modells
(`cnnHandSquares`, gefiltert auf handfoermige Flags) und den engine-eigenen Baseline-Arm aus
Census und Farbe (`occlVetoed`). Die Doku nennt fuer den Kopf F1 0,958 pro ZELLE gegen die
SAM-Matten und, an anderer Stelle, 34 verpasste von 59 FRAMES. Beides stimmt und misst
Verschiedenes.

Hier laeuft die dritte Frage: auf echten Aufnahmen, Frame fuer Frame — wann sagt welcher Arm
etwas, und wie oft allein? Das ist kein Guetemass (es gibt keine Wahrheit im Trace), sondern die
Antwort auf "was traegt der Kopf allein", bevor man ihn allein laufen laesst.
"""

from __future__ import annotations

import argparse
import collections
from pathlib import Path

from chesslab.ioutil import read_jsonl

ROOT = Path(__file__).resolve().parents[1]


def zaehle(trace: Path) -> collections.Counter:
    c: collections.Counter[str] = collections.Counter()
    for row in read_jsonl(trace):
        if row.get("kind") != "frame":
            continue
        kopf, basis = row.get("cnnHandSquares"), row.get("occlVetoed")
        # None heisst: diese Achse stand im Lauf nicht zur Verfuegung -- nicht "null Felder".
        if kopf is None or basis is None:
            c["ungemessen"] += 1
            continue
        c["frames"] += 1
        c["kopf" if kopf > 0 else "kopf_still"] += 1
        c["basis" if basis > 0 else "basis_still"] += 1
        if kopf > 0 and basis > 0:
            c["beide"] += 1
        elif kopf > 0:
            c["nur_kopf"] += 1
        elif basis > 0:
            c["nur_basis"] += 1
        else:
            c["keiner"] += 1
    return c


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dir", default="tmp/batch/occl-reserve")
    ap.add_argument("--arm", default="champion", help="Praefix der Traces, z. B. champion oder alt")
    args = ap.parse_args()

    d = ROOT / args.dir
    gesamt: collections.Counter[str] = collections.Counter()
    for trace in sorted(d.glob(f"{args.arm}--*.jsonl")):
        gesamt.update(zaehle(trace))
    if not gesamt:
        print(f"keine Traces {args.arm}--*.jsonl in {d}")
        return 1
    if gesamt["ungemessen"]:
        print(f"! {gesamt['ungemessen']} Zeilen ohne eine der beiden Achsen — aelterer Binary?")

    n = gesamt["frames"]
    print(f"Arm '{args.arm}': {n} Frames\n")
    print(f"{'Fall':26s} {'Frames':>8s} {'Anteil':>8s}")
    for name, schluessel in (("nur der Modell-Kopf", "nur_kopf"), ("nur der Baseline-Arm", "nur_basis"),
                             ("beide", "beide"), ("keiner", "keiner")):
        print(f"{name:26s} {gesamt[schluessel]:8d} {100.0 * gesamt[schluessel] / max(1, n):7.2f}%")

    melden = gesamt["beide"] + gesamt["nur_kopf"] + gesamt["nur_basis"]
    if melden:
        print(f"\nvon {melden} Frames, in denen UEBERHAUPT einer meldet:")
        print(f"  beide einig      {100.0 * gesamt['beide'] / melden:6.2f} %")
        print(f"  nur Modell-Kopf  {100.0 * gesamt['nur_kopf'] / melden:6.2f} %")
        print(f"  nur Baseline     {100.0 * gesamt['nur_basis'] / melden:6.2f} %")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
