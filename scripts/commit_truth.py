"""Every commit a replay made, with its commit-time confidence and whether it was right.

`decision:` gives the SAN, `decision-conf:` the signals the engine had AT THAT MOMENT — no future.
Correctness comes from an LCS backtrace against the recording's reference: a committed ply inside
the LCS is a hit, one outside it is a fabrication. Transpositions land on the wrong side of that
line; they are counted here the way the replay scorer counts them, so the numbers stay comparable.
"""
import json
import re
from pathlib import Path

import chess
import chess.pgn

from chesslab.ioutil import write_json, write_rows

ROOT = Path("data/recordings")
DEC = re.compile(r"^decision: ply=(\d+) (\S+) decider=(\S+)")
CONF = re.compile(r"^decision-conf: (.*)$")


def reference(session):
    pgn = ROOT / session / "reference.pgn"
    if pgn.is_file():
        game = chess.pgn.read_game(pgn.open(encoding="utf-8"))
        board, sans = game.board(), []
        for mv in game.mainline_moves():
            sans.append(board.san(mv)); board.push(mv)
        return sans, "pgn"
    cand = json.loads((ROOT / session / "candidate.json").read_text(encoding="utf-8"))
    return [m["san"] for m in cand["moves"]], "candidate"


def parse(log):
    """(san, decider, conf-dict) per COMMIT, pairing each decision line with the conf line after."""
    out, pending = [], None
    for line in Path(log).read_text(encoding="utf-8", errors="replace").splitlines():
        if m := DEC.match(line):
            pending = (m.group(2), m.group(3))
            continue
        if (m := CONF.match(line)) and pending is not None:
            d = {}
            for tok in m.group(1).split():
                k, _, v = tok.partition("=")
                v = v.replace(",", ".")
                d[k] = float(v) if re.fullmatch(r"-?\d+\.?\d*", v) else v
            san, decider = pending
            pending = None
            if san != "-" and d.get("accepted") == "true":
                out.append((san, decider, d))
    return out


def lcs_hits(ref, got):
    """Which indices of `got` sit inside the longest common subsequence."""
    n, m = len(ref), len(got)
    t = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            t[i][j] = t[i + 1][j + 1] + 1 if ref[i] == got[j] else max(t[i + 1][j], t[i][j + 1])
    hits, i, j = set(), 0, 0
    while i < n and j < m:
        if ref[i] == got[j]:
            hits.add(j); i += 1; j += 1
        elif t[i + 1][j] >= t[i][j + 1]:
            i += 1
        else:
            j += 1
    return hits


if __name__ == "__main__":
    rows, refs = [], {}
    for log in sorted(Path("tmp/calib").glob("*.log")):
        session = log.stem
        if not (ROOT / session).is_dir():
            continue
        ref, kind = reference(session)
        refs[session] = ref
        commits = parse(log)
        hits = lcs_hits(ref, [c[0] for c in commits])
        for i, (san, decider, d) in enumerate(commits):
            rows.append(dict(session=session, i=i, san=san, decider=decider,
                             correct=i in hits, **d))
        bad = len(commits) - len(hits)
        print(f"{session:<24} ref={len(ref):>3} ({kind:<9}) commits={len(commits):>3} "
              f"hit={len(hits):>3} erfunden={bad:>3}")
    write_rows(Path("tmp/calib/commits.jsonl"), rows)
    write_json(Path("tmp/calib/refs.json"), refs, indent=None)
    print(f"\n{len(rows)} Commits nach tmp/calib/commits.jsonl")
