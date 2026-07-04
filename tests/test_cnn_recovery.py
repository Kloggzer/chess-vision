"""Tests for CNN occupancy recovery of the Move-Tracker (specs/rework/09-cnn-recovery.md).

Core torch-free: observations are built by hand. Integration via a Stub-CnnRecovery
in the headless MoveTracker (FakeCapture pattern from test_move_tracker.py).
"""

from __future__ import annotations

import chess
import pytest

from chesslab.move_tracker.cnn_recovery import (
    CnnRecovery,
    OccupancyObservation,
    expected_occupancy,
    observation_from_probs,
)

_ALL = [f"{f}{r}" for r in range(1, 9) for f in "abcdefgh"]


def _obs_for_board(board: chess.Board, conf: float = 0.99,
                   occluded: set[str] | None = None,
                   flip: set[str] | None = None) -> OccupancyObservation:
    """Observation that exactly matches the position; `flip` inverts squares,
    `occluded` makes squares occluded-dominant (never confident)."""
    occluded = occluded or set()
    flip = flip or set()
    p_occ, p_empty, p_occl = {}, {}, {}
    truth = expected_occupancy(board)
    for sq in _ALL:
        if sq in occluded:
            p_occ[sq], p_empty[sq], p_occl[sq] = 0.05, 0.05, 0.90
            continue
        occupied = truth[sq] != (sq in flip)
        p_occ[sq] = conf if occupied else 1.0 - conf
        p_empty[sq] = 1.0 - conf if occupied else conf
        p_occl[sq] = 0.0
    return OccupancyObservation(p_occ=p_occ, p_empty=p_empty, p_occluded=p_occl)


def _recovery(tmp_path, **kw) -> CnnRecovery:
    """CnnRecovery without a model on disk — only the pure evaluation is tested."""
    run = tmp_path / "run"
    run.mkdir(exist_ok=True)
    (run / "config.json").write_text("{}", encoding="utf-8")
    return CnnRecovery(run, profile=None, **kw)


# ---------------------------------------------------------------------------
# verify_move — pre-commit check of a concrete candidate move
# ---------------------------------------------------------------------------

def test_verify_move_agrees_for_real_move(tmp_path):
    """Observation matches position AFTER e2e4 → high agreement for e2e4."""
    board = chess.Board()
    after = chess.Board(); after.push_san("e4")
    obs = _obs_for_board(after)
    agree, n = _recovery(tmp_path).verify_move(board, chess.Move.from_uci("e2e4"), obs)
    assert agree == pytest.approx(1.0)
    assert n == 2                     # only the touched squares (e2, e4)


def test_verify_move_low_for_wrong_move(tmp_path):
    """Observation matches e2e4, but d2d4 is checked → agreement < 1 (2 squares wrong)."""
    board = chess.Board()
    after = chess.Board(); after.push_san("e4")
    obs = _obs_for_board(after)
    agree, _ = _recovery(tmp_path).verify_move(board, chess.Move.from_uci("d2d4"), obs)
    assert agree < 1.0


def test_verify_move_too_few_confident_returns_zero(tmp_path):
    """Almost everything occluded (< min_confident confident squares) → 0.0."""
    board = chess.Board()
    after = chess.Board(); after.push_san("e4")
    occluded = set(_ALL[:60])                        # only 4 confident squares
    obs = _obs_for_board(after, occluded=occluded)
    agree, n = _recovery(tmp_path, min_confident_recovery=8).verify_move(
        board, chess.Move.from_uci("e2e4"), obs)
    assert agree == 0.0
    assert n < 8


# ---------------------------------------------------------------------------
# Identity path: pred_label per square instead of just occupied/empty
# ---------------------------------------------------------------------------

def _ident_obs(board: chess.Board, conf: float = 0.99,
               occluded: set[str] | None = None,
               overrides: dict[str, str] | None = None) -> OccupancyObservation:
    """Identity observation that exactly matches the position; `overrides` sets individual
    squares to a different label; `occluded` makes squares occluded (not confident)."""
    from chesslab.move_tracker.cnn_recovery import expected_labels
    occluded = occluded or set()
    labels = dict(expected_labels(board))
    labels.update(overrides or {})
    p_occ, p_empty, p_occl, conf_d, label = {}, {}, {}, {}, {}
    for sq in _ALL:
        if sq in occluded:
            label[sq], conf_d[sq] = "occluded", conf
            p_occ[sq], p_empty[sq], p_occl[sq] = 0.05, 0.05, 0.90
            continue
        lab = labels[sq]
        label[sq], conf_d[sq] = lab, conf
        if lab == "empty":
            p_empty[sq], p_occ[sq], p_occl[sq] = conf, 1.0 - conf, 0.0
        else:
            p_occ[sq], p_empty[sq], p_occl[sq] = conf, 1.0 - conf, 0.0
    return OccupancyObservation(p_occ=p_occ, p_empty=p_empty, p_occluded=p_occl,
                                label=label, conf=conf_d)


def test_board_matches_identity_true_when_unchanged(tmp_path):
    board = chess.Board()
    res = _recovery(tmp_path).board_matches_identity(board, _ident_obs(board))
    assert res["match"] is True and res["conflicts"] == []


def test_board_matches_identity_false_on_conflict(tmp_path):
    board = chess.Board()
    obs = _ident_obs(board, overrides={"e2": "empty"})     # one square deviates
    res = _recovery(tmp_path).board_matches_identity(board, obs)
    assert res["match"] is False and "e2" in res["conflicts"]


def test_derive_move_identity_simple(tmp_path):
    board = chess.Board()
    after = chess.Board(); after.push_san("e4")
    mv, best, second = _recovery(tmp_path).derive_move_identity(board, _ident_obs(after))
    assert mv is not None and mv.uci() == "e2e4" and best > second


def test_derive_move_identity_capture(tmp_path):
    board = chess.Board()
    for san in ("e4", "d5"):
        board.push_san(san)
    after = board.copy(); after.push_san("exd5")
    mv, _b, _s = _recovery(tmp_path).derive_move_identity(board, _ident_obs(after))
    assert mv is not None and mv.uci() == "e4d5"           # target square identity = white pawn


def test_derive_move_identity_promotion(tmp_path):
    board = chess.Board("8/P6k/8/8/8/8/7K/8 w - - 0 1")    # white pawn a7, can promote
    after = board.copy(); after.push_san("a8=Q")
    mv, _b, _s = _recovery(tmp_path).derive_move_identity(board, _ident_obs(after))
    assert mv is not None and mv.uci() == "a7a8q"          # queen, not rook/bishop/knight


def test_verify_move_identity_agrees(tmp_path):
    board = chess.Board()
    after = chess.Board(); after.push_san("e4")
    agree, n = _recovery(tmp_path).verify_move_identity(
        board, chess.Move.from_uci("e2e4"), _ident_obs(after))
    assert agree == pytest.approx(1.0) and n == 2


def test_verify_move_identity_low_for_wrong(tmp_path):
    board = chess.Board()
    after = chess.Board(); after.push_san("e4")
    agree, _n = _recovery(tmp_path).verify_move_identity(
        board, chess.Move.from_uci("d2d4"), _ident_obs(after))
    assert agree < 1.0


# ---------------------------------------------------------------------------
# score_moves — the core: which legal move explains the observation?
# ---------------------------------------------------------------------------

def test_score_moves_simple_move(tmp_path):
    board = chess.Board()
    after = chess.Board(); after.push_san("e4")
    obs = _obs_for_board(after)
    mv, best, second = _recovery(tmp_path).score_moves(board, obs)
    assert mv is not None and mv.uci() == "e2e4"
    assert best == pytest.approx(1.0)
    assert best > second


def test_score_moves_capture(tmp_path):
    board = chess.Board()
    for san in ("e4", "d5"):
        board.push_san(san)
    after = board.copy(); after.push_san("exd5")
    obs = _obs_for_board(after)
    mv, best, _ = _recovery(tmp_path).score_moves(board, obs)
    assert mv is not None and mv.uci() == "e4d5"
    assert best == pytest.approx(1.0)


def test_score_moves_castling_signature(tmp_path):
    board = chess.Board("r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4")
    after = board.copy(); after.push_san("O-O")
    obs = _obs_for_board(after)
    mv, best, _ = _recovery(tmp_path).score_moves(board, obs)
    assert mv is not None and mv.uci() == "e1g1"
    assert best == pytest.approx(1.0)


def test_score_moves_en_passant(tmp_path):
    board = chess.Board()
    for san in ("e4", "a6", "e5", "d5"):
        board.push_san(san)
    after = board.copy(); after.push_san("exd6")
    obs = _obs_for_board(after)
    mv, best, _ = _recovery(tmp_path).score_moves(board, obs)
    assert mv is not None and mv.uci() == "e5d6"
    assert best == pytest.approx(1.0)


def test_score_moves_ambiguous_promotion_returns_none(tmp_path):
    """Promotion variants (e8q vs. e8r …) are occupancy-identical → margin rule yields None."""
    board = chess.Board("4k3/P7/8/8/8/8/8/4K3 w - - 0 1")
    after = board.copy(); after.push_san("a8=Q")
    obs = _obs_for_board(after)
    mv, best, second = _recovery(tmp_path).score_moves(board, obs)
    assert mv is None                      # a8=Q/R/B/N erklären die Beobachtung gleich gut
    assert best == pytest.approx(second)   # … exakt gleich gut


def test_score_moves_low_confidence_returns_none(tmp_path):
    board = chess.Board()
    after = chess.Board(); after.push_san("e4")
    obs = _obs_for_board(after, conf=0.6)  # unter conf_thr → kein Feld confident
    mv, best, second = _recovery(tmp_path).score_moves(board, obs)
    assert mv is None and best == 0.0 and second == 0.0


def test_score_moves_all_occluded_returns_none(tmp_path):
    """Hand over the board: everything occluded → no confident squares → no statement."""
    board = chess.Board()
    obs = _obs_for_board(board, occluded=set(_ALL))
    mv, best, second = _recovery(tmp_path).score_moves(board, obs)
    assert mv is None


def test_score_moves_below_min_agreement_returns_none(tmp_path):
    """Beobachtung passt zu KEINEM legalen Zug gut genug (zwei zusätzliche Felder falsch)."""
    board = chess.Board()
    after = chess.Board(); after.push_san("e4")
    obs = _obs_for_board(after, flip={"a5", "h5"})   # e2e4 does not explain a5/h5
    mv, best, _ = _recovery(tmp_path).score_moves(board, obs)
    assert mv is None
    assert best < 0.97


# ---------------------------------------------------------------------------
# Softmax collapse + confident()
# ---------------------------------------------------------------------------

def test_observation_from_probs_collapse():
    classes = ["empty", "wP", "wN", "wB", "wR", "wQ", "wK",
               "bP", "bN", "bB", "bR", "bQ", "bK", "occluded"]
    probs = {sq: [0.0] * 14 for sq in _ALL}
    probs["e2"][1] = 0.9; probs["e2"][0] = 0.05; probs["e2"][13] = 0.05   # klar wP
    probs["e4"][0] = 0.95; probs["e4"][13] = 0.03                         # klar leer
    probs["d4"][13] = 0.9; probs["d4"][0] = 0.05                          # verdeckt-dominant
    for sq in _ALL:
        if sq not in ("e2", "e4", "d4"):
            probs[sq][0] = 1.0
    obs = observation_from_probs(probs, classes)
    assert obs.occupied("e2") and obs.p_occ["e2"] == pytest.approx(0.9)
    assert not obs.occupied("e4")
    conf = obs.confident(0.85)
    assert conf["e2"] and conf["e4"]
    assert not conf["d4"]                 # occluded-dominant is NEVER confident


def test_observation_from_probs_13_classes_without_occluded():
    classes = ["empty", "wP", "wN", "wB", "wR", "wQ", "wK",
               "bP", "bN", "bB", "bR", "bQ", "bK"]
    probs = {sq: [1.0] + [0.0] * 12 for sq in _ALL}
    probs["e2"] = [0.1, 0.9] + [0.0] * 11
    obs = observation_from_probs(probs, classes)
    assert obs.occupied("e2")
    assert obs.p_occluded["e2"] == 0.0    # 13-class run: no occluded, index not guessed


# ---------------------------------------------------------------------------
# resync_check — the button/the control
# ---------------------------------------------------------------------------

def test_resync_check_match(tmp_path):
    board = chess.Board()
    res = _recovery(tmp_path).resync_check(board, _obs_for_board(board))
    assert res["match"] is True and res["conflicts"] == [] and res["move"] is None


def test_resync_check_unique_move(tmp_path):
    board = chess.Board()
    after = chess.Board(); after.push_san("Nf3")
    res = _recovery(tmp_path).resync_check(board, _obs_for_board(after))
    assert res["match"] is False
    assert set(res["conflicts"]) == {"g1", "f3"}
    assert res["move"] == "g1f3"


def test_resync_check_conflicts_without_move(tmp_path):
    """Displaced piece (no legal move explains it) → report conflicts, don’t guess."""
    board = chess.Board()
    obs = _obs_for_board(board, flip={"a3", "h6", "d5"})   # random pattern
    res = _recovery(tmp_path).resync_check(board, obs)
    assert res["match"] is False
    assert set(res["conflicts"]) == {"a3", "h6", "d5"}
    assert res["move"] is None


# ---------------------------------------------------------------------------
# Tracker-Integration (Stub-Recovery, FakeCapture — kein torch)
# ---------------------------------------------------------------------------

class _StubRecovery:
    """Returns a fixed resync_check response; counts observe calls."""

    def __init__(self, result: dict):
        self.result = result
        self.observe_calls = 0

    def observe(self, frame, corners):
        self.observe_calls += 1
        return "obs"

    def resync_check(self, board, obs):
        return dict(self.result)


def _identity_profile(board_size: int = 400):
    """Identity profile (pattern from test_move_tracker.py)."""
    from chesslab.calibration import CalibrationProfile, CropParams, compute_homography

    corners = [[0, 0], [board_size, 0], [board_size, board_size], [0, board_size]]
    return CalibrationProfile(
        profile="test-identity", camera_index=0, frame_size=(board_size, board_size),
        board_size=board_size, image_corners=corners,
        homography=compute_homography(corners, board_size),
        white_pov=True, crop=CropParams.default(board_size))


def _headless_tracker(monkeypatch, **kw):
    """MoveTracker without camera/real profile (pattern from test_move_tracker.py part 2)."""
    import numpy as np

    from chesslab.move_tracker import tracker as trk

    class FakeCapture:
        def read(self):
            return True, np.zeros((400, 400, 3), dtype=np.uint8)

        def release(self):
            pass

    prof = _identity_profile()
    monkeypatch.setattr(trk, "ensure_profile", lambda *a, **k: prof)
    monkeypatch.setattr(trk, "open_source", lambda src: FakeCapture())
    return trk.MoveTracker(profile="t", source="0", live_align=False, **kw)


def test_tracker_cnn_recovery_commits_via_voting(monkeypatch):
    """Diff path stuck → Stub-Recovery proposes move → Commit only after confirm_frames votes."""
    t = _headless_tracker(monkeypatch, cnn_run="stub-run", confirm_frames=2,
                          cnn_cooldown_s=0.0, settle_frames=1)
    stub = _StubRecovery({"match": False, "conflicts": ["e2", "e4"],
                          "move": "e2e4", "agreement": 1.0})
    t.recovery = stub                       # lazy _ensure_cnn is never needed
    t._last_corners = [[0, 0], [820, 0], [820, 820], [0, 820]]
    t._gray_buf.extend([None] * t.avg_frames)   # „stabil genug" fürs Gate
    t.state = "waiting"
    # stuck markieren wie der Diff-Pfad es täte
    with t.lock:
        t._mark_stuck("no_legal_move")
        t._mark_stuck("no_legal_move")

    import numpy as np
    frame = np.zeros((820, 820, 3), dtype=np.uint8)
    t._cnn_tick(frame)                      # Vote 1 → noch kein Commit
    assert t.history == []
    assert "CNN-Recovery prüft" in t.note
    with t.lock:
        t._mark_stuck("no_legal_move")      # weiterhin stuck
    t._cnn_tick(frame)                      # Vote 2 → Commit
    assert t.history == ["e4"]
    assert t.recovered_last is True
    assert t.status()["cnn_active"] is True
    assert stub.observe_calls == 2


def test_tracker_cnn_tick_respects_cooldown(monkeypatch):
    t = _headless_tracker(monkeypatch, cnn_run="stub-run", confirm_frames=1,
                          cnn_cooldown_s=3600.0, settle_frames=1)
    stub = _StubRecovery({"match": False, "conflicts": ["e2", "e4"],
                          "move": "e2e4", "agreement": 1.0})
    t.recovery = stub
    t._last_corners = [[0, 0], [820, 0], [820, 820], [0, 820]]
    t._gray_buf.extend([None] * t.avg_frames)
    import time as _time
    t._last_cnn_ts = _time.time()           # gerade erst beobachtet
    with t.lock:
        t._mark_stuck("no_legal_move")
        t._mark_stuck("no_legal_move")
    import numpy as np
    t._cnn_tick(np.zeros((820, 820, 3), dtype=np.uint8))
    assert stub.observe_calls == 0          # Cooldown greift


def test_tracker_cnn_tick_discards_on_board_change(monkeypatch):
    """FEN changes during observation → discard result."""
    t = _headless_tracker(monkeypatch, cnn_run="stub-run", confirm_frames=1,
                          cnn_cooldown_s=0.0, settle_frames=1)

    class MutatingStub(_StubRecovery):
        def __init__(self, tracker, result):
            super().__init__(result)
            self._t = tracker

        def observe(self, frame, corners):
            self._t.board.push_san("a3")     # Board mutiert „während" der Inference
            return super().observe(frame, corners)

    stub = MutatingStub(t, {"match": False, "conflicts": ["e2", "e4"],
                            "move": "e2e4", "agreement": 1.0})
    t.recovery = stub
    t._last_corners = [[0, 0], [820, 0], [820, 820], [0, 820]]
    t._gray_buf.extend([None] * t.avg_frames)
    with t.lock:
        t._mark_stuck("no_legal_move")
        t._mark_stuck("no_legal_move")
    import numpy as np
    t._cnn_tick(np.zeros((820, 820, 3), dtype=np.uint8))
    assert t.history == []                  # verworfen, nichts committet


def test_tracker_periodic_control_warns_without_guessing(monkeypatch):
    """Periodic check: deviation without clear move → warning, no commit."""
    t = _headless_tracker(monkeypatch, cnn_run="stub-run", confirm_frames=1,
                          cnn_cooldown_s=0.0, cnn_check_interval_s=0.0, settle_frames=1)
    stub = _StubRecovery({"match": False, "conflicts": ["a3", "h6", "d5"],
                          "move": None, "agreement": 0.4})
    t.recovery = stub
    t._last_corners = [[0, 0], [820, 0], [820, 820], [0, 820]]
    t._gray_buf.extend([None] * t.avg_frames)
    t.state = "waiting"                     # quiet, NOT stuck → periodic trigger
    import numpy as np
    t._cnn_tick(np.zeros((820, 820, 3), dtype=np.uint8))
    assert t.history == []
    assert t.cnn_status == "mismatch"
    assert "weicht ab" in t.note
    assert t.status()["cnn_conflicts"] == ["a3", "h6", "d5"]


def test_resync_cnn_endpoint(monkeypatch):
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from chesslab.move_tracker.app import _STATE, create_app

    t_stub = _headless_tracker(monkeypatch, cnn_run="stub-run", confirm_frames=1)
    t_stub.recovery = _StubRecovery({"match": True, "conflicts": [], "move": None, "agreement": 1.0})
    import numpy as np
    t_stub._last_frame = np.zeros((820, 820, 3), dtype=np.uint8)
    t_stub._last_corners = [[0, 0], [820, 0], [820, 820], [0, 820]]

    client = TestClient(create_app())
    old = _STATE.get("tracker")
    try:
        _STATE.update(tracker=None)
        r = client.post("/api/resync_cnn").json()
        assert r["ok"] is False and "nicht gestartet" in r["error"]

        _STATE.update(tracker=t_stub)
        r = client.post("/api/resync_cnn").json()
        assert r["ok"] is True and r["match"] is True
    finally:
        _STATE.update(tracker=old)


def test_resync_cnn_without_model(monkeypatch):
    t = _headless_tracker(monkeypatch)      # cnn_run=None
    r = t.resync_cnn()
    assert r["ok"] is False and "nicht konfiguriert" in r["error"]

# ---------------------------------------------------------------------------
# derive_moves_identity — 2-Ply-Suche (Spec 10, Teil 3)
# ---------------------------------------------------------------------------

def test_derive_moves_identity_single_preferred(tmp_path):
    """One move explains the observation, no pair is returned (most parsimonious explanation)."""
    board = chess.Board()
    after = chess.Board(); after.push_san("e4")
    seq, best, _s = _recovery(tmp_path).derive_moves_identity(board, _ident_obs(after), max_plies=2)
    assert [m.uci() for m in seq] == ["e2e4"]


def test_derive_moves_identity_pair_for_two_moves(tmp_path):
    """Observation matches TWO half-moves (e4 + e5) -> move pair in correct order."""
    board = chess.Board()
    after = chess.Board()
    after.push_san("e4"); after.push_san("e5")
    seq, best, _s = _recovery(tmp_path).derive_moves_identity(board, _ident_obs(after), max_plies=2)
    assert [m.uci() for m in seq] == ["e2e4", "e7e5"]
    assert best == pytest.approx(1.0)


def test_derive_moves_identity_pair_disabled_with_one_ply(tmp_path):
    """max_plies=1: Two-move observation is not explainable -> empty sequence."""
    board = chess.Board()
    after = chess.Board()
    after.push_san("e4"); after.push_san("e5")
    seq, _b, _s = _recovery(tmp_path).derive_moves_identity(board, _ident_obs(after), max_plies=1)
    assert seq == []