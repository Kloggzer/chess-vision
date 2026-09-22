"""Splits the persistence into 'within one position' and 'across a move'.

Within an interval the reads are near-identical images, so a repeat is barely evidence. The
question that decides whether aggregation helps at all is whether the error SURVIVES the move.
"""
import sys
from collections import defaultdict
from pathlib import Path

from chesslab.ioutil import read_jsonl

ROOT = Path("data/recordings")

def measure(session):
    rows = defaultdict(dict)
    for r in read_jsonl(ROOT / session / "model-reads.jsonl"):
        if "square" not in r or not r["probs"]:
            continue
        probs = r["probs"]
        # Ohne Occlusion-Kopf fehlt der Schluessel; als 0,0 gelesen galt jede verdeckte Zelle
        # als sichtbar. Dieselbe Stelle wie in `emission_lag.py`.
        cov = r.get("model_cov", r.get("cov"))
        if cov is None:
            continue
        rows[r["frame"]][r["square"]] = (max(probs, key=probs.get), r["fen_label"], cov)
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


def main(argv: list[str]) -> int:
    """Summiert nur ueber Aufnahmen, die auch gemessen wurden — und nennt die uebrigen.

    Vorher liefen Aufnahmen ohne `model-reads.jsonl` still aus der Schleife; die Quoten galten
    danach fuer eine Teilmenge, die niemand ablesen konnte, und null Aufnahmen druckten nan.
    """
    W = [0, 0, 0, 0]
    A = [0, 0, 0, 0]
    niv = 0
    used, missing = [], []
    for s in argv:
        if not (ROOT / s / "model-reads.jsonl").is_file():
            missing.append(s)
            continue
        n, w, a = measure(s)
        niv += n
        used.append(s)
        W = [x + y for x, y in zip(W, w, strict=False)]
        A = [x + y for x, y in zip(A, a, strict=False)]

    if missing:
        print(f"[WARN] {len(missing)} von {len(argv)} Aufnahmen ohne model-reads.jsonl, "
              f"nicht gemessen: {' '.join(missing)}")
    if not used:
        print("[FAIL] keine Aufnahme gemessen — es gibt nichts zu summieren.")
        return 1

    for name, t in (("innerhalb einer Stellung", W), ("ueber den Zug hinweg", A)):
        pee, peo, rho, ess = ratio(t)
        print(f"{name:<26} P(err|err)={pee:.3f}  P(err|ok)={peo:.4f}  rho={rho:.3f}  "
              f"ESS={ess:.3f}n")
    print(f"\n{niv} Stellungsintervalle aus {len(used)} Aufnahmen")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
