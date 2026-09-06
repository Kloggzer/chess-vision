"""Every recording's label must be a playable game.

A `candidate.json` carries the same game twice: as a SAN list and as a chain of `fen_after`
positions. They can disagree, and on 2026-08-23 three of them did — each broke on a `cnn_pair`
commit that wrote one row for two moves, so a ply existed in the FEN chain and nowhere in the SAN
list. The engine bug is fixed (`9f08b117`, 2026-08-09) and the seven dropped plies were put back;
this keeps the artefacts honest, which the engine fix alone does not.

The check is the cheapest one that catches it: push the SAN list from `start_fen` and see whether
chess accepts it. A dropped ply flips the side to move, so the very next SAN is refused.
"""

import json

import chess
import pytest

from chesslab.config import DATA


def _candidates():
    root = DATA.recordings
    if not root.is_dir():
        return []
    return sorted(p for p in root.glob("*/candidate.json") if p.is_file())


def _first_illegal(candidate: dict) -> str | None:
    board = chess.Board(candidate.get("start_fen") or chess.STARTING_FEN)
    for move in candidate.get("moves") or []:
        try:
            board.push_san(move["san"])
        except (chess.IllegalMoveError, chess.InvalidMoveError, chess.AmbiguousMoveError):
            return f"ply {move['ply']} {move['san']} (frame {move['frame']}, {move['decider']})"
    return None


@pytest.mark.parametrize("path", _candidates(), ids=lambda p: p.parent.name)
def test_candidate_move_chain_is_playable(path):
    candidate = json.loads(path.read_text(encoding="utf-8"))
    broken = _first_illegal(candidate)
    assert broken is None, f"{path.parent.name}: label is not playable from start_fen — {broken}"


def _position(fen):
    """Placement, side and castling: the phone writes an en-passant `-` where chesslib names the square."""
    return " ".join(str(fen or "").split()[:3])


@pytest.mark.parametrize("path", _candidates(), ids=lambda p: p.parent.name)
def test_log_rows_agree_with_the_move_they_name(path):
    """`log.jsonl` carries a ply per frame; its `fen` must be that ply's `fen_after`.

    This is what a ply insertion can silently break — the labels travel with the frame, the ply
    number is what a human reads in the review UI, and a drift of one makes them describe
    different moves.
    """
    log = path.parent / "log.jsonl"
    if not log.is_file():
        pytest.skip("no log.jsonl")
    candidate = json.loads(path.read_text(encoding="utf-8"))
    by_ply = {int(m["ply"]): m["fen_after"] for m in candidate.get("moves") or []}
    drift = [
        f"frame {row.get('frame')} ply {row['ply']}"
        for row in (json.loads(line) for line in log.read_text(encoding="utf-8").splitlines() if line.strip())
        if row.get("ply") is not None and int(row["ply"]) in by_ply and _position(by_ply[int(row["ply"])]) != _position(row.get("fen"))
    ]
    assert not drift, f"{path.parent.name}: {len(drift)} log rows name a ply whose fen they do not carry — {drift[:3]}"
