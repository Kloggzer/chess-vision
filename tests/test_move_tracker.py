"""Sicherheitsnetz-Tests für move_tracker/tracker.py — pure, headless, keine Kamera.

Deckt die Kernfunktionen, deren Verhalten in Spec 06/09 umgebaut wird. Diese Tests
PINNEN das IST-Verhalten (Regel 7 in entry.md): kein „Fix" der getesteten Funktionen.
"""

from __future__ import annotations

import chess
import numpy as np
import pytest

from move_tracker.tracker import (
    best_legal_move,
    move_touched_squares,
    normalize_diffs,
    per_square_diff,
    square_region,
)


# --- helpers ---------------------------------------------------------------------------

def _diffs(values: dict[str, float], default: float = 1.0) -> dict[str, float]:
    """Build a 64-field diff dict: `values` overrides, rest gets `default`."""
    from move_tracker.tracker import _ALL

    d = {sq: default for sq in _ALL}
    d.update(values)
    return d


# =======================================================================================
# normalize_diffs
# =======================================================================================

def test_normalize_diffs_all_equal_suppresses_global_shift():
    """64 Felder gleicher Wert (globaler Belichtungs-Shift) → alle ≈ 0."""
    from move_tracker.tracker import _ALL

    diffs = {sq: 20.0 for sq in _ALL}
    result = normalize_diffs(diffs)
    for v in result.values():
        assert v == pytest.approx(0.0)


def test_normalize_diffs_isolates_hot_fields():
    """62 Felder ≈ 2.0, e2/e4 = 40.0 → e2/e4 bleiben ≈ 38, Rest ≈ 0."""
    from move_tracker.tracker import _ALL

    diffs = {sq: 2.0 for sq in _ALL}
    diffs["e2"] = 40.0
    diffs["e4"] = 40.0
    result = normalize_diffs(diffs)

    # Median ~ 2.0 (62 Felder sind 2.0, 2 sind 40 → median = 2.0)
    assert result["e2"] == pytest.approx(38.0)
    assert result["e4"] == pytest.approx(38.0)
    for sq in _ALL:
        if sq not in ("e2", "e4"):
            assert result[sq] == pytest.approx(0.0)


# =======================================================================================
# best_legal_move
# =======================================================================================

def test_best_legal_move_simple_push():
    """Grundstellung, e2+e4 heiß → best == e2e4, score > 0."""
    board = chess.Board()  # starting position
    diffs = _diffs({"e2": 50.0, "e4": 50.0}, default=0.1)
    best, score, second, changed = best_legal_move(board, diffs, change_thr=10.0)
    assert best is not None
    assert best.uci() == "e2e4"
    assert score > 0
    assert changed == {"e2", "e4"}


def test_best_legal_move_capture():
    """Nach 1.e4 d5, e4+d5 heiß → exd5 gewinnt."""
    board = chess.Board("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2")
    diffs = _diffs({"e4": 50.0, "d5": 50.0}, default=0.1)
    best, score, second, changed = best_legal_move(board, diffs, change_thr=10.0)
    assert best is not None
    assert best.uci() == "e4d5"
    assert score > 0
    assert changed == {"e4", "d5"}


def test_best_legal_move_castling():
    """Rochadefähige Stellung, e1/f1/g1/h1 heiß → e1g1 schlägt Alternativen."""
    board = chess.Board("r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5")
    diffs = _diffs({"e1": 50.0, "f1": 50.0, "g1": 50.0, "h1": 50.0}, default=0.1)
    best, score, second, changed = best_legal_move(board, diffs, change_thr=10.0)
    assert best is not None
    assert best.uci() == "e1g1"
    assert score > 0
    # second_score is from next-best (e.g. e1f1), should be lower
    assert second < score
    assert changed == {"e1", "f1", "g1", "h1"}


def test_best_legal_move_en_passant():
    """En-passant-Stellung: from-, to- und geschlagenes-Bauern-Feld heiß."""
    board = chess.Board("rnbqkbnr/pp1pp1pp/8/2p1Pp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3")
    diffs = _diffs({"e5": 50.0, "f5": 50.0, "f6": 50.0}, default=0.1)
    best, score, second, changed = best_legal_move(board, diffs, change_thr=10.0)
    assert best is not None
    assert best.uci() == "e5f6"
    assert score > 0
    assert changed == {"e5", "f5", "f6"}


def test_best_legal_move_only_target_hot_triggers_penalty():
    """Nur Zielfeld heiß → 1000-Strafpfad greift (score < 0)."""
    board = chess.Board()
    diffs = _diffs({"e4": 50.0}, default=0.1)
    best, score, second, changed = best_legal_move(board, diffs, change_thr=10.0)
    # e2e4 is still the best candidate (touches e2 and e4), but e2 is < threshold → -1000
    # The function still returns best (not None), but with negative score.
    assert score < 0
    assert changed == {"e4"}


def test_best_legal_move_ambiguity_two_knights():
    """Zwei Springer können dasselbe heiße Feld erreichen → score − second klein.

    Stellung: nach 1.e3 e6 2.Nf3 Nf6 3.d4 d5
    Nb1→d2 und Nf3→d2 konkurrieren um d2. Beide Ursprünge heiß.
    """
    board = chess.Board("rnbqkb1r/ppp2ppp/4pn2/3p4/3P4/4PN2/PPP2PPP/RNBQKB1R w KQkq - 0 4")
    # b1 and f3 are both hot, d2 is hot – both knights can reach d2
    diffs = _diffs({"b1": 50.0, "f3": 40.0, "d2": 50.0}, default=0.1)
    best, score, second, changed = best_legal_move(board, diffs, change_thr=10.0)
    # Should pick Nbd2 (b1 hotter than f3, so b1+d2 covered > f3+d2)
    assert best is not None
    assert best.uci() == "b1d2"
    # The margin between best and second should be small (ambiguity signal)
    margin = score - second
    assert margin < 25, f"ambiguity margin expected small, got score={score:.1f} second={second:.1f}"
    assert second > 0, f"second should be positive (not -1000 penalty), got {second:.1f}"
    assert changed == {"b1", "f3", "d2"}


def test_best_legal_move_changed_set_matches_threshold():
    """`changed`-Menge enthält exakt die Felder ≥ change_thr."""
    board = chess.Board()
    diffs = _diffs({"e2": 10.0, "e4": 50.0, "d4": 9.9}, default=0.1)
    _, _, _, changed = best_legal_move(board, diffs, change_thr=10.0)
    # e2=10.0 (exactly at threshold → included), e4=50.0 (included), d4=9.9 (below → excluded)
    assert "e2" in changed
    assert "e4" in changed
    assert "d4" not in changed


def test_best_legal_move_no_changed_returns_none():
    """Kein Feld ≥ change_thr → (None, 0.0, -1e9, empty_set)."""
    board = chess.Board()
    diffs = _diffs({}, default=0.1)
    best, score, second, changed = best_legal_move(board, diffs, change_thr=10.0)
    assert best is None
    assert score == 0.0
    assert second == pytest.approx(-1e9)
    assert changed == set()


# =======================================================================================
# move_touched_squares
# =======================================================================================

def test_move_touched_squares_normal():
    """Normalzug → 2 Felder."""
    board = chess.Board()
    mv = chess.Move.from_uci("e2e4")
    touched = move_touched_squares(board, mv)
    assert touched == {"e2", "e4"}


def test_move_touched_squares_capture():
    """Schlagzug → 2 Felder (from + to)."""
    board = chess.Board("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2")
    mv = chess.Move.from_uci("e4d5")
    touched = move_touched_squares(board, mv)
    assert touched == {"e4", "d5"}


def test_move_touched_squares_kingside_castling():
    """Kurze Rochade → 4 Felder: king from/to + rook from/to."""
    board = chess.Board("r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5")
    mv = chess.Move.from_uci("e1g1")
    touched = move_touched_squares(board, mv)
    assert touched == {"e1", "g1", "h1", "f1"}


def test_move_touched_squares_queenside_castling():
    """Lange Rochade → 4 Felder: king from/to + rook from/to."""
    board = chess.Board("r3k2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 6 5")
    # Wait, this position doesn't have black queenside castling available with king on e8,
    # rook on a8. Let me construct carefully.
    board = chess.Board("r3k2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 b kq - 8 5")
    # Black can castle queenside: e8c8, rook a8→d8
    mv = chess.Move.from_uci("e8c8")
    touched = move_touched_squares(board, mv)
    assert touched == {"e8", "c8", "a8", "d8"}


def test_move_touched_squares_en_passant():
    """En passant → 3 Felder: from, to, und Feld des geschlagenen Bauern."""
    board = chess.Board("rnbqkbnr/pp1pp1pp/8/2p1Pp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3")
    mv = chess.Move.from_uci("e5f6")
    touched = move_touched_squares(board, mv)
    assert touched == {"e5", "f6", "f5"}


# =======================================================================================
# per_square_diff / square_region
# =======================================================================================

def test_per_square_diff_detects_changed_cell():
    """Zwei 800×800-Graubilder, nur e4 geändert → e4 hat hohen Diff, white_pov-Orientierung stimmt."""
    bs = 800
    gray_a = np.full((bs, bs), 128, dtype=np.uint8)
    gray_b = gray_a.copy()

    # e4: col=4, row=8-4=4 (white_pov). Zelle: x 400-500, y 400-500.
    cell = bs // 8
    gray_b[4 * cell : 5 * cell, 4 * cell : 5 * cell] = 255

    diffs = per_square_diff(gray_a, gray_b, bs, white_pov=True)

    # e4 should be by far the highest
    assert diffs["e4"] > 10.0
    # a1 (bottom-left) should have near-zero diff
    assert diffs["a1"] == pytest.approx(0.0, abs=1.0)
    # h8 (top-right) should have near-zero diff
    assert diffs["h8"] == pytest.approx(0.0, abs=1.0)


def test_square_region_returns_in_bounds():
    """square_region liefert Box innerhalb von [0, board_size] mit positiver Fläche."""
    bs = 800
    for sq in ("a1", "e4", "h8", "d5"):
        x0, y0, x1, y1 = square_region(sq, bs, white_pov=True)
        assert 0 <= x0 < x1 <= bs
        assert 0 <= y0 < y1 <= bs


def test_square_region_white_pov_a1_bottom_left():
    """Bei white_pov=True liegt a1 (col=0,row=7) im unteren Viertel, h8 (col=7,row=0) oben."""
    bs = 800
    x0, y0, x1, y1 = square_region("a1", bs, white_pov=True)
    assert y0 > bs * 0.75  # a1 → row=7 → im unteren Viertel

    x0, y0, x1, y1 = square_region("h8", bs, white_pov=True)
    assert y1 < bs * 0.25  # h8 → row=0 → im oberen Viertel
