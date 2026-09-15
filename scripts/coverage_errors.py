"""Welche Fehler die Coverage-Precision kostet — verstreut oder als Klumpen.

2,6 Punkte Precision sagen nichts darueber, ob sie schaden. Die Engine zaehlt einen Flag nur,
wenn er ein orthogonal BENACHBARTES Paar hat (`modelHandSquares`): verstreute Einzelfehler fallen
heraus, ein zusammenhaengender Klumpen nicht. Diese Auswertung trennt genau das — je Frame, gegen
die SAM-Matte als Wahrheit.

    uv run python scripts/coverage_errors.py <reads-datei> [<sessions...>]
"""
import collections
import json
import sys
from pathlib import Path

ROOT = Path("data/recordings")
FILES = "abcdefgh"


def neighbours(sq: str) -> list[str]:
    f, r = FILES.index(sq[0]), int(sq[1])
    out = []
    for df, dr in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nf, nr = f + df, r + dr
        if 0 <= nf < 8 and 1 <= nr <= 8:
            out.append(f"{FILES[nf]}{nr}")
    return out


def clusters(squares: set[str]) -> list[set[str]]:
    """Zusammenhaengende Gruppen — die Einheit, die die Engine als Hand liest."""
    todo, out = set(squares), []
    while todo:
        seed = todo.pop()
        group, stack = {seed}, [seed]
        while stack:
            for n in neighbours(stack.pop()):
                if n in todo:
                    todo.discard(n)
                    group.add(n)
                    stack.append(n)
        out.append(group)
    return out


def main():
    reads = sys.argv[1]
    sessions = sys.argv[2:] or ["2026-08-08-11-55-19", "2026-08-08-00-39-57"]
    thr = 0.15
    per_frame = collections.defaultdict(lambda: {"fp": set(), "fn": set(), "tp": set()})
    for s in sessions:
        rp, mp = ROOT / s / reads, ROOT / s / "matte.jsonl"
        if not rp.is_file() or not mp.is_file():
            continue
        truth = {}
        for line in mp.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line)
                if r.get("coverage"):
                    truth[r["frame"]] = r["coverage"]
        for line in rp.read_text(encoding="utf-8").splitlines():
            r = json.loads(line)
            if "square" not in r or r["frame"] not in truth:
                continue
            t = truth[r["frame"]].get(r["square"])
            if t is None:
                continue
            pred, real = (r.get("model_cov", r.get("cov")) or 0.0) > thr, t > thr
            key = (s, r["frame"])
            if pred and not real:
                per_frame[key]["fp"].add(r["square"])
            elif real and not pred:
                per_frame[key]["fn"].add(r["square"])
            elif pred and real:
                per_frame[key]["tp"].add(r["square"])

    tot_fp = sum(len(v["fp"]) for v in per_frame.values())
    tot_tp = sum(len(v["tp"]) for v in per_frame.values())
    frames_with_fp = [v for v in per_frame.values() if v["fp"]]
    # Was die Engine SIEHT: ein Cluster ab zwei Feldern gilt als Hand.
    hand_shaped = [v for v in frames_with_fp
                   if any(len(c) >= 2 for c in clusters(v["fp"])) and not v["tp"]]
    sizes = collections.Counter(len(v["fp"]) for v in frames_with_fp)

    print(f"{reads}: {len(per_frame)} Frames mit Matte")
    print(f"  richtig verdeckt erkannt (TP): {tot_tp}")
    print(f"  falsch geflaggt (FP):          {tot_fp}   auf {len(frames_with_fp)} Frames")
    print(f"  davon HAND-FOERMIG auf sonst sauberem Frame: {len(hand_shaped)} Frames "
          f"({100 * len(hand_shaped) / max(len(per_frame), 1):.2f} % aller Frames)")
    print("\n  FP je betroffenem Frame:")
    for k in sorted(sizes):
        print(f"    {k:>3} Felder: {sizes[k]:>4} Frames")


if __name__ == "__main__":
    main()
