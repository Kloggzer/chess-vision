"""Core of the Move-Tracker: warp -> z-scores (noise model) -> LL-score per legal move -> game state.
Optional CNN-Verify/-Recovery (Spec 09) and probabilistic scoring v2 (Spec 10).

State machine per frame:
  - Motion gating: frame-to-frame difference high (board OR extended ROI around the board)
    -> "hand in image" (MOVING), do not detect.
  - When it becomes stable (STABLE): per-square diff vs. base truth -> median normalization -> z-scores
    against a running per-square noise model -> log-likelihood per legal move (relative to
    "no move"); ambiguity is resolved via heuristic prior or shown to the user.
  - CNN recovery (optional): when stuck or periodically the CNN (cnn_recovery.py) checks
    identity/occupancy, finds moves up to 2 half-moves deep and can overrule a diff candidate
    in pre-commit verify. Without CNN: nudge/drift cell-patch of the reference.
Full picture: docs/move-tracker-flow.md (Mermaid).

Reuse from chesslab: profile/geometry (load_profile, _square_to_col_row, board_corners_for_frame,
make_tracker, warp_from_corners) and camera (web.camera.open_source: int|URL incl. IP cam).
"""

from __future__ import annotations

import logging
import threading
import time
from collections import deque
from typing import NamedTuple

import chess
import cv2
import numpy as np

log = logging.getLogger("chesslab.move_tracker")

from ..calibration import (  # noqa: E402
    _square_to_col_row,
    board_corners_for_frame,
    draw_calibration_overlay,
    ensure_profile,
    make_tracker,
    warp_from_corners,
)
from ..web.camera import LatestFrame, open_source  # noqa: E402

_FILES = "abcdefgh"
_ALL = [f"{f}{r}" for r in range(1, 9) for f in _FILES]


def square_region(square: str, board_size: int, white_pov: bool, inset: float = 0.16,
                  extend_up: float = 0.0):
    """Pixel box (x0,y0,x1,y1) of the cell in the rectified board_size image, slightly inset
    (against grid-line/neighbor noise). `extend_up` (fraction of cell) extends the box toward
    the top of the image (back rank): 3D pieces protrude there with an angled camera (CLAUDE.md pitfall);
    extended cells may overlap — the soft LL-scoring tolerates that."""
    col, row = _square_to_col_row(square, white_pov)
    cell = board_size / 8.0
    m = cell * inset
    y0 = row * cell + m - extend_up * cell
    return (int(col * cell + m), max(0, int(y0)),
            int((col + 1) * cell - m), int((row + 1) * cell - m))


def square_center(square: str, board_size: int, white_pov: bool):
    col, row = _square_to_col_row(square, white_pov)
    cell = board_size / 8.0
    return int((col + 0.5) * cell), int((row + 0.5) * cell)


def per_square_diff(gray_a, gray_b, board_size: int, white_pov: bool,
                    extend_up: float = 0.0) -> dict[str, float]:
    """Mean absolute brightness difference per square between two rectified grayscale images."""
    d = cv2.absdiff(gray_a, gray_b)
    out: dict[str, float] = {}
    for sq in _ALL:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov, extend_up=extend_up)
        out[sq] = float(d[y0:y1, x0:x1].mean()) if (y1 > y0 and x1 > x0) else 0.0
    return out


# Popcount LUT for 8-bit census codes (Hamming distance per pixel).
_POPCOUNT8 = np.array([bin(i).count("1") for i in range(256)], dtype=np.uint8)


def census_transform(gray) -> np.ndarray:
    """3×3 census transform: each pixel gets an 8-bit code "center brighter than neighbor?".
    Invariant to MONOTONE brightness changes (shadows darken monotonically → code stays
    the same), but captures structure/edges (real piece → code changes)."""
    # Pad border with REPLICATE instead of np.roll: roll would compare border pixels against the
    # OPPOSITE side of the image (row 8 vs row 1) and distort the census scores of edge squares.
    g = cv2.copyMakeBorder(gray, 1, 1, 1, 1, cv2.BORDER_REPLICATE).astype(np.int16)
    center = g[1:-1, 1:-1]
    code = np.zeros(center.shape, dtype=np.uint8)
    bit = 0
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            nb = g[1 + dy:g.shape[0] - 1 + dy, 1 + dx:g.shape[1] - 1 + dx]
            code |= (center > nb).astype(np.uint8) << bit
            bit += 1
    return code


def per_square_census_change(ref_gray, cur_gray, board_size: int, white_pov: bool) -> dict[str, float]:
    """Structural change per square: mean Hamming distance of census codes (0..8),
    scaled to 0..255 (comparable to the gray diff/change_thr). Small for pure
    brightness/shadow changes, large for appearing/disappearing pieces."""
    ham = _POPCOUNT8[census_transform(ref_gray) ^ census_transform(cur_gray)]
    out: dict[str, float] = {}
    for sq in _ALL:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov)
        reg = ham[y0:y1, x0:x1]
        out[sq] = float(reg.mean()) * (255.0 / 8.0) if reg.size else 0.0
    return out


def hsv_shadow_squares(ref_bgr, cur_bgr, board_size: int, white_pov: bool, candidates,
                       v_lo: float = 0.45, v_hi: float = 0.95,
                       h_tol: float = 12.0, s_tol: float = 30.0, frac: float = 0.6) -> set[str]:
    """Cast shadow detection according to Cucchiara (HSV): a square is "shadow" if its pixels,
    compared to the reference, have the same hue (Hue ~equal), are not more saturated and are
    darker (V ratio in [v_lo, v_hi]). Only `candidates` (already marked as changed) are checked.
    A hand shadow satisfies this; a real piece does not (different color/structure)."""
    hr = cv2.cvtColor(ref_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    hc = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    out: set[str] = set()
    for sq in candidates:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov)
        R, C = hr[y0:y1, x0:x1], hc[y0:y1, x0:x1]
        if R.size == 0:
            continue
        Vr, Vc = R[..., 2], C[..., 2]
        ratio = Vc / (Vr + 1e-3)
        dh = np.abs(C[..., 0] - R[..., 0])
        dh = np.minimum(dh, 180.0 - dh)                  # Hue is circular (0..179)
        ds = C[..., 1] - R[..., 1]
        shadow_px = (ratio >= v_lo) & (ratio <= v_hi) & (dh <= h_tol) & (ds <= s_tol)
        if float(shadow_px.mean()) >= frac and Vc.mean() < Vr.mean():
            out.add(sq)
    return out


def move_touched_squares(board: chess.Board, move: chess.Move) -> set[str]:
    """Squares that a move physically changes: from, to, + rook on castling, + captured pawn
    on en passant."""
    sqs = {chess.square_name(move.from_square), chess.square_name(move.to_square)}
    if board.is_castling(move):
        rank = chess.square_rank(move.from_square)
        if chess.square_file(move.to_square) > chess.square_file(move.from_square):  # kingside castling
            sqs.add(chess.square_name(chess.square(7, rank)))
            sqs.add(chess.square_name(chess.square(5, rank)))
        else:
            sqs.add(chess.square_name(chess.square(0, rank)))
            sqs.add(chess.square_name(chess.square(3, rank)))
    if board.is_en_passant(move):
        cap_rank = chess.square_rank(move.from_square)
        sqs.add(chess.square_name(chess.square(chess.square_file(move.to_square), cap_rank)))
    return sqs


def normalize_diffs(diffs: dict[str, float]) -> dict[str, float]:
    """Remove global brightness/exposure drift: per-square diff minus the robust baseline
    noise (median over all 64 squares). For a real move only ~2-4 squares change,
    the median stays ~0 → harmless. If, however, the phone's auto-exposure fluctuates and the
    WHOLE board becomes brighter/darker, the median removes this offset, instead of falsely
    reporting 60+ squares as "changed". This allows detection to survive exposure jumps
    when a hand enters the frame."""
    vals = sorted(diffs.values())
    n = len(vals)
    baseline = vals[n // 2] if n else 0.0           # Median (robust against the few moved squares)
    return {s: max(0.0, v - baseline) for s, v in diffs.items()}


class SquareNoise:
    """Running noise model of per-square diff (EMA of mean and variance) on the
    already median-normalized diffs (otherwise the z-scores would jump on every
    exposure change). Absorbs marker jitter, exposure flicker, and slow,
    spatially uneven light drift that the global median subtraction doesn't catch.

    Learning runs on EVERY stable frame, but only for squares below the threshold
    (`exclude` = current candidates): otherwise the model freezes in the stuck state and
    can never adapt away jitter again. The std-floor is mandatory: against a fresh
    reference diff ≈ 0 and the EMA would otherwise collapse (z-scores explode).
    Floor 3.0 (≈ 9 gray levels at z_thr=3) is deliberately MORE SENSITIVE than v1 (16):
    clip01-replay showed that floor 5 loses low-contrast moves (black pawn on dark
    square); the resulting phantom squares (hand residue, AE flicker)
    are healed by the per-square anomaly patcher in _maybe_patch_anomaly."""

    def __init__(self, alpha: float = 0.05, init_std: float = 6.0, std_floor: float = 3.0) -> None:
        self.alpha = alpha
        self.std_floor = std_floor
        self.mean: dict[str, float] = dict.fromkeys(_ALL, 0.0)
        self.std: dict[str, float] = dict.fromkeys(_ALL, init_std)

    def update(self, diffs: dict[str, float], exclude: set[str] = frozenset()) -> None:
        a = self.alpha
        for sq, d in diffs.items():
            if sq in exclude:
                continue
            m = self.mean[sq]
            self.mean[sq] = (1 - a) * m + a * d
            dev = abs(d - m)
            self.std[sq] = max(self.std_floor, (1 - a) * self.std[sq] + a * dev)

    def z(self, diffs: dict[str, float]) -> dict[str, float]:
        return {sq: (d - self.mean[sq]) / self.std[sq] for sq, d in diffs.items()}


def loglik_scores(board: chess.Board, z: dict[str, float],
                  z_thr: float = 3.0, k: float = 1.0) -> list[tuple[chess.Move, float]]:
    """Log-likelihood score per legal move, relative to the hypothesis "no move".

    p(square changed) = sigmoid(k·(z − z_thr)); a move "explains" its touched squares.
    Relative to "no move", each move contributes Σ logit(p) over its touched squares —
    hot untouched squares thus automatically penalize all moves that don't explain them
    (relative to moves that do). No more hard cutoff: a weak target square
    (white piece on white square) lowers the score but does not eliminate the move.
    Returns sorted descending; empty list if no legal moves exist."""
    # logit(sigmoid(x)) == x: a square's contribution is directly k·(z − z_thr), clipped
    # against outliers (a single extremely hot square should not dominate everything).
    logit = {sq: float(np.clip(k * (v - z_thr), -12.0, 12.0)) for sq, v in z.items()}
    scored = [(mv, sum(logit[s] for s in move_touched_squares(board, mv)))
              for mv in board.legal_moves]
    scored.sort(key=lambda t: -t[1])
    return scored


def loglik_pair_scores(board: chess.Board, z: dict[str, float],
                       z_thr: float = 3.0, k: float = 1.0,
                       soft: float | None = None) -> list[tuple[list[chess.Move], float]]:
    """LL score for MOVE PAIRS (half-move + reply) — saves fast play without CNN:
    if the reply falls into the diff before the first move is confirmed, no
    single move explains the change anymore, but a pair does. Order is fixed by side-to-move.
    Only pairs whose ALL from/to endpoints carry at least weak evidence
    (z ≥ soft) are candidates — otherwise the search space explodes into noise.
    Returns sorted descending (can be empty)."""
    soft = z_thr * 0.5 if soft is None else soft
    logit = {sq: float(np.clip(k * (v - z_thr), -12.0, 12.0)) for sq, v in z.items()}

    def _ok(b, mv):
        return (z[chess.square_name(mv.from_square)] >= soft
                and z[chess.square_name(mv.to_square)] >= soft)

    scored: list[tuple[list[chess.Move], float]] = []
    for mv1 in board.legal_moves:
        if not _ok(board, mv1):
            continue
        t1 = move_touched_squares(board, mv1)
        b2 = board.copy(stack=False)
        b2.push(mv1)
        for mv2 in b2.legal_moves:
            # mv1's target square may be reused by mv2 (capture exchange) —
            # mv2's endpoint evidence still counts.
            if not _ok(b2, mv2):
                continue
            touched = t1 | move_touched_squares(b2, mv2)
            scored.append(([mv1, mv2], sum(logit[s] for s in touched)))
    scored.sort(key=lambda t: -t[1])
    return scored


def move_prior(board: chess.Board, move: chess.Move) -> float:
    """Small plausibility prior in LL units (level A, without engine): decides ONLY
    genuine near-ties, never against clear image evidence (capped |prior| ≤ 1.0).
    Capture +0.5, check +0.3, forward move +0.2."""
    p = 0.0
    if board.is_capture(move):
        p += 0.5
    if board.gives_check(move):
        p += 0.3
    fwd = chess.square_rank(move.to_square) - chess.square_rank(move.from_square)
    if (fwd > 0) == (board.turn == chess.WHITE) and fwd != 0:
        p += 0.2
    return min(p, 1.0)


# =======================================================================================
# Observer-Seam (Spec 06/09)
# =======================================================================================

class Observation(NamedTuple):
    """A detection observation returned by an Observer (Diff/CNN)."""
    move: chess.Move | None
    score: float
    second: float
    changed: frozenset[str]
    source: str                 # "diff" | "cnn"
    note: str = ""


def diff_observer(board: chess.Board, z: dict[str, float], z_thr: float,
                  k: float = 1.0) -> Observation:
    """Pure: LL-scoring on z-scores → best/second-best hypothesis (Observer-Seam, Spec 06/10).
    `changed` = squares above z_thr (gate/debug-info only; the scoring itself is soft)."""
    changed = frozenset(s for s, v in z.items() if v >= z_thr)
    scored = loglik_scores(board, z, z_thr, k)
    if not scored:
        return Observation(move=None, score=-1e9, second=-1e9, changed=changed, source="diff")
    second = scored[1][1] if len(scored) > 1 else -1e9
    return Observation(move=scored[0][0], score=scored[0][1], second=second,
                       changed=changed, source="diff")


class Confirmer:
    """Extracted confirm_frames voting (like the former self._cand tuple).

    Same uci × confirm_frames → feed() returns True (confirmed/commit).
    Different uci in between or feed(None) → Reset.
    """

    def __init__(self, confirm_frames: int) -> None:
        self._confirm_frames = confirm_frames
        self._cand: tuple[str, int] | None = None

    def feed(self, uci: str | None) -> bool:
        """True = confirmed (commit!). No reset on None — call reset() explicitly."""
        if uci is None:
            self._cand = None
            return False
        cnt = (self._cand[1] + 1) if (self._cand and self._cand[0] == uci) else 1
        self._cand = (uci, cnt)
        return cnt >= self._confirm_frames

    def reset(self) -> None:
        self._cand = None

    @property
    def count(self) -> int:
        """Current counter (0 when no candidate)."""
        return self._cand[1] if self._cand else 0


# =======================================================================================
# MoveTracker
# =======================================================================================

class MoveTracker:
    """Reads the camera, holds game state and the last overlay image (thread-safe)."""

    def __init__(self, profile: str = "phone", source="0",
                 motion_thr: float = 3.0, settle_frames: int | None = None,
                 change_thr: float | None = None,          # DEPRECATED (Spec 10): ersetzt durch z_thr
                 confirm_frames: int | None = None,
                 ambiguity_margin: float | None = None,    # DEPRECATED (Spec 10): ersetzt durch ambiguity_margin_ll
                 live_align: bool = True, avg_frames: int | None = None, max_changed: int = 6,
                 cnn_run: str | None = None, cnn_conf_thr: float = 0.85,
                 cnn_cooldown_s: float = 2.0, cnn_check_interval_s: float = 10.0,
                 device: str = "auto", verify_window: int = 8,
                 census_thr: float = 55.0, cnn_verify: bool = True,
                 z_thr: float = 3.0, ll_k: float = 1.0, ambiguity_margin_ll: float = 2.0,
                 reanchor_ll_floor: float = -4.0, nudge_timeout_s: float = 5.0,
                 drift_window_s: float = 30.0, use_prior: bool = True,
                 cnn_min_agreement: float = 0.97, cnn_margin_squares: int = 1,
                 min_confident_board: int = 32, min_confident_recovery: int = 8,
                 motion_margin: float = 0.12, overhang: float = 0.0,
                 corner_jump_px: float = 6.0) -> None:
        # Auto-create a missing profile from the first frames of this source (ArUco).
        self.profile = ensure_profile(profile, source)
        _src = source if not str(source).isdigit() else int(source)
        _cap = open_source(_src)
        # Grab-Latest ONLY for network streams (URL): kills the accumulating MJPEG backlog
        # (read() otherwise returns the oldest buffered JPEG -> latency). Local cameras
        # already provide the current frame; wrapping would only cost an extra thread.
        self.cap = LatestFrame(_cap) if isinstance(_src, str) and "://" in _src else _cap
        self.marker_tracker = make_tracker(self.profile)
        self.board = chess.Board()
        self.motion_thr = motion_thr
        # Faster defaults when CNN verifies every move (it then is the
        # trust authority instead of multi-frame diff voting); otherwise more robust counters.
        _cnn = bool(cnn_run)
        self.settle_frames = settle_frames if settle_frames is not None else (2 if _cnn else 4)
        avg_frames = avg_frames if avg_frames is not None else (2 if _cnn else 3)
        confirm_frames = confirm_frames if confirm_frames is not None else (1 if _cnn else 2)
        if change_thr is not None or ambiguity_margin is not None:
            log.warning("change_thr/ambiguity_margin are deprecated (Spec 10) — "
                        "scoring uses z_thr/ambiguity_margin_ll.")
        self.confirm_frames = confirm_frames          # same move must be confirmed for N stable frames
        # -- probabilistic scoring (Spec 10, part 1) --
        self.z_thr = z_thr                            # z-score above which a square counts as "changed"
        self.ll_k = ll_k                              # sigmoid steepness of the LL scoring
        self.ambiguity_margin_ll = ambiguity_margin_ll  # best − second in LL units (light-independent)
        self.reanchor_ll_floor = reanchor_ll_floor    # Re-anchor ONLY when best-LL is also below this
        self.noise = SquareNoise()                    # per-square noise model (EMA, only updated when stable)
        self.use_prior = use_prior                    # heuristic prior as ambiguity tie-break (part 2)
        self.prior_last = False                       # last move was decided by prior (undo hint)
        # -- Nudge/drift re-anchor without CNN (part 4) --
        self.nudge_timeout_s = nudge_timeout_s
        self.drift_window_s = drift_window_s
        self._anomaly_since: dict[str, float] = {}    # per square: since when persistently changed but unexplained
        # -- Promotion without CNN (part 5): waits for user choice via choose_promotion() --
        self._promo_pending: dict | None = None       # {"from","to","cur","cur_bgr","fen"}
        self.motion_margin = motion_margin            # motion ROI beyond the board edge (fraction)
        self._prev_roi = None                         # previous ROI gray image for the extended motion gate
        self.overhang = overhang                      # extend diff cells upward (fraction of cell)
        self.corner_jump_px = corner_jump_px          # corner jump ⇒ base truth geometrically invalid
        self._ref_corners: list | None = None         # warp corners at the time of reference capture
        self.live_align = live_align                  # True: track markers live; False: freeze calibration
        self.avg_frames = max(1, avg_frames)          # moving average over N stable frames (denoise)
        self.max_changed = max_changed                # more changed squares => occluded/unstable, no move
        self.census_thr = census_thr                  # threshold for STRUCTURAL change (census, 0..255)
        self._confirmer = Confirmer(confirm_frames)   # extracted voting (replaces self._cand)
        self._gray_buf = deque(maxlen=self.avg_frames)  # ring buffer of recent stable gray images
        self._bgr_buf = deque(maxlen=self.avg_frames)   # same in color (for the HSV shadow test)

        # Observer seam slots (Spec 06); `recovery` is lazily populated when cnn_run is set.
        self.extra_observers: list = []
        self.recovery = None

        # CNN recovery/control (Spec 09): automatic observer that (a) when
        # diff detection is stuck finds the move via occupancy and (b) periodically
        # checks whether game state and board still match. torch stays off
        # as long as cnn_run is None or never observed.
        self.cnn_run = cnn_run
        self.cnn_conf_thr = cnn_conf_thr
        self.cnn_min_agreement = cnn_min_agreement
        self.cnn_margin_squares = cnn_margin_squares
        # min_confident split (Spec 10): whole-board match needs lots of clear view (32),
        # recovery must remain operational under partial occlusion (8).
        self.min_confident_board = min_confident_board
        self.min_confident_recovery = min_confident_recovery
        self.cnn_cooldown_s = cnn_cooldown_s              # minimum interval between recovery observations
        self.cnn_check_interval_s = cnn_check_interval_s  # interval for periodic check
        self.device = device                             # "auto" | "cpu" | "cuda" (lazy resolved)
        self._device_resolved: str | None = None         # actual torch device after first use
        self._cnn_failed = False                          # model missing/broken -> feature stays off
        self._recovery_confirmer = Confirmer(confirm_frames)  # no single-shot commit (voting)
        self._stuck_reason: str | None = None             # "no_legal_move" | "too_many_changed"
        self._stuck_count = 0                             # how many stable frames stuck in a row
        self._last_cnn_ts = 0.0
        self.recovered_last = False                       # last move came from CNN recovery
        self.cnn_status: str | None = None                # None | "ok" | "mismatch"
        self.cnn_conflicts: list[str] = []                # squares that contradict the check

        # Pre-commit verification: a confirmed diff candidate waits until the CNN
        # confirms it via (adaptive) multi-frame voting or discards it as a ghost.
        self.verify_window = verify_window                # max frames the CNN is consulted
        self.cnn_verify = cnn_verify                      # identity verify per move ON? (default on, non-blocking)
        self._pending: dict | None = None                 # {"uci","fen","frames"} or None

        # -- Debug metrics (display only; maintained under self.lock) --
        self._motion = 0.0
        self._diff_ms = 0.0
        self._infer_ms = 0.0
        self._fps = 0.0
        self._changed: list[str] = []
        self._changed_vals: list[tuple[str, float]] = []   # strongest square diffs (sq, value) for tuning
        self._shadow_vetoed: list[str] = []                # squares discarded as cast shadow
        self._best_score = 0.0
        self._second_score = 0.0
        self._candidate_uci: str | None = None
        self._cnn_agreement = 0.0                         # confidence of the CNN recommendation (0..1)
        self._cnn_best_move: str | None = None
        self._verify_state: str | None = None             # None|"verifying"|"confirmed"|"ghost"

        self.lock = threading.Lock()
        self.ref_gray = None          # rectified (averaged) gray image of the position AFTER the last move
        self.ref_bgr = None           # same in color (base truth for HSV shadow veto)
        self.ref_fen = None           # FEN associated with ref_gray (base truth = (image, FEN) pair)
        self._last_cur = None         # last averaged stable gray image (for "nothing-changed" re-anchor)
        self._last_cur_bgr = None
        self.prev_gray = None         # for motion gating
        self.stable_count = 0
        self.state = "init"           # init | waiting | moving | move
        self.history: list[str] = []  # SAN
        self.last_move = None         # uci
        self.note = ""
        self._overlay_jpeg = None
        self._last_encode_ts = 0.0    # throttle overlay encode (not every loop under lock)
        self._last_loop_ts = 0.0      # for FPS estimation (EMA)
        self._last_frame = None       # last raw frame (for toggleable alignment image)
        self._last_corners = None     # last used board corners (a8,h8,h1,a1) in raw frame
        self._running = False
        self._thread = None

    # -- Geometry --
    def _warp(self, frame):
        if self.live_align:
            # Track markers live: the MarkerTracker smooths (dead-zone) and HOLDS occluded corners
            # at their last good position (no jump to 2-3-marker approximation when hand covers them).
            # Seeded from calibration -> starts immediately correct and then corrects camera drift.
            corners = board_corners_for_frame(frame, self.profile, self.marker_tracker)
            if corners is not None:
                self._last_corners = corners
                return warp_from_corners(frame, self.profile, corners)
        # frozen or fallback if (not yet) 4 corners known: fixed calibration geometry.
        corners = self.profile.image_corners
        if not corners or len(corners) < 4:
            return None
        self._last_corners = corners
        return warp_from_corners(frame, self.profile, corners)

    def _gray(self, warped):
        g = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        return cv2.GaussianBlur(g, (5, 5), 0)

    def _roi_motion(self, frame) -> float:
        """Motion in a region of the RAW frame extended by `motion_margin` —
        captures the hand before it covers a square (Poggi). Downsampled (cheap in hot-path).
        Only used by the loop thread (no lock needed for _prev_roi)."""
        corners = self._last_corners
        if not corners:
            return 0.0
        xs = [float(p[0]) for p in corners]
        ys = [float(p[1]) for p in corners]
        mx = (max(xs) - min(xs)) * self.motion_margin
        my = (max(ys) - min(ys)) * self.motion_margin
        h, w = frame.shape[:2]
        x0, x1 = max(0, int(min(xs) - mx)), min(w, int(max(xs) + mx))
        y0, y1 = max(0, int(min(ys) - my)), min(h, int(max(ys) + my))
        if x1 - x0 < 8 or y1 - y0 < 8:
            return 0.0
        roi = cv2.cvtColor(frame[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)
        roi = cv2.resize(roi, (160, max(8, int(160 * (y1 - y0) / (x1 - x0)))))
        prev, self._prev_roi = self._prev_roi, roi
        if prev is None or prev.shape != roi.shape:
            return 0.0
        return float(cv2.absdiff(roi, prev).mean())

    # -- Control --
    def reset_to_start(self, fen: str | None = None):
        """Set board to start/FEN and use the current camera image as reference
        (= "I just set up this position")."""
        with self.lock:
            self.board = chess.Board(fen) if fen else chess.Board()
            self.history, self.last_move, self.note = [], None, "Reference set"
            self.ref_gray = self.ref_bgr = None
            self.ref_fen = None
            self.state = "waiting"
            self._confirmer.reset()
            self._gray_buf.clear()
            self._clear_stuck()
            self.recovered_last = False
            self.cnn_status, self.cnn_conflicts = None, []
            self._pending, self._verify_state = None, None
            self._promo_pending = None
            self._anomaly_since = {}
            self.prior_last = False

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self):
        """Set the shutdown signal and wait for the thread to finish (NEVER join under self.lock)."""
        self._running = False
        if self._thread is not None and self._thread.is_alive():
            self._thread.join(timeout=2)

    # -- Main loop --
    def _loop(self):
        try:
            while self._running:
                ok, frame = self.cap.read() if hasattr(self.cap, "read") else (False, None)
                if not ok or frame is None:
                    time.sleep(0.03)
                    continue
                warped = self._warp(frame)
                if warped is None:
                    with self.lock:
                        self.note = "waiting for markers…"
                    time.sleep(0.02)
                    continue
                gray = self._gray(warped)
                # Extended motion gate (Spec 10, part 6): also capture motion in the margin
                # AROUND the board — the hand is seen BEFORE it covers a square.
                motion_roi = self._roi_motion(frame)

                now = time.time()
                with self.lock:
                    self._last_frame = frame
                    # FPS as EMA of the loop rate (display only).
                    if self._last_loop_ts:
                        dt = now - self._last_loop_ts
                        if dt > 0:
                            self._fps = 0.9 * self._fps + 0.1 * (1.0 / dt) if self._fps else 1.0 / dt
                    self._last_loop_ts = now

                    self.prev_gray = gray if self.prev_gray is None else self.prev_gray
                    motion = max(float(cv2.absdiff(gray, self.prev_gray).mean()), motion_roi)
                    self.prev_gray = gray
                    self._motion = motion

                    if motion > self.motion_thr:       # hand/camera moving -> discard buffers
                        self.state, self.stable_count = "moving", 0
                        self._confirmer.reset()
                        self._gray_buf.clear()
                        self._bgr_buf.clear()
                        self._changed, self._changed_vals = [], []   # clear overlay/debug (hand in image)
                        self._shadow_vetoed = []
                    else:
                        self.stable_count += 1
                        self._gray_buf.append(gray)
                        self._bgr_buf.append(warped)
                        if len(self._gray_buf) >= self.avg_frames:
                            cur = self._mean_gray()    # moving average over N stable frames (denoised)
                            cur_bgr = self._mean_bgr()
                            self._last_cur, self._last_cur_bgr = cur, cur_bgr
                            if self.ref_gray is None:
                                # Initial/re-capture of base truth: do NOT grab the buffer on the
                                # first stable frame (a hand still covering the board would make a
                                # obscured image the reference); wait for clear view (board stable
                                # long enough). The user just set up the position.
                                if self.stable_count >= self.settle_frames:
                                    self._set_ref(cur, cur_bgr)  # base truth = (image, current FEN)
                                else:
                                    self.note = "waiting for clear view of the board…"
                            elif self.stable_count >= self.settle_frames and self.state != "move":
                                self._try_detect(cur, cur_bgr)  # only commits after multi-frame confirmation
                        if self.state != "move":
                            self.state = "waiting"

                    # Throttle overlay encode (JPEG ~5–15 ms): keeps the detection hot-path clear.
                    if now - self._last_encode_ts >= 0.08:
                        self._overlay_jpeg = self._encode_overlay(warped)
                        self._last_encode_ts = now

                # CNN OUTSIDE the lock. Verify of a pending candidate has priority
                # (pre-commit ghost filter); otherwise recovery/periodic check.
                if self.cnn_run and not self._cnn_failed:
                    if self._pending is not None:
                        self._verify_tick(frame)
                    else:
                        self._cnn_tick(frame)
                time.sleep(0.005)
        finally:
            if hasattr(self.cap, "release"):
                self.cap.release()

    # -- CNN-Recovery & periodic check (Spec 09) --
    def _resolve_device(self) -> str:
        """Resolve `device` once: 'auto' -> 'cuda' if available, else 'cpu'. torch is
        imported here (lazy), so not in the hot-path. NEVER call under self.lock."""
        if self._device_resolved is not None:
            return self._device_resolved
        dev = (self.device or "auto").lower()
        if dev == "auto":
            try:
                import torch  # lazy: only on first CNN use
                dev = "cuda" if torch.cuda.is_available() else "cpu"
            except Exception:  # noqa: BLE001 — no torch -> CPU (feature fails cleanly later)
                dev = "cpu"
        self._device_resolved = dev
        return dev

    def _ensure_cnn(self):
        """Build CnnRecovery lazily; silently deactivate the feature if the run is missing/broken.
        NEVER call under self.lock."""
        if self.recovery is not None:
            return self.recovery
        try:
            from .. import config
            from .cnn_recovery import CnnRecovery

            self.recovery = CnnRecovery(config.DATA.models / self.cnn_run, self.profile,
                                        device=self._resolve_device(), conf_thr=self.cnn_conf_thr,
                                        min_agreement=self.cnn_min_agreement,
                                        margin_squares=self.cnn_margin_squares,
                                        min_confident_board=self.min_confident_board,
                                        min_confident_recovery=self.min_confident_recovery)
            return self.recovery
        except Exception as e:  # noqa: BLE001 — feature off, tracker continues normally
            self._cnn_failed = True
            with self.lock:
                self.note = f"CNN recovery disabled: {e}"
            return None

    def _cnn_tick(self, frame) -> None:
        """An observation cycle, event-driven — never in the per-frame hot-path:
        - Recovery: diff path persistently stuck (no_legal_move/too_many_changed) + cooldown.
        - Check: board quiet and not checked since cnn_check_interval_s.
        Flow: snapshot under lock → observe WITHOUT lock → under lock FEN revalidate + evaluate."""
        now = time.time()
        with self.lock:
            stable = len(self._gray_buf) >= self.avg_frames and self.state in ("waiting", "move")
            stuck = (self._stuck_reason is not None and self._stuck_count >= self.settle_frames
                     and (now - self._last_cnn_ts) >= self.cnn_cooldown_s)
            periodic = stable and (now - self._last_cnn_ts) >= self.cnn_check_interval_s
            if not (stuck or periodic):
                return
            fen = self.board.fen()
            corners = self._last_corners
        if corners is None:
            return
        recovery = self._ensure_cnn()
        if recovery is None:
            return
        try:
            obs = recovery.observe(frame, corners)          # expensive, intentionally without lock
        except Exception as e:  # noqa: BLE001 — single failure, feature stays on
            with self.lock:
                self._last_cnn_ts = now
            log.warning("CNN observation failed: %s", e)
            return
        # Identity-based evaluation (pure) — fallback to occupancy if the run does not provide
        # piece identity (obs.label is None).
        has_identity = getattr(obs, "label", None) is not None
        if has_identity:
            matches = recovery.board_matches_identity(self.board, obs)
            # 2-ply search (Spec 10, part 3): if no single move explains the observation,
            # move pairs are tried — saves the case "reply move arrived before commit".
            cnn_moves, agreement, _second = recovery.derive_moves_identity(self.board, obs,
                                                                           max_plies=2)
            conflicts = matches["conflicts"]
            match_ok = matches["match"]
            inconclusive = matches["inconclusive"]
        else:
            res = recovery.resync_check(self.board, obs)
            cnn_moves = [chess.Move.from_uci(res["move"])] if res["move"] else []
            agreement, conflicts = res["agreement"], res["conflicts"]
            match_ok, inconclusive = res["match"], False

        with self.lock:
            self._last_cnn_ts = now
            if self.board.fen() != fen:                     # state changed → discard
                self._recovery_confirmer.reset()
                return
            self._cnn_agreement = agreement
            self._cnn_best_move = " ".join(m.uci() for m in cnn_moves) if cnn_moves else None

            if match_ok:
                # "Nothing-changed": CNN confirms the board matches game state.
                # The diff was stuck on shadow/drift -> pull reference forward, NO move.
                self.cnn_status, self.cnn_conflicts = "ok", []
                self._recovery_confirmer.reset()
                if self._stuck_reason is not None and self._last_cur is not None:
                    self._set_ref(self._last_cur, self._last_cur_bgr)
                    self._clear_stuck()
                    self._confirmer.reset()
                    self._verify_state = "resynced"
                    self.note = "CNN: board unchanged — reference pulled forward (no move)"
                return

            if inconclusive:                                # too occluded → no statement
                self._recovery_confirmer.reset()
                return

            self.cnn_status, self.cnn_conflicts = "mismatch", conflicts
            if not cnn_moves:
                shown = ", ".join(conflicts[:4]) + ("…" if len(conflicts) > 4 else "")
                self.note = f"CNN check: board deviates ({shown}) — check pieces or resync"
                self._recovery_confirmer.reset()
                return
            key = " ".join(m.uci() for m in cnn_moves)      # move sequence as voting key
            if not self._recovery_confirmer.feed(key):      # voting instead of single-shot
                self.note = (f"CNN recovery checks {key}… "
                             f"({self._recovery_confirmer.count}/{self.confirm_frames})")
                return
            # Atomic commit of the move sequence (1 or 2 half-moves, order fixed by side-to-move).
            sans = []
            for mv in cnn_moves:
                sans.append(self.board.san(mv))
                self.board.push(mv)
            self.history.extend(sans)
            self.last_move = cnn_moves[-1].uci()
            # Do NOT discard reference (Spec 10, part 3): the frame on which the recovery
            # decided is position-current via FEN revalidation → set immediately as
            # base truth, instead of blindly waiting for the next settle phase.
            if self._last_cur is not None:
                self._set_ref(self._last_cur, self._last_cur_bgr)
            else:
                self.ref_gray = self.ref_bgr = None
                self.ref_fen = None
                self._gray_buf.clear()
            self.state = "move"
            self.recovered_last = True
            self.prior_last = False
            self.cnn_status, self.cnn_conflicts = "ok", []
            self._confirmer.reset()
            self._clear_stuck()
            self.note = (f"Move detected by CNN recovery: {' + '.join(sans)} "
                         f"(agreement {agreement:.0%})")

    def _verify_tick(self, frame) -> None:
        """Pre-commit verification of a diff candidate (`self._pending`) via CNN, autonomously
        over several frames — no user input. Flow like _cnn_tick: snapshot under lock →
        observe WITHOUT lock → under lock FEN revalidate + multi-frame voting evaluate.

        Decision per observation:
          - verify_move(pending) high & CNN's own suggestion ∈ {pending, None} → vote pending.
          - CNN's own suggestion is a DIFFERENT unambiguous move → vote that (diff was ghost;
            CNN knows the real move → recovery applies it).
          - otherwise uncertain → no vote (next frame = fresh image).
        `_recovery_confirmer` collects matching votes up to confirm_frames → Commit. If it remains
        undecided over `verify_window` frames → discard candidate as ghost, base truth stays."""
        time.time()
        with self.lock:
            pending = self._pending
            if pending is None or self.board.fen() != pending["fen"]:
                return
            corners = self._last_corners
        if corners is None:
            return
        recovery = self._ensure_cnn()
        if recovery is None:                                # CNN not available → fallback:
            with self.lock:                                 # commit candidate directly.
                if self._pending is pending and self.board.fen() == pending["fen"]:
                    self._commit_move(chess.Move.from_uci(pending["uci"]), pending["cur"],
                                      pending.get("cur_bgr"))
            return
        try:
            _t0 = time.perf_counter()
            obs = recovery.observe(frame, corners)          # teuer, bewusst ohne Lock
            infer_ms = (time.perf_counter() - _t0) * 1000.0
        except Exception as e:  # noqa: BLE001 — individual failure, retry on next frame
            log.warning("CNN verify observation failed: %s", e)
            return
        # Prepare evaluation (purely by IDENTITY) outside the lock.
        pend_mv = chess.Move.from_uci(pending["uci"])
        agree, n = recovery.verify_move_identity(self.board, pend_mv, obs)
        matches = recovery.board_matches_identity(self.board, obs)
        cnn_mv, _best, _second = recovery.derive_move_identity(self.board, obs)
        cnn_uci = cnn_mv.uci() if cnn_mv else None

        with self.lock:
            self._infer_ms = infer_ms
            self._cnn_agreement = agree
            self._cnn_best_move = cnn_uci
            if self._pending is not pending or self.board.fen() != pending["fen"]:
                return                                      # state changed → discard
            pending["frames"] += 1

            def _commit(note_suffix: str, state: str, status: str, conflicts=None,
                        move: chess.Move | None = None):
                self.cnn_status = status
                self.cnn_conflicts = conflicts or []
                self._commit_move(move or pend_mv, pending["cur"], pending.get("cur_bgr"),
                                  prior_used=pending.get("prior_used", False))
                self._verify_state = state
                if note_suffix:
                    self.note += note_suffix

            # 1) Shadow/no move: CNN sees the BELIEVED board unchanged (identity matches)
            #    → do NOT commit, instead pull reference forward. Reliable shadow killer.
            if matches["match"]:
                self._pending = None
                self._confirmer.reset()
                self._recovery_confirmer.reset()
                self._clear_stuck()
                self._set_ref(pending["cur"], pending.get("cur_bgr"))
                self._verify_state = "shadow"
                self.cnn_status, self.cnn_conflicts = "shadow", []
                self.note = "Shadow/no move (CNN: board unchanged)"
                return

            # 2) Diff confirmed by identity → Commit.
            if agree >= recovery.min_agreement:
                _commit("", "confirmed", "ok")
                return

            # 3) Counter-candidate (Spec 10, part 5): the CNN clearly sees a DIFFERENT legal
            #    move and its touched squares reliably confirm it → CNN overrules the
            #    diff candidate (instead of "diff always wins"). Resolves promotion variants
            #    (target square label) and similar-looking moves.
            if cnn_mv is not None and cnn_uci != pending["uci"]:
                agree_alt, n_alt = recovery.verify_move_identity(self.board, cnn_mv, obs)
                if agree_alt >= recovery.min_agreement and n_alt >= 2:
                    old_san = self.board.san(pend_mv)
                    _commit(f"  (CNN overruled {old_san})", "overruled", "ok", move=cnn_mv)
                    log.info("CNN overruled diff candidate: %s → %s", pending["uci"], cnn_uci)
                    return

            # 4) Touched squares reliable, but identity does NOT match → diff wins (user
            #    decision), CNN only warns (mismatch, alternative in debug card).
            if n >= 2:
                _commit("  (CNN discrepant — diff accepted)", "mismatch", "mismatch",
                        [] if cnn_uci is None else [cnn_uci])
                return

            # 5) Occlusion/low confidence on the endpoints → do not block: wait,
            #    after `verify_window` trust the diff.
            if pending["frames"] >= self.verify_window:
                _commit("  (CNN uncertain — diff accepted)", "confirmed", "ok")
            else:
                self.note = (f"checking {self.board.san(pend_mv)} via CNN… "
                             f"({pending['frames']}/{self.verify_window})")

    def resync_cnn(self) -> dict:
        """Manual "Resync via CNN" button: one-time check, applies an UNAMBIGUOUSLY
        explanatory move directly (intentionally single-shot — explicit user request)."""
        if not self.cnn_run or self._cnn_failed:
            return {"ok": False, "error": "CNN not configured (--cnn-run) or disabled"}
        with self.lock:
            frame = None if self._last_frame is None else self._last_frame.copy()
            corners = self._last_corners
            fen = self.board.fen()
        if frame is None or corners is None:
            return {"ok": False, "error": "no camera image/no corners — tracker started?"}
        recovery = self._ensure_cnn()
        if recovery is None:
            return {"ok": False, "error": "CNN recovery disabled (model missing/broken)"}
        try:
            obs = recovery.observe(frame, corners)
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": f"CNN observation failed: {e}"}
        with self.lock:
            self._last_cnn_ts = time.time()
            if self.board.fen() != fen:
                return {"ok": False, "error": "Board changed during analysis"}
            res = recovery.resync_check(self.board, obs)
            if res["match"]:
                self.cnn_status, self.cnn_conflicts = "ok", []
                self.note = "CNN resync: board matches game state"
                return {"ok": True, "match": True, "conflicts": [], "move": None,
                        "agreement": res["agreement"], "note": self.note}
            self.cnn_status, self.cnn_conflicts = "mismatch", res["conflicts"]
            if res["move"]:
                mv = chess.Move.from_uci(res["move"])
                san = self.board.san(mv)
                self.board.push(mv)
                self.history.append(san)
                self.last_move = res["move"]
                self.ref_gray = self.ref_bgr = None
                self.ref_fen = None
                self._gray_buf.clear()
                self.state = "move"
                self.recovered_last = True
                self.cnn_status, self.cnn_conflicts = "ok", []
                self._confirmer.reset()
                self._clear_stuck()
                self.note = f"CNN resync: move applied: {san} (agreement {res['agreement']:.0%})"
            else:
                shown = ", ".join(res["conflicts"][:4]) + ("…" if len(res["conflicts"]) > 4 else "")
                self.note = f"CNN resync: no unambiguous move — conflicts on {shown}"
            return {"ok": True, "match": False, "conflicts": res["conflicts"],
                    "move": res["move"], "agreement": res["agreement"], "note": self.note}

    def _set_ref(self, cur, cur_bgr=None) -> None:
        """Base-Truth als (Bild, FEN)-Paar setzen: ref_gray/ref_bgr und ref_fen bleiben gekoppelt.
        Merkt sich auch die Warp-Ecken der Aufnahme (Geometrie-Invalidierung). Unter self.lock."""
        self.ref_gray = cur
        if cur_bgr is not None:
            self.ref_bgr = cur_bgr
        self.ref_fen = self.board.fen()
        self._ref_corners = None if self._last_corners is None else \
            [[float(x), float(y)] for x, y in self._last_corners]

    def _corners_jumped(self) -> bool:
        """True if a warp corner has moved by > corner_jump_px since the reference capture
        (marker lost/refound, camera nudged). Then the base truth is geometrically
        UNUSABLE — diffing against it produces phantom changes on half-ranks
        (observed in clip03: a1-marker intermittent, ~130 px jump)."""
        if self._ref_corners is None or self._last_corners is None:
            return False
        for (rx, ry), (cx, cy) in zip(self._ref_corners, self._last_corners, strict=False):
            if abs(float(cx) - rx) > self.corner_jump_px or abs(float(cy) - ry) > self.corner_jump_px:
                return True
        return False

    def _mean_gray(self):
        """Moving average of the buffered stable gray images -> dampens sensor/light noise and
        residual jitter from marker tracking, so the per-square diff does not rely on a single
        noisy frame."""
        return np.mean(np.stack(list(self._gray_buf)), axis=0).astype(np.uint8)

    def _mean_bgr(self):
        """Moving average of the stable color frames (for the HSV shadow test)."""
        if not self._bgr_buf:
            return None
        return np.mean(np.stack(list(self._bgr_buf)), axis=0).astype(np.uint8)

    def _commit_move(self, move: chess.Move, cur, cur_bgr=None, recovered: bool = False,
                     prior_used: bool = False) -> None:
        """Apply move and set base truth = (image, FEN after move). Under self.lock.
        Used by both paths: direct commit (no CNN) and verified verify-commit."""
        san = self.board.san(move)
        self.board.push(move)
        self.history.append(san)
        self.last_move = move.uci()
        # Reference from the detection frame: may contain hand residue (slow hand under
        # the motion gate), but re-capturing in fast play catches the same hands and
        # makes the tracker additionally blind (clip01-replay: worse). Residue is healed by
        # the per-square anomaly patcher (_maybe_patch_anomaly) or the CNN recovery.
        self._set_ref(cur, cur_bgr)
        self.state = "move"
        self._confirmer.reset()
        self._clear_stuck()          # also resets _recovery_confirmer
        self._pending = None
        self._anomaly_since = {}
        self._verify_state = "confirmed"
        self.recovered_last = recovered
        # Make prior decisions visible (Spec 10, part 2): the prior can guess on genuine
        # image tie — the user should see that undo is advisable.
        self.prior_last = prior_used
        self.note = f"Move detected: {san}" + (" (CNN recovery)" if recovered else "") \
            + (" (decided by prior — undo if needed)" if prior_used else "")
        if self.board.is_checkmate():
            self.note += " — Checkmate!"

    def _try_detect(self, cur, cur_bgr=None):
        # --- Pending verification/promotion running: do not generate a new candidate. ---
        if self._pending is not None or self._promo_pending is not None:
            return

        # --- Invariant: base truth is (image, FEN). If the FEN no longer matches the
        #     current board, ref_gray is stale -> force re-capture instead of detecting
        #     against an outdated reference. ---
        if self.ref_gray is None or self.ref_fen != self.board.fen():
            self.ref_gray = self.ref_bgr = None
            self.ref_fen = None
            return

        # --- Geometry invalidation: warp corners have jumped since the reference capture
        #     (marker refound/camera moved) → re-capture base truth instead of chasing phantom
        #     diffs. Move evidence is not lost: the move remains visible on the board and
        #     will be detected against the NEW reference on the next move. ---
        if self._corners_jumped():
            self.ref_gray = self.ref_bgr = None
            self.ref_fen = None
            self._confirmer.reset()
            self._clear_stuck()
            self.note = "Board geometry shifted (marker/camera) — re-capturing reference"
            return

        # --- Diffs → median normalization (global exposure jump) → z-scores
        #     (per-square noise model; local drift/square characteristics). All gates and
        #     the LL-scoring operate on the SAME z-values. ---
        _t0 = time.perf_counter()
        diffs = per_square_diff(self.ref_gray, cur, self.profile.board_size,
                                self.profile.white_pov, extend_up=self.overhang)
        diffs = normalize_diffs(diffs)
        z = self.noise.z(diffs)
        self._diff_ms = (time.perf_counter() - _t0) * 1000.0

        # --- Candidate squares (z above threshold); debug also shows those just below ---
        changed = {s for s, v in z.items() if v >= self.z_thr}
        self._changed_vals = sorted(
            ((s, round(v, 1)) for s, v in z.items() if v >= self.z_thr * 0.5),
            key=lambda kv: -kv[1])[:8]

        # --- Cast shadow veto (HSV per Cucchiara) + census confirmation ---
        # Vetoed squares only leave the changed set (gates); their z-values are preserved
        # for scoring. IMPORTANT: a VACATED square often looks like a darkening to the HSV
        # test (piece gone → board color) — zeroing z would lose the real move's from-evidence.
        # Proven semantics from v1 retained.
        self._shadow_vetoed = []
        if cur_bgr is not None and self.ref_bgr is not None and changed:
            cens = per_square_census_change(self.ref_gray, cur, self.profile.board_size,
                                            self.profile.white_pov)
            shadows = hsv_shadow_squares(self.ref_bgr, cur_bgr, self.profile.board_size,
                                         self.profile.white_pov, changed)
            veto = {s for s in changed if s in shadows and cens[s] < self.census_thr}
            if veto:
                changed -= veto
                self._shadow_vetoed = sorted(veto)

        self._changed = sorted(changed)
        # Noise model learns on EVERY stable frame the non-candidate squares — even in the
        # stuck state, otherwise jitter (marker/exposure) can never be adapted away.
        self.noise.update(diffs, exclude=changed)

        # --- LL-scoring: best/second-best hypothesis relative to "no move". A move is viable
        #     only if BOTH endpoints carry at least weak evidence (z ≥ z_thr/2,
        #     Spec 10 part 1): otherwise a single hot square (nudge!) would score moves with
        #     completely cold target squares net-positive. White-on-white (target just below z_thr)
        #     remains viable — exactly the case the old −1000 cutoff killed. ---
        scored = loglik_scores(self.board, z, self.z_thr, self.ll_k)
        soft = self.z_thr * 0.5
        viable = [(mv, s) for mv, s in scored
                  if z[chess.square_name(mv.from_square)] >= soft
                  and z[chess.square_name(mv.to_square)] >= soft]
        obs_move, best = viable[0] if viable else (None, -1e9)
        second = viable[1][1] if len(viable) > 1 else -1e9
        self._best_score = best if viable else (scored[0][1] if scored else 0.0)
        self._second_score = second
        self._candidate_uci = obs_move.uci() if obs_move else None

        # --- max_changed gate: occlusion/instability gate (base truth stays). Runs
        #     AFTER scoring so the anomaly patcher knows whether a viable move explains
        #     the situation (then never patch). ---
        if len(changed) > self.max_changed:
            # Move pair attempt (fast play: 2 half-moves = up to ~8 changed squares),
            # before the situation is considered occluded/unstable.
            if len(changed) <= self.max_changed + 2 and self._try_pair(z, best, cur, cur_bgr):
                return
            self._confirmer.reset()
            self._mark_stuck("too_many_changed")   # Spec 09: recovery trigger via _cnn_tick
            self._maybe_patch_anomaly(changed, best, cur, cur_bgr)
            if self._stuck_reason is not None:
                self.note = (f"Much change ({len(changed)} squares) — occluded/unstable, "
                             f"no move committed (base truth unchanged)")
            return

        # --- Quiet / Re-anchor (stricter, Spec 10 part 1): nothing above z_thr AND no
        #     viable candidate with net-positive evidence. A premature re-anchor would
        #     bake weak move evidence permanently into the base truth.
        #     Only here does the noise model learn. ---
        if not changed:
            if obs_move is None or best < self.reanchor_ll_floor:
                self._confirmer.reset()
                self._clear_stuck()
                self._anomaly_since = {}
                self._set_ref(cur, cur_bgr)
                return
            if best < 0.0:
                # weak but move-consistent evidence (white-on-white?) → KEEP reference,
                # neither re-anchor nor report stuck; the confirmer keeps collecting.
                self.note = f"weak move evidence ({self.board.san(obs_move)}?) — waiting"
                return

        # --- no single move explains the change → first try move pair (fast
        #     play), then stuck + nudge/drift self-healing (part 4) ---
        if obs_move is None or best < 0.0:
            if self._try_pair(z, best, cur, cur_bgr):
                return
            self._confirmer.reset()
            self._mark_stuck("no_legal_move")      # Spec 09: recovery trigger via _cnn_tick
            self._maybe_patch_anomaly(changed, best, cur, cur_bgr)   # nudge/drift without CNN (part 4)
            if self._stuck_reason is not None:
                self.note = (f"Change on {len(changed)} squares, but no legal move fits — "
                             f"possible wrong move, base truth unchanged (resync needed?)")
            return
        self._anomaly_since = {}

        # --- ambiguity gate (LL units, light-independent) + prior tie-break (part 2) ---
        prior_used = False
        if best - second < self.ambiguity_margin_ll:
            near = [(mv, s) for mv, s in viable if best - s < self.ambiguity_margin_ll]
            # Promotion special case: all near candidates are promo variants of the same move
            # → diff fundamentally cannot distinguish them. With CNN, verify decides
            # (target square label); without CNN, the UI asks the user (choose_promotion).
            if all(mv.promotion for mv, _ in near) and \
               len({(mv.from_square, mv.to_square) for mv, _ in near}) == 1:
                if not (self.cnn_verify and self.cnn_run and not self._cnn_failed):
                    self._promo_pending = {
                        "from": chess.square_name(near[0][0].from_square),
                        "to": chess.square_name(near[0][0].to_square),
                        "cur": cur, "cur_bgr": cur_bgr, "fen": self.board.fen()}
                    self.note = "Promotion detected — please choose piece (Q/R/B/N)"
                    return
                # with CNN: pass best variant (default queen), verify corrects via label
            elif self.use_prior:
                rescored = sorted(((mv, s + move_prior(self.board, mv)) for mv, s in near),
                                  key=lambda t: -t[1])
                if len(rescored) > 1 and rescored[0][1] - rescored[1][1] >= self.ambiguity_margin_ll:
                    obs_move, prior_used = rescored[0][0], True
                else:
                    self._confirmer.reset()
                    self.note = ("ambiguous: " + " / ".join(
                        f"{self.board.san(mv)} ({s:+.1f})" for mv, s in near[:3])
                        + " — please move cleanly / wait briefly")
                    return
            else:
                self._confirmer.reset()
                self.note = "ambiguous change — please move cleanly / wait briefly"
                return

        # --- Confirmer voting ---
        uci = obs_move.uci()
        if not self._confirmer.feed(uci):
            self.note = f"detecting {self.board.san(obs_move)}… ({self._confirmer.count}/{self.confirm_frames})"
            return

        # --- Confirmed diff candidate ---
        san = self.board.san(obs_move)
        if self.cnn_verify and self.cnn_run and not self._cnn_failed:
            self._pending = {"uci": uci, "fen": self.board.fen(),
                             "cur": cur, "cur_bgr": cur_bgr, "frames": 0,
                             "prior_used": prior_used}
            self._recovery_confirmer.reset()
            self._verify_state = "verifying"
            self.note = f"checking {san} via CNN…"
            return
        # Standard: diff commits directly (fast). Shadows are already removed via HSV veto;
        # on stuck/deviation, CNN recovery/control kicks in via _cnn_tick.
        self._commit_move(obs_move, cur, cur_bgr, recovered=False, prior_used=prior_used)

    def _try_pair(self, z: dict[str, float], best_single: float, cur, cur_bgr) -> bool:
        """Diff-side 2-half-move detection (fast play without CNN). Under self.lock.

        True = situation handled (pair confirmed or committed) — caller then does NOT
        mark stuck. A pair must be clearly better than the best single move
        AND than the second-best pair (LL margin), otherwise normal stuck logic applies
        (with CNN the verified 2-ply recovery takes over)."""
        pairs = loglik_pair_scores(self.board, z, self.z_thr, self.ll_k)
        if not pairs:
            return False
        seq, best = pairs[0]
        second = pairs[1][1] if len(pairs) > 1 else -1e9
        if best < 0.0 or best - max(second, best_single) < self.ambiguity_margin_ll:
            return False
        key = " ".join(m.uci() for m in seq)
        self._candidate_uci = key
        self._best_score, self._second_score = best, max(second, best_single)
        if not self._confirmer.feed(key):
            self.note = f"detecting double move {key}… ({self._confirmer.count}/{self.confirm_frames})"
            return True
        sans = []
        for mv in seq:
            sans.append(self.board.san(mv))
            self.board.push(mv)
        self.history.extend(sans)
        self.last_move = seq[-1].uci()
        self._set_ref(cur, cur_bgr)
        self.state = "move"
        self._confirmer.reset()
        self._clear_stuck()
        self._pending = None
        self._anomaly_since = {}
        self.prior_last = False
        self.recovered_last = False
        self.note = f"Double move detected: {' + '.join(sans)} (fast play)"
        if self.board.is_checkmate():
            self.note += " — Checkmate!"
        return True

    def _maybe_patch_anomaly(self, changed: set[str], best_ll: float, cur, cur_bgr) -> None:
        """Nudge/drift self-healing of the reference without CNN (Spec 10, part 4). Under self.lock.

        Per-square timer: a square that is persistently "changed" although NO viable move
        explains the situation (best_ll < 0), after its timeout is individually pulled forward
        in the reference (cell patch) rather than discarding the entire base truth:
        - occupied squares (nudge/j'adoube, hand residue on the commit reference): nudge_timeout_s
        - empty squares (local light drift): drift_window_s — more conservative because a
          changing empty square could also be a silent wrong move.
        Protection against resting hands: never patch when more than max_changed+2 squares."""
        now = time.time()
        # Maintain timer (also with CNN, for debug): start new squares, remove disappeared ones.
        self._anomaly_since = {sq: self._anomaly_since.get(sq, now) for sq in changed}
        if self.cnn_run and not self._cnn_failed:
            return                                  # with CNN, recovery heals faster/more reliably
        if not changed or best_ll >= 0.0 or len(changed) > self.max_changed + 2:
            return
        patched, why = [], ""
        for sq in sorted(changed):
            occupied = self.board.piece_at(chess.parse_square(sq)) is not None
            needed = self.nudge_timeout_s if occupied else self.drift_window_s
            if now - self._anomaly_since[sq] < needed:
                continue
            x0, y0, x1, y1 = square_region(sq, self.profile.board_size, self.profile.white_pov,
                                           inset=0.0)
            self.ref_gray[y0:y1, x0:x1] = cur[y0:y1, x0:x1]
            if cur_bgr is not None and self.ref_bgr is not None:
                self.ref_bgr[y0:y1, x0:x1] = cur_bgr[y0:y1, x0:x1]
            patched.append(sq)
            why = "piece moved/hand residue" if occupied else "light drift"
        if not patched:
            return
        for sq in patched:
            self._anomaly_since.pop(sq, None)
        self.note = f"Reference pulled forward ({', '.join(patched)}): {why} — no move"
        log.info("Reference cells patched: %s (%s)", patched, why)
        if len(patched) == len(changed):
            self._clear_stuck()
            self._confirmer.reset()

    def choose_promotion(self, piece: str) -> dict:
        """User choice of promotion piece (Q/R/B/N) for a pending promotion move without CNN."""
        piece = (piece or "").lower().strip()
        symbols = {"q": chess.QUEEN, "r": chess.ROOK, "b": chess.BISHOP, "n": chess.KNIGHT}
        if piece not in symbols:
            return {"ok": False, "error": f"invalid piece: {piece!r} (q/r/b/n)"}
        with self.lock:
            pp = self._promo_pending
            if pp is None:
                return {"ok": False, "error": "no promotion pending"}
            if self.board.fen() != pp["fen"]:
                self._promo_pending = None
                return {"ok": False, "error": "Position has changed"}
            mv = chess.Move(chess.parse_square(pp["from"]), chess.parse_square(pp["to"]),
                            promotion=symbols[piece])
            if mv not in self.board.legal_moves:
                return {"ok": False, "error": f"{mv.uci()} ist nicht legal"}
            self._promo_pending = None
            self._commit_move(mv, pp["cur"], pp.get("cur_bgr"))
            return {"ok": True, "move": mv.uci(), "san": self.history[-1]}

    # -- Stuck accounting (call under self.lock) --
    def _mark_stuck(self, reason: str) -> None:
        self._stuck_count = (self._stuck_count + 1) if self._stuck_reason == reason else 1
        self._stuck_reason = reason

    def _clear_stuck(self) -> None:
        self._stuck_reason, self._stuck_count = None, 0
        self._recovery_confirmer.reset()

    # -- Overlay for the web (shows what the tracker BELIEVES) --
    def _encode_overlay(self, warped):
        img = warped.copy()
        bs = self.profile.board_size
        cell = bs / 8.0
        for i in range(9):
            p = int(i * cell)
            cv2.line(img, (p, 0), (p, bs), (0, 180, 0), 1)
            cv2.line(img, (0, p), (bs, p), (0, 180, 0), 1)
        # Squares currently detected as "changed" by the diff algorithm (magenta) — shows live
        # what the detection is reacting to (shadows/ghosts immediately visible → tuning aid).
        changed = set(self._changed)
        for sq in changed:
            x0, y0, x1, y1 = square_region(sq, bs, self.profile.white_pov, inset=0.06)
            cv2.rectangle(img, (x0, y0), (x1, y1), (255, 0, 255), 2)
        # Squares discarded as cast shadow (cyan) — shows what the HSV veto filters out.
        for sq in self._shadow_vetoed:
            x0, y0, x1, y1 = square_region(sq, bs, self.profile.white_pov, inset=0.06)
            cv2.rectangle(img, (x0, y0), (x1, y1), (255, 255, 0), 2)
        last = chess.Move.from_uci(self.last_move) if self.last_move else None
        for sq in _ALL:
            piece = self.board.piece_at(chess.parse_square(sq))
            cx, cy = square_center(sq, bs, self.profile.white_pov)
            if last and chess.parse_square(sq) in (last.from_square, last.to_square):
                x0, y0, x1, y1 = square_region(sq, bs, self.profile.white_pov, inset=0.02)
                cv2.rectangle(img, (x0, y0), (x1, y1), (0, 215, 255), 2)
            if piece:
                ch = piece.symbol()
                col = (245, 245, 245) if piece.color == chess.WHITE else (25, 25, 25)
                halo = (25, 25, 25) if piece.color == chess.WHITE else (235, 235, 235)
                cv2.putText(img, ch, (cx - 8, cy + 8), cv2.FONT_HERSHEY_SIMPLEX, 0.8, halo, 4, cv2.LINE_AA)
                cv2.putText(img, ch, (cx - 8, cy + 8), cv2.FONT_HERSHEY_SIMPLEX, 0.8, col, 2, cv2.LINE_AA)
        badge = {"moving": (0, 0, 255), "move": (0, 200, 0), "waiting": (0, 180, 0)}.get(self.state, (160, 160, 160))
        cv2.putText(img, f"{self.state}  {self.note}", (10, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.6, badge, 2, cv2.LINE_AA)
        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 80])
        return buf.tobytes() if ok else None

    # -- Abfragen --
    def status(self) -> dict:
        with self.lock:
            return {
                "fen": self.board.fen(),
                "turn": "white" if self.board.turn else "black",
                "state": self.state,
                "last_move": self.last_move,
                "history": list(self.history),
                "note": self.note,
                "in_check": self.board.is_check(),
                "game_over": self.board.is_game_over(),
                "result": self.board.result() if self.board.is_game_over() else None,
                "fullmove": self.board.fullmove_number,
                # CNN recovery/check (additive, Spec 09)
                "cnn_active": bool(self.cnn_run) and not self._cnn_failed,
                "recovered_last": self.recovered_last,
                "cnn_status": self.cnn_status,
                "cnn_conflicts": list(self.cnn_conflicts),
                # Promotion wartet auf Nutzerwahl (nur ohne CNN-Verify): {"from","to"} | None
                "promotion_pending": (None if self._promo_pending is None else
                                      {"from": self._promo_pending["from"],
                                       "to": self._promo_pending["to"]}),
                "prior_last": self.prior_last,
                # Base truth diagnosis: which FEN the reference image shows (None = re-capture running)
                "ref_fen": self.ref_fen,
                # Debug card: all relevant live metrics (display only).
                "debug": {
                    "fps": round(self._fps, 1),
                    "diff_ms": round(self._diff_ms, 1),
                    "infer_ms": round(self._infer_ms, 1),
                    "device": self._device_resolved or self.device,
                    "motion": round(self._motion, 2),
                    "motion_thr": self.motion_thr,
                    "stable_count": self.stable_count,
                    "frames_used": self.avg_frames,
                    "settle_frames": self.settle_frames,
                    "n_changed": len(self._changed),
                    "changed": list(self._changed),
                    "changed_vals": [[s, v] for s, v in self._changed_vals],
                    "shadow_vetoed": list(self._shadow_vetoed),
                    "max_changed": self.max_changed,
                    "z_thr": self.z_thr,
                    "census_thr": self.census_thr,
                    # Rauschmodell-Heatmap-Daten (Mittel/Streuung je Feld, gerundet)
                    "noise_mean": {s: round(v, 1) for s, v in self.noise.mean.items()},
                    "noise_std": {s: round(v, 1) for s, v in self.noise.std.items()},
                    "best_score": round(self._best_score, 1),
                    "second_score": round(self._second_score, 1),
                    "margin": round(self._best_score - self._second_score, 1),
                    "ambiguity_margin_ll": self.ambiguity_margin_ll,
                    "candidate": self._candidate_uci,
                    "confirm_count": self._confirmer.count,
                    "confirm_frames": self.confirm_frames,
                    "stuck_reason": self._stuck_reason,
                    "stuck_count": self._stuck_count,
                    # CNN-Verifikation
                    "verify_state": self._verify_state,
                    "pending_move": None if self._pending is None else self._pending["uci"],
                    "verify_frames": 0 if self._pending is None else self._pending["frames"],
                    "verify_votes": self._recovery_confirmer.count,
                    "cnn_agreement": round(self._cnn_agreement, 3),
                    "cnn_best_move": self._cnn_best_move,
                    "cnn_conf_thr": self.cnn_conf_thr,
                },
            }

    def overlay_jpeg(self):
        with self.lock:
            return self._overlay_jpeg

    def calib_overlay_jpeg(self, width: int = 640):
        """Raw camera image with calibration overlay (green grid/board + orange marker box) —
        for aligning/moving the board into view. Built on-demand only (toggle in the
        UI), therefore no continuous stream. `width` scales the result for the small preview image."""
        with self.lock:
            frame = None if self._last_frame is None else self._last_frame.copy()
            corners = self._last_corners
        if frame is None or not corners:
            return None
        img = draw_calibration_overlay(frame, corners, self.profile, labels=False)
        h, w = img.shape[:2]
        if w > width:
            img = cv2.resize(img, (width, max(1, int(h * width / w))))
        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 80])
        return buf.tobytes() if ok else None

    def undo(self):
        with self.lock:
            if self.history:
                self.board.pop()
                self.history.pop()
                self.last_move = None
                self.ref_gray = self.ref_bgr = None                # Referenz neu aufnehmen
                self.ref_fen = None
                self._confirmer.reset()
                self._gray_buf.clear()
                self._clear_stuck()
                self.recovered_last = False
                self._pending, self._verify_state = None, None
                self._promo_pending = None
                self._anomaly_since = {}
                self.prior_last = False
                self.note = "last move undone"
