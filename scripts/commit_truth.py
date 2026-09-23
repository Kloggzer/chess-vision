"""Every commit a replay made, with its commit-time confidence and whether it was right (inside the
LCS against the reference = hit, outside = fabrication, as the replay scorer counts).
"""
import json
import re
from collections import Counter
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


def main() -> int:
    rows, refs, skipped, kinds = [], {}, [], Counter()
    logs = sorted(Path("tmp/calib").glob("*.log"))
    for log in logs:
        session = log.stem
        if not (ROOT / session).is_dir():
            skipped.append(session)
            continue
        ref, kind = reference(session)
        kinds[kind] += 1
        refs[session] = ref
        commits = parse(log)
        hits = lcs_hits(ref, [c[0] for c in commits])
        for i, (san, decider, d) in enumerate(commits):
            rows.append(dict(session=session, ref_kind=kind, i=i, san=san, decider=decider,
                             correct=i in hits, **d))
        bad = len(commits) - len(hits)
        print(f"{session:<24} ref={len(ref):>3} ({kind:<9}) commits={len(commits):>3} "
              f"hit={len(hits):>3} erfunden={bad:>3}")
    if skipped:
        print(f"\n[WARN] {len(skipped)} von {len(logs)} Logs ohne Aufnahmeordner, nicht "
              f"bewertet: {' '.join(skipped)}")
    if not rows:
        print("[FAIL] kein Commit bewertet — nichts zu schreiben.")
        return 1
    # `candidate.json` ist die Zugliste EINES frueheren Trackerlaufs, kein unabhaengiger Zeuge.
    print(f"\n[i] Referenz: {kinds['pgn']} Aufnahmen aus reference.pgn, "
          f"{kinds['candidate']} aus candidate.json")
    write_rows(Path("tmp/calib/commits.jsonl"), rows)
    write_json(Path("tmp/calib/refs.json"), refs, indent=None)
    print(f"{len(rows)} Commits nach tmp/calib/commits.jsonl")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
