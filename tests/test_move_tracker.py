"""Tests für chesslab.move_tracker.tracker — pure, headless, keine Kamera.

Seit Spec 10 (Move-Detection v2) läuft das Scoring probabilistisch: z-Scores gegen ein
per-Feld-Rauschmodell + Log-Likelihood je legalem Zug (statt harter change_thr-Gates).
"""

from __future__ import annotations

import chess
import cv2
import numpy as np
import pytest

from chesslab.move_tracker.tracker import (
    SquareNoise,
    loglik_scores,
    move_prior,
    move_touched_squares,
    normalize_diffs,
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

    # Median ~ 2.0 (62 Felder sind 2.0, 2 sind 40 → median = 2.0)
    assert result["e2"] == pytest.approx(38.0)
    assert result["e4"] == pytest.approx(38.0)
    for sq in _ALL:
        if sq not in ("e2", "e4"):
            assert result[sq] == pytest.approx(0.0)


# =======================================================================================
# SquareNoise + loglik_scores (Spec 10, Teil 1)
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
        """Neuer Ausschlag gegen gelerntes Ruhe-Rauschen → hoher z-Score."""
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
        """Weiß-auf-weiß: Zielfeld nur z=1.5 (unter z_thr!) — e2e4 gewinnt trotzdem,
        kein harter Cutoff mehr (das erste DoD-Kriterium der Spec)."""
        board = chess.Board()
        scored = loglik_scores(board, _z({"e2": 8.0, "e4": 1.5}))
        assert scored[0][0].uci() == "e2e4"
        assert scored[0][1] > 0                    # Evidenz spricht netto FÜR den Zug

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
        """Heißes unberührtes Feld drückt Züge, die es NICHT erklären, unter den Zug, der es deckt."""
        board = chess.Board()
        z = _z({"e2": 8.0, "e4": 8.0, "a3": 8.0})   # a3 heiß, aber nur a2a3/b1a3 decken es
        scored = {mv.uci(): s for mv, s in loglik_scores(board, z)}
        assert scored["e2e4"] > scored["d2d4"]      # d2d4 erklärt gar nichts Heißes
        # e2e4 lässt a3 unerklärt → sein Score ist niedriger als ohne das Störfeld
        clean = {mv.uci(): s for mv, s in loglik_scores(board, _z({"e2": 8.0, "e4": 8.0}))}
        assert scored["e2e4"] == pytest.approx(clean["e2e4"])   # relativ: Störfeld trifft alle gleich

    def test_quiet_board_all_negative(self):
        """Ruhiges Brett → alle Züge deutlich negativ (Re-Anchor-Floor greift)."""
        board = chess.Board()
        scored = loglik_scores(board, _z({}))
        assert scored[0][1] < -4.0

    def test_ambiguity_two_knights_small_margin(self):
        board = chess.Board("rnbqkb1r/ppp2ppp/4pn2/3p4/3P4/4PN2/PPP2PPP/RNBQKB1R w KQkq - 0 4")
        scored = loglik_scores(board, _z({"b1": 8.0, "f3": 7.0, "d2": 8.0}))
        assert scored[0][0].uci() == "b1d2"
        assert scored[0][1] - scored[1][1] < 2.0    # klein → Ambiguitäts-Gate/Prior


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
    assert y0 > bs * 0.75  # a1 → row=7 → im unteren Viertel

    x0, y0, x1, y1 = square_region("h8", bs, white_pov=True)
    assert y1 < bs * 0.25  # h8 → row=0 → im oberen Viertel


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

        mt = MoveTracker(profile="phone", source="0", live_align=False,
                         motion_thr=100, settle_frames=3, confirm_frames=3,
                         avg_frames=2, max_changed=6)
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

        mt = MoveTracker(profile="phone", source="0", live_align=False, settle_frames=10)
        mt.reset_to_start()
        mt.start()
        import time as _time
        _time.sleep(0.2)  # let loop run a few iterations
        mt.stop()
        assert mt._thread is not None
        assert not mt._thread.is_alive()


def _gray_frame(blob_squares, board_size=400, white_pov=True, base=128) -> np.ndarray:
    """2D-Graubild (uint8) mit hellen Blobs auf gegebenen Feldern — direkt für _try_detect."""
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
                    "max_changed": 6, "confirm_frames": 1, "avg_frames": 1}
    defaults.update(kwargs)
    return MoveTracker(**defaults)


class TestBaseTruthDetect:
    """Direkte _try_detect-Tests: Base-Truth = (Bild, FEN), normalisierte Gates."""

    def test_global_exposure_shift_not_stuck(self, monkeypatch):
        """Globaler Belichtungssprung (alle 64 Felder heller) → KEIN too_many_changed,
        Base-Truth wird per Drift-Refresh übernommen (Fix: Gates auf normalisierten Diffs)."""
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


class _FakeRecovery:
    """Stub für CnnRecovery (Identitätspfad): liefert vorgegebene Ergebnisse ohne torch."""

    def __init__(self, matches=False, verify_agree=0.0, verify_n=2, derive_move=None,
                 min_agreement=0.97):
        self.matches, self.verify_agree, self.verify_n = matches, verify_agree, verify_n
        self.derive_move, self.min_agreement = derive_move, min_agreement

    def observe(self, frame, corners):
        return "OBS"

    def board_matches_identity(self, board, obs):
        return {"match": self.matches, "conflicts": [], "n": 20, "inconclusive": False}

    def verify_move_identity(self, board, move, obs):
        return self.verify_agree, self.verify_n

    def derive_move_identity(self, board, obs):
        if self.derive_move is None:
            return None, 0.0, 0.0
        return chess.Move.from_uci(self.derive_move), 0.99, 0.3


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
    """Identitäts-Verify eines Diff-Kandidaten durchs (gestubbte) CNN."""

    def test_shadow_suppressed_no_commit(self, monkeypatch):
        """CNN sieht das Brett unverändert (Identität gleich) → kein Zug, Referenz nachgezogen."""
        mt = _pending_tracker(monkeypatch, matches=True)
        mt._verify_tick(np.zeros((4, 4, 3), np.uint8))
        assert mt.history == []
        assert mt._pending is None
        assert mt._verify_state == "shadow"
        assert mt.cnn_status == "shadow"

    def test_identity_confirms_commit(self, monkeypatch):
        """Identität bestätigt den Diff-Zug → Commit."""
        mt = _pending_tracker(monkeypatch, matches=False, verify_agree=1.0, verify_n=2)
        mt._verify_tick(np.zeros((4, 4, 3), np.uint8))
        assert mt.history == ["e4"]
        assert mt.last_move == "e2e4"
        assert mt._pending is None
        assert mt._verify_state == "confirmed"
        assert mt.recovered_last is False

    def test_diff_wins_with_warning_on_mismatch(self, monkeypatch):
        """Identität passt NICHT (Felder belastbar), CNN sieht anderen Zug → Diff gewinnt,
        CNN warnt nur (mismatch)."""
        mt = _pending_tracker(monkeypatch, matches=False, verify_agree=0.0, verify_n=2,
                              derive_move="d2d4")
        mt._verify_tick(np.zeros((4, 4, 3), np.uint8))
        assert mt.history == ["e4"]                        # Diff-Zug committet (nicht d4)
        assert mt.last_move == "e2e4"
        assert mt.cnn_status == "mismatch"
        assert mt._cnn_best_move == "d2d4"                 # Alternative sichtbar

    def test_occlusion_waits_then_commits_diff(self, monkeypatch):
        """Endpunkte verdeckt (verify_n<2) → nicht blockieren: nach verify_window Diff committen."""
        mt = _pending_tracker(monkeypatch, matches=False, verify_agree=0.0, verify_n=0,
                              verify_window=3)
        mt._verify_tick(np.zeros((4, 4, 3), np.uint8))
        assert mt.history == []                            # noch am Warten
        for _ in range(2):
            mt._verify_tick(np.zeros((4, 4, 3), np.uint8))
        assert mt.history == ["e4"]
        assert mt._pending is None

    def test_cnn_unavailable_commits_pending(self, monkeypatch):
        """_ensure_cnn liefert None (Modell weg) → Fallback: Pending direkt committen."""
        mt = _pending_tracker(monkeypatch, matches=False, verify_agree=1.0)
        monkeypatch.setattr(mt, "_ensure_cnn", lambda: None)
        mt._verify_tick(np.zeros((4, 4, 3), np.uint8))
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


class TestLatestFrame:
    """Grab-Latest-Wrapper: always returns the latest frame; clean release()."""

    def test_reads_newest_and_releases(self):
        from chesslab.web.camera import LatestFrame

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

    def test_reset_invalid_fen(self):
        from fastapi.testclient import TestClient

        from chesslab.move_tracker.app import create_app

        client = TestClient(create_app())
        r = client.post("/api/reset", json={"fen": "invalid-fen-string"})
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is False
        assert "error" in data
        assert "ungültige FEN" in data["error"]

# =======================================================================================
# Spec 10: Nudge-Patch, Promotion, CNN-Overrule, Prior-Sichtbarkeit
# =======================================================================================


class TestNudgePatch:
    """Nicht-CNN-Re-Anchor fuer erklaerbare Stoerungen (Spec 10, Teil 4)."""

    def test_nudge_patches_occupied_square(self, monkeypatch):
        """1 occupied square persistently unexplained -> after nudge_timeout_s the
        Referenz-Zelle gepatcht, Tracker laeuft weiter (kein stuck)."""
        mt = _make_tracker(monkeypatch, cnn_run=None, nudge_timeout_s=0.0)
        mt.ref_gray = _gray_frame([], base=128)
        mt.ref_fen = mt.board.fen()
        cur = _gray_frame(["e2"], base=128)      # e2 (belegt) sieht anders aus: Figur verrueckt
        mt._try_detect(cur)                       # 1. Sichtung: Timer startet, timeout 0 -> patchen
        mt._try_detect(cur)
        assert mt._stuck_reason is None
        assert mt.history == []
        # Reference cell adopted -> next frame is quiet
        mt._try_detect(cur)
        assert mt._changed == []

    def test_empty_square_not_patched_before_drift_window(self, monkeypatch):
        """Leeres Feld aendert sich -> NICHT sofort patchen (koennte stiller Fehlzug sein)."""
        mt = _make_tracker(monkeypatch, cnn_run=None, nudge_timeout_s=0.0, drift_window_s=9999.0)
        mt.ref_gray = _gray_frame([], base=128)
        mt.ref_fen = mt.board.fen()
        cur = _gray_frame(["e4"], base=128)      # e4 ist LEER laut Spielzustand
        mt._try_detect(cur)
        mt._try_detect(cur)
        assert mt._stuck_reason == "no_legal_move"   # bleibt stuck, kein Patch
        assert mt._changed == ["e4"]


class TestPromotionWithoutCnn:
    def test_promotion_waits_for_user_choice(self, monkeypatch):
        """Bauer erreicht die Grundreihe ohne CNN -> promotion_pending statt Dauer-Ambiguitaet;
        choose_promotion committet die gewaehlte Figur."""
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
        """CNN sieht eindeutig einen ANDEREN Zug und bestaetigt ihn belastbar ->
        der CNN-Kandidat wird committet, nicht der Diff-Kandidat (Spec 10, Teil 5)."""
        mt = _pending_tracker(monkeypatch, matches=False, verify_agree=0.0, verify_n=2,
                              derive_move="d2d4")
        # Alternative d2d4 wird vom Fake belastbar bestaetigt, e2e4 nicht:
        fake = mt.recovery
        fake.verify_move_identity = lambda board, move, obs: \
            (1.0, 2) if move.uci() == "d2d4" else (0.0, 2)
        mt._verify_tick(np.zeros((4, 4, 3), np.uint8))
        assert mt.last_move == "d2d4"
        assert mt._verify_state == "overruled"


class TestWeakEvidenceHold:
    def test_weak_candidate_does_not_reanchor(self, monkeypatch):
        """Schwache zugkonsistente Evidenz (weiss-auf-weiss): kein Feld ueber z_thr, aber
        best-LL ueber dem Floor -> Referenz wird GEHALTEN (nicht eingebacken)."""
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
        assert mt.ref_gray is ref                 # NICHT re-anchored
        assert mt._stuck_reason is None
        assert "schwache Zugevidenz" in mt.note

class TestPairScores:
    """Diff-side 2-half-move detection (fast play without CNN)."""

    def test_pair_explains_two_moves(self):
        from chesslab.move_tracker.tracker import loglik_pair_scores

        board = chess.Board()
        z = _z({"e2": 8.0, "e4": 8.0, "e7": 8.0, "e5": 8.0})
        pairs = loglik_pair_scores(board, z)
        assert pairs, "keine Paare gefunden"
        best_seq, best = pairs[0]
        assert [m.uci() for m in best_seq] == ["e2e4", "e7e5"]
        assert best > 0

    def test_pair_requires_endpoint_evidence(self):
        from chesslab.move_tracker.tracker import loglik_pair_scores

        board = chess.Board()
        z = _z({"e2": 8.0, "e4": 8.0})          # nur EIN Zug hat Evidenz
        pairs = loglik_pair_scores(board, z)
        # zulaessige Paare muessen alle 4 Endpunkte tragen -> hier keine
        assert pairs == []
