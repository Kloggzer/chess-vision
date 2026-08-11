"""Rebuild a stored game from the tracker's decision log, which keeps every ply the record can lose.

The record and the log are two independent writers. The log (`files/diagnostics/diag-*.ndjson`)
carries one row per decision, accepted or not, straight off the engine; the game record is
accumulated by `GameSessionController` from the event stream and can come out SHORT — until
`d8b4e35` a status update delivered one ply late was indistinguishable from a take-back and deleted
the ply it had just written. Measured on the device on 2026-08-10: the engine committed and
announced 69 plies, the stored game kept 39, in eleven pieces.

Nothing here is inferred. Every accepted ply is replayed from the game's own `startFen` and three
things must agree before a rebuilt record is written:

- the move is legal in the position the replay has reached,
- its SAN matches what the log recorded,
- the position the replay reaches matches the FEN the engine published for that ply
  (placement and side to move; the counters are not compared, see below).

Any disagreement aborts with the ply named and NOTHING is written. A record that guesses is worse
than a record that is short — the short one at least says so, with a seam.

The rebuilt game keeps the original's identity: id, `startFen`, `startedAtEpochMs`, `profileName`,
`sessionId` and the player names. Only the move list, the segments (one, no seam), the result and
`finishedAtEpochMs` come from the log.

**It writes a file, it does not install one.** Putting it on the device is a separate, deliberate
act, and the app has to re-derive what it caches beside the record:

    adb push out.json /data/local/tmp/g.json
    adb shell chmod 644 /data/local/tmp/g.json
    adb shell "run-as com.chesslab.tracker sh -c 'cat /data/local/tmp/g.json > files/games/<id>.json'"

then open the game once and use *Edit game details -> Save*: `GameStore.save` rewrites the stored
PGN and the index row, which `list()` reads and never recomputes. The stored analysis is keyed to
the position count and will ask to finish the new positions; the per-position cache makes that fast.

Usage:
    uv run python scripts/rebuild_game_from_diag.py --diag diag-18.ndjson --game 2026-08-10_1242.json
        --out rebuilt.json [--dry-run]

Both inputs come off the device with `adb exec-out run-as com.chesslab.tracker cat <path>`.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import chess

# Placement and side to move. The halfmove clock and fullmove number are NOT compared: the log's
# FENs come from the engine's own writer and the record may count differently across a seam, and a
# counter has never once been the thing that made a position wrong.
FEN_POSITION_FIELDS = 2


def position(fen: str) -> str:
    """The two FEN fields a rebuilt ply is judged on."""
    return " ".join(fen.split(" ")[:FEN_POSITION_FIELDS])


def accepted_plies(diag: Path) -> list[dict]:
    """The committed moves, in order. Rows without a move are decisions, not plies."""
    rows = [json.loads(line) for line in diag.read_text(encoding="utf-8").splitlines() if line.strip()]
    return [r for r in rows if r.get("accepted") and r.get("san") and r.get("uci")]


def provenance_of(row: dict) -> dict:
    """`MoveProvenance` as the app stores it — the evidence the log already holds, nothing invented."""
    return {
        "decider": row["decider"],
        "reason": row.get("reason") or row["decider"],
        "priorUsed": bool(row.get("priorUsed")),
        "best": row.get("bestScore") or 0.0,
        "second": row.get("secondScore") or 0.0,
        "margin": row.get("margin") or 0.0,
        "changed": row.get("changed") or [],
        "shadowVetoed": row.get("shadowVetoed") or [],
        "occludedVetoed": row.get("occludedVetoed") or [],
        "cnnAgreement": row.get("cnnAgreement") or 0.0,
        "verifyOutcomes": [row["verifyOutcome"]] if row.get("verifyOutcome") else [],
    }


def is_this_game(old: dict, moves: list[dict]) -> bool:
    """Is [moves] the same game the record holds — or another one that merely starts the same way?

    The record's FIRST segment is a clean prefix of what was played: a lost ply is exactly what ends
    a segment, so everything before the first seam is untouched. A log from a different session
    replays from `startFen` just as legally (most games open 1.e4 e5) and would otherwise be written
    over this record on nothing but a ply count.
    """
    segments = old.get("segments") or [{"moves": old["moves"]}]
    prefix = [m["uci"] for m in segments[0]["moves"]]
    return [m["uci"] for m in moves[: len(prefix)]] == prefix


def replay(rows: list[dict], start_fen: str) -> tuple[list[dict], list[str], chess.Board]:
    """Replay the log's plies, checking each against the position the engine published for it."""
    board = chess.Board(start_fen)
    moves: list[dict] = []
    problems: list[str] = []
    for row in rows:
        move = chess.Move.from_uci(row["uci"])
        if move not in board.legal_moves:
            problems.append(f"ply {row['ply']} {row['san']} ({row['uci']}) is not legal in {board.fen()}")
            break
        san = board.san(move)
        if san != row["san"]:
            problems.append(f"ply {row['ply']}: log says {row['san']}, the board says {san}")
        board.push(move)
        if position(row["fenAfter"]) != position(board.fen()):
            problems.append(
                f"ply {row['ply']} {san}: engine published {position(row['fenAfter'])}, replay reaches {position(board.fen())}"
            )
        moves.append(
            {
                "ply": len(moves) + 1,
                "san": san,
                "uci": row["uci"],
                "tsEpochMs": int(row["tsS"] * 1000),
                "provenance": provenance_of(row),
            }
        )
    return moves, problems, board


def result_of(board: chess.Board, fallback: str) -> str:
    """The record's own rule (`resultFromFen`): a tracked game usually ends because people stopped."""
    if board.is_checkmate():
        return "0-1" if board.turn == chess.WHITE else "1-0"
    if board.is_stalemate() or board.is_insufficient_material():
        return "1/2-1/2"
    return fallback


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--diag", type=Path, required=True, help="diag-NN.ndjson covering the game")
    parser.add_argument("--game", type=Path, required=True, help="the stored <id>.json to rebuild")
    parser.add_argument("--out", type=Path, help="where to write the rebuilt record (required unless --dry-run)")
    parser.add_argument("--dry-run", action="store_true", help="verify and report, write nothing")
    args = parser.parse_args()
    if args.out is None and not args.dry_run:
        parser.error("--out is required unless --dry-run")

    old = json.loads(args.game.read_text(encoding="utf-8"))
    rows = accepted_plies(args.diag)
    print(f"log: {len(rows)} accepted plies · record: {len(old['moves'])} plies in {len(old.get('segments') or [1])} segment(s)")

    moves, problems, board = replay(rows, old["startFen"])
    for problem in problems:
        print(f"  ! {problem}")
    if problems:
        print("nothing written — the log does not replay cleanly from this game's start position")
        return 1
    if not is_this_game(old, moves):
        print("nothing written — this log is not this game: it diverges inside the record's first segment")
        return 1
    if len(moves) <= len(old["moves"]):
        print("nothing written — the log holds no more plies than the record already has")
        return 1

    result = result_of(board, old["result"])
    print(f"replayed {len(moves)} plies, every position confirmed against the engine's own FEN, result {result}")
    if args.dry_run:
        return 0

    rebuilt = dict(old)
    rebuilt["moves"] = moves
    # One segment: a record that replays from its own start has no seam left to declare.
    rebuilt["segments"] = [{"startFen": old["startFen"], "moves": moves, "enteredBy": None}]
    rebuilt["result"] = result
    rebuilt["finishedAtEpochMs"] = moves[-1]["tsEpochMs"]
    args.out.write_text(json.dumps(rebuilt, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {args.out} — {len(moves) - len(old['moves'])} plies recovered")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
