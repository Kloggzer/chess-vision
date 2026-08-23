"""The tracker's Markov chain, completed and decoded offline (`docs/tracker-flow.md`).

Hidden state: the board position. Transition: one legal ply or nothing. Emission: the recorded
per-square distribution in `model-reads.jsonl`, weighted down by that square's coverage. Decoding:
beam-pruned Viterbi over the frames in order.

A SMOOTHER, not the live filter — it sees the whole recording, so it measures what the emissions
SUPPORT rather than what a tracker can reach. `--floor` is the calibration: the smallest probability
any label is granted, and therefore the most a single misread square may testify.

    uv run python scripts/chain_decode.py <session> [--beam N] [--pmove P] [--floor F] [--no-coverage]
"""

import argparse
import json
import math
from collections import defaultdict
from pathlib import Path

import chess

ROOT = Path("data/recordings")


def load_reads(session, floor, use_coverage):
    """frame -> {square: {label: weighted log prob}} — the emission table, precomputed once."""
    table = defaultdict(dict)
    for line in (ROOT / session / "model-reads.jsonl").read_text(encoding="utf-8").splitlines():
        row = json.loads(line)
        if "square" not in row:
            continue
        weight = (1.0 - (row.get("cov") or 0.0)) if use_coverage else 1.0
        dist = row["probs"]
        cell = {lab: weight * math.log(max(dist.get(lab, floor), floor)) for lab in LABELS}
        table[row["frame"]][row["square"]] = cell
    return table


LABELS = ["empty"] + [c + p for c in "wb" for p in "PNBRQK"]

SQUARES = [chess.square_name(s) for s in chess.SQUARES]


def label_of(board, square):
    piece = board.piece_at(chess.parse_square(square))
    if piece is None:
        return "empty"
    return ("w" if piece.color else "b") + piece.symbol().upper()


def emission(board, cells):
    """log P(this frame's read | this position), summed over the 64 squares."""
    return sum(cells[sq][label_of(board, sq)] for sq in SQUARES)


def touched(board, move):
    """The squares a move changes — enough to update the emission without re-summing 64."""
    out = {chess.square_name(move.from_square), chess.square_name(move.to_square)}
    if board.is_castling(move):
        rank = chess.square_rank(move.from_square)
        kingside = chess.square_file(move.to_square) > chess.square_file(move.from_square)
        for f in ((7, 5) if kingside else (0, 3)):
            out.add(chess.square_name(chess.square(f, rank)))
    if board.is_en_passant(move):
        out.add(chess.square_name(chess.square(chess.square_file(move.to_square),
                                               chess.square_rank(move.from_square))))
    return out


def decode(session, beam, p_move, floor, use_coverage):
    candidate = json.loads((ROOT / session / "candidate.json").read_text(encoding="utf-8"))
    table = load_reads(session, floor, use_coverage)
    frames = sorted(table)
    stay_cost = math.log(1.0 - p_move)

    start = chess.Board(candidate.get("start_fen") or chess.STARTING_FEN)
    states = [(0.0, start, ())]
    for frame in frames:
        cells = table[frame]
        scored = {}
        for logp, board, path in states:
            base = emission(board, cells)
            if (key := (board.board_fen(), board.turn, len(path))) not in scored or                     logp + stay_cost + base > scored[key][0]:
                scored[key] = (logp + stay_cost + base, board, path)
            moves = list(board.legal_moves)
            move_cost = math.log(p_move / max(len(moves), 1))
            for mv in moves:
                sqs = touched(board, mv)
                before = sum(cells[sq][label_of(board, sq)] for sq in sqs)
                nxt = board.copy(stack=False)
                nxt.push(mv)
                after = sum(cells[sq][label_of(nxt, sq)] for sq in sqs)
                total = logp + move_cost + base - before + after
                nxt_path = path + ((frame, mv.uci()),)
                key = (nxt.board_fen(), nxt.turn, len(nxt_path))
                if key not in scored or total > scored[key][0]:
                    scored[key] = (total, nxt, nxt_path)
        states = sorted(scored.values(), key=lambda s: -s[0])[:beam]
    return max(states, key=lambda s: s[0]), candidate


def lcs_score(reference, found):
    """found / missed / invented, the replay scorer's shape: an LCS over the SAN sequences."""
    n, m = len(reference), len(found)
    table = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            table[i][j] = table[i + 1][j + 1] + 1 if reference[i] == found[j] else max(table[i + 1][j], table[i][j + 1])
    keep = table[0][0]
    return keep, n - keep, m - keep


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("session")
    ap.add_argument("--beam", type=int, default=24)
    ap.add_argument("--pmove", type=float, default=0.06)
    ap.add_argument("--floor", type=float, default=1e-4)
    ap.add_argument("--no-coverage", action="store_true")
    args = ap.parse_args()

    (logp, board, path), candidate = decode(
        args.session, args.beam, args.pmove, args.floor, not args.no_coverage
    )
    reference = [m["san"] for m in candidate["moves"]]
    replay = chess.Board(candidate.get("start_fen") or chess.STARTING_FEN)
    sans = []
    for _, uci in path:
        mv = chess.Move.from_uci(uci)
        sans.append(replay.san(mv))
        replay.push(mv)
    found, missed, invented = lcs_score(reference, sans)
    print(f"{args.session}  beam={args.beam} pmove={args.pmove} coverage={not args.no_coverage}")
    print(f"  Referenz {len(reference)} Plies, Kette {len(sans)} Plies, logP {logp:.0f}")
    print(f"  gefunden {found} / verpasst {missed} / erfunden {invented}")
    if missed or invented:
        print(f"  Referenz: {' '.join(reference[:14])} …")
        print(f"  Kette:    {' '.join(sans[:14])} …")
