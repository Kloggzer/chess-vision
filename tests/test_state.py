"""Stage 2 tests — headless GameState (no camera)."""

import chess
import pytest

from chesslab import config
from chesslab.state import GameState, load_pgn_game, pgn_positions

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


def test_illegal_and_malformed_uci_raise():
    gs = GameState()
    with pytest.raises(ValueError):
        gs.push_uci("e2e5")  # illegal
    with pytest.raises(ValueError):
        gs.push_uci("zz99")  # malformed


def test_undo_and_set_fen():
    gs = GameState()
    gs.push_san("e4")
    gs.undo()
    assert gs.fen() == chess.Board().fen()
    gs.set_fen(SCHOLARS_MATE_FEN)
    assert gs.label_for("f7") == "wQ"
    with pytest.raises(ValueError):
        gs.set_fen("not a real fen")


def test_pgn_positions_from_text_and_every():
    pgn_text = "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0"
    steps = pgn_positions(pgn_text)
    assert len(steps) == 7
    assert steps[0]["san"] == "e4"
    assert steps[-1]["fen"] == SCHOLARS_MATE_FEN
    # every=2 -> only even half-moves
    sparse = pgn_positions(pgn_text, every=2)
    assert [s["san"] for s in sparse] == ["e5", "Nc6", "Nf6"]


def test_load_pgn_game_invalid_source_raises():
    with pytest.raises(ValueError):
        load_pgn_game("   ")  # empty -> no game


def test_random_game_positions_deterministic_and_legal():
    from chesslab.state import random_game_positions

    a = random_game_positions(max_plies=20, seed=7)
    b = random_game_positions(max_plies=20, seed=7)
    assert [s["san"] for s in a] == [s["san"] for s in b]   # same seed -> same game
    assert len(a) <= 20
    # different seed -> (almost surely) different game
    c = random_game_positions(max_plies=20, seed=99)
    assert [s["san"] for s in a] != [s["san"] for s in c]
    # every step is a legal, replayable position
    gs = GameState()
    for step in a:
        gs.push_san(step["san"])
        assert gs.fen() == step["fen"]


def test_castling_rook_squares():
    from chesslab.state import castling_rook_squares

    b = chess.Board("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")
    rf, rt = castling_rook_squares(b, b.parse_san("O-O"))
    assert chess.square_name(rf) == "h1" and chess.square_name(rt) == "f1"
    rf2, rt2 = castling_rook_squares(b, b.parse_san("O-O-O"))
    assert chess.square_name(rf2) == "a1" and chess.square_name(rt2) == "d1"
    # black kingside
    bb = chess.Board("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1")
    rf3, rt3 = castling_rook_squares(bb, bb.parse_san("O-O"))
    assert chess.square_name(rf3) == "h8" and chess.square_name(rt3) == "f8"
    # non-castling -> None
    assert castling_rook_squares(b, b.parse_san("Kf1")) is None


def test_en_passant_captured_square():
    from chesslab.state import en_passant_captured_square

    # After 1.e4 a6 2.e5 f5 — white can play exf6 e.p., removing the pawn on f5.
    b = chess.Board("rnbqkbnr/1pppp1pp/p7/4Pp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3")
    mv = b.parse_san("exf6")
    sq = en_passant_captured_square(b, mv)
    assert chess.square_name(sq) == "f5"          # captured pawn is NOT on the destination
    # a normal capture is not en passant
    assert en_passant_captured_square(chess.Board(), chess.Board().parse_san("e4")) is None


def test_random_game_positions_from_start_fen():
    from chesslab.state import random_game_positions

    steps = random_game_positions(max_plies=5, seed=1, start_fen=SCHOLARS_MATE_FEN)
    # SCHOLARS_MATE_FEN is checkmate -> game over immediately, no moves
    assert steps == []


def test_physical_inventory_violations_flags_extra_queen():
    from chesslab.state import physical_inventory_violations

    assert physical_inventory_violations(chess.Board().fen()) == []
    fen = "Q3Q3/8/8/8/8/8/8/4K2k w - - 0 1"
    assert physical_inventory_violations(fen) == ["wQ 2/1"]
