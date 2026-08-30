"""Splits the persistence into 'within one position' and 'across a move'.

Within an interval the reads are near-identical images, so a repeat is barely evidence. The
question that decides whether aggregation helps at all is whether the error SURVIVES the move.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path("data/recordings")

def measure(session):
    rows = defaultdict(dict)
    for line in (ROOT / session / "model-reads.jsonl").read_text(encoding="utf-8").splitlines():
        r = json.loads(line)
        if "square" not in r or not r["probs"]:
            continue
        probs = r["probs"]
        rows[r["frame"]][r["square"]] = (max(probs, key=probs.get), r["fen_label"], r.get("cov") or 0.0)
    frames = sorted(rows)
    board_of = {f: tuple(sorted((s, v[1]) for s, v in rows[f].items())) for f in frames}
    interval, last, iv = [], None, -1
    for f in frames:
        if board_of[f] != last:
            iv += 1; last = board_of[f]
        interval.append(iv)

    within = [0, 0, 0, 0]   # a,b,c,d as before
    across = [0, 0, 0, 0]
    iv_err = defaultdict(lambda: defaultdict(list))   # square -> interval -> [errors]
    for f, iv_id in zip(frames, interval, strict=False):
        for sq, (top, lab, cov) in rows[f].items():
            if cov <= 0.15:
                iv_err[sq][iv_id].append(1 if top != lab else 0)

    for ivs in iv_err.values():
        ids = sorted(ivs)
        for i in ids:                                  # within one position
            seq = ivs[i]
            for x, y in zip(seq, seq[1:], strict=False):
                within[x * 2 + y] += 1
        for i, j in zip(ids, ids[1:], strict=False):                 # position -> next position
            x, y = ivs[i][-1], ivs[j][0]
            across[x * 2 + y] += 1
    return len(set(interval)), within, across

def ratio(t):
    a, b, c, d = t
    pee = d / (c + d) if c + d else float("nan")
    peo = b / (a + b) if a + b else float("nan")
    rho = pee - peo
    return pee, peo, rho, (1 - rho) / (1 + rho)

W = [0, 0, 0, 0]; A = [0, 0, 0, 0]; niv = 0
for s in sys.argv[1:]:
    if not (ROOT / s / "model-reads.jsonl").is_file():
        continue
    n, w, a = measure(s)
    niv += n
    W = [x + y for x, y in zip(W, w, strict=False)]; A = [x + y for x, y in zip(A, a, strict=False)]

for name, t in (("innerhalb einer Stellung", W), ("ueber den Zug hinweg", A)):
    pee, peo, rho, ess = ratio(t)
    print(f"{name:<26} P(err|err)={pee:.3f}  P(err|ok)={peo:.4f}  rho={rho:.3f}  ESS={ess:.3f}n")
print(f"\n{niv} Stellungsintervalle")
