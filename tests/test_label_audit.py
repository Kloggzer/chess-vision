"""The ledger audit: it must prove, and it must not accuse a hand."""

from chesslab.label_audit import board_of, fen_labels, violations

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def test_a_legal_position_trips_nothing():
    assert violations(fen_labels(START)) == []


def test_two_black_kings_are_proof_not_suspicion():
    """Found on 46 real frames (2026-08-16): the ledger named a second king and nobody noticed."""
    labels = {**fen_labels(START), "d8": "bK"}

    assert "TOO_MANY_KINGS" in violations(labels)


def test_a_pawn_on_the_back_rank_is_flagged():
    labels = {**fen_labels(START), "e1": "wP"}

    assert "PAWNS_ON_BACKRANK" in violations(labels)


def test_occlusion_never_accuses():
    """`occluded` hides a square, and hiding can only LOWER a count. A board missing both kings
    because hands cover them is not a ledger error, and flagging it would bury the real ones."""
    labels = {**fen_labels(START), "e1": "occluded", "e8": "occluded"}

    assert violations(labels) == []


def test_the_board_ignores_empty_and_occluded():
    board = board_of({"a1": "wR", "b1": "empty", "c1": "occluded"})

    assert board.piece_map() and len(board.piece_map()) == 1
