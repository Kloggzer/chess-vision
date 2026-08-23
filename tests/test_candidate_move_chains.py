"""Every recording's label must be a playable game.

A `candidate.json` carries the same game twice: as a SAN list and as a chain of `fen_after`
positions. They can disagree, and on 2026-08-23 three of them did — each broke on a `cnn_pair`
commit that wrote one row for two moves, so a ply exists in the FEN chain and nowhere in the SAN
list. The engine bug is fixed (`9f08b117`, 2026-08-09); this guards the artefacts, which the fix
did not travel back to.

The check is the cheapest one that catches it: push the SAN list from `start_fen` and see whether
chess accepts it. A dropped ply flips the side to move, so the very next SAN is refused.
"""

import json

import chess
import pytest

from chesslab.config import DATA

# Known-broken labels, with the ply the FEN chain proves is missing. They are DATA, recorded before
# the engine fix and confirmed by a human who was checking positions, not SAN bookkeeping. Repairing
# them shifts every later ply number (and `reviewed_plies` with it), so they are listed rather than
# silently tolerated: delete an entry the moment its recording is repaired.
KNOWN_BROKEN = {
    "2026-08-08-11-59-12": "ply 15 Qa5 (cnn_pair) — dxc5 missing before it",
    "VID_20260726_233432": "ply 1 e5 (cnn_pair) — Nf3 missing before it",
    "VID_20260802_222741": "ply 1 e5 (cnn_pair) — e4 missing before it",
}


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
    session = path.parent.name
    broken = _first_illegal(json.loads(path.read_text(encoding="utf-8")))
    if session in KNOWN_BROKEN:
        assert broken is not None, f"{session} is playable now — drop it from KNOWN_BROKEN"
        return
    assert broken is None, f"{session}: label is not playable from start_fen — {broken}"
