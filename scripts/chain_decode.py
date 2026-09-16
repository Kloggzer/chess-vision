"""An INSTRUMENT, never a tracker (`docs/tracker-flow.md`).

The offline tracker is `desktop replay`: it runs the shipping `:core-engine` over a video, so it
cannot diverge from the device by construction. This file is a different algorithm on purpose — it
answers "how much do the emissions support at best", which the engine cannot answer about itself.
Nothing in the app calls it and nothing should; what it proves belongs in `:core-engine`, measured
through `desktop replay` afterwards. Kotlin is the reference implementation.

The chain, completed and decoded offline.

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

from chesslab.ioutil import read_jsonl

ROOT = Path("data/recordings")


def tempered(dist, temp):
    """The full 13-way distribution at temperature [temp] — the post-hoc calibration knob.

    `model-reads.jsonl` stores only the significant entries, so the missing mass is spread over the
    labels it left out before `p ** (1 / temp)` is applied and everything renormalised. T = 1 is the
    stored distribution exactly; T > 1 softens a confident read without moving its argmax.
    """
    missing = [lab for lab in LABELS if lab not in dist]
    rest = max(0.0, 1.0 - sum(dist.values())) / len(missing) if missing else 0.0
    full = {lab: dist.get(lab, rest) for lab in LABELS}
    if temp == 1.0:
        return full
    powered = {lab: p ** (1.0 / temp) for lab, p in full.items()}
    total = sum(powered.values()) or 1.0
    return {lab: p / total for lab, p in powered.items()}


def load_reads(session, floor, use_coverage, temp, reads):
    """frame -> {square: {label: weighted log prob}} — the emission table, precomputed once."""
    table = defaultdict(dict)
    for row in read_jsonl(ROOT / session / reads):
        if "square" not in row:
            continue
        cov = row.get("model_cov", row.get("cov"))          # `cov`: Schreibweise vor 2026-09-16
        weight = (1.0 - (cov or 0.0)) if use_coverage else 1.0
        dist = tempered(row["probs"], temp)
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


def decode(session, beam, p_move, floor, use_coverage, temp=1.0, reads="model-reads.jsonl", every=1):
    candidate = json.loads((ROOT / session / "candidate.json").read_text(encoding="utf-8"))
    table = load_reads(session, floor, use_coverage, temp, reads)
    # `every` thins the frames. The cost of every stage is linear in them, and a recording carries
    # far more boards than plies — the question a sweep answers is how few still name every move.
    frames = sorted(table)[::every]
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


def filter_decode(session, beam, p_move, floor, use_coverage, temp=1.0,
                  reads="model-reads.jsonl", every=1):
    """The same chain, but committing as it goes — no lookahead, no taking anything back.

    A streaming beam emits what every surviving hypothesis already agrees on: the longest common
    prefix. That prefix is then FINAL and the beam is pruned to it, which is what makes this a
    filter rather than a smoother. Everything else — the emission, the transition prior, the beam
    width — is identical to [decode], so the difference between the two is the lookahead alone.
    """
    candidate = json.loads((ROOT / session / "candidate.json").read_text(encoding="utf-8"))
    table = load_reads(session, floor, use_coverage, temp, reads)
    frames = sorted(table)[::every]
    stay_cost = math.log(1.0 - p_move)

    start = chess.Board(candidate.get("start_fen") or chess.STARTING_FEN)
    states = [(0.0, start, ())]
    committed: tuple = ()
    for frame in frames:
        cells = table[frame]
        scored = {}
        for logp, board, path in states:
            base = emission(board, cells)
            key = (board.board_fen(), board.turn, len(path))
            if key not in scored or logp + stay_cost + base > scored[key][0]:
                scored[key] = (logp + stay_cost + base, board, path)
            moves = list(board.legal_moves)
            move_cost = math.log(p_move / max(len(moves), 1))
            for mv in moves:
                sqs = touched(board, mv)
                before = sum(cells[sq][label_of(board, sq)] for sq in sqs)
                nxt = board.copy(stack=False)
                nxt.push(mv)
                after = sum(cells[sq][label_of(nxt, sq)] for sq in sqs)
                nxt_path = path + ((frame, mv.uci()),)
                total = logp + move_cost + base - before + after
                k2 = (nxt.board_fen(), nxt.turn, len(nxt_path))
                if k2 not in scored or total > scored[k2][0]:
                    scored[k2] = (total, nxt, nxt_path)
        states = sorted(scored.values(), key=lambda s: -s[0])[:beam]
        shortest = min(len(p) for _, _, p in states)
        agreed = 0
        while agreed < shortest and len({p[agreed][1] for _, _, p in states}) == 1:
            agreed += 1
        if agreed > len(committed):
            committed = states[0][2][:agreed]
            states = [s for s in states if s[2][:agreed] == committed]
    return (max(states, key=lambda s: s[0])[0], None, committed), candidate


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
    ap.add_argument("--temp", type=float, default=1.0)
    ap.add_argument("--reads", default="model-reads.jsonl")
    ap.add_argument("--every", type=int, default=1)
    ap.add_argument("--filter", action="store_true", help="commit as you go, no lookahead")
    args = ap.parse_args()

    run = filter_decode if args.filter else decode
    (logp, board, path), candidate = run(
        args.session, args.beam, args.pmove, args.floor, not args.no_coverage, args.temp, args.reads, args.every
    )
    reference = [m["san"] for m in candidate["moves"]]
    replay = chess.Board(candidate.get("start_fen") or chess.STARTING_FEN)
    sans = []
    for _, uci in path:
        mv = chess.Move.from_uci(uci)
        sans.append(replay.san(mv))
        replay.push(mv)
    found, missed, invented = lcs_score(reference, sans)
    print(f"{args.session}  beam={args.beam} pmove={args.pmove} floor={args.floor} temp={args.temp} filter={args.filter}")
    print(f"  Referenz {len(reference)} Plies, Kette {len(sans)} Plies, logP {logp:.0f}")
    print(f"  gefunden {found} / verpasst {missed} / erfunden {invented}")
    if missed or invented:
        print(f"  Referenz: {' '.join(reference[:14])} …")
        print(f"  Kette:    {' '.join(sans[:14])} …")
