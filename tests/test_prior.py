"""The legal-placement prior: what chess allows per square, folded onto the softmax.

Kotlin twin: `android/core-cnn/src/test/kotlin/com/chesslab/cnn/PriorTest.kt`.
"""

import chess

from chesslab import config
from chesslab.serving import apply_prior, observation_from_probs
from chesslab.state import possible_labels

CLASSES = ["empty", "bB", "bR"]


def test_start_rank3_admits_pawn_knight_and_empty():
    possible = possible_labels(chess.Board())
    assert possible["a3"] == {"empty", "wP", "wN"}
    assert possible["b3"] == {"empty", "wP"}
    assert possible["h3"] == {"empty", "wP", "wN"}


def test_ranks_black_cannot_reach_stay_empty():
    possible = possible_labels(chess.Board())
    for sq, labels in possible.items():
        if sq[1] in "56":
            assert labels == {"empty"}, sq


def test_black_back_rank_is_pinned_to_one_label():
    possible = possible_labels(chess.Board())
    assert possible["a8"] == {"bR"}
    assert possible["e8"] == {"bK"}
    assert possible["a7"] == {"bP"}


def test_resting_placement_is_always_in_the_set():
    board = chess.Board()
    possible = possible_labels(board)
    for sq in chess.SQUARES:
        name = chess.square_name(sq)
        piece = board.piece_at(sq)
        label = config.label_from_piece(piece.symbol() if piece else None)
        assert label in possible[name], name


def test_lambda_zero_leaves_probabilities_untouched():
    probs = [0.6, 0.35, 0.05]
    assert apply_prior(probs, CLASSES, {"empty"}, 0.0) == probs


def test_missing_prior_leaves_probabilities_untouched():
    probs = [0.6, 0.35, 0.05]
    assert apply_prior(probs, CLASSES, None, 4.0) == probs


def test_illegal_favourite_loses_to_the_legal_runner_up():
    # 60 % bB against 35 % bR — today's argmax says bB and conf_thr 0.85 drops the square.
    out = apply_prior([0.05, 0.60, 0.35], CLASSES, {"empty", "bR"}, 4.0)
    assert out[2] > out[1]
    assert abs(sum(out) - 1.0) < 1e-9


def test_a_finite_lambda_leaves_the_pixels_arguable():
    # The reserve against a wrongly committed move: lambda is an exchange rate, not a wall.
    probs = [0.005, 0.990, 0.005]
    soft = apply_prior(probs, CLASSES, {"empty"}, 4.0)
    assert soft[1] > soft[0]
    stiff = apply_prior(probs, CLASSES, {"empty"}, 8.0)
    assert stiff[1] < stiff[0]
    assert stiff[1] > 0.0


def test_occluded_is_never_penalised():
    classes = ["empty", "bB", "occluded"]
    out = apply_prior([0.30, 0.30, 0.40], classes, {"empty"}, 4.0)
    assert out[2] > 0.40


def test_coverage_column_rides_through_untouched():
    out = apply_prior([0.6, 0.35, 0.05, 0.42], CLASSES, {"empty"}, 4.0)
    assert out[3] == 0.42
    assert abs(sum(out[: len(CLASSES)]) - 1.0) < 1e-9


def test_observation_defaults_to_the_pixels_alone():
    rows = {sq: [0.05, 0.60, 0.35] for sq in ("a5", "a8")}
    plain = observation_from_probs(rows, CLASSES)
    zeroed = observation_from_probs(rows, CLASSES, possible_labels(chess.Board()), 0.0)
    assert plain.label == zeroed.label
    assert plain.conf == zeroed.conf


def test_prior_reaches_the_label():
    rows = {sq: [0.05, 0.60, 0.35] for sq in ("a5", "a8")}
    obs = observation_from_probs(rows, CLASSES, possible_labels(chess.Board()), 4.0)
    # a5 can only be empty after one white half-move, so the 5 % class wins there.
    assert obs.label["a5"] == "empty"
    assert obs.label["a8"] == "bR"
