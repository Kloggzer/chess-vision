"""Welche Fehler die Coverage-Precision kostet — verstreut oder als Klumpen.

2,6 Punkte Precision sagen nichts darueber, ob sie schaden. Die Engine zaehlt einen Flag nur,
wenn er ein orthogonal BENACHBARTES Paar hat (`modelHandSquares`): verstreute Einzelfehler fallen
heraus, ein zusammenhaengender Klumpen nicht. Diese Auswertung trennt genau das — je Frame, gegen
die SAM-Matte als Wahrheit.

    uv run python scripts/coverage_errors.py <reads-datei> [<sessions...>]
"""
import collections
import sys
from pathlib import Path

from chesslab.ioutil import read_jsonl

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
    seen_frames = set()
    for s in sessions:
        rp, mp = ROOT / s / reads, ROOT / s / "matte.jsonl"
        if not rp.is_file() or not mp.is_file():
            continue
        truth = {}
        for r in read_jsonl(mp):
            # Eine LEERE Coverage ist "gemessen, nichts verdeckt" und gehoert als
            # Wahrheit dazu; truthy warf sie mit SAMs Absage in denselben Topf.
            if r.get("coverage") is not None:
                truth[r["frame"]] = r["coverage"]
        for r in read_jsonl(rp):
            if "square" not in r or r["frame"] not in truth:
                continue
            t = truth[r["frame"]].get(r["square"])
            if t is None:
                continue
            # TODO(bug-hunt 2026-09-16f): `or 0.0` machte aus "kein Occlusion-Kopf" ein
            # gemessenes "nicht verdeckt" — null FP bei null TP sieht wie makellose Precision aus.
            cov = r.get("model_cov", r.get("cov"))
            if cov is None:
                continue
            pred, real = cov > thr, t > thr
            key = (s, r["frame"])
            seen_frames.add(key)
            if pred and not real:
                per_frame[key]["fp"].add(r["square"])
            elif real and not pred:
                per_frame[key]["fn"].add(r["square"])
            elif pred and real:
                per_frame[key]["tp"].add(r["square"])

    if not seen_frames:
        print(f"[FAIL] {reads}: keine Zeile traegt `model_cov` — der Lauf hat keinen "
              f"Occlusion-Kopf, hier ist nichts zu messen.")
        return
    tot_fp = sum(len(v["fp"]) for v in per_frame.values())
    tot_tp = sum(len(v["tp"]) for v in per_frame.values())
    frames_with_fp = [v for v in per_frame.values() if v["fp"]]
    # Was die Engine SIEHT: ein Cluster ab zwei Feldern gilt als Hand.
    hand_shaped = [v for v in frames_with_fp
                   if any(len(c) >= 2 for c in clusters(v["fp"])) and not v["tp"]]
    sizes = collections.Counter(len(v["fp"]) for v in frames_with_fp)

    print(f"{reads}: {len(seen_frames)} Frames mit Matte")
    print(f"  richtig verdeckt erkannt (TP): {tot_tp}")
    print(f"  falsch geflaggt (FP):          {tot_fp}   auf {len(frames_with_fp)} Frames")
    print(f"  davon HAND-FOERMIG auf sonst sauberem Frame: {len(hand_shaped)} Frames "
          f"({100 * len(hand_shaped) / max(len(seen_frames), 1):.2f} % aller Frames)")
    print("\n  FP je betroffenem Frame:")
    for k in sorted(sizes):
        print(f"    {k:>3} Felder: {sizes[k]:>4} Frames")


if __name__ == "__main__":
    main()
