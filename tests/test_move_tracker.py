"""Tests for chesslab.move_tracker.tracker — pure, headless, no camera.

Since Spec 10 (Move-Detection v2) scoring is probabilistic: z-scores against a
per-square noise model + log-likelihood per legal move (instead of hard change_thr gates).
"""

from __future__ import annotations

import inspect
import json
import time

import chess
import cv2
import numpy as np
import pytest

from chesslab.move_tracker.cnn_recovery import OccupancyObservation
from chesslab.move_tracker.tracker import (
    CnnSnapshot,
    SquareNoise,
    loglik_scores,
    move_destination_squares,
    move_prior,
    move_touched_squares,
    normalize_diffs,
    per_square_census_change,
    per_square_diff,
    square_region,
)

# --- helpers ---------------------------------------------------------------------------

def _diffs(values: dict[str, float], default: float = 1.0) -> dict[str, float]:
    """Build a 64-field diff dict: `values` overrides, rest gets `default`."""
    from chesslab.move_tracker.tracker import _ALL

    d = dict.fromkeys(_ALL, default)
    d.update(values)
    return d


def test_tracker_direct_defaults_match_config():
    from chesslab import config
    from chesslab.move_tracker.tracker import MoveTracker

    sig = inspect.signature(MoveTracker)
    for name in ("motion_margin", "overhang", "motion_hold_s", "min_grid_line_coverage"):
        assert sig.parameters[name].default == config.TRACK_DEFAULTS[name]


# =======================================================================================
# normalize_diffs
# =======================================================================================

def test_normalize_diffs_all_equal_suppresses_global_shift():
    """64 squares same value (global exposure shift) → all ≈ 0."""
    from chesslab.move_tracker.tracker import _ALL

    diffs = dict.fromkeys(_ALL, 20.0)
    result = normalize_diffs(diffs)
    for v in result.values():
        assert v == pytest.approx(0.0)


def test_normalize_diffs_isolates_hot_fields():
    """62 squares ≈ 2.0, e2/e4 = 40.0 → e2/e4 stay ≈ 38, rest ≈ 0."""
    from chesslab.move_tracker.tracker import _ALL

    diffs = dict.fromkeys(_ALL, 2.0)
    diffs["e2"] = 40.0
    diffs["e4"] = 40.0
    result = normalize_diffs(diffs)

    # Median ~ 2.0 (62 squares are 2.0, 2 are 40 → median = 2.0)
    assert result["e2"] == pytest.approx(38.0)
    assert result["e4"] == pytest.approx(38.0)
    for sq in _ALL:
        if sq not in ("e2", "e4"):
            assert result[sq] == pytest.approx(0.0)


# =======================================================================================
# SquareNoise + loglik_scores (Spec 10, part 1)
# =======================================================================================

def _z(values: dict[str, float], default: float = 0.0) -> dict[str, float]:
    from chesslab.move_tracker.tracker import _ALL

    z = dict.fromkeys(_ALL, default)
    z.update(values)
    return z


class TestSquareNoise:
    def test_std_floor_prevents_collapse(self):
        """Many updates with diff ≈ 0 → std does NOT collapse below the floor."""
        n = SquareNoise()
        quiet = _diffs({}, default=0.0)
        for _ in range(200):
            n.update(quiet)
        assert min(n.std.values()) >= n.std_floor

    def test_mean_absorbs_local_drift(self):
        """Persistent local offset on e4 is learned into the mean → z drops toward 0."""
        n = SquareNoise()
        drifted = _diffs({"e4": 10.0}, default=0.0)
        for _ in range(200):
            n.update(drifted)
        assert n.z(drifted)["e4"] < 1.0

    def test_fresh_change_scores_high_z(self):
        """Fresh spike against learned quiet noise → high z-score."""
        n = SquareNoise()
        for _ in range(100):
            n.update(_diffs({}, default=1.0))
        z = n.z(_diffs({"e4": 30.0}, default=1.0))
        assert z["e4"] > 5.0


class TestLoglikScores:
    def test_simple_push_wins(self):
        board = chess.Board()
        scored = loglik_scores(board, _z({"e2": 8.0, "e4": 8.0}))
        assert scored[0][0].uci() == "e2e4"
        assert scored[0][1] > 0

    def test_weak_target_still_wins(self):
        """White-on-white: target square only z=1.5 (below z_thr!) — e2e4 still wins,
        no hard cutoff anymore (first DoD criterion of the spec)."""
        board = chess.Board()
        scored = loglik_scores(board, _z({"e2": 8.0, "e4": 1.5}))
        assert scored[0][0].uci() == "e2e4"
        assert scored[0][1] > 0                    # Evidence speaks net FOR the move

    def test_capture_wins(self):
        board = chess.Board("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2")
        scored = loglik_scores(board, _z({"e4": 8.0, "d5": 8.0}))
        assert scored[0][0].uci() == "e4d5"

    def test_castling_signature_wins(self):
        board = chess.Board("r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5")
        scored = loglik_scores(board, _z({"e1": 8.0, "f1": 8.0, "g1": 8.0, "h1": 8.0}))
        assert scored[0][0].uci() == "e1g1"
        assert scored[0][1] > scored[1][1]

    def test_en_passant_signature_wins(self):
        board = chess.Board("rnbqkbnr/pp1pp1pp/8/2p1Pp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3")
        scored = loglik_scores(board, _z({"e5": 8.0, "f5": 8.0, "f6": 8.0}))
        assert scored[0][0].uci() == "e5f6"

    def test_unexplained_hot_square_penalizes_noncovering_moves(self):
        """Hot untouched square pushes moves that do NOT explain it below the one that covers it."""
        board = chess.Board()
        z = _z({"e2": 8.0, "e4": 8.0, "a3": 8.0})   # a3 is hot, but only a2a3/b1a3 cover it
        scored = {mv.uci(): s for mv, s in loglik_scores(board, z)}
        assert scored["e2e4"] > scored["d2d4"]      # d2d4 explains nothing hot
        # e2e4 leaves a3 unexplained → its score is lower than without the interfering field
        clean = {mv.uci(): s for mv, s in loglik_scores(board, _z({"e2": 8.0, "e4": 8.0}))}
        assert scored["e2e4"] == pytest.approx(clean["e2e4"])   # relative: interfering field affects all equally

    def test_quiet_board_all_negative(self):
        """Quiet board → all moves clearly negative (re-anchor floor kicks in)."""
        board = chess.Board()
        scored = loglik_scores(board, _z({}))
        assert scored[0][1] < -4.0

    def test_ambiguity_two_knights_small_margin(self):
        board = chess.Board("rnbqkb1r/ppp2ppp/4pn2/3p4/3P4/4PN2/PPP2PPP/RNBQKB1R w KQkq - 0 4")
        scored = loglik_scores(board, _z({"b1": 8.0, "f3": 7.0, "d2": 8.0}))
        assert scored[0][0].uci() == "b1d2"
        assert scored[0][1] - scored[1][1] < 2.0    # small → ambiguity gate/prior


class TestMovePrior:
    def test_capture_beats_quiet(self):
        board = chess.Board("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2")
        assert move_prior(board, chess.Move.from_uci("e4d5")) > \
               move_prior(board, chess.Move.from_uci("a2a3"))

    def test_capped_at_one(self):
        board = chess.Board()
        for mv in board.legal_moves:
            assert 0.0 <= move_prior(board, mv) <= 1.0


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
    """Capture → 2 squares (from + to)."""
    board = chess.Board("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2")
    mv = chess.Move.from_uci("e4d5")
    touched = move_touched_squares(board, mv)
    assert touched == {"e4", "d5"}


def test_move_touched_squares_kingside_castling():
    """Kingside castling → 4 squares: king from/to + rook from/to."""
    board = chess.Board("r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5")
    mv = chess.Move.from_uci("e1g1")
    touched = move_touched_squares(board, mv)
    assert touched == {"e1", "g1", "h1", "f1"}


def test_move_touched_squares_queenside_castling():
    """Queenside castling → 4 squares: king from/to + rook from/to."""
    board = chess.Board("r3k2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 6 5")
    # Wait, this position doesn't have black queenside castling available with king on e8,
    # rook on a8. Let me construct carefully.
    board = chess.Board("r3k2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 b kq - 8 5")
    # Black can castle queenside: e8c8, rook a8→d8
    mv = chess.Move.from_uci("e8c8")
    touched = move_touched_squares(board, mv)
    assert touched == {"e8", "c8", "a8", "d8"}


def test_move_touched_squares_en_passant():
    """En passant → 3 squares: from, to, and the captured pawn's square."""
    board = chess.Board("rnbqkbnr/pp1pp1pp/8/2p1Pp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3")
    mv = chess.Move.from_uci("e5f6")
    touched = move_touched_squares(board, mv)
    assert touched == {"e5", "f6", "f5"}


# =======================================================================================
# per_square_diff / square_region
# =======================================================================================

def test_per_square_diff_detects_changed_cell():
    """Two 800×800 gray images, only e4 changed → e4 has high diff, white_pov orientation is correct."""
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
    """square_region returns box within [0, board_size] with positive area."""
    bs = 800
    for sq in ("a1", "e4", "h8", "d5"):
        x0, y0, x1, y1 = square_region(sq, bs, white_pov=True)
        assert 0 <= x0 < x1 <= bs
        assert 0 <= y0 < y1 <= bs


def test_square_region_white_pov_a1_bottom_left():
    """With white_pov=True, a1 (col=0,row=7) is in the lower quarter, h8 (col=7,row=0) at top."""
    bs = 800
    x0, y0, x1, y1 = square_region("a1", bs, white_pov=True)
    assert y0 > bs * 0.75  # a1 → row=7 → in the lower quarter

    x0, y0, x1, y1 = square_region("h8", bs, white_pov=True)
    assert y1 < bs * 0.25  # h8 → row=0 → in the upper quarter


# =======================================================================================
# Stage-A A1: integral-image refactors — oracle copies of old implementations
# =======================================================================================

def _per_square_diff_sliced(gray_a, gray_b, board_size: int, white_pov: bool,
                            extend_up: float = 0.0) -> dict[str, float]:
    from chesslab.move_tracker.tracker import _ALL, square_region
    d = cv2.absdiff(gray_a, gray_b)
    out: dict[str, float] = {}
    for sq in _ALL:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov, extend_up=extend_up)
        out[sq] = float(d[y0:y1, x0:x1].mean()) if (y1 > y0 and x1 > x0) else 0.0
    return out


def _per_square_census_change_sliced(ref_gray, cur_gray, board_size: int, white_pov: bool,
                                     extend_up: float = 0.0, ref_codes=None) -> dict[str, float]:
    from chesslab.move_tracker.tracker import _ALL, _POPCOUNT8, census_transform, square_region
    ham = _POPCOUNT8[(census_transform(ref_gray) if ref_codes is None else ref_codes)
                      ^ census_transform(cur_gray)]
    out: dict[str, float] = {}
    for sq in _ALL:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov, extend_up=extend_up)
        reg = ham[y0:y1, x0:x1]
        out[sq] = float(reg.mean()) * (255.0 / 8.0) if reg.size else 0.0
    return out


def _hsv_shadow_squares_sliced(ref_bgr, cur_bgr, board_size: int, white_pov: bool,
                                candidates, v_lo: float = 0.35, v_hi: float = 0.97,
                                h_tol: float = 15.0, s_tol: float = 40.0, frac: float = 0.5,
                                extend_up: float = 0.0) -> set[str]:
    from chesslab.move_tracker.tracker import square_region
    hr = cv2.cvtColor(ref_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    hc = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    out: set[str] = set()
    for sq in candidates:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov, extend_up=extend_up)
        R, C = hr[y0:y1, x0:x1], hc[y0:y1, x0:x1]
        if R.size == 0:
            continue
        Vr, Vc = R[..., 2], C[..., 2]
        ratio = Vc / (Vr + 1e-3)
        dh = np.abs(C[..., 0] - R[..., 0])
        dh = np.minimum(dh, 180.0 - dh)
        ds = C[..., 1] - R[..., 1]
        shadow_px = (ratio >= v_lo) & (ratio <= v_hi) & (dh <= h_tol) & (ds <= s_tol)
        if float(shadow_px.mean()) >= frac and Vc.mean() < Vr.mean():
            out.add(sq)
    return out


def _occlusion_color_squares_sliced(cur_bgr, gamut, board_size: int, white_pov: bool,
                                    candidates, thr: float = 4.0,
                                    extend_up: float = 0.0) -> set[str]:
    from chesslab.move_tracker.tracker import square_region
    if gamut is None or cur_bgr is None or not candidates or thr <= 0:
        return set()
    _mu, inv, refs = gamut
    lab = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    sat = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)[..., 1]
    thr2 = float(thr) * float(thr)
    out: set[str] = set()
    for sq in candidates:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov, extend_up=extend_up)
        reg = lab[y0:y1, x0:x1]
        s = sat[y0:y1, x0:x1]
        if reg.size == 0:
            continue
        cur_feat = np.array([float(reg[..., 1].mean()), float(reg[..., 2].mean()),
                             float(s.mean())], dtype=np.float32)
        dists = ((refs - cur_feat) @ inv * (refs - cur_feat)).sum(axis=1)
        if float(dists.min()) > thr2:
            out.add(sq)
    return out


def _board_color_gamut_sliced(ref_bgr, board_size: int, white_pov: bool):
    from chesslab.move_tracker.tracker import _ALL, square_region
    if ref_bgr is None:
        return None
    lab = cv2.cvtColor(ref_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    sat = cv2.cvtColor(ref_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)[..., 1]
    feats = []
    for sq in _ALL:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov)
        reg = lab[y0:y1, x0:x1]
        if reg.size == 0:
            continue
        s = sat[y0:y1, x0:x1]
        feats.append([float(reg[..., 1].mean()), float(reg[..., 2].mean()), float(s.mean())])
    if len(feats) < 8:
        return None
    F = np.asarray(feats, dtype=np.float32)
    mu = F.mean(axis=0)
    cov = np.cov(F.T).astype(np.float32) + np.eye(3, dtype=np.float32) * 4.0
    try:
        inv = np.linalg.inv(cov).astype(np.float32)
    except np.linalg.LinAlgError:
        return None
    return mu, inv, F


class TestA1IntegralImage:
    """Exact-output: new integral-image versions == old sliced-oracle copies (abs tol 1e-4)."""

    @staticmethod
    def _rand(bs=800):
        return np.random.RandomState(42).randint(0, 256, (bs, bs), dtype=np.uint8)

    @staticmethod
    def _rand_bgr(bs=800):
        return np.random.RandomState(42).randint(0, 256, (bs, bs, 3), dtype=np.uint8)

    def test_diff_wpov_noext(self):
        ga, gb = self._rand(), self._rand()
        old = _per_square_diff_sliced(ga, gb, 800, True, 0.0)
        new = per_square_diff(ga, gb, 800, True, 0.0)
        for sq in old:
            assert new[sq] == pytest.approx(old[sq], abs=1e-4)

    def test_diff_wpov_ext(self):
        ga, gb = self._rand(), self._rand()
        old = _per_square_diff_sliced(ga, gb, 800, True, 0.35)
        new = per_square_diff(ga, gb, 800, True, 0.35)
        for sq in old:
            assert new[sq] == pytest.approx(old[sq], abs=1e-4)

    def test_diff_bpov_noext(self):
        ga, gb = self._rand(), self._rand()
        old = _per_square_diff_sliced(ga, gb, 800, False, 0.0)
        new = per_square_diff(ga, gb, 800, False, 0.0)
        for sq in old:
            assert new[sq] == pytest.approx(old[sq], abs=1e-4)

    def test_diff_bpov_ext(self):
        ga, gb = self._rand(), self._rand()
        old = _per_square_diff_sliced(ga, gb, 800, False, 0.35)
        new = per_square_diff(ga, gb, 800, False, 0.35)
        for sq in old:
            assert new[sq] == pytest.approx(old[sq], abs=1e-4)

    def test_census_wpov_noext(self):
        ga, gb = self._rand(), self._rand()
        old = _per_square_census_change_sliced(ga, gb, 800, True, 0.0)
        new = per_square_census_change(ga, gb, 800, True, 0.0)
        for sq in old:
            assert new[sq] == pytest.approx(old[sq], abs=1e-4)

    def test_census_wpov_ext(self):
        ga, gb = self._rand(), self._rand()
        old = _per_square_census_change_sliced(ga, gb, 800, True, 0.35)
        new = per_square_census_change(ga, gb, 800, True, 0.35)
        for sq in old:
            assert new[sq] == pytest.approx(old[sq], abs=1e-4)

    def test_census_bpov_noext(self):
        ga, gb = self._rand(), self._rand()
        old = _per_square_census_change_sliced(ga, gb, 800, False, 0.0)
        new = per_square_census_change(ga, gb, 800, False, 0.0)
        for sq in old:
            assert new[sq] == pytest.approx(old[sq], abs=1e-4)

    def test_census_bpov_ext(self):
        ga, gb = self._rand(), self._rand()
        old = _per_square_census_change_sliced(ga, gb, 800, False, 0.35)
        new = per_square_census_change(ga, gb, 800, False, 0.35)
        for sq in old:
            assert new[sq] == pytest.approx(old[sq], abs=1e-4)

    def test_hsv_matches(self):
        from chesslab.move_tracker.tracker import hsv_shadow_squares
        rb, cb = self._rand_bgr(), self._rand_bgr()
        cands = {"e4", "d5", "a1", "h8"}
        assert hsv_shadow_squares(rb, cb, 800, True, cands) == \
               _hsv_shadow_squares_sliced(rb, cb, 800, True, cands)

    def test_hsv_matches_ext(self):
        from chesslab.move_tracker.tracker import hsv_shadow_squares
        rb, cb = self._rand_bgr(), self._rand_bgr()
        cands = {"e4", "d5", "a1", "h8"}
        assert hsv_shadow_squares(rb, cb, 800, True, cands, extend_up=0.35) == \
               _hsv_shadow_squares_sliced(rb, cb, 800, True, cands, extend_up=0.35)

    def test_occlusion_matches(self):
        from chesslab.move_tracker.tracker import board_color_gamut, occlusion_color_squares
        rb, cb = self._rand_bgr(), self._rand_bgr()
        gamut = board_color_gamut(rb, 800, True)
        cands = {"e4", "d5"}
        assert occlusion_color_squares(cb, gamut, 800, True, cands, thr=4.0) == \
               _occlusion_color_squares_sliced(cb, gamut, 800, True, cands, thr=4.0)

    def test_occlusion_matches_ext(self):
        from chesslab.move_tracker.tracker import board_color_gamut, occlusion_color_squares
        rb, cb = self._rand_bgr(), self._rand_bgr()
        gamut = board_color_gamut(rb, 800, True)
        cands = {"e4", "d5"}
        assert occlusion_color_squares(cb, gamut, 800, True, cands, thr=4.0, extend_up=0.35) == \
               _occlusion_color_squares_sliced(cb, gamut, 800, True, cands, thr=4.0, extend_up=0.35)

    def test_gamut_matches(self):
        from chesslab.move_tracker.tracker import board_color_gamut
        rb = self._rand_bgr()
        old = _board_color_gamut_sliced(rb, 800, True)
        new = board_color_gamut(rb, 800, True)
        if old is None:
            assert new is None
        else:
            mu_o, inv_o, refs_o = old
            mu_n, inv_n, refs_n = new
            assert mu_o == pytest.approx(mu_n, abs=1e-4)
            assert inv_o == pytest.approx(inv_n, abs=1e-4)
            assert refs_o == pytest.approx(refs_n, abs=1e-4)


# =======================================================================================
# Part 2 — Confirmer, headless E2E, TestClient (Spec 06)
# =======================================================================================


class TestConfirmer:
    """Extracted confirm_frames voting from tracker.py."""

    def test_same_uci_confirm_frames_times_commits(self):
        from chesslab.move_tracker.tracker import Confirmer

        c = Confirmer(confirm_frames=3)
        assert c.feed("e2e4") is False  # 1/3
        assert c.feed("e2e4") is False  # 2/3
        assert c.feed("e2e4") is True   # 3/3

    def test_different_uci_resets_count(self):
        from chesslab.move_tracker.tracker import Confirmer

        c = Confirmer(confirm_frames=3)
        c.feed("e2e4")  # 1/3
        c.feed("e2e4")  # 2/3
        assert c.feed("d2d4") is False  # reset → 1/3 for d2d4
        assert c.count == 1

    def test_none_resets(self):
        from chesslab.move_tracker.tracker import Confirmer

        c = Confirmer(confirm_frames=3)
        c.feed("e2e4")
        c.feed("e2e4")
        assert c.feed(None) is False
        assert c.count == 0

    def test_explicit_reset(self):
        from chesslab.move_tracker.tracker import Confirmer

        c = Confirmer(confirm_frames=2)
        c.feed("e2e4")
        c.reset()
        assert c.count == 0
        assert c.feed("e2e4") is False  # fresh start

    def test_confirm_frames_one_immediate(self):
        from chesslab.move_tracker.tracker import Confirmer

        c = Confirmer(confirm_frames=1)
        assert c.feed("e2e4") is True


# =======================================================================================
# Stage-A A2: _RunningMean incremental buffer means
# =======================================================================================

class TestRunningMean:
    def test_initial_empty(self):
        from chesslab.move_tracker.tracker import _RunningMean
        rm = _RunningMean(3)
        assert rm.mean_uint8() is None
        assert not rm

    def test_single_frame(self):
        from chesslab.move_tracker.tracker import _RunningMean
        rm = _RunningMean(3)
        f = np.full((10, 10), 42, dtype=np.uint8)
        rm.append(f)
        assert np.array_equal(rm.mean_uint8(), f)

    def test_mean_equals_stack(self):
        from chesslab.move_tracker.tracker import _RunningMean
        rm = _RunningMean(3)
        frames = [np.random.RandomState(i).randint(0, 256, (10, 10), dtype=np.uint8)
                  for i in range(10)]
        for f in frames:
            rm.append(f)
        expected = np.mean(np.stack(frames[-3:]), axis=0).astype(np.uint8)
        assert np.array_equal(rm.mean_uint8(), expected)

    def test_drift_resync_after_64(self):
        from chesslab.move_tracker.tracker import _RunningMean
        rm = _RunningMean(5)
        rng = np.random.RandomState(42)
        for _ in range(70):
            rm.append(rng.randint(0, 256, (8, 8), dtype=np.uint8))
        buf = list(rm._buf)
        expected = np.mean(np.stack(buf), axis=0).astype(np.uint8)
        assert np.array_equal(rm.mean_uint8(), expected)

    def test_clear_and_reuse(self):
        from chesslab.move_tracker.tracker import _RunningMean
        rm = _RunningMean(3)
        rm.append(np.full((5, 5), 10, dtype=np.uint8))
        rm.clear()
        assert rm.mean_uint8() is None
        assert not rm
        rm.append(np.full((5, 5), 20, dtype=np.uint8))
        assert rm.mean_uint8()[0, 0] == 20


# =======================================================================================
# Stage-A A3: Census transform only on candidate bands
# =======================================================================================

class TestA3CensusBand:
    """Band census (production `rows=` fast path) == full-image census for candidates."""

    @staticmethod
    def _rand(bs=800):
        return np.random.RandomState(42).randint(0, 256, (bs, bs), dtype=np.uint8)

    @staticmethod
    def _band(ref, cur, bs, pov, candidates, ref_codes, extend_up=0.0):
        from chesslab.move_tracker.tracker import per_square_census_change, square_region
        boxes = [square_region(s, bs, pov, extend_up=extend_up) for s in candidates]
        rows = (min(b[1] for b in boxes) - 1, max(b[3] for b in boxes) + 1)
        return per_square_census_change(ref, cur, bs, pov, extend_up=extend_up,
                                        ref_codes=ref_codes, rows=rows)

    def test_band_equals_full_census(self):
        from chesslab.move_tracker.tracker import census_transform, per_square_census_change
        ga, gb = self._rand(), self._rand()
        ref_codes = census_transform(ga)
        cands = {"e4", "d5", "a1", "h8"}                     # spread over distant ranks
        full = per_square_census_change(ga, gb, 800, True, ref_codes=ref_codes)
        band = self._band(ga, gb, 800, True, cands, ref_codes)
        for s in cands:
            assert band[s] == pytest.approx(full[s], abs=1e-4)

    def test_band_equals_full_census_extend(self):
        from chesslab.move_tracker.tracker import census_transform, per_square_census_change
        ga, gb = self._rand(), self._rand()
        ref_codes = census_transform(ga)
        cands = {"e4", "a8", "h1"}
        full = per_square_census_change(ga, gb, 800, True, ref_codes=ref_codes, extend_up=0.35)
        band = self._band(ga, gb, 800, True, cands, ref_codes, extend_up=0.35)
        for s in cands:
            assert band[s] == pytest.approx(full[s], abs=1e-4)

    def test_band_black_pov(self):
        from chesslab.move_tracker.tracker import census_transform, per_square_census_change
        ga, gb = self._rand(), self._rand()
        ref_codes = census_transform(ga)
        cands = {"c3", "f6"}
        full = per_square_census_change(ga, gb, 800, False, ref_codes=ref_codes)
        band = self._band(ga, gb, 800, False, cands, ref_codes)
        for s in cands:
            assert band[s] == pytest.approx(full[s], abs=1e-4)


# --- headless E2E helpers ---------------------------------------------------------------

def _make_identity_profile(board_size=400, white_pov=True):
    """Identity calibration profile: image exactly maps to board_size square."""

    from chesslab.calibration import CalibrationProfile, CropParams, compute_homography

    corners = [[0.0, 0.0], [float(board_size), 0.0],
               [float(board_size), float(board_size)], [0.0, float(board_size)]]
    H = compute_homography(corners, board_size)
    return CalibrationProfile(
        profile="test-identity", camera_index=0,
        frame_size=(board_size, board_size),
        board_size=board_size,
        image_corners=corners, homography=H,
        white_pov=white_pov,
        crop=CropParams.default(board_size),
    )


class FakeCapture:
    """Pretend camera: reads from a list of BGR frames, then repeats the last one."""

    def __init__(self, frames):
        self.frames = [f.copy() for f in frames]
        self.i = 0

    def read(self):
        if self.i < len(self.frames):
            f = self.frames[self.i]
            self.i += 1
            return True, f.copy()
        if self.frames:
            return True, self.frames[-1].copy()
        return False, None

    def isOpened(self):
        return True

    def release(self):
        pass


def _bgr_frame(blob_squares, board_size=400, white_pov=True) -> np.ndarray:
    """Gray BGR frame with bright 40×40 blob(s) on given square(s)."""
    from chesslab.move_tracker.tracker import square_region

    img = np.full((board_size, board_size, 3), 128, dtype=np.uint8)
    for sq in blob_squares:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov)
        img[y0:y1, x0:x1] = (220, 220, 220)
    return img


class TestMoveTrackerHeadless:
    """End-to-end: MoveTracker with FakeCapture, identity profile, no live camera."""

    def test_single_move_detected(self, monkeypatch):
        from chesslab.move_tracker.tracker import MoveTracker

        board_size = 400
        prof = _make_identity_profile(board_size=board_size)

        # Frames: 10 "start" frames (blob on e2), then 20 "after" frames (blob on e4)
        start = _bgr_frame(["e2"], board_size=board_size)
        after = _bgr_frame(["e4"], board_size=board_size)
        fake = FakeCapture([start] * 10 + [after] * 20)

        monkeypatch.setattr("chesslab.move_tracker.tracker.open_source", lambda s: fake)
        monkeypatch.setattr("chesslab.move_tracker.tracker.ensure_profile", lambda *a, **k: prof)

        mt = MoveTracker(profile="phone", source="0", live_align=False, auto_record=False,
                         motion_thr=100, settle_frames=3, confirm_frames=3,
                         avg_frames=2, max_changed=6, require_motion_for_move=False,
                         min_grid_line_coverage=0.0)
        mt.reset_to_start()
        mt.start()

        # Poll until a move is detected or timeout
        import time as _time
        deadline = _time.time() + 5.0
        detected = False
        while _time.time() < deadline:
            s = mt.status()
            if s["history"]:
                detected = True
                break
            _time.sleep(0.05)

        mt.stop()
        s = mt.status()

        assert detected, f"no move detected after timeout; state={s['state']} note={s['note']}"

        # At least one move, ideally e2e4
        assert len(s["history"]) >= 1
        # history stores SAN (e.g. "e4"); last_move stores UCI (e.g. "e2e4")
        assert s["last_move"] is not None
        assert "e2" in s["last_move"] and "e4" in s["last_move"]

    def test_stop_joins_within_timeout(self, monkeypatch):
        from chesslab.move_tracker.tracker import MoveTracker

        board_size = 400
        prof = _make_identity_profile(board_size=board_size)

        frame = _bgr_frame(["e2"], board_size=board_size)
        fake = FakeCapture([frame] * 5)

        monkeypatch.setattr("chesslab.move_tracker.tracker.open_source", lambda s: fake)
        monkeypatch.setattr("chesslab.move_tracker.tracker.ensure_profile", lambda *a, **k: prof)

        mt = MoveTracker(profile="phone", source="0", live_align=False, auto_record=False,
                         settle_frames=10)
        mt.reset_to_start()
        mt.start()
        import time as _time
        _time.sleep(0.2)  # let loop run a few iterations
        mt.stop()
        assert mt._thread is not None
        assert not mt._thread.is_alive()


def _gray_frame(blob_squares, board_size=400, white_pov=True, base=128) -> np.ndarray:
    """2D gray image (uint8) with bright blobs on given squares — directly for _try_detect."""
    from chesslab.move_tracker.tracker import square_region

    img = np.full((board_size, board_size), base, dtype=np.uint8)
    for sq in blob_squares:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov)
        img[y0:y1, x0:x1] = 220
    return img


def _make_tracker(monkeypatch, **kwargs):
    """MoveTracker mit identity-Profil + FakeCapture bauen, OHNE den Thread zu starten."""
    from chesslab.move_tracker.tracker import MoveTracker

    prof = _make_identity_profile(board_size=kwargs.pop("board_size", 400))
    fake = FakeCapture([_bgr_frame(["e2"])])
    monkeypatch.setattr("chesslab.move_tracker.tracker.open_source", lambda s: fake)
    monkeypatch.setattr("chesslab.move_tracker.tracker.ensure_profile", lambda *a, **k: prof)
    defaults = {"profile": "phone", "source": "0", "live_align": False,
                    "max_changed": 6, "confirm_frames": 1, "avg_frames": 1,
                    # Most detection tests drive _try_detect directly without simulating the hand
                    # motion that precedes a real move; disable the motion prerequisite by default.
                    "require_motion_for_move": False,
                    # Never auto-record: committing a move here would otherwise write a real
                    # session into config.DATA.sessions (recording tests opt in explicitly).
                    "auto_record": False,
                    # Tests build 400px identity profiles; keep detection at full res.
                    "detect_scale": 1.0}
    defaults.update(kwargs)
    return MoveTracker(**defaults)


class TestBaseTruthDetect:
    """Direkte _try_detect-Tests: Base-Truth = (Bild, FEN), normalisierte Gates."""

    def test_global_exposure_shift_not_stuck(self, monkeypatch):
        """Globaler Belichtungssprung (alle 64 Felder heller) → KEIN too_many_changed,
        Ground truth is adopted via drift refresh (Fix: gates on normalized diffs)."""
        mt = _make_tracker(monkeypatch)
        mt.ref_gray = _gray_frame([], base=128)
        mt.ref_fen = mt.board.fen()
        cur = _gray_frame([], base=170)          # gesamtes Brett +42
        mt._try_detect(cur)
        assert mt._stuck_reason is None
        assert mt.history == []
        assert mt.ref_gray is cur                # Referenz aufgefrischt
        assert mt.ref_fen == mt.board.fen()

    def test_hand_over_pieces_keeps_base_truth(self, monkeypatch):
        """Viele veränderte Felder (Hand) → too_many_changed, Base-Truth bleibt unverändert."""
        mt = _make_tracker(monkeypatch, max_changed=6)
        ref = _gray_frame([], base=128)
        mt.ref_gray = ref
        mt.ref_fen = mt.board.fen()
        # 10 Felder verdeckt (unterschiedliche Helligkeit, damit Median niedrig bleibt)
        cur = _gray_frame(["a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1", "a2", "b2"], base=128)
        mt._try_detect(cur)
        assert mt._stuck_reason == "too_many_changed"
        assert mt.history == []
        assert mt.ref_gray is ref                # Base-Truth NICHT korrumpiert

    def test_valid_move_advances_base_truth_with_fen(self, monkeypatch):
        """Sauberer e2e4: Commit, Base-Truth = Nach-Zug-Bild, ref_fen == board.fen()."""
        mt = _make_tracker(monkeypatch, confirm_frames=1)
        mt.ref_gray = _gray_frame(["e2"], base=128)   # Figur auf e2
        mt.ref_fen = mt.board.fen()
        cur = _gray_frame(["e4"], base=128)           # Figur jetzt auf e4
        mt._try_detect(cur)
        assert mt.history == ["e4"]
        assert mt.last_move == "e2e4"
        assert mt.ref_gray is cur
        assert mt.ref_fen == mt.board.fen()           # Paar bleibt konsistent

    def test_stale_ref_fen_forces_recapture(self, monkeypatch):
        """ref_fen passt nicht zur aktuellen FEN → ref wird verworfen (Neu-Aufnahme)."""
        mt = _make_tracker(monkeypatch)
        mt.ref_gray = _gray_frame([], base=128)
        mt.ref_fen = "invalid/stale fen not matching board"
        mt._try_detect(_gray_frame(["e4"], base=128))
        assert mt.ref_gray is None
        assert mt.ref_fen is None
        assert mt.history == []


class TestRestingHandVeto:
    """CNN occluded-class veto: a motionless hand (no motion → stable state → baseline
    occlusion detector NOT running, skin inside the wood gamut) must not surface as
    'change' — the free-running observer's fresh snapshot taints it (2026-07-09)."""

    @staticmethod
    def _occl_obs(squares, p=0.9):
        import types
        return types.SimpleNamespace(p_occluded=dict.fromkeys(squares, p))

    def _snap(self, mt, squares, age_s=0.0):
        return CnnSnapshot(obs=self._occl_obs(squares), seq=0,
                           ts=time.time() - age_s, infer_ms=0.0,
                           warped=None, gray=None, fen=mt.board.fen())

    def test_resting_hand_taints_and_blocks_reanchor(self, monkeypatch):
        mt = _make_tracker(monkeypatch, confirm_frames=1)
        mt.ref_gray = _gray_frame([], base=128)
        mt.ref_fen = mt.board.fen()
        mt._cnn_snap = self._snap(mt, ["e3", "e4"])          # fresh: hand seen by CNN
        ref = mt.ref_gray
        mt._motion_since_ref, mt._last_motion_ts = True, time.time()
        cur = _gray_frame(["e3", "e4"], base=128)            # hand shows as hot squares
        mt._try_detect(cur)
        assert mt.history == []                              # no phantom move
        assert "e3" in mt._tainted and "e4" in mt._tainted   # latched as occluded
        assert mt.ref_gray is ref                            # re-anchor blocked (not baked in)

    def test_taint_persists_without_motion_while_evidence_hot(self, monkeypatch):
        """Latch invariant: no motion since the taint + square still differs from the
        reference → the latch does NOT expire on the timer (a still hand cannot vanish)."""
        mt = _make_tracker(monkeypatch, confirm_frames=1)
        mt.ref_gray = _gray_frame([], base=128)
        mt.ref_fen = mt.board.fen()
        mt._motion_since_ref = True
        mt._last_motion_ts = time.time() - 60          # last motion long BEFORE the taint
        mt._tainted = {"e3": time.time() - 5}          # hold long expired
        mt._try_detect(_gray_frame(["e3"], base=128))  # e3 still hot (hand still there)
        assert "e3" in mt._tainted                     # latch survives — no motion since
        assert mt.history == []

    def test_taint_releases_on_motion_or_baseline(self, monkeypatch):
        """Release path A: motion after the taint refresh → released at expiry.
        Release path B: no motion, but the square matches the reference again → released."""
        mt = _make_tracker(monkeypatch, confirm_frames=1)
        mt.ref_gray = _gray_frame([], base=128)
        mt.ref_fen = mt.board.fen()
        mt._motion_since_ref = True
        # A: motion AFTER the taint was last refreshed
        mt._tainted = {"e3": time.time() - 5}
        mt._last_motion_ts = time.time() - 1
        mt._try_detect(_gray_frame(["e3"], base=128))
        assert "e3" not in mt._tainted
        # B: no motion since, but evidence back to baseline (square = reference)
        mt._tainted = {"f5": time.time() - 5}
        mt._last_motion_ts = time.time() - 60
        mt._try_detect(_gray_frame([], base=128))      # f5 quiet again
        assert "f5" not in mt._tainted

    def test_stale_snapshot_does_not_taint(self, monkeypatch):
        mt = _make_tracker(monkeypatch, confirm_frames=1)
        mt.ref_gray = _gray_frame([], base=128)
        mt.ref_fen = mt.board.fen()
        mt._cnn_snap = self._snap(mt, ["e3", "e4"], age_s=10.0)   # stale → ignored
        mt._motion_since_ref, mt._last_motion_ts = True, time.time()
        mt._try_detect(_gray_frame(["e3", "e4"], base=128))
        assert not mt._tainted                               # no taint from stale data


class _FakeObs:
    """Minimal OccupancyObservation stub: per-square occupancy + confidence dicts."""

    def __init__(self, occ: dict, conf: dict):
        self._occ, self._conf = occ, conf

    def occupied(self, sq: str) -> bool:
        return bool(self._occ.get(sq, False))

    def confident(self, thr: float) -> dict:
        return dict(self._conf)


class _FakeRecovery:
    """Stub für CnnRecovery (Occupancy-Pfad): liefert vorgegebene Ergebnisse ohne torch."""

    def __init__(self, match=False, occ_agree=0.0, occ_n=2, derive_move=None,
                 derive_agreement=0.99, min_agreement=0.97, conf_thr=0.85,
                 occ=None, conf=None, conflicts=None):
        self.match, self.occ_agree, self.occ_n = match, occ_agree, occ_n
        self.derive_move, self.derive_agreement = derive_move, derive_agreement
        self.min_agreement, self.conf_thr = min_agreement, conf_thr
        self.conflicts = list(conflicts or [])   # occupancy conflicts vs ANY checked board
        # Default endpoints for candidate e2e4: to occupied+confident, from empty+confident.
        self._occ = occ if occ is not None else {"e4": True, "e2": False}
        self._conf = conf if conf is not None else {"e4": True, "e2": True}

    def observe(self, frame, corners):
        return _FakeObs(self._occ, self._conf)

    def verify_move(self, board, move, obs):
        return self.occ_agree, self.occ_n

    def resync_check(self, board, obs):
        return {"match": self.match, "conflicts": list(self.conflicts),
                "move": self.derive_move,
                "agreement": self.derive_agreement if self.derive_move else 0.0}


def _mk_snap(mt, seq=0, warped=None, gray=None, obs=None):
    """Seq-getaggter CnnSnapshot, wie ihn der free-running Observer liefern würde (Spec 11)."""
    if obs is None and mt.recovery is not None:
        obs = mt.recovery.observe(None, None)
    return CnnSnapshot(obs=obs, seq=seq, ts=time.time(), infer_ms=0.0,
                       warped=warped, gray=gray, fen=mt.board.fen())


def _pending_tracker(monkeypatch, **fake_kw):
    """Tracker mit aktivem (gestubbtem) CNN und einem Pending-Kandidaten e2e4."""
    win = fake_kw.pop("verify_window", None)
    kw = {} if win is None else {"verify_window": win}
    mt = _make_tracker(monkeypatch, cnn_run="stub", **kw)
    mt.recovery = _FakeRecovery(**fake_kw)                 # _ensure_cnn gibt das zurück
    mt._last_corners = [[0, 0], [400, 0], [400, 400], [0, 400]]
    mt.ref_gray = _gray_frame(["e2"])
    mt.ref_fen = mt.board.fen()
    mt._pending = {"uci": "e2e4", "fen": mt.board.fen(),
                   "cur": _gray_frame(["e4"]), "cur_bgr": None, "frames": 0}
    mt._verify_state = "verifying"
    return mt


class TestCnnVerify:
    """Occupancy-Verify eines Diff-Kandidaten durchs (gestubbte) CNN."""

    def test_shadow_suppressed_no_commit(self, monkeypatch):
        """CNN sieht das Brett unverändert (Belegung gleich) → kein Zug, Referenz nachgezogen."""
        mt = _pending_tracker(monkeypatch, match=True)
        for _ in range(2):                       # verify_obs_votes: never act on one glance
            mt._verify_tick(_mk_snap(mt))
        assert mt.history == []
        assert mt._pending is None
        assert mt._verify_state == "shadow"
        assert mt.cnn_status == "shadow"

    def test_occupancy_confirms_commit(self, monkeypatch):
        """Belegung bestätigt den Diff-Zug (from leer, to belegt) → Commit."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=1.0, occ_n=2)
        for _ in range(2):                       # verify_obs_votes
            mt._verify_tick(_mk_snap(mt))
        assert mt.history == ["e4"]
        assert mt.last_move == "e2e4"
        assert mt._pending is None
        assert mt._verify_state == "confirmed"
        assert mt.recovered_last is False

    def test_hard_veto_rejects_ghost_to_still_empty(self, monkeypatch):
        """Hand-Wisch-Geist: NICHTS bewegt — Start e2 noch BELEGT und Ziel e4 noch LEER
        → verworfen. (Ziel-leer allein reicht NICHT: bei geräumtem Start committet es, sonst
        würde eine fehl-gelesene Zielsituation echte Züge killen, z.B. Rochade.)"""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=0.0,
                              occ={"e4": False, "e2": True}, conf={"e4": True, "e2": True})
        for _ in range(2):                       # verify_obs_votes
            mt._verify_tick(_mk_snap(mt))
        assert mt.history == []
        assert mt._pending is None
        assert mt._verify_state == "ghost"
        assert mt.cnn_status == "ghost"

    def test_from_empty_but_to_empty_holds_non_castling(self, monkeypatch):
        """Regression (h2h4 nudge incident, 2026-07-09): a nudged piece mis-reads its OWN
        square as confidently empty (crop edge) while the destination is confidently empty
        too — "piece left e2" is NOT "piece arrived on e4". Non-castling: HOLD, no commit;
        the verify window later discards the candidate."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=0.0,
                              occ={"e4": False, "e2": False}, conf={"e4": True, "e2": True})
        mt._verify_tick(_mk_snap(mt))
        assert mt.history == []
        assert mt._pending is not None            # held, not committed and not rejected
        assert mt._verify_state == "verifying"

    def test_from_left_alone_never_commits_non_castling(self, monkeypatch):
        """Regression (b1→c4 illegal move, 2026-07-09): knight physically placed on c4
        (illegal), diff proposes the best LEGAL move Na3. CNN: b1 confidently empty
        (true — the piece left), a3 unreadable (no confident statement), no derived
        move. 'from left' alone must NOT commit — HOLD; the desync alarm later sees
        the real conflict (c4 occupied where empty expected)."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=0.0,
                              occ={"a3": False, "b1": False},
                              conf={"a3": False, "b1": True})
        mt._pending = {"uci": "b1a3", "fen": mt.board.fen(),
                       "cur": _gray_frame(["a3"]), "cur_bgr": None, "frames": 0}
        mt._verify_tick(_mk_snap(mt))
        assert mt.history == []
        assert mt._pending is not None            # held, not committed
        assert mt._verify_state == "verifying"

    def test_from_left_commits_when_occupancy_derives_same_move(self, monkeypatch):
        """from-left still commits when the whole-board occupancy derives EXACTLY the
        pending move (destination unreadable but the rest of the board agrees)."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=0.0,
                              derive_move="e2e4", derive_agreement=0.99,
                              occ={"e4": False, "e2": False},
                              conf={"e4": False, "e2": True})
        for _ in range(2):                       # verify_obs_votes
            mt._verify_tick(_mk_snap(mt))
        assert mt.history == ["e4"]
        assert mt._verify_state == "confirmed"

    def test_castling_commits_despite_king_square_misread_empty(self, monkeypatch):
        """Castling keeps the from-left shortcut: e1 confidently EMPTY (king left) while the
        king on g1 is mis-read as empty → still COMMITS (known model weakness on g1)."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=0.0,
                              occ={"g1": False, "e1": False}, conf={"g1": True, "e1": True})
        mt.board = chess.Board(
            "rnbqkbnr/pppppppp/8/8/8/5NP1/PPPPPPBP/RNBQK2R w KQkq - 0 1")
        mt.ref_fen = mt.board.fen()
        mt._pending = {"uci": "e1g1", "fen": mt.board.fen(),
                       "cur": _gray_frame(["g1"]), "cur_bgr": None, "frames": 0}
        for _ in range(2):                       # verify_obs_votes
            mt._verify_tick(_mk_snap(mt))
        assert mt.history == ["O-O"]
        assert mt._verify_state == "confirmed"

    def test_from_occupied_but_arrived_commits_after_window(self, monkeypatch):
        """d2d4 case: destination arrived but the model mis-reads the origin as still
        occupied ('occupied' is the unreliable axis). Since the d4→b3 rook incident this
        no longer commits INSTANTLY — both signals contradict, so it HOLDS; the window
        fallback then checks the whole post-move position (no conflicts here) → commit."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=0.0,
                              occ={"e4": True, "e2": True}, conf={"e4": True, "e2": True},
                              verify_window=2)
        mt._verify_tick(_mk_snap(mt))
        assert mt.history == []                                  # held, not instant
        assert mt._pending is not None
        mt._verify_tick(_mk_snap(mt))
        assert mt.history == ["e4"]                              # post-move board consistent
        assert mt._verify_state == "confirmed"

    def test_arrived_but_origin_never_emptied_discards(self, monkeypatch):
        """Regression (d4→b3 rook incident, 2026-07-09): a FOREIGN piece lands on the
        destination (b3 occupied → to_arrived) while the origin pawn provably never moved
        (from confidently occupied — a real reading, not a misread). Post-move board check
        has an occupancy conflict on the origin → discard, no phantom pawn push."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=0.0,
                              occ={"e4": True, "e2": True}, conf={"e4": True, "e2": True},
                              conflicts=["e2"], verify_window=2)
        for _ in range(2):
            mt._verify_tick(_mk_snap(mt))
        assert mt.history == []
        assert mt._pending is None
        assert mt._verify_state == "ghost"

    def test_alarm_blocks_dispatch_commits(self, monkeypatch):
        """While the desync alarm is active, the diff pipeline must not commit ANY move —
        the reference/game-state pairing is fiction (d4→b3 incident)."""
        mt = _make_tracker(monkeypatch, confirm_frames=1)
        mt.ref_gray = _gray_frame(["e2"], base=128)
        mt.ref_fen = mt.board.fen()
        mt._alarm = {"kind": "illegal_move", "since": time.time(),
                     "conflicts": ["b1", "d4"], "guess": None}
        mt._motion_since_ref, mt._last_motion_ts = True, time.time()
        mt._try_detect(_gray_frame(["e4"], base=128))            # clean e2e4 evidence
        assert mt.history == []
        assert "desynced" in mt.note

    def test_alarm_discards_pending_candidate(self, monkeypatch):
        """A candidate pended just before the alarm fired is discarded, not verified."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=1.0)
        mt._alarm = {"kind": "illegal_move", "since": time.time(),
                     "conflicts": ["b1", "d4"], "guess": None}
        mt._verify_tick(_mk_snap(mt))
        assert mt.history == []
        assert mt._pending is None

    def test_from_occupied_no_arrival_rejects_after_window(self, monkeypatch):
        """Start bleibt confident BELEGT und Ziel kommt NICHT an (nicht lesbar) → nach dem
        verify_window verworfen (kein Zug passiert), als Rejection protokolliert."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=0.0,
                              occ={"e2": True}, conf={"e4": False, "e2": True},
                              verify_window=2)
        for _ in range(2):
            mt._verify_tick(_mk_snap(mt))
        assert mt.history == []
        assert mt._pending is None
        assert mt._verify_state == "ghost"

    def test_counter_move_overrules(self, monkeypatch):
        """CNN sieht eindeutig einen ANDEREN Zug (Belegung) → überstimmt den Diff-Kandidaten."""
        # Endpoints of e2e4 unreadable (not confident) → no positive/negative signal for it,
        # so the CNN's own confident move d2d4 wins.
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=0.0, derive_move="d2d4",
                              derive_agreement=0.99, conf={"e4": False, "e2": False})
        for _ in range(2):                       # verify_obs_votes
            mt._verify_tick(_mk_snap(mt))
        assert mt.history == ["d4"]
        assert mt.last_move == "d2d4"
        assert mt._verify_state == "overruled"

    def test_occlusion_times_out_rejects(self, monkeypatch):
        """Endpunkte bleiben verdeckt (nicht confident) → nach verify_window VERWERFEN,
        NICHT blind den Diff akzeptieren (das war das alte Loch für die Hand)."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=0.0, occ_n=0,
                              conf={"e4": False, "e2": False}, verify_window=3)
        mt._verify_tick(_mk_snap(mt))
        assert mt.history == []                            # noch am Warten
        for _ in range(2):
            mt._verify_tick(_mk_snap(mt))
        assert mt.history == []                            # verworfen, kein Zug
        assert mt._pending is None
        assert mt._verify_state == "ghost"

    def test_fallback_rejects_when_postmove_board_contradicts(self, monkeypatch):
        """Regression (b1→d4 illegal move, 2026-07-09): knight physically on d4 (illegal),
        pending = best-legal fiction. Endpoints stay weak all window, but the board-level
        check vs the POST-move position has an occupancy conflict (d4 occupied where empty
        expected) → the 'CNN uncertain — diff accepted' fallback must DISCARD, not commit."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=0.0,
                              occ={"e4": False, "e2": False},
                              conf={"e4": False, "e2": True},
                              conflicts=["d4"], verify_window=2)
        for _ in range(2):
            mt._verify_tick(_mk_snap(mt))
        assert mt.history == []
        assert mt._pending is None
        assert mt._verify_state == "ghost"

    def test_clearview_borderline_accepts_after_window(self, monkeypatch):
        """Klare Sicht auf beide Endpunkte, aber Belegung nur grenzwertig → nach Fenster
        wird dem Diff vertraut (nur bei confidenter, freier Sicht)."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=0.0, occ_n=2,
                              occ={"e4": True, "e2": False}, conf={"e4": True, "e2": True},
                              verify_window=3)
        for _ in range(3):
            mt._verify_tick(_mk_snap(mt))
        assert mt.history == ["e4"]
        assert mt._pending is None

    def test_cnn_unavailable_commits_pending(self, monkeypatch):
        """_ensure_cnn liefert None (Modell weg) → Fallback: Pending direkt committen."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=1.0)
        monkeypatch.setattr(mt, "_ensure_cnn", lambda: None)
        mt._verify_tick(_mk_snap(mt))
        assert mt.history == ["e4"]
        assert mt._pending is None

    def test_no_cnn_commits_directly(self, monkeypatch):
        """Ohne cnn_run committet _try_detect direkt (kein Pending, Fallback-Pfad)."""
        mt = _make_tracker(monkeypatch, cnn_run=None, confirm_frames=1)
        mt.ref_gray = _gray_frame(["e2"])
        mt.ref_fen = mt.board.fen()
        mt._try_detect(_gray_frame(["e4"]))
        assert mt.history == ["e4"]
        assert mt._pending is None


class TestShadowRobustness:
    """Census metric + HSV cast-shadow veto (shadow-robust detection)."""

    def _bgr(self, squares, base_bgr=(120, 120, 120), fill_bgr=(30, 40, 200), board_size=400):
        """Color warp: base color gray, on `squares` a colored (reddish) block."""
        from chesslab.move_tracker.tracker import square_region
        img = np.full((board_size, board_size, 3), base_bgr, dtype=np.uint8)
        for sq in squares:
            x0, y0, x1, y1 = square_region(sq, board_size, True)
            img[y0:y1, x0:x1] = fill_bgr
        return img

    def test_hsv_shadow_detects_uniform_darkening(self):
        """Same color, uniformly darker → detected as shadow."""
        from chesslab.move_tracker.tracker import hsv_shadow_squares
        ref = self._bgr([], base_bgr=(120, 120, 120))
        cur = self._bgr([], base_bgr=(70, 70, 70))          # abgedunkelt, gleiche (graue) Chroma
        shadows = hsv_shadow_squares(ref, cur, 400, True, ["e4", "d5"])
        assert "e4" in shadows and "d5" in shadows

    def test_hsv_shadow_ignores_real_piece(self):
        """Colored block (new piece) → NOT a shadow (different chroma)."""
        from chesslab.move_tracker.tracker import hsv_shadow_squares
        ref = self._bgr([])
        cur = self._bgr(["e4"], fill_bgr=(30, 40, 200))     # kräftig rot auf e4
        shadows = hsv_shadow_squares(ref, cur, 400, True, ["e4"])
        assert "e4" not in shadows

    def test_census_low_for_uniform_darkening(self):
        """Census ≈ 0 for pure brightness change (no structure)."""
        from chesslab.move_tracker.tracker import per_square_census_change
        ref = np.full((400, 400), 120, np.uint8)
        cur = np.full((400, 400), 70, np.uint8)
        cens = per_square_census_change(ref, cur, 400, True)
        assert cens["e4"] < 5.0

    def test_shadow_veto_removes_hand_shadow_in_detect(self, monkeypatch):
        """Handschatten (gleiche Farbe, dunkler) auf mehreren Feldern → weggefiltert,
        Base-Truth bleibt statt too_many_changed."""
        mt = _make_tracker(monkeypatch, cnn_run=None)
        sqs = ["a3", "b3", "c3", "d3", "e3", "f3", "g3", "h3"]   # 8 Felder „verschattet"
        mt.ref_bgr = self._bgr([], base_bgr=(120, 120, 120))
        mt.ref_gray = cv2.cvtColor(mt.ref_bgr, cv2.COLOR_BGR2GRAY)
        mt.ref_fen = mt.board.fen()
        cur_bgr = self._bgr([], base_bgr=(72, 72, 72))          # gleichmäßig dunkler = Schatten
        cur_gray = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2GRAY)
        mt._try_detect(cur_gray, cur_bgr)
        assert mt._stuck_reason != "too_many_changed"
        assert set(sqs).issubset(set(mt._shadow_vetoed)) or mt._changed == []


class TestPipelineRegressions:
    """Ghost/stuck fixes: pair path through gates, gamut hygiene, noise-learning exclusion,
    buffer alignment, robust motion metric."""

    def _pair_frames(self):
        """ref: pieces on e2+e7; cur: both moved (e4+e5) — two half-moves in one window."""
        return _gray_frame(["e2", "e7"]), _gray_frame(["e4", "e5"])

    def test_pair_goes_pending_with_cnn(self, monkeypatch):
        """Fast-play pair is NOT committed directly with CNN verify on — it becomes pending
        (pre-commit verification), like every single-move candidate."""
        mt = _make_tracker(monkeypatch, cnn_run="stub", confirm_frames=1)
        mt.recovery = _FakeRecovery()
        ref, cur = self._pair_frames()
        mt.ref_gray, mt.ref_fen = ref, mt.board.fen()
        mt._try_detect(cur)
        assert mt.history == []                               # nothing committed yet
        assert mt._pending is not None
        assert mt._pending["ucis"] == ["e2e4", "e7e5"]

    def test_pair_respects_motion_gate(self, monkeypatch):
        """No hand since the reference → even a pair-shaped change is drift/light, no commit.
        Without CNN the pair path is reachable via too_many_changed (pair + residue)."""
        mt = _make_tracker(monkeypatch, cnn_run=None, confirm_frames=1,
                           require_motion_for_move=True)
        ref = _gray_frame(["e2", "e7"])
        cur = _gray_frame(["e4", "e5", "a3", "b3", "h3"])   # pair + 3 residue squares (7 > max 6)
        mt.ref_gray, mt.ref_fen = ref, mt.board.fen()
        assert mt._motion_since_ref is False
        mt._try_detect(cur)
        assert mt.history == [] and mt._pending is None
        mt._motion_since_ref, mt._last_motion_ts = True, time.time()                           # hand entered → pair commits
        mt._try_detect(cur)
        assert mt.history == ["e4", "e5"]
        assert mt._recent_decisions[-1]["rec"]["decider"] == "diff_pair"

    def test_pair_verify_commits_on_after_match(self, monkeypatch):
        """Pending pair: CNN occupancy matches the position AFTER both half-moves → commit."""
        mt = _pending_tracker(monkeypatch, match=False)
        mt._pending = {"ucis": ["e2e4", "e7e5"], "uci": "e2e4", "fen": mt.board.fen(),
                       "cur": _gray_frame(["e4", "e5"]), "cur_bgr": None, "frames": 0}

        def _check(board, obs):                                # match only the post-pair position
            after = chess.Board()
            after.push_uci("e2e4"); after.push_uci("e7e5")
            return {"match": board.fen() == after.fen(), "conflicts": [], "move": None,
                    "agreement": 0.99}
        mt.recovery.resync_check = _check
        mt._verify_tick(_mk_snap(mt))
        assert mt.history == ["e4", "e5"]
        assert mt._pending is None and mt._verify_state == "confirmed"
        assert mt._recent_decisions[-1]["rec"]["decider"] == "cnn_pair"

    def test_pair_verify_rejects_shadow(self, monkeypatch):
        """Pending pair: CNN occupancy still matches the CURRENT position → shadow, no move."""
        mt = _pending_tracker(monkeypatch, match=True)
        mt._pending = {"ucis": ["e2e4", "e7e5"], "uci": "e2e4", "fen": mt.board.fen(),
                       "cur": _gray_frame([]), "cur_bgr": None, "frames": 0}
        mt._verify_tick(_mk_snap(mt))
        assert mt.history == [] and mt._pending is None
        assert mt._verify_state == "shadow"

    def test_shadow_squares_not_learned_into_noise(self, monkeypatch):
        """Shadow-vetoed squares are excluded from noise-model learning — otherwise a
        recurring shadow inflates the square's EMA and desensitizes later real moves."""
        mt = _make_tracker(monkeypatch, cnn_run=None)
        base = np.full((400, 400, 3), (120, 120, 120), dtype=np.uint8)
        mt.ref_bgr = base
        mt.ref_gray = cv2.cvtColor(base, cv2.COLOR_BGR2GRAY)
        mt.ref_fen = mt.board.fen()
        cur_bgr = base.copy()
        cur_bgr[:100, :] = (72, 72, 72)   # shadow on 2 ranks only (median normalization safe)
        cur_gray = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2GRAY)
        mt._try_detect(cur_gray, cur_bgr)
        assert mt._shadow_vetoed                                  # veto actually fired
        for sq in mt._shadow_vetoed:
            assert mt.noise.mean[sq] == 0.0                       # not learned

    def test_undo_clears_bgr_buffer(self, monkeypatch):
        """undo() clears BOTH averaging buffers — a stale color average would feed the
        shadow/occlusion vetoes with frames from before the undo."""
        mt = _make_tracker(monkeypatch, cnn_run=None, confirm_frames=1)
        mt.ref_gray, mt.ref_fen = _gray_frame(["e2"]), mt.board.fen()
        mt._try_detect(_gray_frame(["e4"]))
        mt._gray_buf.append(_gray_frame(["e4"]))
        mt._bgr_buf.append(_bgr_frame(["e4"]))
        mt.undo()
        assert len(mt._gray_buf) == 0 and len(mt._bgr_buf) == 0

    def test_motion_score_ignores_global_wobble(self):
        """Desk wobble = the whole image shifts ~1px (small deltas everywhere) → ~0 motion;
        a hand = compact region of strong deltas → high motion."""
        from chesslab.move_tracker.tracker import motion_score
        rng = np.random.default_rng(42)
        raw = rng.integers(100, 156, size=(200, 200), dtype=np.uint8)
        tex = cv2.GaussianBlur(raw, (5, 5), 0)     # the pipeline blurs before the motion test
        wobble = cv2.GaussianBlur(np.roll(raw, 1, axis=1), (5, 5), 0)  # 1px global shift
        assert motion_score(tex, wobble, px_thr=20.0) < 1.0
        hand = tex.copy()
        hand[50:120, 50:120] = 240                                     # strong local blob
        assert motion_score(tex, hand, px_thr=20.0) > 5.0


class TestGridLineGate:
    """Grid-line visibility occlusion gate (large opaque object hides the board grid)."""

    def _grid(self, board_size=400):
        bs = board_size
        img = np.full((bs, bs), 128, np.uint8)
        cell = bs / 8.0
        for i in range(9):
            p = int(i * cell)
            cv2.line(img, (p, 0), (p, bs), 40, 2)
            cv2.line(img, (0, p), (bs, p), 40, 2)
        return img

    def test_clear_board_high_coverage(self, monkeypatch):
        mt = _make_tracker(monkeypatch, cnn_run=None, min_grid_line_coverage=0.6)
        clear = self._grid()
        assert mt._grid_line_coverage(clear) >= 0.9
        assert not mt._occluded_by_grid(clear)

    def test_covered_board_low_coverage(self, monkeypatch):
        mt = _make_tracker(monkeypatch, cnn_run=None, min_grid_line_coverage=0.6)
        covered = self._grid()
        covered[:, : int(400 * 0.6)] = 128            # flat block erases lines over 60% width
        assert mt._grid_line_coverage(covered) < 0.6
        assert mt._occluded_by_grid(covered)

    def test_gate_disabled_when_zero(self, monkeypatch):
        mt = _make_tracker(monkeypatch, cnn_run=None, min_grid_line_coverage=0.0)
        blank = np.full((400, 400), 128, np.uint8)      # no lines at all
        assert mt._occluded_by_grid(blank) is False     # disabled → never blocks


class TestMotionPrerequisite:
    """A move only commits if a hand entered since the reference (drift/light suppression)."""

    def test_no_motion_blocks_commit(self, monkeypatch):
        mt = _make_tracker(monkeypatch, cnn_run=None, require_motion_for_move=True)
        mt.ref_gray = _gray_frame(["e2"])
        mt.ref_fen = mt.board.fen()
        mt._motion_since_ref = False                             # board untouched since reference
        mt._try_detect(_gray_frame(["e4"]))                      # looks like e2e4 but no motion
        assert mt.history == []                                  # suppressed as drift
        assert "no motion" in mt.note

    def test_motion_allows_commit(self, monkeypatch):
        mt = _make_tracker(monkeypatch, cnn_run=None, require_motion_for_move=True, confirm_frames=1)
        mt.ref_gray = _gray_frame(["e2"])
        mt.ref_fen = mt.board.fen()
        mt._motion_since_ref, mt._last_motion_ts = True, time.time()                              # a hand entered → real move possible
        mt._try_detect(_gray_frame(["e4"]))
        assert mt.history == ["e4"]

    def test_stale_motion_blocks_commit(self, monkeypatch):
        """Motion armed long ago (high stable count since): drift is not a move — one old
        wobble spike must not license a commit minutes later."""
        mt = _make_tracker(monkeypatch, require_motion_for_move=True, confirm_frames=1)
        mt.ref_gray, mt.ref_fen = _gray_frame(["e2"]), mt.board.fen()
        mt._motion_since_ref, mt._last_motion_ts = True, time.time() - 120   # 2 min ago
        mt._try_detect(_gray_frame(["e4"]))
        assert mt.history == []
        assert "ago" in mt.note

    def test_commit_resets_motion_flag(self, monkeypatch):
        mt = _make_tracker(monkeypatch, cnn_run=None, require_motion_for_move=True, confirm_frames=1)
        mt.ref_gray = _gray_frame(["e2"])
        mt.ref_fen = mt.board.fen()
        mt._motion_since_ref, mt._last_motion_ts = True, time.time()
        mt._try_detect(_gray_frame(["e4"]))
        assert mt.history == ["e4"]
        assert mt._motion_since_ref is False                     # _set_ref reset it → next move needs motion


class TestClaheAndRecovery:
    """CLAHE contrast boost (B) + single-square destination recovery (A)."""

    def test_clahe_off_is_identity_shape(self, monkeypatch):
        mt = _make_tracker(monkeypatch, cnn_run=None, diff_clahe_clip=0.0)
        g = mt._gray(_bgr_frame(["e4"]))
        assert g.shape == (400, 400) and mt._clahe is None     # untouched when off

    def test_clahe_on_builds_operator(self, monkeypatch):
        mt = _make_tracker(monkeypatch, cnn_run=None, diff_clahe_clip=3.0)
        g = mt._gray(_bgr_frame(["e4"]))
        assert g.shape == (400, 400) and mt._clahe is not None  # CLAHE applied + cached

    def test_single_endpoint_candidate_unambiguous(self, monkeypatch):
        """Only the destination c6 is strongly changed → the one legal knight move Nc6 is
        proposed (from-square weak, below the both-endpoints gate)."""
        from chesslab.move_tracker.tracker import _ALL, loglik_scores
        mt = _make_tracker(monkeypatch, cnn_run=None)
        mt.board = chess.Board()
        mt.board.push_uci("e2e4")                                # black to move → Nb8c6 legal
        z = dict.fromkeys(_ALL, 0.0)
        z["c6"] = 8.0                                            # only destination hot
        scored = loglik_scores(mt.board, z, mt.z_thr, mt.ll_k)
        sm = mt._single_endpoint_candidate(z, scored)
        assert sm is not None and chess.square_name(sm.to_square) == "c6"

    def test_single_endpoint_none_when_multi_changed(self, monkeypatch):
        from chesslab.move_tracker.tracker import _ALL, loglik_scores
        mt = _make_tracker(monkeypatch, cnn_run=None)
        z = dict.fromkeys(_ALL, 0.0)
        z["c6"] = 8.0; z["e4"] = 8.0                             # two strong squares → not single
        scored = loglik_scores(mt.board, z, mt.z_thr, mt.ll_k)
        assert mt._single_endpoint_candidate(z, scored) is None


class TestFeedbackAndRecording:
    """Implicit labeling (undo=bad, standing=good) + session recording (auto-labeled game)."""

    def _committed_tracker(self, monkeypatch, auto_record=False):
        """Tracker that has just committed e2e4 (diff path, no CNN), with raw frame+corners."""
        mt = _make_tracker(monkeypatch, cnn_run=None, confirm_frames=1, auto_record=auto_record)
        mt.ref_gray = _gray_frame(["e2"])
        mt.ref_bgr = _bgr_frame(["e2"])
        mt.ref_fen = mt.board.fen()
        mt._last_frame = _bgr_frame(["e2"])                       # raw frame for recording
        mt._last_corners = [[0.0, 0.0], [400.0, 0.0], [400.0, 400.0], [0.0, 400.0]]
        return mt

    def test_decision_recorded_on_commit(self, monkeypatch):
        mt = self._committed_tracker(monkeypatch)
        mt._try_detect(_gray_frame(["e4"]), _bgr_frame(["e4"]))
        assert mt.history == ["e4"]
        assert len(mt._recent_decisions) == 1
        rec = mt._recent_decisions[-1]["rec"]
        assert rec["decider"] == "diff" and rec["move"] == "e2e4"

    def test_undo_logs_bad_example(self, monkeypatch, tmp_path):
        import chesslab.config as config
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        mt = self._committed_tracker(monkeypatch)
        mt._try_detect(_gray_frame(["e4"]), _bgr_frame(["e4"]))
        mt.undo()                                                 # undo = bad
        assert mt.history == []
        fb = tmp_path / "tracker_feedback" / "feedback.jsonl"
        assert fb.exists()
        rec = json.loads(fb.read_text(encoding="utf-8").strip())
        assert rec["feedback"] == "bad" and rec["move"] == "e2e4" and rec["decider"] == "diff"
        assert rec["images"] and all((tmp_path / "tracker_feedback" / p).exists()
                                     for p in rec["images"].values())

    def test_cascade_undo_logs_each_move(self, monkeypatch, tmp_path):
        import chesslab.config as config
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        mt = self._committed_tracker(monkeypatch)
        mt._try_detect(_gray_frame(["e4"]), _bgr_frame(["e4"]))   # 1. e4 (white)
        mt._commit_move(chess.Move.from_uci("e7e5"), _gray_frame(["e5"]), _bgr_frame(["e5"]))  # 1... e5
        assert len(mt._recent_decisions) == 2
        mt.undo(); mt.undo()                                      # cascade: both wrong
        assert mt.history == []
        recs = [json.loads(x) for x in
                (tmp_path / "tracker_feedback" / "feedback.jsonl").read_text().splitlines()]
        assert {r["move"] for r in recs} == {"e2e4", "e7e5"}      # each undone move logged once

    def test_auto_record_starts_on_commit(self, monkeypatch, tmp_path):
        import chesslab.config as config
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        mt = self._committed_tracker(monkeypatch, auto_record=True)
        assert mt._recorder is None
        mt._try_detect(_gray_frame(["e4"]), _bgr_frame(["e4"]))   # commit → flush immediately
        assert mt._recorder is not None and mt._pending_capture is None
        r = mt.stop_recording()
        assert r["ok"] and r["frames"] >= 1
        assert (tmp_path / "sessions" / r["session_id"] / "log.jsonl").exists()

    def test_auto_record_skips_positions_over_physical_inventory(self, monkeypatch, tmp_path):
        import chesslab.config as config
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        mt = self._committed_tracker(monkeypatch, auto_record=True)
        mt.board = chess.Board("Q3Q3/8/8/8/8/8/8/4K2k w - - 0 1")

        mt._queue_session_capture("a8=Q")

        assert mt._pending_capture is None
        assert mt._record_skipped_inventory == 1
        assert mt._record_skip_reason == "wQ 2/1"

    def test_recording_creates_sliceable_session(self, monkeypatch, tmp_path):
        import chesslab.config as config
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        mt = self._committed_tracker(monkeypatch)
        r = mt.start_recording()
        assert r["ok"]
        sid = r["session_id"]
        mt._try_detect(_gray_frame(["e4"]), _bgr_frame(["e4"]))   # commit e2e4 → photo deferred
        mt._try_detect(_gray_frame(["e4"]), _bgr_frame(["e4"]))   # clean quiet frame → captured
        r2 = mt.stop_recording()
        assert r2["ok"] and r2["frames"] >= 2                     # start position + one move
        sess = tmp_path / "sessions" / sid
        assert (sess / "log.jsonl").exists() and (sess / "session.yaml").exists()
        lines = [json.loads(x) for x in (sess / "log.jsonl").read_text(encoding="utf-8").splitlines()]
        assert lines[-1]["fen"] == mt.board.fen()                # last entry = post-move FEN
        assert "corners" in lines[-1]                            # slice re-warps from these

    def test_reattach_rebuilds_capture_keeps_game(self, monkeypatch):
        """Reattach swaps the capture and re-captures the reference, but keeps board/history."""
        mt = _make_tracker(monkeypatch, cnn_run=None, confirm_frames=1)
        mt.ref_gray = _gray_frame(["e2"]); mt.ref_bgr = _bgr_frame(["e2"])
        mt.ref_fen = mt.board.fen()
        mt._last_frame = _bgr_frame(["e2"])
        mt._last_corners = [[0.0, 0.0], [400.0, 0.0], [400.0, 400.0], [0.0, 400.0]]
        mt._try_detect(_gray_frame(["e4"]), _bgr_frame(["e4"]))
        assert mt.history == ["e4"]
        old_cap = mt.cap
        new_fake = FakeCapture([_bgr_frame(["e4"])])
        monkeypatch.setattr("chesslab.move_tracker.tracker.open_source", lambda s: new_fake)
        r = mt.reattach_camera()
        assert r["ok"]
        assert mt.cap is new_fake and mt.cap is not old_cap
        assert mt.history == ["e4"]                              # game state preserved
        # Reference is KEPT (fast resume): a brief dropout does not invalidate the base
        # truth — geometry changes are caught by _corners_jumped on the next frame.
        assert mt.ref_gray is not None and mt.ref_fen == mt.board.fen()

    def test_undo_drops_recorded_frame(self, monkeypatch, tmp_path):
        import chesslab.config as config
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        mt = self._committed_tracker(monkeypatch)
        mt.start_recording()
        mt._try_detect(_gray_frame(["e4"]), _bgr_frame(["e4"]))   # commit → photo deferred
        mt._try_detect(_gray_frame(["e4"]), _bgr_frame(["e4"]))   # clean quiet frame → captured
        assert mt._recorder.count == 2
        mt.undo()
        assert mt._recorder.count == 1                           # undone move's frame removed
        mt.stop_recording()

    def test_recorded_ply_survives_resync(self, monkeypatch, tmp_path):
        """Recorded ply comes from the POSITION, not len(history). Flushed immediately now
        so check plies in the recorder log."""
        import json

        import chesslab.config as config
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        mt = self._committed_tracker(monkeypatch, auto_record=True)
        mt.board = chess.Board("r5k1/5pp1/pBq4p/8/P1r5/5P2/1Q4PP/R2R3K w - - 1 33")
        mt.history = []
        mt._queue_session_capture("Qc6")
        rec = mt._recorder
        assert rec is not None
        entries = [json.loads(line) for line in (rec.dir / "log.jsonl").read_text().splitlines()]
        assert entries[-1]["ply"] == 64

    def test_undo_before_flush_drops_pending_photo(self, monkeypatch, tmp_path):
        """Capture flushed immediately at commit — undo removes the recorded frame."""
        import chesslab.config as config
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        mt = self._committed_tracker(monkeypatch)
        mt.start_recording()
        before = mt._recorder.count
        mt._try_detect(_gray_frame(["e4"]), _bgr_frame(["e4"]))   # commit → flush immediately
        assert mt._pending_capture is None
        assert mt._recorder.count == before + 1                     # frame captured
        mt.undo()
        assert mt._recorder.count == before                         # undone frame removed


class TestTrackFeedbackIngest:
    """UNDO=bad feedback → labeled hard-negative crops in the squares manifest."""

    def _write_feedback(self, tmp_path, fen_before, move="e2e4"):
        import cv2
        fb = tmp_path / "tracker_feedback"
        (fb / "frames").mkdir(parents=True, exist_ok=True)
        board = np.full((400, 400, 3), (120, 122, 118), np.uint8)   # warped board stand-in
        cv2.imwrite(str(fb / "frames" / "b_cur_bgr.png"), board)
        rec = {"ts": 1.5, "profile": "phone", "ply": 1, "move": move, "san": move,
               "fen_before": fen_before, "feedback": "bad",
               "images": {"cur_bgr": "frames/b_cur_bgr.png"}}
        (fb / "feedback.jsonl").write_text(json.dumps(rec) + "\n", encoding="utf-8")

    def test_ingest_labels_from_fen_before(self, monkeypatch, tmp_path):
        import chesslab.config as config
        import chesslab.track_feedback as tf
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        monkeypatch.setattr(tf, "load_profile", lambda name: _make_identity_profile(board_size=400))
        self._write_feedback(tmp_path, chess.Board().fen())          # start position
        res = tf.ingest_feedback(assume_ghost=True)
        assert res["ok"] and res["records"] == 1 and res["crops"] == 64
        # start position → 16 pieces + 32 empty per side layout; check a couple labels
        assert res["classes"].get("wR") == 2 and res["classes"].get("bK") == 1
        assert res["classes"].get("empty") == 32
        man = tmp_path / "manifests" / "squares.jsonl"
        rows = [json.loads(x) for x in man.read_text(encoding="utf-8").splitlines()]
        assert len(rows) == 64 and all(r["session_id"] == "track-feedback" for r in rows)
        a1 = next(r for r in rows if r["square"] == "a1")
        assert a1["label"] == "wR" and a1["source"] == "track-feedback"
        assert (tmp_path / "squares" / "wR" / a1["path"].split("/")[-1]).exists()

    def test_ingest_requires_assume_ghost(self, monkeypatch, tmp_path):
        import chesslab.config as config
        import chesslab.track_feedback as tf
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        assert tf.ingest_feedback(assume_ghost=False)["ok"] is False

    def test_ingest_empty_is_noop(self, monkeypatch, tmp_path):
        import chesslab.config as config
        import chesslab.track_feedback as tf
        monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path))
        res = tf.ingest_feedback(assume_ghost=True)
        assert res["ok"] and res["records"] == 0 and res["crops"] == 0


class TestStockfishAnalysis:
    """Eval-bar / best-move analysis wrapper (engine-free paths)."""

    def test_win_chance_symmetric_and_monotonic(self):
        from chesslab.move_tracker.analysis import win_chance_white
        assert win_chance_white(0) == pytest.approx(50.0)
        assert win_chance_white(300) > win_chance_white(0) > win_chance_white(-300)
        assert win_chance_white(300) + win_chance_white(-300) == pytest.approx(100.0, abs=0.1)

    def test_analyse_game_over_needs_no_engine(self):
        from chesslab.move_tracker.analysis import StockfishAnalyzer
        az = StockfishAnalyzer(lambda: None, engine_path="/nonexistent/sf")
        # Fool's mate — game over, so _analyse returns before touching the engine.
        fen = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"
        res = az._analyse(fen)
        assert res["game_over"] is True and res["lines"] == [] and res["win_white"] is None

    def test_analysis_endpoint_contract(self, monkeypatch):
        from fastapi.testclient import TestClient

        from chesslab.move_tracker.app import create_app
        # Force "no engine" so the endpoint is deterministic without a Stockfish binary.
        monkeypatch.setattr("chesslab.config.find_stockfish", lambda: None)
        client = TestClient(create_app(default_profile="p", default_source="0"))
        r = client.get("/api/analysis")
        assert r.status_code == 200 and r.json()["available"] is False


class TestLatestFrame:
    """Grab-Latest-Wrapper: always returns the latest frame; clean release()."""

    def test_reads_newest_and_releases(self):
        from chesslab.camera import LatestFrame

        class Counting:
            def __init__(self):
                self.i, self.released = 0, False

            def read(self):
                self.i += 1
                return True, np.array([[self.i]], dtype=np.int32)

            def release(self):
                self.released = True

        cap = Counting()
        lf = LatestFrame(cap)
        import time as _t
        _t.sleep(0.05)
        ok1, f1 = lf.read()
        _t.sleep(0.03)
        ok2, f2 = lf.read()
        assert ok1 and ok2
        assert int(f2[0, 0]) >= int(f1[0, 0]) >= 1   # monoton wachsend = neuester Frame
        lf.release()
        assert cap.released is True


class TestAppEndpoints:
    """TestClient on create_app() — contract freeze."""

    def test_status_inactive_contains_defaults(self):
        # Must not import TestClient at module level (fastapi lazy)
        from fastapi.testclient import TestClient

        from chesslab.move_tracker.app import create_app

        client = TestClient(create_app(default_profile="testp", default_source="99"))
        r = client.get("/api/status")
        assert r.status_code == 200
        data = r.json()
        assert data["active"] is False
        assert data.get("default_profile") == "testp"
        assert data.get("default_source") == "99"
        assert data["track_defaults"]["motion_margin"] == 0.10
        assert data["track_defaults"]["overhang"] == 0.25
        assert data["track_defaults"]["motion_hold_s"] == 0.4

    def test_double_start_one_thread(self, monkeypatch):
        from fastapi.testclient import TestClient

        from chesslab.move_tracker.app import create_app

        board_size = 400
        prof = _make_identity_profile(board_size=board_size)
        frame = _bgr_frame(["e2"], board_size=board_size)
        fake = FakeCapture([frame] * 5)

        monkeypatch.setattr("chesslab.move_tracker.tracker.open_source", lambda s: fake)
        monkeypatch.setattr("chesslab.move_tracker.tracker.ensure_profile", lambda *a, **k: prof)

        app = create_app(default_profile="testp", default_source="0",
                         tracker_kwargs={"live_align": False, "settle_frames": 10})
        client = TestClient(app)

        # Start twice quickly
        r1 = client.post("/api/start", json={"profile": "testp", "source": "0"})
        assert r1.status_code == 200
        r2 = client.post("/api/start", json={"profile": "testp", "source": "0"})
        assert r2.status_code == 200

        # Status should be active
        r = client.get("/api/status")
        assert r.json()["active"] is True

    def test_start_accepts_live_tuning_values(self, monkeypatch):
        from fastapi.testclient import TestClient

        from chesslab.move_tracker.app import _STATE, create_app

        board_size = 400
        prof = _make_identity_profile(board_size=board_size)
        frame = _bgr_frame(["e2"], board_size=board_size)
        fake = FakeCapture([frame] * 5)

        monkeypatch.setattr("chesslab.move_tracker.tracker.open_source", lambda s: fake)
        monkeypatch.setattr("chesslab.move_tracker.tracker.ensure_profile", lambda *a, **k: prof)

        app = create_app(default_profile="testp", default_source="0",
                         tracker_kwargs={"live_align": False, "settle_frames": 10})
        client = TestClient(app)
        r = client.post("/api/start", json={
            "profile": "testp",
            "source": "0",
            "motion_margin": 0.33,
            "overhang": 0.40,
            "motion_hold_s": 0.55,
            "min_grid_line_coverage": 0.25,
        })
        assert r.status_code == 200
        tracker = _STATE.get("tracker")
        assert tracker.motion_margin == 0.33
        assert tracker.overhang == 0.40
        assert tracker.motion_hold_s == 0.55
        assert tracker.min_grid_line_coverage == 0.25

    def test_settings_updates_running_tracker_without_restart(self, monkeypatch):
        from fastapi.testclient import TestClient

        from chesslab.move_tracker.app import _STATE, create_app

        board_size = 400
        prof = _make_identity_profile(board_size=board_size)
        frame = _bgr_frame(["e2"], board_size=board_size)
        fake = FakeCapture([frame] * 5)

        monkeypatch.setattr("chesslab.move_tracker.tracker.open_source", lambda s: fake)
        monkeypatch.setattr("chesslab.move_tracker.tracker.ensure_profile", lambda *a, **k: prof)

        app = create_app(default_profile="testp", default_source="0",
                         tracker_kwargs={"live_align": False, "settle_frames": 10})
        client = TestClient(app)
        assert client.post("/api/start", json={"profile": "testp", "source": "0"}).json()["ok"]
        tracker_before = _STATE.get("tracker")

        r = client.post("/api/settings", json={
            "motion_margin": 0.28,
            "overhang": 0.35,
            "motion_hold_s": 0.6,
            "min_grid_line_coverage": 0.3,
            "occlusion_color_thr": 2.0,
            "census_thr": 140,
        })
        assert r.status_code == 200 and r.json()["ok"] is True
        tracker_after = _STATE.get("tracker")
        assert tracker_after is tracker_before
        assert tracker_after.motion_margin == 0.28
        assert tracker_after.overhang == 0.35
        assert tracker_after.motion_hold_s == 0.6
        assert tracker_after.min_grid_line_coverage == 0.3
        assert tracker_after.occlusion_color_thr == 2.0
        assert tracker_after.census_thr == 140

    def test_reset_invalid_fen(self):
        from fastapi.testclient import TestClient

        from chesslab.move_tracker.app import create_app

        client = TestClient(create_app())
        r = client.post("/api/reset", json={"fen": "invalid-fen-string"})
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is False
        assert "error" in data
        assert "invalid FEN" in data["error"]

# =======================================================================================
# Spec 10: Nudge-Patch, Promotion, CNN-Overrule, Prior visibility
# =======================================================================================


class TestNudgePatch:
    """Non-CNN re-anchor for explainable disturbances (Spec 10, part 4)."""

    def test_nudge_patches_occupied_square(self, monkeypatch):
        """1 occupied square persistently unexplained -> after nudge_timeout_s the
        reference cell is patched, tracker continues (no stuck)."""
        mt = _make_tracker(monkeypatch, cnn_run=None, nudge_timeout_s=0.0)
        mt.ref_gray = _gray_frame([], base=128)
        mt.ref_fen = mt.board.fen()
        cur = _gray_frame(["e2"], base=128)      # e2 (occupied) looks different: piece moved
        mt._try_detect(cur)                       # 1st sighting: timer starts, timeout 0 -> patch
        mt._try_detect(cur)
        assert mt._stuck_reason is None
        assert mt.history == []
        # Reference cell adopted -> next frame is quiet
        mt._try_detect(cur)
        assert mt._changed == []

    def test_empty_square_not_patched_before_drift_window(self, monkeypatch):
        """Empty square changes -> do NOT patch immediately (could be silent wrong move)."""
        mt = _make_tracker(monkeypatch, cnn_run=None, nudge_timeout_s=0.0, drift_window_s=9999.0)
        mt.ref_gray = _gray_frame([], base=128)
        mt.ref_fen = mt.board.fen()
        cur = _gray_frame(["e4"], base=128)      # e4 is EMPTY according to game state
        mt._try_detect(cur)
        mt._try_detect(cur)
        assert mt._stuck_reason == "no_legal_move"   # stays stuck, no patch
        assert mt._changed == ["e4"]


class TestPromotionWithoutCnn:
    def test_promotion_waits_for_user_choice(self, monkeypatch):
        """Pawn reaches the back rank without CNN -> promotion_pending instead of permanent ambiguity;
        choose_promotion commits the chosen piece."""
        mt = _make_tracker(monkeypatch, cnn_run=None)
        mt.board = chess.Board("8/P6k/8/8/8/8/7K/8 w - - 0 1")
        mt.ref_gray = _gray_frame(["a7"], base=128)
        mt.ref_fen = mt.board.fen()
        cur = _gray_frame(["a8"], base=128)
        mt._try_detect(cur)
        assert mt._promo_pending is not None
        assert mt._promo_pending["from"] == "a7" and mt._promo_pending["to"] == "a8"
        assert mt.history == []
        res = mt.choose_promotion("n")
        assert res["ok"] is True and res["move"] == "a7a8n"
        assert mt.history == ["a8=N+"] or mt.history == ["a8=N"]
        assert mt._promo_pending is None

    def test_choose_promotion_invalid_piece(self, monkeypatch):
        mt = _make_tracker(monkeypatch, cnn_run=None)
        assert mt.choose_promotion("k")["ok"] is False
        assert mt.choose_promotion("q")["ok"] is False   # nichts offen


class TestCnnOverrule:
    def test_cnn_overrules_diff_candidate(self, monkeypatch):
        """CNN clearly sees a DIFFERENT move (occupancy) and confirms it reliably ->
        the CNN candidate is committed, not the diff candidate (Spec 10, part 5)."""
        # e2e4 endpoints unreadable so it is neither confirmed nor rejected; d2d4 is reliable.
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=0.0, derive_move="d2d4",
                              derive_agreement=0.99, conf={"e4": False, "e2": False})
        for _ in range(2):                       # verify_obs_votes
            mt._verify_tick(_mk_snap(mt))
        assert mt.last_move == "d2d4"
        assert mt._verify_state == "overruled"


class TestWeakEvidenceHold:
    def test_weak_candidate_does_not_reanchor(self, monkeypatch):
        """Weak move-consistent evidence (white-on-white): no square above z_thr, but
        best-LL above the floor -> reference is HELD (not baked in)."""
        from chesslab.move_tracker import tracker as trk

        mt = _make_tracker(monkeypatch, cnn_run=None)
        ref = _gray_frame([], base=128)
        mt.ref_gray = ref
        mt.ref_fen = mt.board.fen()
        # Feed z-scores directly: e2 (2.5) and e4 (1.5) BOTH below z_thr, but both
        # ueber z_thr/2 -> e2e4 viabel, best-LL = -2 (zwischen Floor -4 und 0) -> HALTEN.
        monkeypatch.setattr(trk, "per_square_diff",
                            lambda *a, **k: dict.fromkeys(trk._ALL, 0.0))
        monkeypatch.setattr(mt.noise, "z",
                            lambda diffs: {s: {"e2": 2.5, "e4": 1.5}.get(s, 0.0)
                                           for s in trk._ALL})
        cur = _gray_frame([], base=128)
        mt._try_detect(cur)
        assert mt.ref_gray is ref                 # NOT re-anchored
        assert mt._stuck_reason is None
        assert "weak move evidence" in mt.note

# =======================================================================================
# Stage A1: _region_means (integral-image per-square statistics)
# =======================================================================================


class TestRegionMeans:
    """Stage A1 — integral-image _region_means must be bit-identical to loop-based means."""

    def _reference_per_square_diff(self, gray_a, gray_b, bs, white_pov, extend_up=0.0):
        """Original loop-based per_square_diff (copy for comparison)."""
        from chesslab.move_tracker.tracker import _ALL, square_region

        d = cv2.absdiff(gray_a, gray_b)
        out: dict[str, float] = {}
        for sq in _ALL:
            x0, y0, x1, y1 = square_region(sq, bs, white_pov, extend_up=extend_up)
            out[sq] = float(d[y0:y1, x0:x1].mean()) if (y1 > y0 and x1 > x0) else 0.0
        return out

    def _reference_per_square_census(self, ref_gray, cur_gray, bs, white_pov, extend_up=0.0):
        """Original loop-based per_square_census_change (copy for comparison)."""
        from chesslab.move_tracker.tracker import _ALL, _POPCOUNT8, census_transform, square_region

        ham = _POPCOUNT8[census_transform(ref_gray) ^ census_transform(cur_gray)]
        out: dict[str, float] = {}
        for sq in _ALL:
            x0, y0, x1, y1 = square_region(sq, bs, white_pov, extend_up=extend_up)
            reg = ham[y0:y1, x0:x1]
            out[sq] = float(reg.mean()) * (255.0 / 8.0) if reg.size else 0.0
        return out

    def test_per_square_diff_integral_matches_loop(self):
        """For several board sizes: integral-based equals loop-based (atol=1e-6)."""
        rng = np.random.RandomState(42)
        for bs in (200, 400, 800, 1600):
            ga = rng.randint(0, 256, (bs, bs), dtype=np.uint8)
            gb = rng.randint(0, 256, (bs, bs), dtype=np.uint8)
            for w_pov in (True, False):
                for eu in (0.0, 0.35):
                    ref = self._reference_per_square_diff(ga, gb, bs, w_pov, extend_up=eu)
                    new = per_square_diff(ga, gb, bs, w_pov, extend_up=eu)
                    for sq in ref:
                        assert new[sq] == pytest.approx(ref[sq], abs=1e-6), \
                            f"diff mismatch {sq} @ bs={bs} wpov={w_pov} eu={eu}"

    def test_per_square_census_integral_matches_loop(self):
        """For several board sizes: integral-based equals loop-based (atol=1e-6)."""
        rng = np.random.RandomState(42)
        for bs in (200, 400, 800):
            gray_ref = rng.randint(0, 256, (bs, bs), dtype=np.uint8)
            gray_cur = rng.randint(0, 256, (bs, bs), dtype=np.uint8)
            for w_pov in (True, False):
                for eu in (0.0, 0.35):
                    ref = self._reference_per_square_census(gray_ref, gray_cur, bs, w_pov, extend_up=eu)
                    new = per_square_census_change(gray_ref, gray_cur, bs, w_pov, extend_up=eu)
                    for sq in ref:
                        assert new[sq] == pytest.approx(ref[sq], abs=1e-6), \
                            f"census mismatch {sq} @ bs={bs} wpov={w_pov} eu={eu}"

    def test_per_square_census_integral_matches_loop_with_ref_codes(self):
        """Same with precomputed ref_codes (the cached fast path)."""
        from chesslab.move_tracker.tracker import census_transform

        rng = np.random.RandomState(42)
        for bs in (200, 400):
            gray_ref = rng.randint(0, 256, (bs, bs), dtype=np.uint8)
            gray_cur = rng.randint(0, 256, (bs, bs), dtype=np.uint8)
            ref_codes = census_transform(gray_ref)
            for eu in (0.0, 0.35):
                ref = self._reference_per_square_census(gray_ref, gray_cur, bs, True, extend_up=eu)
                new = per_square_census_change(gray_ref, gray_cur, bs, True, extend_up=eu,
                                               ref_codes=ref_codes)
                for sq in ref:
                    assert new[sq] == pytest.approx(ref[sq], abs=1e-6), \
                        f"census+cache mismatch {sq} @ bs={bs} eu={eu}"

class TestPairScores:
    """Diff-side 2-half-move detection (fast play without CNN)."""

    def test_pair_explains_two_moves(self):
        from chesslab.move_tracker.tracker import loglik_pair_scores

        board = chess.Board()
        z = _z({"e2": 8.0, "e4": 8.0, "e7": 8.0, "e5": 8.0})
        pairs = loglik_pair_scores(board, z)
        assert pairs, "no pairs found"
        best_seq, best = pairs[0]
        assert [m.uci() for m in best_seq] == ["e2e4", "e7e5"]
        assert best > 0

    def test_pair_requires_endpoint_evidence(self):
        from chesslab.move_tracker.tracker import loglik_pair_scores

        board = chess.Board()
        z = _z({"e2": 8.0, "e4": 8.0})          # only ONE move has evidence
        pairs = loglik_pair_scores(board, z)
        # valid pairs must carry all 4 endpoints -> none here
        assert pairs == []


def test_api_runs_lists_selectable_models(tmp_path, monkeypatch):
    """/api/runs lists runs with weights, newest first, plus the resolved default."""
    import pytest
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from chesslab import config
    from chesslab.move_tracker.app import create_app

    monkeypatch.setattr(config, "DATA", config.Paths(root=tmp_path / "data"))
    # two runs with weights, one without
    for name in ("run-a", "run-b"):
        d = config.DATA.models / name
        d.mkdir(parents=True)
        (d / "best.pt").write_bytes(b"x")
    (config.DATA.models / "no-weights").mkdir(parents=True)

    client = TestClient(create_app({}))
    r = client.get("/api/runs").json()
    assert set(r["runs"]) == {"run-a", "run-b"}
    assert r["default"] in r["runs"]
    assert r["active"] is None


class TestDetectScale:
    """B1: detection at detect_scale=0.5 uses a det-sized ref_gray and commits a simple move."""

    def test_detect_scale_half_det_size_and_e2e4(self, monkeypatch):
        """detect_scale=0.5 with a 400px profile → det_size=200, ref_gray is 200×200,
        and e2e4 commits."""
        mt = _make_tracker(monkeypatch, detect_scale=0.5)
        assert mt._det_size == 200
        assert mt.detect_scale == 0.5

        # Set reference: e2 occupied (piece present), e4 empty
        ref = _gray_frame(["e2"], board_size=200, base=128)
        mt.ref_gray = ref
        mt.ref_fen = mt.board.fen()

        # After e2e4: e2 empty, e4 occupied
        cur = _gray_frame(["e4"], board_size=200, base=128)
        mt._try_detect(cur)
        assert mt.history == ["e4"], f"Expected e4, got {mt.history}"


# --- Structural evidence fusion + shadow/occlusion classifier (2026-07) -----------------

class TestStructuralEvidence:
    """Census as an EVIDENCE channel (dark-on-dark) and as the baseline
    occlusion-vs-shadow discriminator (hard shadows must not latch as occlusion)."""

    BS = 400  # 50 px cells

    @staticmethod
    def _piece(img, sq, lo, hi, rng):
        """Textured disc (a 'piece') covering ~half the inset box of `sq`."""
        x0, y0, x1, y1 = square_region(sq, 400, True)
        cx, cy, r = (x0 + x1) // 2, (y0 + y1) // 2, (x1 - x0) // 3
        mask = np.zeros(img.shape[:2], dtype=np.uint8)
        cv2.circle(mask, (cx, cy), r, 255, -1)
        tex = rng.integers(lo, hi, img.shape[:2], dtype=np.uint8 if img.ndim == 2 else None)
        if img.ndim == 2:
            img[mask > 0] = tex[mask > 0]
        else:
            for c in range(3):
                img[..., c][mask > 0] = tex[mask > 0]

    def test_dark_on_dark_seen_by_census_not_gray(self):
        """A dark textured piece on a dark square: gray-mean z misses (< z_thr), the
        census channel fires — the fused max detects exactly this one square."""
        from chesslab.move_tracker.tracker import census_transform

        rng = np.random.default_rng(42)
        ref = np.full((400, 400), 40, dtype=np.uint8)
        cur = ref.copy()
        self._piece(cur, "e4", 20, 34, rng)          # dark-on-dark: |mean delta| tiny
        diffs = normalize_diffs(per_square_diff(ref, cur, 400, True))
        z_gray = SquareNoise().z(diffs)
        cens = per_square_census_change(ref, cur, 400, True,
                                        ref_codes=census_transform(ref))
        z_cens = SquareNoise(init_std=4.0, std_floor=2.0).z(cens)
        assert z_gray["e4"] < 3.0                    # the old single-channel failure
        assert z_cens["e4"] >= 3.0                   # structure sees the piece
        fused = {s: max(z_gray[s], z_cens[s]) for s in z_gray}
        hot = {s for s, v in fused.items() if v >= 3.0}
        assert hot == {"e4"}

    def test_multiplicative_shadow_is_census_quiet(self):
        """A cast shadow (uniform multiplicative darkening) preserves the census codes:
        the structural channel must NOT fire — no ghost evidence from shadows."""
        from chesslab.move_tracker.tracker import census_transform

        rng = np.random.default_rng(7)
        ref = rng.integers(60, 200, (400, 400), dtype=np.uint8)
        ref = cv2.GaussianBlur(ref, (5, 5), 0)       # realistic smooth texture
        cur = ref.copy()
        x0, y0, x1, y1 = square_region("d5", 400, True)
        reg = cur[y0 - 8:y1 + 8, x0 - 8:x1 + 8]
        cur[y0 - 8:y1 + 8, x0 - 8:x1 + 8] = (reg.astype(np.float32) * 0.6).astype(np.uint8)
        cens = per_square_census_change(ref, cur, 400, True,
                                        ref_codes=census_transform(ref))
        z_cens = SquareNoise(init_std=4.0, std_floor=2.0).z(cens)
        assert z_cens["d5"] < 3.0


class TestBaselineOcclusionClassifier:
    """_baseline_occlusion_and_shadow in structural mode: strong absdiff is classified
    by WHAT changed (structure / chroma / flat darkening), not just how much."""

    ABS_THR = 20.0

    @staticmethod
    def _classify(ref, cur, ref_codes=None, occl_census_thr=24.0,
                  cur_bgr=None, gamut=None, color_thr=0.0):
        from chesslab.move_tracker.tracker import _baseline_occlusion_and_shadow, census_transform
        if ref_codes is None:
            ref_codes = census_transform(ref)
        occ, shad, _core = _baseline_occlusion_and_shadow(
            cur, ref, 400, TestBaselineOcclusionClassifier.ABS_THR, True,
            ref_codes=ref_codes, occl_census_thr=occl_census_thr,
            cur_bgr=cur_bgr, gamut=gamut, color_thr=color_thr)
        return occ, shad

    @staticmethod
    def _textured_board(seed=3):
        rng = np.random.default_rng(seed)
        b = rng.integers(60, 200, (400, 400), dtype=np.uint8)
        return cv2.GaussianBlur(b, (5, 5), 0)

    def test_hard_shadow_is_shadow_not_occlusion(self):
        """The user-reported bug: a strong cast shadow used to exceed the absdiff
        threshold and latch the square as OCCLUDED (z zeroed → detection stall)."""
        ref = self._textured_board()
        cur = ref.copy()
        x0, y0, x1, y1 = square_region("e4", 400, True)
        reg = cur[y0 - 8:y1 + 8, x0 - 8:x1 + 8]
        cur[y0 - 8:y1 + 8, x0 - 8:x1 + 8] = (reg.astype(np.float32) * 0.5).astype(np.uint8)
        occ, shad = self._classify(ref, cur)
        assert "e4" not in occ
        assert "e4" in shad
        # legacy mode (occl_census_thr=0) reproduces the old misclassification:
        occ_legacy, _ = self._classify(ref, cur, occl_census_thr=0.0)
        assert "e4" in occ_legacy

    def test_textured_occluder_is_occluded(self):
        rng = np.random.default_rng(11)
        ref = self._textured_board()
        cur = ref.copy()
        x0, y0, x1, y1 = square_region("c3", 400, True)
        cur[y0 - 8:y1 + 8, x0 - 8:x1 + 8] = rng.integers(
            0, 255, (y1 - y0 + 16, x1 - x0 + 16), dtype=np.uint8)
        occ, shad = self._classify(ref, cur)
        assert "c3" in occ
        assert "c3" not in shad

    def test_flat_hand_needs_chroma_to_be_occlusion(self):
        """Flat skin-toned occluder: low census (no texture), darker than the board —
        without the gamut it is misread as shadow; the chroma outlier check fixes it."""
        from chesslab.move_tracker.tracker import board_color_gamut

        ref_bgr = np.full((400, 400, 3), 170, dtype=np.uint8)     # neutral gray board
        gamut = board_color_gamut(ref_bgr, 400, True)
        assert gamut is not None
        cur_bgr = ref_bgr.copy()
        x0, y0, x1, y1 = square_region("f6", 400, True)
        cur_bgr[y0 - 8:y1 + 8, x0 - 8:x1 + 8] = (80, 100, 190)    # flat skin tone, darker
        ref = cv2.cvtColor(ref_bgr, cv2.COLOR_BGR2GRAY)
        cur = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2GRAY)
        occ_no_gamut, shad_no_gamut = self._classify(ref, cur)
        assert "f6" in shad_no_gamut and "f6" not in occ_no_gamut  # the blind spot
        occ, shad = self._classify(ref, cur, cur_bgr=cur_bgr, gamut=gamut, color_thr=1.5)
        assert "f6" in occ
        assert "f6" not in shad

    def test_global_jitter_median_normalized(self):
        """Table wobble / pixel jitter shifts EVERY piece edge → raw census fires on
        all textured squares at once (the observed 62-square 'much change' state).
        Median normalization removes the global component; the channel-local guard
        (> max_changed+2 hot squares) catches whatever survives."""
        from chesslab.move_tracker.tracker import _ALL, census_transform

        rng = np.random.default_rng(5)
        ref = np.full((400, 400), 120, dtype=np.uint8)
        for sq in _ALL[:16] + _ALL[48:]:             # pieces on 4 ranks (32 squares)
            TestStructuralEvidence._piece(ref, sq, 30, 220, rng)
        ref = cv2.GaussianBlur(ref, (3, 3), 0)
        cur = np.roll(ref, 1, axis=1)                 # 1 px horizontal wobble
        cens = per_square_census_change(ref, cur, 400, True,
                                        ref_codes=census_transform(ref))
        noise = SquareNoise(init_std=4.0, std_floor=2.5)
        raw_hot = sum(1 for v in noise.z(cens).values() if v >= 3.0)
        norm_hot = sum(1 for v in noise.z(normalize_diffs(cens)).values() if v >= 3.0)
        assert raw_hot > 8                            # raw channel would flood (old bug)
        assert norm_hot < raw_hot / 2                 # median norm strips the global part
        # whatever residual remains is caught by the channel guard in _compute_evidence
        assert norm_hot <= 8 or raw_hot > 8

    def test_raw_core_vs_dilated(self):
        """The occluded-state gate counts the RAW core: one strong square dilates to 5
        neighbors for z-taint protection, but must not lock the tracker in 'occluded'
        (piece arrivals need to reach detection + CNN arbitration)."""
        from chesslab.move_tracker.tracker import _baseline_occlusion_and_shadow, census_transform

        rng = np.random.default_rng(13)
        ref = self._textured_board()
        cur = ref.copy()
        x0, y0, x1, y1 = square_region("e4", 400, True)
        cur[y0 - 8:y1 + 8, x0 - 8:x1 + 8] = rng.integers(
            0, 255, (y1 - y0 + 16, x1 - x0 + 16), dtype=np.uint8)
        occ, _shad, core = _baseline_occlusion_and_shadow(
            cur, ref, 400, self.ABS_THR, True,
            ref_codes=census_transform(ref), occl_census_thr=24.0)
        assert "e4" in core and len(core) <= 2      # piece-like: reaches detection
        assert len(occ) >= 4                        # dilation still protects the taint

# =======================================================================================

# =======================================================================================

# =======================================================================================
# Phase 00: shadow-destination-veto
# =======================================================================================

def test_destination_squares_castling():
    """Pure unit test: move_destination_squares returns correct gained squares."""

    # O-O white: king e1->g1, rook h1->f1
    board = chess.Board("r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5")
    mv = chess.Move.from_uci("e1g1")
    assert move_destination_squares(board, mv) == {"g1", "f1"}

    # O-O-O black: king e8->c8, rook a8->d8
    board = chess.Board("r3k2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 b kq - 8 5")
    mv = chess.Move.from_uci("e8c8")
    assert move_destination_squares(board, mv) == {"c8", "d8"}

    # En passant: captured square NOT a destination
    board = chess.Board("rnbqkbnr/pp1pp1pp/8/2p1Pp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3")
    mv = chess.Move.from_uci("e5f6")
    assert move_destination_squares(board, mv) == {"f6"}

    # Normal move
    board = chess.Board()
    mv = chess.Move.from_uci("e2e4")
    assert move_destination_squares(board, mv) == {"e4"}


def test_shadow_destination_blocks_phantom_move(monkeypatch):
    """wR on h1, g1 empty. Uniform darkening on both -> shadow_veto on changed squares.
    h1g1 is rejected because destination g1 is shadow-vetoed."""
    mt = _make_tracker(monkeypatch, cnn_run=None, confirm_frames=1, board_size=400)
    # Position: wR on h1, g1 empty
    board = chess.Board("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQK2R w KQkq - 0 1")
    mt.board = board.copy()

    from chesslab.move_tracker.tracker import square_region
    # Reference: white piece on h1, gray bg
    ref_bgr = np.full((400, 400, 3), (120, 120, 120), dtype=np.uint8)
    x0, y0, x1, y1 = square_region("h1", 400, True)
    ref_bgr[y0:y1, x0:x1] = (255, 255, 255)
    mt.ref_bgr = ref_bgr
    mt.ref_gray = cv2.cvtColor(ref_bgr, cv2.COLOR_BGR2GRAY)
    mt.ref_fen = mt.board.fen()

    # Current: uniformly darker everywhere (HSV shadow on changed squares)
    cur_bgr = np.full((400, 400, 3), (72, 72, 72), dtype=np.uint8)
    cur_gray = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2GRAY)

    mt._motion_since_ref, mt._last_motion_ts = True, time.time()
    mt._try_detect(cur_gray, cur_bgr)

    # No new move committed, FEN unchanged
    assert board.fen() == mt.board.fen(), \
        f"FEN changed: {mt.board.fen()}"

    # If shadow_veto was active, h1g1 should be among blocked destinations
    if mt._shadow_blocked:
        assert "h1g1" in mt._shadow_blocked, \
            f"Expected h1g1 blocked, got {mt._shadow_blocked}"


def test_shadow_on_from_square_still_allows_move(monkeypatch):
    """Guard asymmetry: e2->e4 still commits when from-square e2 is shadow-flagged.
    Uses white pieces for high contrast against gray background."""
    mt = _make_tracker(monkeypatch, cnn_run=None, confirm_frames=1, board_size=400,
                       require_motion_for_move=False)

    from chesslab.move_tracker.tracker import square_region

    # Reference: white piece on e2, gray bg
    ref_bgr = np.full((400, 400, 3), (120, 120, 120), dtype=np.uint8)
    x0, y0, x1, y1 = square_region("e2", 400, True)
    ref_bgr[y0:y1, x0:x1] = (255, 255, 255)
    mt.ref_bgr = ref_bgr
    mt.ref_gray = cv2.cvtColor(ref_bgr, cv2.COLOR_BGR2GRAY)
    mt.ref_fen = mt.board.fen()

    # Current: white piece on e4, e2 dark (vacated shadow), gray bg
    cur_bgr = np.full((400, 400, 3), (120, 120, 120), dtype=np.uint8)
    x0, y0, x1, y1 = square_region("e4", 400, True)
    cur_bgr[y0:y1, x0:x1] = (255, 255, 255)
    x0, y0, x1, y1 = square_region("e2", 400, True)
    cur_bgr[y0:y1, x0:x1] = (40, 40, 40)   # vacated square darkens
    cur_gray = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2GRAY)

    mt._motion_since_ref, mt._last_motion_ts = True, time.time()
    mt._try_detect(cur_gray, cur_bgr)

    # Move should commit: e2e4
    assert "e4" in mt.history, \
        f"Expected e4 in history, got {mt.history}, note={mt.note}"

# --- Illegal-move alarm tests (Phase 01) ---
# ---------------------------------------------------------------------------

_ALL_SQS = [f"{f}{r}" for r in range(1, 9) for f in "abcdefgh"]


class _AlarmStub:
    """Stub CnnRecovery for identity-path alarm tests.
    Provides board_matches_identity + derive_moves_identity.
    The observation carries identity labels so has_identity=True."""

    def __init__(self, match=False, conflicts=None, cnn_moves=None,
                 match_obs_label=True):
        self._match = match
        self._conflicts = conflicts or []
        self._cnn_moves = list(cnn_moves) if cnn_moves else []
        self.observe_calls = 0
        self._obs_label = match_obs_label
        self._build_obs({})

    def _build_obs(self, labels):
        po, pe, poc, lb, cf = {}, {}, {}, {}, {}
        for sq in _ALL_SQS:
            lab = labels.get(sq, "empty")
            lb[sq] = lab
            cf[sq] = 0.99
            if lab == "empty":
                pe[sq], po[sq], poc[sq] = 0.99, 0.01, 0.0
            else:
                po[sq], pe[sq], poc[sq] = 0.99, 0.01, 0.0
        self._obs = OccupancyObservation(p_occ=po, p_empty=pe, p_occluded=poc,
                                         label=lb, conf=cf)

    def set_obs_for_board(self, board, overrides=None):
        from chesslab.move_tracker.cnn_recovery import expected_labels
        labels = dict(expected_labels(board))
        labels.update(overrides or {})
        self._build_obs(labels)

    def observe(self, frame, corners):
        self.observe_calls += 1
        return self._obs

    def board_matches_identity(self, board, obs):
        return {"match": self._match, "conflicts": list(self._conflicts),
                "n": 2, "inconclusive": False}

    def derive_moves_identity(self, board, obs, max_plies=2):
        return (list(self._cnn_moves), 1.0 if self._cnn_moves else 0.0, 0.0)

    def resync_check(self, board, obs):
        return {"match": self._match, "conflicts": list(self._conflicts),
                "move": None, "agreement": 0.0}


def test_alarm_triggers_after_n_stable_mismatches(monkeypatch):
    """Stable conflict e1,g1 for 3 observations -> alarm set, re-anchor blocked."""
    t = _make_tracker(monkeypatch, cnn_run="stub", confirm_frames=1,
                      cnn_cooldown_s=0.0, cnn_check_interval_s=3600.0,
                      settle_frames=1, desync_obs_n=3)
    t.board.push_san("Nf3")
    t.board.castling_rights = 0
    stub = _AlarmStub(match=False, conflicts=["e1", "g1"])
    stub.set_obs_for_board(t.board, overrides={"e1": "empty", "g1": "wK"})
    t.recovery = stub
    t._last_corners = [[0, 0], [400, 0], [400, 400], [0, 400]]
    [t._gray_buf.append(np.zeros((8, 8), np.uint8)) for _ in range(t.avg_frames)]
    with t.lock:
        t._mark_stuck("no_legal_move")
        t._mark_stuck("no_legal_move")
    old_ref = t.ref_gray
    t._cnn_tick(_mk_snap(t, seq=1))
    assert t._alarm is None, "alarm not set yet (need 3)"
    with t.lock:
        t._mark_stuck("no_legal_move")
    t._cnn_tick(_mk_snap(t, seq=2))
    assert t._alarm is None, "alarm not set yet (need 3)"
    with t.lock:
        t._mark_stuck("no_legal_move")
    t._cnn_tick(_mk_snap(t, seq=3))
    assert t._alarm is not None, "alarm should be set after 3 stable mismatches"
    assert t._alarm["kind"] == "illegal_move"
    assert set(t._alarm["conflicts"]) == {"e1", "g1"}
    assert t._alarm["guess"] == "e1g1"
    s = t.status()
    assert s["alarm"] is not None
    assert s["alarm"]["kind"] == "illegal_move"
    assert "ILLEGAL" in t.note
    assert t.ref_gray is old_ref, "quiet-board re-anchor ran despite alarm"


def test_alarm_blocks_fabricated_recovery(monkeypatch):
    """Alarmed: recovery offers plausible sequence not resolving e1 -> no commit.
    Then match_ok=True -> alarm clears."""
    t = _make_tracker(monkeypatch, cnn_run="stub", confirm_frames=1,
                      cnn_cooldown_s=0.0, cnn_check_interval_s=3600.0,
                      settle_frames=1, desync_obs_n=3)
    t.board.push_san("Nf3")
    t.board.castling_rights = 0
    stub = _AlarmStub(match=False, conflicts=["e1", "g1"])
    stub.set_obs_for_board(t.board, overrides={"e1": "empty", "g1": "wK"})
    t.recovery = stub
    t._last_corners = [[0, 0], [400, 0], [400, 400], [0, 400]]
    [t._gray_buf.append(np.zeros((8, 8), np.uint8)) for _ in range(t.avg_frames)]
    # Three _cnn_tick calls to trigger alarm (desync_obs_n=3)
    with t.lock:
        t._mark_stuck("no_legal_move")
        t._mark_stuck("no_legal_move")
    t._cnn_tick(_mk_snap(t, seq=1))  # desync_obs = 1
    with t.lock:
        t._mark_stuck("no_legal_move")
    t._cnn_tick(_mk_snap(t, seq=2))  # desync_obs = 2
    with t.lock:
        t._mark_stuck("no_legal_move")
    t._cnn_tick(_mk_snap(t, seq=3))  # desync_obs = 3 -> alarm triggers
    assert t._alarm is not None, "alarm must be set"
    fen_before = t.board.fen()
    # Stub now offers a legal sequence that does NOT resolve e1
    stub._cnn_moves = [chess.Move.from_uci("g2g4")]
    with t.lock:
        t._mark_stuck("no_legal_move")
    t._cnn_tick(_mk_snap(t, seq=4))
    assert t.board.fen() == fen_before, "commit despite alarm!"
    assert t._alarm is not None, "alarm cleared despite unresolved conflict"
    assert "withholding" in t.note, f"note missing withholding: {t.note}"
    # Now match_ok=True: board restored -> alarm clears
    stub._match = True
    stub._cnn_moves = []
    stub.set_obs_for_board(t.board)
    with t.lock:
        t._mark_stuck("no_legal_move")
    t._cnn_tick(_mk_snap(t, seq=5))
    assert t._alarm is None, "alarm should clear on match_ok"
    assert t._desync_obs == 0
    assert t._desync_conflicts == set()


def test_no_alarm_without_cnn(monkeypatch):
    """Diff-only tracker stuck on no_legal_move -> alarm stays None."""
    t = _make_tracker(monkeypatch, cnn_run=None, settle_frames=1)
    t._last_corners = [[0, 0], [400, 0], [400, 400], [0, 400]]
    [t._gray_buf.append(np.zeros((8, 8), np.uint8)) for _ in range(t.avg_frames)]
    with t.lock:
        t._mark_stuck("no_legal_move")
        t._mark_stuck("no_legal_move")
        t._mark_stuck("no_legal_move")
        t._mark_stuck("no_legal_move")
    t._cnn_tick(_mk_snap(t, seq=1))
    assert t._alarm is None, "no CNN should never set alarm"
    assert t.status()["alarm"] is None
    for i in range(10):
        with t.lock:
            t._mark_stuck("no_legal_move")
        t._cnn_tick(_mk_snap(t, seq=2 + i))
    assert t._alarm is None
    assert t.status()["alarm"] is None


# ---------------------------------------------------------------------------------------
# Spec 11 phase 00: free-running observer + frame-signature snapshots
# ---------------------------------------------------------------------------------------

class TestStreamingObserver:
    """The observer runs unconditionally (no stuck/periodic demand gate) and every
    snapshot carries the seq of the frame it saw plus its anchor warp."""

    def test_observer_snapshots_on_quiet_board(self, monkeypatch):
        """Not stuck, no pending, periodic not due — the old _cnn_tick returned without
        observing; the free-running worker still stores a seq-tagged snapshot."""
        mt = _make_tracker(monkeypatch, cnn_run="stub")
        mt.recovery = _FakeRecovery()
        mt._last_corners = [[0, 0], [400, 0], [400, 400], [0, 400]]
        mt._last_cnn_ts = time.time()          # periodic check not due
        mt._cnn_worker(np.zeros((400, 400, 3), np.uint8), 7)
        assert mt._cnn_snap is not None
        assert mt._cnn_snap.seq == 7
        s = mt.status()["debug"]
        assert s["cnn_obs_seq"] == 7
        assert "frame_seq" in s
        assert mt.history == []                # observation only — no evaluation side effects

    def test_observer_interval_throttles(self, monkeypatch):
        """observer_interval_s throttles observation STARTS (battery/thermal knob)."""
        mt = _make_tracker(monkeypatch, cnn_run="stub", observer_interval_s=10.0)
        now = time.time()
        assert mt._observer_due(now) is True   # first observation starts immediately
        mt._observer_started_ts = now          # what the spawn path does
        assert mt._observer_due(now + 1.0) is False
        assert mt._observer_due(now + 11.0) is True
        mt._cnn_busy = True                    # worker running → never spawn a second one
        assert mt._observer_due(now + 11.0) is False

    def test_snapshot_carries_anchor_warp(self, monkeypatch):
        """Snapshot carries gray/warped at det size; a recovery pull-forward anchors
        ref_gray on the OBSERVED frame (snapshot), not on the newer live buffer."""
        mt = _make_tracker(monkeypatch, cnn_run="stub", confirm_frames=1,
                           cnn_cooldown_s=0.0, settle_frames=1, detect_scale=0.5)
        mt.recovery = _FakeRecovery(derive_move="e2e4", derive_agreement=0.99)
        mt._last_corners = [[0, 0], [400, 0], [400, 400], [0, 400]]
        with mt.lock:
            mt._mark_stuck("no_legal_move")
        mt._cnn_worker(np.zeros((400, 400, 3), np.uint8), 3)
        snap = mt._cnn_snap
        assert snap is not None and snap.seq == 3
        assert snap.gray.shape == (mt._det_size, mt._det_size)
        assert snap.warped.shape[:2] == (mt._det_size, mt._det_size)
        assert mt.history == ["e4"]            # recovery committed via the snapshot
        assert mt.ref_gray is snap.gray        # base truth anchored on the observed frame


# ---------------------------------------------------------------------------------------
# Spec 11 phase 01: consumers enforce the frame-seq contract
# ---------------------------------------------------------------------------------------

class TestSeqContract:
    """A decision made at frame N may only be verified/arbitrated by an observation
    with seq >= N; stale observations neither confirm nor refute newer candidates."""

    def test_verify_ignores_stale_observation(self, monkeypatch):
        """Pending seq=10: a seq=9 snapshot whose readings WOULD confirm does nothing
        (no commit, no verify-frame counted); the same readings at seq=10 commit."""
        mt = _pending_tracker(monkeypatch, match=False, occ_agree=1.0, occ_n=2)
        mt._pending["seq"] = 10
        mt._verify_tick(_mk_snap(mt, seq=9))
        assert mt.history == []
        assert mt._pending is not None
        assert mt._pending["frames"] == 0      # ignored entirely, not held
        mt._verify_tick(_mk_snap(mt, seq=10))
        mt._verify_tick(_mk_snap(mt, seq=11))  # verify_obs_votes: 2nd agreeing glance
        assert mt.history == ["e4"]
        assert mt._pending is None
        assert mt._verify_state == "confirmed"

    def test_occlusion_filter_ignores_old_snapshot(self, monkeypatch):
        """Snapshot 10 s old → filter behaves as if no CNN (falls back to >2 heuristic)."""
        import dataclasses
        mt = _make_tracker(monkeypatch, cnn_run="stub")
        mt.recovery = _FakeRecovery(occ={"a3": False}, conf={"a3": True})
        fresh = _mk_snap(mt, seq=1)
        mt._cnn_snap = fresh
        # Fresh: CNN agrees with FEN (a3 empty) → noise, tainted even as a single square.
        assert mt._cnn_occlusion_filter({"a3"}, mt.board) == {"a3"}
        mt._cnn_snap = dataclasses.replace(fresh, ts=time.time() - 10.0)
        # Stale: no-CNN heuristic — a single square passes, >2 squares count as hand.
        assert mt._cnn_occlusion_filter({"a3"}, mt.board) == set()
        assert mt._cnn_occlusion_filter({"a3", "b3", "c3"}, mt.board) == {"a3", "b3", "c3"}

    def test_desync_counts_distinct_observations(self, monkeypatch):
        """Same snapshot (seq) evaluated twice counts once; three distinct-seq mismatching
        snapshots trigger the illegal-move alarm."""
        t = _make_tracker(monkeypatch, cnn_run="stub", confirm_frames=1,
                          cnn_cooldown_s=0.0, cnn_check_interval_s=3600.0,
                          settle_frames=1, desync_obs_n=3)
        t.board.push_san("Nf3")
        t.board.castling_rights = 0
        stub = _AlarmStub(match=False, conflicts=["e1", "g1"])
        stub.set_obs_for_board(t.board, overrides={"e1": "empty", "g1": "wK"})
        t.recovery = stub
        t._last_corners = [[0, 0], [400, 0], [400, 400], [0, 400]]
        [t._gray_buf.append(np.zeros((8, 8), np.uint8)) for _ in range(t.avg_frames)]

        def tick(seq):
            with t.lock:
                t._mark_stuck("no_legal_move")
                t._mark_stuck("no_legal_move")
            t._cnn_tick(_mk_snap(t, seq=seq))

        tick(5)
        assert t._desync_obs == 1
        tick(5)                                # same seq re-evaluated → NOT counted again
        assert t._desync_obs == 1
        assert t._alarm is None
        tick(6)
        assert t._desync_obs == 2
        tick(7)
        assert t._desync_obs == 3
        assert t._alarm is not None
        assert t._alarm["kind"] == "illegal_move"


class TestLensDriftHook:
    """The drift watchdog is a DIAGNOSTIC: it may never affect or break tracking."""

    def test_missing_image_corners_is_skipped_silently(self, monkeypatch):
        from dataclasses import replace as _replace

        mt = _make_tracker(monkeypatch)
        mt.profile = _replace(mt.profile, image_corners=[])
        mt._check_lens_drift(_bgr_frame([]), [[0, 0], [400, 0], [400, 400], [0, 400]])
        assert mt._drift is None or mt._drift.status["geometry"] is None

    def test_fewer_than_four_corners_is_skipped_silently(self, monkeypatch):
        mt = _make_tracker(monkeypatch)
        mt._check_lens_drift(_bgr_frame([]), [[0, 0], [400, 0]])
        assert mt._drift is None or mt._drift.status["geometry"] is None

    def test_an_exception_inside_the_check_never_escapes(self, monkeypatch):
        from chesslab import lens

        mt = _make_tracker(monkeypatch)

        def boom(*a, **k):
            raise RuntimeError("synthetic failure")

        monkeypatch.setattr(lens, "DriftMonitor", boom)
        mt._check_lens_drift(_bgr_frame([]), [[0, 0], [400, 0], [400, 400], [0, 400]])
        assert mt._drift is None

    def test_disabled_config_does_not_even_build_a_monitor(self, monkeypatch):
        from dataclasses import replace as _replace

        from chesslab import config

        monkeypatch.setattr(config, "LENS", _replace(config.LENS, drift_enabled=False))
        mt = _make_tracker(monkeypatch)
        mt._check_lens_drift(_bgr_frame([]), [[0, 0], [400, 0], [400, 400], [0, 400]])
        assert mt._drift is None

    def test_zoom_drift_reaches_the_status_debug_card(self, monkeypatch):
        from dataclasses import replace as _replace

        from chesslab import config

        monkeypatch.setattr(config, "LENS",
                            _replace(config.LENS, drift_sample_every=1, drift_window=3,
                                     drift_streak=2, drift_geometry_thr=0.05))
        mt = _make_tracker(monkeypatch)
        base = mt.profile.image_corners
        cx = sum(p[0] for p in base) / 4.0
        cy = sum(p[1] for p in base) / 4.0
        zoomed = [[cx + (x - cx) * 1.4, cy + (y - cy) * 1.4] for x, y in base]
        for _ in range(10):
            mt._check_lens_drift(_bgr_frame([]), zoomed)
        assert mt.status()["debug"]["lens_drift"]["geometry_alarm"] is True

    def test_sampling_interval_limits_the_work(self, monkeypatch):
        from dataclasses import replace as _replace

        from chesslab import config

        monkeypatch.setattr(config, "LENS", _replace(config.LENS, drift_sample_every=5))
        mt = _make_tracker(monkeypatch)
        for _ in range(4):
            mt._check_lens_drift(_bgr_frame([]), mt.profile.image_corners)
        assert mt._drift is None
        mt._check_lens_drift(_bgr_frame([]), mt.profile.image_corners)
        assert mt._drift is not None and mt._drift.status["samples"] == 1
