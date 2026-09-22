"""Derive the commit threshold from a target fabrication rate instead of tuning it.

Distribution-free risk control: pick the most permissive threshold whose fabrication rate among
ACCEPTED commits still has a Clopper-Pearson upper bound below the target. Calibrated
leave-one-recording-out, so every reported number is on a recording the threshold never saw.

This screens commits after the fact; it does not re-run the tracker with the threshold in place,
so a rejected commit here does not change what the engine believed next. It answers the question
that has to hold first: is there a commit-time signal that separates fabrications from hits, and
does a threshold fitted on one set of recordings carry to another.
"""
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

from chesslab.ioutil import read_jsonl

CAND = Path("tmp/calib/commits.jsonl")


def binom_cdf(k, n, p):
    if p <= 0.0:
        return 1.0
    if p >= 1.0:
        return 0.0 if k < n else 1.0
    return sum(math.comb(n, i) * p**i * (1 - p) ** (n - i) for i in range(k + 1))


def cp_upper(k, n, delta=0.10):
    """Clopper-Pearson upper bound on the rate, k of n, at confidence 1-delta."""
    if n == 0:
        return 1.0
    if k == n:
        return 1.0
    lo, hi = k / n, 1.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if binom_cdf(k, n, mid) > delta:
            lo = mid
        else:
            hi = mid
    return hi


def calibrate(rows, score, alpha, delta=0.10):
    """The LOWEST threshold whose accepted set is provably clean enough; None if none is."""
    vals = sorted({score(r) for r in rows})
    best = None
    for tau in vals:
        acc = [r for r in rows if score(r) >= tau]
        if not acc:
            continue
        k = sum(1 for r in acc if not r["correct"])
        if cp_upper(k, len(acc), delta) <= alpha:
            best = tau
            break
    return best


def lcs(ref, got):
    n, m = len(ref), len(got)
    t = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            t[i][j] = t[i + 1][j + 1] + 1 if ref[i] == got[j] else max(t[i + 1][j], t[i][j + 1])
    return t[0][0]


def loo_eval(by_sess, refs, score, alpha, delta=0.10):
    """Leave-one-recording-out totals for one score.

    A recording whose calibration set yields no threshold commits NOTHING, so its reference plies
    stay in the denominator — dropping them let a score that refused half the corpus print the
    same `gefunden x/y` as one that carried all of it.
    """
    tot = {"acc": 0, "fab": 0, "found": 0, "ref": 0, "refused": 0, "taus": []}
    for held in sorted(by_sess):
        calib = [r for s, v in by_sess.items() if s != held for r in v]
        tot["ref"] += len(refs[held])
        tau = calibrate(calib, score, alpha, delta)
        if tau is None:
            tot["refused"] += 1
            continue
        tot["taus"].append(tau)
        acc = [r for r in by_sess[held] if score(r) >= tau]
        tot["acc"] += len(acc)
        tot["fab"] += sum(1 for r in acc if not r["correct"])
        tot["found"] += lcs(refs[held], [r["san"] for r in acc])
    return tot


SCORES = {
    "margin": lambda r: r["margin"],
    "agree": lambda r: r["agree"],
    "margin+agree": lambda r: r["margin"] + 4.0 * r["agree"],
    "best": lambda r: r["best"],
    "best-changed": lambda r: r["best"] - r["changed"],
}

if __name__ == "__main__":
    rows = read_jsonl(CAND)
    rows = [r for r in rows if r["session"] != "VID_20260726_155132"]  # Label ohne Zuege
    by_sess = defaultdict(list)
    for r in rows:
        by_sess[r["session"]].append(r)
    refs = json.loads(Path("tmp/calib/refs.json").read_text(encoding="utf-8"))

    n_fab = sum(1 for r in rows if not r["correct"])
    print(f"{len(rows)} Commits, davon {n_fab} erfunden ({100*n_fab/len(rows):.1f} %), "
          f"{len(by_sess)} Recordings\n")

    print("Trennt das Signal ueberhaupt?  (Median ueber alle Commits)")
    for name, f in SCORES.items():
        ok = sorted(f(r) for r in rows if r["correct"])
        bad = sorted(f(r) for r in rows if not r["correct"])
        if not bad:
            continue
        auc = sum((1.0 if a > b else 0.5 if a == b else 0.0) for a in ok for b in bad) / (len(ok) * len(bad))
        print(f"  {name:<13} Treffer {ok[len(ok)//2]:>8.3f}   erfunden {bad[len(bad)//2]:>8.3f}   AUC {auc:.3f}")

    for alpha in (float(a) for a in (sys.argv[1:] or ["0.02", "0.05", "0.10"])):
        print(f"\n=== Ziel: hoechstens {100*alpha:.0f} % erfundene Commits (90 % Konfidenz) ===")
        for name, f in SCORES.items():
            tot = loo_eval(by_sess, refs, f, alpha)
            taus = tot["taus"]
            if not taus:
                print(f"  {name:<13} kein Schwellwert erreicht das Ziel")
                continue
            rate = f"{100 * tot['fab'] / tot['acc']:.1f} %" if tot["acc"] else "kein Commit"
            print(f"  {name:<13} tau {min(taus):.2f}..{max(taus):.2f}  "
                  f"gefunden {tot['found']}/{tot['ref']}  erfunden {tot['fab']} ({rate})"
                  + (f"  [{tot['refused']} Recordings ohne Schwelle]" if tot["refused"] else ""))
