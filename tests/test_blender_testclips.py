import chess
import pytest
from scripts.generate_blender_testclips import positions_and_san


def test_positions_and_san_builds_every_intermediate_position():
    positions, sans = positions_and_san(["d2d4", "e7e5", "b1c3"])

    assert sans == ["d4", "e5", "Nc3"]
    assert len(positions) == 4
    final = chess.Board(positions[-1])
    assert final.piece_at(chess.D4) == chess.Piece(chess.PAWN, chess.WHITE)
    assert final.piece_at(chess.E5) == chess.Piece(chess.PAWN, chess.BLACK)
    assert final.piece_at(chess.C3) == chess.Piece(chess.KNIGHT, chess.WHITE)


def test_positions_and_san_rejects_illegal_fixture_move():
    with pytest.raises(ValueError, match="illegal scenario move"):
        positions_and_san(["e2e5"])
