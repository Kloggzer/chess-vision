"""Was die Verdeckungs-Reserve auf ECHTEM Material kostet.

`scripts/occlusion_reserve.ps1` faehrt denselben Satz zweimal — einmal mit der ausgelieferten
`motionPxThr` und einmal mit der alten. Hier wird aus den Traces gezaehlt, was sich dabei
verschiebt. Die Frage steht als Entscheidung 30 in `docs/offene-entscheidungen.md`: der
synthetische `fuzz check` misst 42 % weniger `veto:occlusion`, und niemand weiss, ob das im
Betrieb etwas bedeutet.

Gezaehlt werden FRAMES, nicht Felder: `occlVetoed` ist die Anzahl vetoisierter Felder in einem
Frame, und ein Frame mit einem einzigen Veto ist ein Frame, in dem der Schutz griff.
"""

from __future__ import annotations

import argparse
import collections
from pathlib import Path

from chesslab.ioutil import read_jsonl

ROOT = Path(__file__).resolve().parents[1]

#: Was eine Trace-Zeile ueber den Schutz sagt. `changed` ist der Nenner: ohne geaendertes Feld
#: gibt es nichts zu vetoisieren, ein Anteil an ALLEN Frames waere also der falsche Bruch.
ACHSEN = ("occlVetoed", "shadowVetoed", "changed")


def zaehle(trace: Path) -> dict[str, int]:
    out: collections.Counter[str] = collections.Counter()
    for row in read_jsonl(trace):
        if row.get("kind") != "frame":
            continue
        out["frames"] += 1
        for achse in ACHSEN:
            wert = row.get(achse)
            # None heisst: dieser Lauf schrieb die Achse noch nicht — nicht "null Vetos".
            if wert is None:
                out[f"{achse}_ungemessen"] += 1
            elif wert > 0:
                out[f"{achse}_frames"] += 1
                out[f"{achse}_felder"] += wert
    return dict(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dir", default="tmp/batch/occl-reserve")
    args = ap.parse_args()

    d = ROOT / args.dir
    je_arm: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for trace in sorted(d.glob("*.jsonl")):
        arm, _, rest = trace.stem.partition("--")
        je_arm[arm].update(zaehle(trace))
        je_arm[arm]["aufnahmen"] += 1
        del rest

    if not je_arm:
        print(f"keine Traces in {d}")
        return 1

    print(f"{'Arm':12s} {'Aufn':>5s} {'Frames':>8s} {'changed':>9s} {'occlVeto':>9s} {'shadow':>8s}")
    for arm in sorted(je_arm):
        c = je_arm[arm]
        print(f"{arm:12s} {c['aufnahmen']:5d} {c['frames']:8d} {c['changed_frames']:9d} "
              f"{c['occlVetoed_frames']:9d} {c['shadowVetoed_frames']:8d}")
        if c["occlVetoed_ungemessen"]:
            print(f"  ! {c['occlVetoed_ungemessen']} Zeilen ohne die Achse — aelterer Binary?")

    if {"champion", "alt"} <= set(je_arm):
        a, b = je_arm["alt"], je_arm["champion"]
        for achse in ("occlVetoed", "shadowVetoed"):
            vor, nach = a[f"{achse}_frames"], b[f"{achse}_frames"]
            if vor:
                print(f"\n{achse}: {vor} -> {nach} Frames ({100.0 * (nach - vor) / vor:+.1f} %)")
            else:
                print(f"\n{achse}: {vor} -> {nach} Frames (kein Bezug, der alte Arm hat keine)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
