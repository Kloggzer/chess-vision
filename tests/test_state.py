"""Stage 2 tests — headless GameState (no camera)."""

import chess
import pytest

from chesslab import config
from chesslab.state import GameState

# Scholar's mate; the resulting position is a known, checkable FEN.
SCHOLARS_MATE_SAN = ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"]
SCHOLARS_MATE_FEN = "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4"


def test_start_position_labels():
    gs = GameState()
    labels = gs.labels()
    assert len(labels) == 64
    occupied = [s for s, lab in labels.items() if lab != "empty"]
    empty = [s for s, lab in labels.items() if lab == "empty"]
    assert len(occupied) == 32
    assert len(empty) == 32
    assert labels["e1"] == "wK"
    assert labels["e8"] == "bK"
    assert labels["d1"] == "wQ"
    assert labels["a2"] == "wP"
    assert labels["a7"] == "bP"
    # every produced label is a valid class
    assert all(lab in config.CLASSES for lab in labels.values())


def test_piece_map_and_labels_consistent_over_64():
    gs = GameState()
    gs.push_san("e4")
    occupied = set(gs.piece_map().keys())
    empty = {s for s, lab in gs.labels().items() if lab == "empty"}
    assert occupied.isdisjoint(empty)
    assert len(occupied | empty) == 64


def test_known_pgn_reaches_expected_end_fen():
    gs = GameState()
    for san in SCHOLARS_MATE_SAN:
        gs.push_san(san)
    assert gs.fen() == SCHOLARS_MATE_FEN
    assert gs.is_game_over() is True
    assert gs.ply() == 7  # 7 half-moves played, 0-indexed count


def test_illegal_san_raises():
    gs = GameState()
    with pytest.raises(ValueError):
        gs.push_san("e5")  # white pawn cannot reach e5 on move 1


def test_undo_and_set_fen():
    gs = GameState()
    gs.push_san("e4")
    gs.undo()
    assert gs.fen() == chess.Board().fen()
    gs.set_fen(SCHOLARS_MATE_FEN)
    assert gs.label_for("f7") == "wQ"
    with pytest.raises(ValueError):
        gs.set_fen("not a real fen")
