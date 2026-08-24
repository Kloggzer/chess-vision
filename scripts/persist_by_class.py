"""Which classes carry the error that survives a move.

The chain can out-vote an error that resets; it cannot out-vote one that is a property of the
piece. Persistence per true class says which of the two each class is.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path("data/recordings")
stat = defaultdict(lambda: [0, 0, 0, 0])   # class -> [seen, wrong, cross-move pairs, cross-move err|err]
conf = defaultdict(lambda: defaultdict(int))

for session in sys.argv[1:]:
    p = ROOT / session / "model-reads.jsonl"
    if not p.is_file():
        continue
    rows = defaultdict(dict)
    for line in p.read_text(encoding="utf-8").splitlines():
        r = json.loads(line)
        if "square" not in r or not r["probs"]:
            continue
        rows[r["frame"]][r["square"]] = (max(r["probs"], key=r["probs"].get), r["fen_label"], r.get("cov") or 0.0)
    frames = sorted(rows)
    board = {f: tuple(sorted((s, v[1]) for s, v in rows[f].items())) for f in frames}
    iv, last, ivid = {}, None, -1
    for f in frames:
        if board[f] != last:
            ivid += 1; last = board[f]
        iv[f] = ivid
    seq = defaultdict(lambda: defaultdict(list))     # square -> interval -> [(err, label)]
    for f in frames:
        for sq, (top, lab, cov) in rows[f].items():
            if cov > 0.15:
                continue
            e = int(top != lab)
            stat[lab][0] += 1; stat[lab][1] += e
            if e:
                conf[lab][top] += 1
            seq[sq][iv[f]].append((e, lab))
    for ivs in seq.values():
        ids = sorted(ivs)
        for i, j in zip(ids, ids[1:], strict=False):
            (e1, _), (e2, l2) = ivs[i][-1], ivs[j][0]
            if e1:
                stat[l2][2] += 1; stat[l2][3] += e2

print(f"{'Klasse':<8} {'Reads':>8} {'Fehler':>7} {'P(err|Vorstellung err)':>23}  haeufigste Verwechslung")
for lab in sorted(stat, key=lambda k: -stat[k][1] / max(stat[k][0], 1)):
    seen, wrong, n, k = stat[lab]
    if seen < 500:
        continue
    pers = f"{k/n:.3f}" if n >= 30 else "  —"
    top = sorted(conf[lab].items(), key=lambda kv: -kv[1])[:2]
    print(f"{lab:<8} {seen:>8} {100*wrong/seen:>6.1f}% {pers:>23}  "
          + ", ".join(f"{a} {100*b/max(wrong,1):.0f}%" for a, b in top))
