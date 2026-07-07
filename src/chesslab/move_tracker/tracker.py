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

import json
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


def _square_boxes(board_size: int, white_pov: bool, extend_up: float = 0.0):
    """Pre-compute all 64 square-region boxes from the canonical source (square_region).
    Returns list of (x0, y0, x1, y1, area) tuples. Area is 0 for degenerate regions."""
    boxes = []
    for sq in _ALL:
        x0, y0, x1, y1 = square_region(sq, board_size, white_pov, extend_up=extend_up)
        area = (x1 - x0) * (y1 - y0) if y1 > y0 and x1 > x0 else 0
        boxes.append((x0, y0, x1, y1, area))
    return boxes


def _region_means(integral_img, boxes):
    """Per-region means from an integral image (shape (h+1,w+1) float64 from cv2.integral).
    Returns list of float means (0.0 for zero-area boxes)."""
    ii = integral_img
    return [float(ii[y1, x1] - ii[y0, x1] - ii[y1, x0] + ii[y0, x0]) / a
            if a > 0 else 0.0
            for (x0, y0, x1, y1, a) in boxes]


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
    boxes = _square_boxes(board_size, white_pov, extend_up)
    d = cv2.absdiff(gray_a, gray_b)
    return dict(zip(_ALL, _region_means(cv2.integral(d), boxes), strict=True))


# Popcount LUT for 8-bit census codes (Hamming distance per pixel).

class _RunningMean:
    """Fixed-window running mean over frames. Exact: recomputes the float64 sum from
    scratch every 64 appends to kill drift; otherwise sum += new - evicted."""

    def __init__(self, maxlen: int):
        self._maxlen = maxlen
        self._buf: deque = deque(maxlen=maxlen)
        self._sum = None
        self._count = 0

    def append(self, frame: np.ndarray) -> None:
        f64 = frame.astype(np.float64)
        if self._sum is None:
            self._sum = f64.copy()
        else:
            if len(self._buf) == self._maxlen:
                self._sum -= self._buf[0].astype(np.float64)
            self._sum += f64
        self._buf.append(frame)
        self._count += 1
        if self._count % 64 == 0:
            self._sum = np.sum(np.stack(list(self._buf)).astype(np.float64), axis=0)

    def clear(self) -> None:
        self._buf.clear()
        self._sum = None
        self._count = 0

    def __len__(self) -> int:
        return len(self._buf)

    def __bool__(self) -> bool:
        return len(self._buf) > 0

    def mean_uint8(self):
        if self._sum is None or len(self._buf) == 0:
            return None
        return (self._sum / len(self._buf)).astype(np.uint8)


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


def per_square_census_change(ref_gray, cur_gray, board_size: int, white_pov: bool,
                             extend_up: float = 0.0, ref_codes=None,
                             rows: tuple[int, int] | None = None) -> dict[str, float]:
    """Structural change per square: mean Hamming distance of census codes (0..8),
    scaled to 0..255 (comparable to the gray diff/change_thr). Small for pure
    brightness/shadow changes, large for appearing/disappearing pieces.
    `extend_up` must match the diff regions so both look at the same pixels. `ref_codes`
    (precomputed census_transform of the reference) skips re-encoding the rarely-changing
    reference every stable frame.

    `rows=(y_lo, y_hi)` (requires ref_codes): band fast path — the census transform of the
    CURRENT frame is computed only on that row band (callers pass the candidate squares'
    rows ±1 px halo; with the REPLICATE padding the halo makes the interior codes identical
    to the full transform). Squares outside the band get 0.0 — callers must only consult
    squares whose boxes lie inside the band."""
    boxes = _square_boxes(board_size, white_pov, extend_up)
    if rows is not None and ref_codes is not None:
        y_lo, y_hi = max(0, rows[0]), min(board_size, rows[1])
        ham = _POPCOUNT8[ref_codes[y_lo:y_hi] ^ census_transform(cur_gray[y_lo:y_hi])]
        ii = cv2.integral(ham)
        out = {}
        for sq, (x0, y0, x1, y1, a) in zip(_ALL, boxes, strict=True):
            if a > 0 and y0 >= y_lo + (1 if y_lo > 0 else 0)                     and y1 <= y_hi - (1 if y_hi < board_size else 0):
                s = float(ii[y1 - y_lo, x1] - ii[y0 - y_lo, x1]
                          - ii[y1 - y_lo, x0] + ii[y0 - y_lo, x0])
                out[sq] = s / a * (255.0 / 8.0)
            else:
                out[sq] = 0.0
        return out
    ham = _POPCOUNT8[(census_transform(ref_gray) if ref_codes is None else ref_codes)
                      ^ census_transform(cur_gray)]
    out = {}
    for sq, mean_val in zip(_ALL, _region_means(cv2.integral(ham), boxes), strict=True):
        out[sq] = mean_val * (255.0 / 8.0)
    return out


def hsv_shadow_squares(ref_bgr, cur_bgr, board_size: int, white_pov: bool, candidates,
                       v_lo: float = 0.35, v_hi: float = 0.97,
                       h_tol: float = 15.0, s_tol: float = 40.0, frac: float = 0.5,
                       extend_up: float = 0.0) -> set[str]:
    """Cast shadow detection according to Cucchiara (HSV): a square is "shadow" if its pixels,
    compared to the reference, have the same hue (Hue ~equal), are not more saturated and are
    darker (V ratio in [v_lo, v_hi]). Only `candidates` (already marked as changed) are checked.
    A hand shadow satisfies this; a real piece does not (different color/structure)."""
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
        dh = np.minimum(dh, 180.0 - dh)                  # Hue is circular (0..179)
        ds = C[..., 1] - R[..., 1]
        shadow_px = (ratio >= v_lo) & (ratio <= v_hi) & (dh <= h_tol) & (ds <= s_tol)
        if float(shadow_px.mean()) >= frac and Vc.mean() < Vr.mean():
            out.add(sq)
    return out


def board_color_gamut(ref_bgr, board_size: int, white_pov: bool):
    """Color 'gamut' of the reference board: mean + inverse covariance of the per-square
    feature (Lab a*, Lab b*, HSV S) over all 64 squares. Lightness (L*) is intentionally
    dropped so the model is robust to exposure/shadow; saturation is included because a
    hand/arm reads markedly more saturated than the muted board and cream/graphite pieces
    (user's "crank saturation" idea folded in as a feature axis).

    Returns (mu[3], inv_cov[3,3], feats[N,3]) or None if the reference is unusable. Used by
    `occlusion_color_squares` to flag opaque occluders whose color lies far from EVERY
    reference square (nearest-neighbor Mahalanobis): a dark piece arriving on a light square
    matches some square that already carries a dark piece, whereas skin/fabric matches none —
    a global-mean test would flag the piece as an outlier and stall detection."""
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
    # Regularize: keeps the matrix invertible and stops one flat axis (e.g. all-neutral
    # board with near-zero chroma variance) from exploding the Mahalanobis distance.
    cov = np.cov(F.T).astype(np.float32) + np.eye(3, dtype=np.float32) * 4.0
    try:
        inv = np.linalg.inv(cov).astype(np.float32)
    except np.linalg.LinAlgError:
        return None
    return mu, inv, F


def occlusion_color_squares(cur_bgr, gamut, board_size: int, white_pov: bool,
                            candidates, thr: float = 4.0, extend_up: float = 0.0) -> set[str]:
    """Opaque-occlusion veto: squares whose current color (Lab a*/b* + saturation) lies
    farther than `thr` sigma (Mahalanobis) from EVERY reference square's feature
    (nearest neighbor over the 64 squares, scaled by the board's covariance). A hand,
    arm or sleeve is skin/fabric-toned and matches NO square, whereas a piece arriving
    on a new square matches some square that already carries a similar piece — the old
    global-mean test flagged e.g. a black knight on a light square as an outlier and
    stalled detection. Only `candidates` (already-changed squares) are checked."""
    if gamut is None or cur_bgr is None or not candidates or thr <= 0:
        return set()
    _mu, inv, refs = gamut
    lab = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    sat = cv2.cvtColor(cur_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)[..., 1]
    thr2 = float(thr) * float(thr)
    out: set[str] = set()

    def _is_outlier(box) -> bool:
        x0, y0, x1, y1 = box
        reg = lab[y0:y1, x0:x1]
        if reg.size == 0:
            return False
        s = sat[y0:y1, x0:x1]
        f = np.array([float(reg[..., 1].mean()), float(reg[..., 2].mean()), float(s.mean())],
                     dtype=np.float32)
        d = refs - f                                     # NN over all reference squares
        return float(np.einsum("ij,jk,ik->i", d, inv, d).min()) > thr2

    for sq in candidates:
        base_box = square_region(sq, board_size, white_pov)
        ext_box = square_region(sq, board_size, white_pov, extend_up=extend_up)
        if _is_outlier(base_box) or (extend_up > 0 and _is_outlier(ext_box)):
            out.add(sq)
    return out


def motion_score(prev_gray, cur_gray, px_thr: float = 20.0) -> float:
    """Robust frame-to-frame motion: PERCENT of pixels whose brightness changed by more
    than `px_thr` (0..100). A hand entering produces a compact region of STRONG diffs
    (high score); desk wobble / marker jitter shifts the whole image by ~a pixel and
    produces many TINY diffs everywhere (all below px_thr → score ~0). The previous
    plain mean-abs-diff could not tell these apart — global sub-threshold motion kept
    the tracker permanently in 'moving'."""
    d = cv2.absdiff(cur_gray, prev_gray)
    return float((d > px_thr).mean()) * 100.0


_SQ_NEIGHBOURS: dict[str, list[str]] = {}
for _f in _FILES:
    for _r in range(1, 9):
        _sq = f"{_f}{_r}"
        _n = []
        if _r < 8:
            _n.append(f"{_f}{_r + 1}")
        if _r > 1:
            _n.append(f"{_f}{_r - 1}")
        _fi = _FILES.index(_f)
        if _fi > 0:
            _n.append(f"{_FILES[_fi - 1]}{_r}")
        if _fi < 7:
            _n.append(f"{_FILES[_fi + 1]}{_r}")
        _SQ_NEIGHBOURS[_sq] = _n


def _baseline_occlusion_and_shadow(cur_gray, ref_gray, board_size, abs_thr: float,
                                   white_pov: bool,
                                   boxes: list[tuple[int, int, int, int, int]] | None = None
                                   ) -> tuple[set[str], set[str]]:
    """Return (occluded_squares, shadow_squares) from absdiff vs baseline.
    Occlusion: mean absdiff > abs_thr. Shadow: mean pixel value decreased > abs_thr/2
    AND not already occluded. Both dilated by one orthogonal neighbour.
    Uses integral images + precomputed boxes for O(1) per-square means."""
    if boxes is None:
        boxes = _square_boxes(board_size, white_pov)
    d = cv2.absdiff(cur_gray, ref_gray)
    occ_means = _region_means(cv2.integral(d), boxes)
    cur_means = _region_means(cv2.integral(cur_gray.astype(np.float64)), boxes)
    ref_means = _region_means(cv2.integral(ref_gray.astype(np.float64)), boxes)
    occluded: set[str] = set()
    shadow: set[str] = set()
    for sq, om, cm, rm in zip(_ALL, occ_means, cur_means, ref_means, strict=True):
        if om > abs_thr:
            occluded.add(sq)
        elif rm - cm > abs_thr / 2:
            shadow.add(sq)
    dilated_occ = set(occluded)
    for sq in occluded:
        dilated_occ.update(_SQ_NEIGHBOURS.get(sq, []))
    dilated_shadow = set(shadow)
    for sq in shadow:
        dilated_shadow.update(_SQ_NEIGHBOURS.get(sq, []))
    return dilated_occ, dilated_shadow - dilated_occ


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
                 motion_thr: float = 0.25, motion_px_thr: float = 20.0,
                 settle_frames: int | None = None,
                 change_thr: float | None = None,          # DEPRECATED (Spec 10): ersetzt durch z_thr
                 confirm_frames: int | None = None,
                 ambiguity_margin: float | None = None,    # DEPRECATED (Spec 10): ersetzt durch ambiguity_margin_ll
                 live_align: bool = True, align_every: int = 3, align_scale: float = 0.5,
                 avg_frames: int | None = None, max_changed: int = 6,
                 cnn_run: str | None = None, cnn_conf_thr: float = 0.85,
                 cnn_cooldown_s: float = 2.0, cnn_check_interval_s: float = 10.0,
                 device: str = "auto", verify_window: int = 8,
                 census_thr: float = 160.0, cnn_verify: bool = True,
                 z_thr: float = 3.0, ll_k: float = 1.0, ambiguity_margin_ll: float = 2.0,
                 reanchor_ll_floor: float = -4.0, nudge_timeout_s: float = 5.0,
                 drift_window_s: float = 30.0, use_prior: bool = True,
                 cnn_min_agreement: float = 0.97, cnn_margin_squares: int = 1,
                 recovery_max_plies: int = 4,
                 min_confident_board: int = 32, min_confident_recovery: int = 8,
                 motion_margin: float = 0.10, overhang: float = 0.25,
                 corner_jump_px: float = 6.0, motion_cooldown: int | None = None,
                 motion_hold_s: float = 0.4,
                 occlusion_color_thr: float = 1.5,
                 min_grid_line_coverage: float = 0.5,
                 reconnect_grace_s: float = 2.0,
                 diff_clahe_clip: float = 0.0, auto_record: bool = True,
                 record_inventory_filter: bool = True,
                 require_motion_for_move: bool = True, detect_scale: float = 0.5,
                 motion_recency_s: float = 20.0) -> None:
        # Auto-create a missing profile from the first frames of this source (ArUco).
        self.profile_name = profile           # string profile name (for session recording)
        self.profile = ensure_profile(profile, source)
        self._src = source if not str(source).isdigit() else int(source)
        self.cap = self._open_capture()
        # Auto-reconnect: a dropped feed (URL stream closed, device unplugged) otherwise leaves
        # a dead capture that read()s False forever. If no frame arrives for `reconnect_grace_s`,
        # the loop rebuilds the capture WITHOUT restarting the session (board/history kept).
        self.reconnect_grace_s = reconnect_grace_s
        self._last_read_ok = time.time()
        self._last_reattach_ts = 0.0
        self._camera_ok = True
        self.marker_tracker = make_tracker(self.profile)
        self.board = chess.Board()
        self.motion_thr = motion_thr          # percent of strongly-changed pixels (motion_score)
        self.motion_px_thr = motion_px_thr    # per-pixel delta above which a pixel counts as changed
        # Faster defaults when CNN verifies every move (it then is the
        # trust authority instead of multi-frame diff voting); otherwise more robust counters.
        _cnn = bool(cnn_run)
        self.settle_frames = settle_frames if settle_frames is not None else (3 if _cnn else 4)
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
        # Post-motion cooldown (Defense 1): block detection for N stable frames AFTER any
        # motion spike, so hand residue is flushed from the averaging buffer before diffing.
        if motion_cooldown is not None:
            log.warning("motion_cooldown (frames) is deprecated — use motion_hold_s (seconds).")
        self.motion_hold_s = motion_hold_s            # detection blocked until motion-free this long
        self._hold_until = 0.0                        # wall-clock until which detection is held
        # Color-outlier occlusion veto (Defense 2): squares whose color lies far outside the
        # reference board's gamut (hand/arm) are neutralized before move scoring.
        self.occlusion_color_thr = occlusion_color_thr
        self._ref_gamut = None                        # (mu, inv_cov) built from ref_bgr at capture
        self._occluded_vetoed: list[str] = []         # squares discarded as opaque occlusion (color)
        self._motion_occluded_squares: set[str] = set()  # squares occluded during motion (baseline absdiff)
        self._occlusion_expiry: dict[str, float] = {}    # per-square occlusion keep-alive (expiry timestamp)
        self._last_cnn_obs = None                         # cached OccupancyObservation (for occlusion filter)
        self._occluded_since: float | None = None     # occlusion-latch timer (gamut escape hatch)
        self._tainted: dict[str, int] = {}            # per-square occlusion latch (frames to clear)
        self._occl_whitelist: set[str] = set()        # persistent-occlusion squares exempt from the veto
        self._occl_grid_active = False                # grid gate was blocking on the previous frame
        # Grid-line visibility gate (Defense 2b): if too few of the board's grid lines are
        # visible, a large opaque object covers the board → skip detection this frame.
        self.min_grid_line_coverage = min_grid_line_coverage
        self._grid_coverage = 1.0                     # last measured fraction of visible grid lines
        # CLAHE contrast boost on the diff image (0 = off): lifts low-contrast dark-on-dark moves.
        self.diff_clahe_clip = diff_clahe_clip
        self._clahe = None                            # lazily built CLAHE operator
        # Require motion since the reference before committing a move (drift/light suppression).
        self.require_motion_for_move = require_motion_for_move
        self.motion_recency_s = motion_recency_s      # commit only within N s of the last motion
        self._last_motion_ts = 0.0                    # wall-clock of the last motion spike
        self.overhang = overhang                      # extend diff cells upward (fraction of cell)
        self.corner_jump_px = corner_jump_px          # corner jump ⇒ base truth geometrically invalid
        self._ref_corners: list | None = None         # warp corners at the time of reference capture
        self.live_align = live_align                  # True: track markers live; False: freeze calibration
        self.align_every = max(1, int(align_every))   # ArUco every N-th frame (corners held between)
        self.align_scale = align_scale                # ArUco on downscaled frame (0.5 = half-res)
        self.detect_scale = detect_scale              # Detection warp scale (0.5=half-res; 1.0=off)
        self._det_size = (int(self.profile.board_size * detect_scale)
                          if detect_scale < 1.0 else self.profile.board_size)
        self._det_boxes = _square_boxes(self._det_size, self.profile.white_pov)
        self._align_i = 0
        self._ref_census = None                       # cached census codes of ref_gray
        self._ref_census_for = None                   # identity key of the cached codes
        self.avg_frames = max(1, avg_frames)          # moving average over N stable frames (denoise)
        self.max_changed = max_changed                # more changed squares => occluded/unstable, no move
        self.census_thr = census_thr                  # threshold for STRUCTURAL change (census, 0..255)
        self._confirmer = Confirmer(confirm_frames)   # extracted voting (replaces self._cand)
        self._gray_buf = _RunningMean(self.avg_frames)  # running mean of recent stable gray images
        self._bgr_buf = _RunningMean(self.avg_frames)   # same in color (for the HSV shadow test)

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
        self.recovery_max_plies = max(1, int(recovery_max_plies))  # deep-recovery search depth
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
        self._perf_frame = 0                              # frame counter for perf log (first 100 only)
        self._perf_log: list[str] = []                    # per-frame timing lines
        self._recovery_confirmer = Confirmer(confirm_frames)  # no single-shot commit (voting)
        self._stuck_reason: str | None = None             # "no_legal_move" | "too_many_changed"
        self._stuck_count = 0                             # how many stable frames stuck in a row
        self._last_cnn_ts = 0.0
        self._cnn_busy = False                            # one CNN observation at a time (worker thread)
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
        # Recent committed decisions (record + warped frames), newest last. Implicit feedback:
        # UNDO pops one and logs it as a hard-negative (bad); a move left standing = good data.
        self._recent_decisions: deque = deque(maxlen=8)
        # Compact full-session decision log (no images) — feeds the per-move popover
        # in the web UI: WHO decided each move and what the evidence looked like.
        self._decision_log: list[dict] = []
        # Session recorder (auto-labeled dataset from a correctly tracked game). Auto-started on
        # the first committed move when `auto_record` is on, so good data accrues with no clicks.
        self._recorder = None
        self.auto_record = auto_record
        self.record_inventory_filter = record_inventory_filter
        self._record_skipped_inventory = 0
        self._record_skip_reason = ""
        # Deferred session photo: at commit time a hand is often still over the board — the
        # auto-labeled frame is taken at the next CLEAN stable view instead (or skipped).
        self._pending_capture: dict | None = None     # {"ply","fen","san"}

        self.lock = threading.Lock()
        self.ref_gray = None          # rectified (averaged) gray image of the position AFTER the last move
        self.ref_bgr = None           # same in color (base truth for HSV shadow veto)
        self.ref_fen = None           # FEN associated with ref_gray (base truth = (image, FEN) pair)
        self._last_cur = None         # last averaged stable gray image (for "nothing-changed" re-anchor)
        self._last_cur_bgr = None
        self.prev_gray = None         # for motion gating
        self.stable_count = 0
        # A real move is always preceded by a hand entering the frame (motion resets stable_count).
        # So a commit is only allowed if there has been motion SINCE the current reference was set;
        # a "move" on a long-static board (high stable_count, no motion) is drift/light, not a move.
        self._motion_since_ref = False
        self.state = "init"           # init | waiting | moving | move
        self.history: list[str] = []  # SAN
        self.last_move = None         # uci
        self.note = ""
        self._overlay_jpeg = None
        self._last_viewer_ts = 0.0    # stamped by the MJPEG stream on every poll;
                                      # encode only while a viewer was seen recently
        self._last_encode_ts = 0.0    # throttle overlay encode (not every loop under lock)
        self._last_loop_ts = 0.0      # for FPS estimation (EMA)
        self._last_frame = None       # last raw frame (for toggleable alignment image)
        self._last_corners = None     # last used board corners (a8,h8,h1,a1) in raw frame
        self._running = False
        self._thread = None

    # -- Geometry --
    def _warp(self, frame, target_size: int | None = None):
        if self.live_align:
            self._align_i += 1
            if self._last_corners is not None and (self._align_i % self.align_every):
                return warp_from_corners(frame, self.profile, self._last_corners, target_size)
            corners = board_corners_for_frame(frame, self.profile, self.marker_tracker,
                                              detect_scale=self.align_scale)
            if corners is not None:
                self._last_corners = corners
                return warp_from_corners(frame, self.profile, corners, target_size)
        # frozen or fallback if (not yet) 4 corners known: fixed calibration geometry.
        corners = self.profile.image_corners
        if not corners or len(corners) < 4:
            return None
        self._last_corners = corners
        return warp_from_corners(frame, self.profile, corners, target_size)

    def _gray(self, warped):
        g = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        # Optional local-contrast boost (CLAHE) BEFORE denoise: lifts low-contrast moves the
        # eye needs more light for (dark piece on a dark square). Applied to EVERY frame, so
        # ref and cur are enhanced identically and the per-square noise model stays valid.
        if self.diff_clahe_clip > 0:
            if self._clahe is None:
                from .. import config
                self._clahe = cv2.createCLAHE(clipLimit=self.diff_clahe_clip,
                                              tileGridSize=(config.PHOTOMETRY.clahe_tile,) * 2)
            g = self._clahe.apply(g)
        return cv2.GaussianBlur(g, (5, 5), 0)

    @staticmethod
    def _roi_aabb(corners, motion_margin, frame_shape):
        """Compute the AABB of centre-expanded board corners (what ``_roi_motion`` crops)."""
        exs, eys = MoveTracker._expand_corners(corners, motion_margin)
        h, w = frame_shape[:2]
        return max(0, int(min(exs))), min(w, int(max(exs))), max(0, int(min(eys))), min(h, int(max(eys)))

    @staticmethod
    def _expand_corners(corners, motion_margin):
        """Return (xs, ys) of the 4 board corners expanded outward from the centre."""
        xs = [float(p[0]) for p in corners]
        ys = [float(p[1]) for p in corners]
        cx, cy = sum(xs) / 4.0, sum(ys) / 4.0
        scale = 1.0 + 2.0 * motion_margin
        exs = [cx + (x - cx) * scale for x in xs]
        eys = [cy + (y - cy) * scale for y in ys]
        return exs, eys

    @staticmethod
    def _roi_polygon(corners, motion_margin):
        """Return the 4 expanded corner points as int (x, y) tuples —
        a board-aligned quadrilateral for visualization."""
        exs, eys = MoveTracker._expand_corners(corners, motion_margin)
        return [(int(round(x)), int(round(y))) for x, y in zip(exs, eys, strict=True)]

    def _roi_motion(self, frame) -> float:
        """Motion in a board-aligned region extended by ``motion_margin`` —
        captures the hand before it covers a square (Poggi). Uses a perspective warp
        from the centre-expanded corners so the ROI exactly matches the visualization.
        Only used by the loop thread (no lock needed for _prev_roi)."""
        corners = self._last_corners
        if not corners:
            return 0.0
        pts_src = self._roi_polygon(corners, self.motion_margin)
        scale = 1.0 + 2.0 * self.motion_margin
        dst_sz = max(8, int(self.profile.board_size * scale))
        dst_pts = np.array([[0, 0], [dst_sz - 1, 0],
                            [dst_sz - 1, dst_sz - 1], [0, dst_sz - 1]], dtype=np.float32)
        src_pts = np.array(pts_src, dtype=np.float32)
        M = cv2.getPerspectiveTransform(src_pts, dst_pts)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        roi = cv2.warpPerspective(gray, M, (dst_sz, dst_sz),
                                   borderMode=cv2.BORDER_REPLICATE)
        roi = cv2.resize(roi, (160, 160))
        roi = cv2.GaussianBlur(roi, (5, 5), 0)
        prev, self._prev_roi = self._prev_roi, roi
        if prev is None or prev.shape != roi.shape:
            return 0.0
        return motion_score(prev, roi, self.motion_px_thr)

    def _open_capture(self):
        """(Re)open the camera source. Grab-Latest ONLY for network streams (URL): kills the
        accumulating MJPEG backlog (read() otherwise returns the oldest buffered JPEG → latency).
        Local cameras already provide the current frame; wrapping would only cost a thread.
        May BLOCK (URL open up to the socket timeout) — never call under self.lock."""
        cap = open_source(self._src)
        return LatestFrame(cap) if isinstance(self._src, str) and "://" in self._src else cap

    def reattach_camera(self) -> dict:
        """Rebuild the capture from the same source WITHOUT restarting the session: board,
        history, calibration and recording are kept; only the transient detection state is
        reset (base truth is re-captured on the next clear view). Recovers a dead feed."""
        try:
            newcap = self._open_capture()                 # may block on URL open — outside lock
        except Exception as e:  # noqa: BLE001 — source still down: report, keep the old cap
            with self.lock:
                self.note = f"camera reattach failed: {e}"
            return {"ok": False, "error": str(e)}
        with self.lock:
            old, self.cap = self.cap, newcap
            self.prev_gray = None
            self._prev_roi = None
            self._gray_buf.clear()
            self._bgr_buf.clear()
            self.stable_count = 0
            self._hold_until = 0.0
            self._tainted = {}
            self._occl_whitelist = set()
            self._occluded_since = None
            # KEEP the base truth: a brief feed dropout does not invalidate the reference —
            # _corners_jumped() re-captures it anyway if the camera actually moved, and a
            # move made during the gap is then detected against the KEPT reference instead
            # of being silently absorbed into a fresh one (faster + no missed move).
            self._confirmer.reset()
            self._last_read_ok = time.time()
            self._last_reattach_ts = time.time()
            self._camera_ok = True
            self.note = "camera reattached — resuming with kept reference"
        if old is not None and hasattr(old, "release"):
            try:
                old.release()                              # LatestFrame.release joins its thread
            except Exception:  # noqa: BLE001
                pass
        return {"ok": True}

    def _grid_line_coverage(self, gray) -> float:
        """Fraction of the board's interior grid lines (7 vertical + 7 horizontal) that are
        actually visible in the rectified board image. On a clear board every grid line runs
        edge-to-edge; a hand/arm/sleeve lying across the board erases the lines beneath it, so
        the fraction drops. Pieces sit ON intersections but never hide a whole line, so a
        clear board with pieces still scores near 1.0. Cheap: one Canny pass + column/row
        band max-projection."""
        h, w = gray.shape[:2]
        if h < 16 or w < 16:
            return 1.0
        edges = cv2.Canny(gray, 40, 120)
        cell_x, cell_y = w / 8.0, h / 8.0
        band = max(1, int(min(cell_x, cell_y) * 0.12))
        hits = 0
        for i in range(1, 8):                                   # interior vertical grid lines
            x = int(round(i * cell_x))
            col = edges[:, max(0, x - band):x + band + 1]
            if col.size and float((col.max(axis=1) > 0).mean()) >= 0.5:
                hits += 1
        for j in range(1, 8):                                   # interior horizontal grid lines
            y = int(round(j * cell_y))
            row = edges[max(0, y - band):y + band + 1, :]
            if row.size and float((row.max(axis=0) > 0).mean()) >= 0.5:
                hits += 1
        return hits / 14.0

    def _occluded_by_grid(self, gray) -> bool:
        """True if too few grid lines are visible (large opaque occlusion). Disabled when
        `min_grid_line_coverage` is 0 (avoids the Canny pass entirely). Updates the debug
        metric `_grid_coverage`."""
        if self.min_grid_line_coverage <= 0:
            return False
        self._grid_coverage = self._grid_line_coverage(gray)
        return self._grid_coverage < self.min_grid_line_coverage

    def _cnn_occlusion_filter(self, squares: set[str], board: chess.Board) -> set[str]:
        """Filter baseline-absdiff squares through the cached CNN observation.
        Real moves (CNN disagrees with FEN) pass through — don't taint.
        Occlusion (CNN unconfident) and noise (CNN agrees with FEN) get tainted.
        Without a fresh CNN observation, falls back to >2 = hand heuristic."""
        if self._last_cnn_obs is None or self.recovery is None \
                or time.time() - self._last_cnn_ts > 1.0:
            return squares if len(squares) > 2 else set()
        obs = self._last_cnn_obs
        thr = getattr(self.recovery, 'conf_thr', 0.9)
        conf = obs.confident(thr)
        taint: set[str] = set()
        for sq in squares:
            if not conf.get(sq, False):
                taint.add(sq)
            else:
                piece = board.piece_at(chess.parse_square(sq))
                fen_occupied = piece is not None
                cnn_occupied = obs.occupied(sq)
                if fen_occupied == cnn_occupied:
                    taint.add(sq)
        return taint

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
            self._bgr_buf.clear()          # keep gray/color averages aligned (vetoes/gamut)
            self._pending_capture = None
            self._clear_stuck()
            self.recovered_last = False
            self.cnn_status, self.cnn_conflicts = None, []
            self._pending, self._verify_state = None, None
            self._promo_pending = None
            self._anomaly_since = {}
            self.prior_last = False
            self._shadow_vetoed = []
            self._occluded_vetoed = []
            self._motion_occluded_squares = set()
            self._occlusion_expiry = {}
            self._hold_until = 0.0
            self._tainted = {}
            self._occl_whitelist = set()
            self._occluded_since = None
            self._ref_gamut = None
            self._recent_decisions.clear()
            self._decision_log.clear()
            self._motion_since_ref = False
            self._last_motion_ts = 0.0
            self._last_cnn_ts = 0.0
            self._last_cnn_obs = None
            self._prev_roi = None
            self._occl_grid_active = False
            self._grid_coverage = 1.0

    def capture_baseline(self) -> dict:
        """Take a new baseline now: use the current camera image as reference for the
        current board position. The FEN is trusted — only the visual reference is refreshed.
        The reference is captured on the next stable frame (no post-motion wait)."""
        with self.lock:
            self.ref_gray = self.ref_bgr = None
            self.ref_fen = None
            self._confirmer.reset()
            self._gray_buf.clear()
            self._bgr_buf.clear()
            self._clear_stuck()
            self._hold_until = 0.0             # no post-motion wait — deliberate user action
            self._tainted = {}
            self._occl_whitelist = set()
            self._occluded_since = None
            self._shadow_vetoed = []
            self._occluded_vetoed = []
            self._motion_occluded_squares = set()
            self._occlusion_expiry = {}
            self._last_cnn_obs = None
            self._anomaly_since = {}
            self.state = "waiting"
            self.note = "Baseline: re-capturing reference from the next clear frame…"
            return {"ok": True, "note": self.note}

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
                _t0 = time.perf_counter()
                _ts = {}  # per-step wall time (seconds)
                ok, frame = self.cap.read() if hasattr(self.cap, "read") else (False, None)
                if not ok or frame is None:
                    now_f = time.time()
                    down_for = now_f - self._last_read_ok
                    # Auto-reconnect: feed has produced nothing for `reconnect_grace_s` → rebuild
                    # the capture (dead socket/device won't recover on its own). Cooldown so we
                    # don't spam-open a source that is genuinely gone.
                    if (self.reconnect_grace_s > 0 and down_for > self.reconnect_grace_s
                            and (now_f - self._last_reattach_ts) > max(3.0, self.reconnect_grace_s)):
                        self._camera_ok = False
                        self.note = f"camera down {down_for:.0f}s — reconnecting…"
                        self._last_reattach_ts = now_f
                        self.reattach_camera()             # best-effort; blocks on URL open
                    elif down_for > 0.5:
                        self._camera_ok = False
                    time.sleep(0.03)
                    continue
                self._last_read_ok = time.time()
                self._camera_ok = True
                _ts["read"] = time.perf_counter()
                target_size = self._det_size if self.detect_scale < 1.0 else None
                warped_det = self._warp(frame, target_size)
                _ts["warp"] = time.perf_counter()
                if warped_det is None:
                    with self.lock:
                        self.note = "waiting for markers…"
                    time.sleep(0.02)
                    continue
                gray_det = self._gray(warped_det)
                _ts["gray"] = time.perf_counter()
                # Extended motion gate (Spec 10, part 6): also capture motion in the margin
                # AROUND the board — the hand is seen BEFORE it covers a square.
                motion_roi = self._roi_motion(frame)
                _ts["roi"] = time.perf_counter()

                now = time.time()
                with self.lock:
                    self._last_frame = frame
                    # FPS as EMA of the loop rate (display only).
                    if self._last_loop_ts:
                        dt = now - self._last_loop_ts
                        if dt > 0:
                            self._fps = 0.9 * self._fps + 0.1 * (1.0 / dt) if self._fps else 1.0 / dt
                    self._last_loop_ts = now

                    self.prev_gray = gray_det if self.prev_gray is None else self.prev_gray
                    motion = max(motion_score(self.prev_gray, gray_det, self.motion_px_thr), motion_roi)
                    self.prev_gray = gray_det
                    self._motion = motion

                    # Per-square occlusion against the baseline reference — runs during
                    # motion/occlusion states. Hand-occluded squares are shown on the overlay
                    # and hard-blocked in detection; the 100ms keep-alive bridges the gap
                    # between when the hand leaves and when motion_hold expires.
                    if self.ref_gray is not None and self.state not in ("waiting", "move"):
                        raw_occ, raw_shadow = _baseline_occlusion_and_shadow(
                            gray_det, self.ref_gray, self._det_size,
                            self.motion_px_thr * 4, self.profile.white_pov,
                            self._det_boxes)
                        for sq in raw_occ:
                            self._occlusion_expiry[sq] = now + 0.1
                        self._shadow_vetoed = sorted(raw_shadow)
                    self._motion_occluded_squares = {
                        sq for sq, exp in self._occlusion_expiry.items() if now < exp}
                    self._occluded_vetoed = sorted(self._motion_occluded_squares)

                    if motion > self.motion_thr:       # hand/camera moving -> discard buffers
                        self.stable_count = 0
                        self._motion_since_ref = True   # a hand entered → a real move is now possible
                        self._last_motion_ts = now      # recency: commits must follow motion promptly
                        self._confirmer.reset()
                        self._gray_buf.clear()
                        self._bgr_buf.clear()
                        if self._occluded_by_grid(gray_det):
                            self.state = "occluded"
                            self._occl_grid_active = True
                        else:
                            self.state = "moving"
                        self._hold_until = now + self.motion_hold_s
                    else:
                        self.stable_count += 1
                        self._gray_buf.append(gray_det)
                        self._bgr_buf.append(warped_det)
                        ready = (self.stable_count >= self.settle_frames
                                 and now >= self._hold_until)
                        occluded_now = False
                        if len(self._gray_buf) >= self.avg_frames:
                            # Grid-line gate FIRST, on the latest gray (Defense 2b): a large
                            # opaque object (hand/arm/paper) hides the board's grid lines ->
                            # skip detection AND the buffer means (the fps drop during
                            # occlusion was the means computed for nothing every frame).
                            occluded_now = self._occluded_by_grid(gray_det)
                            if occluded_now:
                                self._occl_grid_active = True
                                self.state = "occluded"
                                self.note = ("waiting for clear view of the board…"
                                              if self.ref_gray is None else
                                              "Board partly covered (grid lines hidden) — "
                                              "waiting for clear view")
                            else:
                                if self._occl_grid_active:
                                    # Gate just cleared: the occluder left. Double the settle
                                    # hold so residual hand pixels (half-shadows, averaging-buffer
                                    # mix) don't pollute the first detection after occlusion.
                                    self._occl_grid_active = False
                                    self._hold_until = max(self._hold_until,
                                                            now + self.motion_hold_s)
                                    self._gray_buf.clear()
                                    self._bgr_buf.clear()
                                    ready = False
                                cur = self._mean_gray()    # moving average over N stable frames
                                cur_bgr = self._mean_bgr()
                                self._last_cur, self._last_cur_bgr = cur, cur_bgr
                                if self.ref_gray is None:
                                    # Initial/re-capture of base truth: wait for a clear, long
                                    # enough stable view — never reference an obscured image.
                                    if ready:
                                        self._set_ref(cur, cur_bgr)  # base truth = (image, FEN)
                                    else:
                                        self.note = "waiting for clear view of the board…"
                                elif ready and self.state != "move":
                                    if len(self._motion_occluded_squares) > 2:
                                        self.state = "occluded"
                                    else:
                                        self._try_detect(cur, cur_bgr)  # commits only after confirmation
                        if self.state not in ("move", "occluded"):
                            self.state = "waiting"
                    _ts["detect"] = time.perf_counter()

                    # Throttle overlay encode (JPEG ~5–15 ms): keeps the detection hot-path clear.
                    if now - self._last_viewer_ts < 2.0 and now - self._last_encode_ts >= 0.08:
                        overlay_img = warped_det if self.detect_scale >= 1.0 else \
                            cv2.resize(warped_det, (self.profile.board_size, self.profile.board_size),
                                       interpolation=cv2.INTER_LINEAR)
                        self._overlay_jpeg = self._encode_overlay(overlay_img)
                        self._last_encode_ts = now
                    _ts["encode"] = time.perf_counter()

                # CNN in a WORKER thread (one observation at a time): an observation takes
                # 50-500 ms — running it inline froze the frame loop and punched holes into
                # the motion gate (a hand could enter/leave between two processed frames).
                # Verify of a pending candidate has priority (pre-commit ghost filter).
                if self.cnn_run and not self._cnn_failed and not self._cnn_busy:
                    self._cnn_busy = True
                    threading.Thread(target=self._cnn_worker, args=(frame,),
                                     daemon=True).start()
                time.sleep(0.005)

                # Perf logging: record per-step timings for the first 100 frames
                # Per-step timing (always logged, file written as rolling last-100)
                dt = {}
                prev = _t0
                for step in ("read", "warp", "gray", "roi", "detect", "encode"):
                    t = _ts.get(step)
                    if t is not None and t > prev:
                        dt[step] = round((t - prev) * 1000, 1)
                        prev = t
                total = round((time.perf_counter() - _t0) * 1000, 1)
                parts = " | ".join(f"{k}={v}ms" for k, v in dt.items())
                self._perf_log.append(f"frame {self._perf_frame:3d}: {parts} | total={total}ms")
                self._perf_frame += 1
                # Write rolling log every 100 frames (always shows the last 100)
                if self._perf_frame % 100 == 0:
                    try:
                        from .. import config
                        log_dir = config.DATA.root / "_perf"
                        log_dir.mkdir(parents=True, exist_ok=True)
                        (log_dir / "perf_loop.log").write_text(
                            "\n".join(self._perf_log[-100:]), encoding="utf-8")
                    except Exception:
                        pass
        finally:
            if hasattr(self.cap, "release"):
                self.cap.release()

    # -- CNN-Recovery & periodic check (Spec 09) --
    def _cnn_worker(self, frame) -> None:
        """Run one CNN observation off the loop thread. _verify_tick/_cnn_tick already
        snapshot state under the lock and revalidate the FEN before applying results, so
        running them concurrently with the frame loop is safe; `_cnn_busy` serializes to
        one observation at a time."""
        try:
            if self._pending is not None:
                self._verify_tick(frame)
            else:
                self._cnn_tick(frame)
        except Exception as e:  # noqa: BLE001 — single failure, next tick retries
            log.warning("CNN worker failed: %s", e)
        finally:
            self._cnn_busy = False

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
        # Warp of the frame the CNN actually LOOKED AT (still without lock). The commit below
        # must anchor the new base truth on THIS frame — `self._last_cur` is several seconds
        # newer (worker latency + voting + cooldown) and may already contain the opponent's
        # NEXT move; using it baked that move into the reference and it was never detected.
        try:
            obs_warped = warp_from_corners(frame, self.profile, corners)
            obs_gray = None if obs_warped is None else self._gray(obs_warped)
            # CNN reference must match the detection resolution (invariant: ref_gray size == _det_size).
            if obs_warped is not None and self.detect_scale < 1.0:
                obs_warped = cv2.resize(obs_warped, (self._det_size, self._det_size),
                                        interpolation=cv2.INTER_AREA)
                obs_gray = cv2.resize(obs_gray, (self._det_size, self._det_size),
                                      interpolation=cv2.INTER_AREA)
        except Exception:  # noqa: BLE001 — fall back to the live buffer below
            obs_warped = obs_gray = None
        # Identity-based evaluation (pure) — fallback to occupancy if the run does not provide
        # piece identity (obs.label is None).
        has_identity = getattr(obs, "label", None) is not None
        deep = getattr(recovery, "derive_moves_deep", None)
        if has_identity:
            matches = recovery.board_matches_identity(self.board, obs)
            # Deep recovery (conflict-guided beam search, up to recovery_max_plies): a stuck
            # tracker while play continues is 3-4 half-moves behind within seconds — the old
            # 2-ply full enumeration could not reach that ("resync needed" dead end).
            if deep is not None:
                cnn_moves, agreement, _second = deep(self.board, obs,
                                                     max_plies=self.recovery_max_plies)
            else:
                cnn_moves, agreement, _second = recovery.derive_moves_identity(
                    self.board, obs, max_plies=2)
            conflicts = matches["conflicts"]
            match_ok = matches["match"]
            inconclusive = matches["inconclusive"]
        else:
            res = recovery.resync_check(self.board, obs)
            cnn_moves = [chess.Move.from_uci(res["move"])] if res["move"] else []
            agreement, conflicts = res["agreement"], res["conflicts"]
            match_ok, inconclusive = res["match"], False
            if not cnn_moves and not match_ok and deep is not None:
                seq, agr, _second = deep(self.board, obs, max_plies=self.recovery_max_plies)
                if seq:
                    cnn_moves, agreement = seq, agr

        with self.lock:
            self._last_cnn_ts = now
            self._last_cnn_obs = obs
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
                if self._stuck_reason is not None                         and (obs_gray is not None or self._last_cur is not None):
                    # from_commit: the CNN tolerates partial occlusion (min_confident_recovery),
                    # so this frame is not guaranteed clean enough for a gamut rebuild.
                    if obs_gray is not None:
                        self._set_ref(obs_gray, obs_warped, from_commit=True)
                    else:
                        self._set_ref(self._last_cur, self._last_cur_bgr, from_commit=True)
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
            _fen_before = self.board.fen()
            _pre_ref_bgr = self.ref_bgr
            sans = []
            for mv in cnn_moves:
                sans.append(self.board.san(mv))
                self.board.push(mv)
            self.history.extend(sans)
            self.last_move = cnn_moves[-1].uci()
            self._record_decision(cnn_moves[-1], sans[-1], _fen_before, "cnn_recovery",
                                  False, self._last_cur, self._last_cur_bgr, _pre_ref_bgr)
            self._queue_session_capture(sans[-1])
            # Base truth = the frame the recovery DECIDED ON (not the live buffer): the
            # decision is only valid for that frame — a newer buffer may already show the
            # opponent's next move, which would silently vanish into the reference.
            if obs_gray is not None:
                self._set_ref(obs_gray, obs_warped, from_commit=True)
            elif self._last_cur is not None:
                self._set_ref(self._last_cur, self._last_cur_bgr, from_commit=True)
            else:
                self.ref_gray = self.ref_bgr = None
                self.ref_fen = None
                self._gray_buf.clear()
            # Recovery means we WERE behind: a reply played during the recovery window is
            # already visible against this (old) reference — grant one motion window so the
            # recency gate does not hold it hostage until the next recovery cycle.
            self._motion_since_ref, self._last_motion_ts = True, time.time()
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

        Verification is by OCCUPANCY (the model's reliable axis), not piece identity:
          - occupancy says board unchanged → shadow/no move, pull reference forward.
          - a confident endpoint contradicts the move (to still empty / from still occupied)
            → reject as ghost (this is what a hand-wave produces).
          - occupancy confirms from-empty/to-occupied → commit.
          - CNN sees a different unambiguous move → overrule.
          - endpoints occluded/unreadable → HOLD; never auto-accept while occluded. Only after
            `verify_window` frames WITH a clear view of both endpoints is the diff trusted;
            otherwise the candidate is discarded, base truth stays."""
        with self.lock:
            pending = self._pending
            if pending is None or self.board.fen() != pending["fen"]:
                return
            corners = self._last_corners
            board_snap = self.board.copy(stack=False)       # race-free board reads below
        if corners is None:
            return
        pend_moves = [chess.Move.from_uci(u) for u in self._pending_ucis(pending)]
        recovery = self._ensure_cnn()
        if recovery is None:                                # CNN not available → fallback:
            with self.lock:                                 # commit candidate directly.
                if self._pending is pending and self.board.fen() == pending["fen"]:
                    if len(pend_moves) == 1:
                        self._commit_move(pend_moves[0], pending["cur"], pending.get("cur_bgr"))
                    else:
                        self._commit_sequence(pend_moves, pending["cur"], pending.get("cur_bgr"))
            return
        try:
            _t0 = time.perf_counter()
            obs = recovery.observe(frame, corners)          # expensive, deliberately without lock
            infer_ms = (time.perf_counter() - _t0) * 1000.0
        except Exception as e:  # noqa: BLE001 — individual failure, retry on next frame
            log.warning("CNN verify observation failed: %s", e)
            return
        if len(pend_moves) > 1:                             # pair candidate (fast play)
            self._verify_pair_tick(pending, pend_moves, board_snap, obs, recovery, infer_ms)
            return
        # Prepare evaluation by OCCUPANCY (the new model's reliable axis: ~99.99% on `empty`,
        # ~88% per-square, but only ~40% on piece identity — so we verify "did a piece leave
        # from / arrive to" rather than "which piece"). Piece identity is intentionally NOT the
        # accept/reject axis here.
        pend_mv = pend_moves[0]
        from_sq = chess.square_name(pend_mv.from_square)
        to_sq = chess.square_name(pend_mv.to_square)
        occ_agree, occ_n = recovery.verify_move(board_snap, pend_mv, obs)
        occ_check = recovery.resync_check(board_snap, obs)   # occupancy: board unchanged? derived move?
        conf = obs.confident(recovery.conf_thr)
        to_conf, from_conf = bool(conf.get(to_sq)), bool(conf.get(from_sq))
        # Reliable/unreliable axes: the model is ~99.99% on `empty`, so a CONFIDENT-EMPTY
        # reading is trustworthy; a CONFIDENT-OCCUPIED reading is NOT (lower precision). So:
        #   - to-square confidently EMPTY  → piece never arrived → strong evidence AGAINST.
        #   - from-square confidently EMPTY → piece left          → strong evidence FOR.
        #   - to-square confidently OCCUPIED (non-capture) → piece arrived → decent evidence FOR.
        #   - from-square "still occupied" is NOT used to hard-reject: a false-positive occupied
        #     would kill a real move (e.g. d2d4 with d2 mis-read as occupied). It only withholds
        #     confirmation.
        is_capture = board_snap.is_capture(pend_mv)
        to_empty_conf = to_conf and not obs.occupied(to_sq)          # reliable AGAINST
        from_left_conf = from_conf and not obs.occupied(from_sq)     # reliable FOR (empty axis)
        to_arrived_conf = to_conf and obs.occupied(to_sq) and not is_capture  # decent FOR
        from_occ_conf = from_conf and obs.occupied(from_sq)          # UNRELIABLE — no hard reject
        cnn_uci = occ_check.get("move")
        cnn_agreement = float(occ_check.get("agreement", 0.0))

        with self.lock:
            self._last_cnn_obs = obs
            self._infer_ms = infer_ms
            self._cnn_agreement = occ_agree
            self._cnn_best_move = cnn_uci
            if self._pending is not pending or self.board.fen() != pending["fen"]:
                return                                      # state changed → discard
            pending["frames"] += 1

            def _commit(note_suffix: str, state: str, status: str, conflicts=None,
                        move: chess.Move | None = None, decider: str = "cnn_occupancy"):
                self.cnn_status = status
                self.cnn_conflicts = conflicts or []
                self._commit_move(move or pend_mv, pending["cur"], pending.get("cur_bgr"),
                                  prior_used=pending.get("prior_used", False), decider=decider)
                self._verify_state = state
                if note_suffix:
                    self.note += note_suffix

            def _reject(state: str, status: str, note: str, conflicts=None):
                self._pending = None
                self._confirmer.reset()
                self._recovery_confirmer.reset()
                self._verify_state = state
                self.cnn_status, self.cnn_conflicts = status, conflicts or []
                self.note = note

            # 1) Occupancy says the believed board is unchanged → shadow / no real move.
            #    Drop the candidate and pull the reference forward (reliable shadow killer).
            if occ_check["match"]:
                self._clear_stuck()
                self._set_ref(pending["cur"], pending.get("cur_bgr"), from_commit=True)
                _reject("shadow", "shadow", "Shadow/no move (CNN: board unchanged)")
                return

            # 2) Positive confirmation via the reliable axes FIRST (checked before the veto so a
            #    genuine move isn't killed by a mis-read destination): from confidently EMPTY
            #    (the piece demonstrably LEFT — 'empty' is the model's 99.99% class) OR non-capture
            #    destination confidently OCCUPIED (piece arrived) OR touched-square agreement.
            if from_left_conf or to_arrived_conf or (occ_agree >= recovery.min_agreement and occ_n >= 2):
                _commit("", "confirmed", "ok")
                return

            # 3) HARD veto: destination confidently EMPTY *and* the origin did NOT clearly empty
            #    → nothing actually moved (hand-wave ghost: from still occupied, to still empty).
            #    We require `not from_left_conf` so a real move whose origin demonstrably emptied
            #    (e.g. castling: e1 empty, but the king on g1 mis-read as empty) is NOT rejected —
            #    it already committed in (2) via from_left. Only "nothing moved" is a ghost.
            if to_empty_conf and not from_left_conf:
                _reject("ghost", "ghost", f"Ghost move rejected (CNN: {to_sq} still empty)", [to_sq])
                return

            # 4) CNN sees a DIFFERENT move whose occupancy is unambiguous → overrule the diff.
            if cnn_uci and cnn_uci != pending["uci"] and cnn_agreement >= recovery.min_agreement:
                old_san = self.board.san(pend_mv)
                _commit(f"  (CNN overruled {old_san})", "overruled", "ok",
                        move=chess.Move.from_uci(cnn_uci), decider="cnn_overrule")
                log.info("CNN overruled diff candidate: %s → %s", pending["uci"], cnn_uci)
                return

            # 5) Undecided. Wait up to `verify_window` frames, then resolve:
            if pending["frames"] >= self.verify_window:
                if from_occ_conf and not to_arrived_conf:
                    # Origin still (confidently) occupied and destination never arrived → the move
                    # most likely never happened (ghost / residue). Reject, keep base truth.
                    _reject("ghost", "ghost",
                            f"Move not confirmed (CNN: {from_sq} still occupied) — discarded", [from_sq])
                elif not (to_conf or from_conf):
                    # Both endpoints stayed occluded the whole window → can't tell → reject (don't
                    # reopen the old hole where a covering hand was auto-accepted).
                    _reject("ghost", "ghost",
                            "Verification timed out under occlusion — no move committed")
                else:
                    # Clear view, no contradiction, just not strongly confirmed → trust the diff.
                    _commit("  (CNN uncertain — diff accepted)", "confirmed", "ok",
                            decider="diff_after_verify")
            else:
                self.note = (f"checking {self.board.san(pend_mv)} via CNN… "
                             f"({pending['frames']}/{self.verify_window})")

    @staticmethod
    def _pending_ucis(pending: dict) -> list[str]:
        """UCIs of a pending candidate — sequence-aware ("ucis") with single-move fallback."""
        return pending.get("ucis") or [pending["uci"]]

    def _verify_pair_tick(self, pending: dict, moves: list[chess.Move], board_snap: chess.Board,
                          obs, recovery, infer_ms: float) -> None:
        """Occupancy verify of a PAIR candidate (fast play, 2 half-moves): confirmed when the
        observation matches the position AFTER both half-moves, rejected as shadow when it
        still matches the CURRENT position, dropped after `verify_window` frames otherwise.
        Endpoint-level reasoning is skipped — with 3-4 touched squares the whole-position
        occupancy match is the more robust axis."""
        before = recovery.resync_check(board_snap, obs)
        after_board = board_snap.copy(stack=False)
        for mv in moves:
            after_board.push(mv)
        after = recovery.resync_check(after_board, obs)
        key = " ".join(m.uci() for m in moves)
        with self.lock:
            self._infer_ms = infer_ms
            self._cnn_agreement = float(after.get("agreement", 0.0))
            if self._pending is not pending or self.board.fen() != pending["fen"]:
                return                                      # state changed → discard
            pending["frames"] += 1
            if before["match"]:
                # Board still matches the CURRENT position → shadow/no move.
                self._pending = None
                self._confirmer.reset()
                self._recovery_confirmer.reset()
                self._clear_stuck()
                self._set_ref(pending["cur"], pending.get("cur_bgr"), from_commit=True)
                self._verify_state = "shadow"
                self.cnn_status, self.cnn_conflicts = "shadow", []
                self.note = "Shadow/no move (CNN: board unchanged)"
            elif after["match"]:
                self.cnn_status, self.cnn_conflicts = "ok", []
                self._commit_sequence(moves, pending["cur"], pending.get("cur_bgr"),
                                      decider="cnn_pair")
                self._verify_state = "confirmed"
            elif pending["frames"] >= self.verify_window:
                self._pending = None
                self._confirmer.reset()
                self._recovery_confirmer.reset()
                self._verify_state = "ghost"
                self.cnn_status, self.cnn_conflicts = "ghost", []
                self.note = f"Double move {key} not confirmed by CNN — discarded"
            else:
                self.note = (f"checking double move {key} via CNN… "
                             f"({pending['frames']}/{self.verify_window})")

    def _commit_sequence(self, moves: list[chess.Move], cur, cur_bgr=None,
                         decider: str = "diff_pair") -> None:
        """Atomically apply a confirmed move sequence (fast play: half-move + reply).
        Mirrors _commit_move including provenance and deferred session capture. Under self.lock."""
        fen_before = self.board.fen()
        pre_ref_bgr = self.ref_bgr
        sans = []
        for mv in moves:
            sans.append(self.board.san(mv))
            self.board.push(mv)
        self.history.extend(sans)
        self.last_move = moves[-1].uci()
        self._record_decision(moves[-1], sans[-1], fen_before, decider, False,
                              cur, cur_bgr, pre_ref_bgr)
        self._queue_session_capture(sans[-1])
        self._set_ref(cur, cur_bgr, from_commit=True)
        self.state = "move"
        self._confirmer.reset()
        self._clear_stuck()
        self._pending = None
        self._anomaly_since = {}
        self.prior_last = False
        self.recovered_last = False
        self._verify_state = "confirmed"
        self.note = f"Double move detected: {' + '.join(sans)} (fast play)"
        if self.board.is_checkmate():
            self.note += " — Checkmate!"

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
                _fen_before = self.board.fen()
                _pre_ref_bgr = self.ref_bgr
                self.board.push(mv)
                self.history.append(san)
                self.last_move = res["move"]
                self._record_decision(mv, san, _fen_before, "cnn_resync", False,
                                      self._last_cur, self._last_cur_bgr, _pre_ref_bgr)
                self._queue_session_capture(san)
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

    def _set_ref(self, cur, cur_bgr=None, from_commit: bool = False) -> None:
        """Set base truth as (image, FEN) pair: ref_gray/ref_bgr and ref_fen stay coupled.
        Also remembers the warp corners of the capture (geometry invalidation). Under self.lock.

        `from_commit=True` marks a reference taken at commit time: that frame may still
        contain hand residue, so the occlusion color gamut is NOT rebuilt from it (a
        contaminated gamut would bake the hand's colors in and blind the occlusion veto).
        The gamut refreshes at the next quiet re-anchor, where the board is verifiably clean."""
        self.ref_gray = cur
        if cur_bgr is not None:
            self.ref_bgr = cur_bgr
        self.ref_fen = self.board.fen()
        self._ref_corners = None if self._last_corners is None else \
            [[float(x), float(y)] for x, y in self._last_corners]
        # Fresh reference → require new motion (a hand) before the NEXT move may commit.
        self._motion_since_ref = False

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
        """Moving average of the buffered stable gray images (incremental)."""
        return self._gray_buf.mean_uint8()

    def _mean_bgr(self):
        """Moving average of the stable color frames (incremental)."""
        return self._bgr_buf.mean_uint8()

    def _commit_move(self, move: chess.Move, cur, cur_bgr=None, recovered: bool = False,
                     prior_used: bool = False, decider: str = "diff") -> None:
        """Apply move and set base truth = (image, FEN after move). Under self.lock.
        Used by both paths: direct commit (no CNN) and verified verify-commit."""
        fen_before = self.board.fen()
        pre_ref_bgr = self.ref_bgr                    # pre-move reference (before _set_ref overwrites)
        san = self.board.san(move)
        self.board.push(move)
        self.history.append(san)
        self.last_move = move.uci()
        self._record_decision(move, san, fen_before, decider, prior_used, cur, cur_bgr, pre_ref_bgr)
        self._queue_session_capture(san)
        # Reference from the detection frame: may contain hand residue (slow hand under
        # the motion gate), but re-capturing in fast play catches the same hands and
        # makes the tracker additionally blind (clip01-replay: worse). Residue is healed by
        # the per-square anomaly patcher (_maybe_patch_anomaly) or the CNN recovery.
        self._set_ref(cur, cur_bgr, from_commit=True)
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

    # -- Decision provenance & human feedback (good/bad → hard-negative dataset) --
    _DECIDER_REASON = {
        "diff": "frame-diff (no CNN verify)",
        "diff_pair": "frame-diff double move (fast play, no CNN verify)",
        "cnn_pair": "CNN occupancy confirmed double move (fast play)",
        "cnn_occupancy": "CNN occupancy confirmed",
        "cnn_overrule": "CNN overruled the diff move",
        "diff_after_verify": "diff accepted (CNN uncertain, clear view)",
        "cnn_recovery": "CNN recovery (diff was stuck)",
        "cnn_resync": "manual CNN resync",
    }

    def _record_decision(self, move, san, fen_before, decider, prior_used,
                         cur, cur_bgr, pre_ref_bgr) -> None:
        """Snapshot WHO decided this move + the evidence + warped board images, appended to the
        recent-decisions ring. If the user later UNDOes this move it becomes a hard-negative
        (bad); if it stays it is good data. Under self.lock."""
        reason = self._DECIDER_REASON.get(decider, decider)
        if prior_used:
            reason += " + prior tie-break"
        rec = {
            "ts": time.time(),
            "profile": self.profile_name,          # for offline crop geometry (track-feedback ingest)
            "ply": len(self.history),
            "move": move.uci(),
            "san": san,
            "fen_before": fen_before,
            "fen_after": self.board.fen(),
            "decider": decider,
            "reason": reason,
            "prior_used": bool(prior_used),
            "cnn_run": self.cnn_run,
            "cnn_agreement": round(float(self._cnn_agreement), 3),
            "cnn_best_move": self._cnn_best_move,
            "best_score": round(float(self._best_score), 2),
            "second_score": round(float(self._second_score), 2),
            "margin": round(float(self._best_score - self._second_score), 2),
            "changed": list(self._changed),
            "changed_vals": [[s, v] for s, v in self._changed_vals],
            "shadow_vetoed": list(self._shadow_vetoed),
            "occluded_vetoed": list(self._occluded_vetoed),
            "grid_coverage": round(float(self._grid_coverage), 2),
            "z_thr": self.z_thr,
            "motion": round(float(self._motion), 2),
        }
        imgs = {
            "ref_bgr": None if pre_ref_bgr is None else pre_ref_bgr.copy(),
            "cur_bgr": None if cur_bgr is None else cur_bgr.copy(),
            "cur_gray": None if cur is None else cur.copy(),
        }
        self._recent_decisions.append({"rec": rec, "imgs": imgs})
        self._decision_log.append(rec)

    @staticmethod
    def _write_feedback_example(rec: dict, imgs: dict, label: str) -> int:
        """Append one feedback record (+ warped PNGs) to data/tracker_feedback/. Returns the
        number of images saved. File I/O only — call OUTSIDE self.lock."""
        from .. import config
        out_dir = config.DATA.tracker_feedback
        img_dir = out_dir / "frames"
        img_dir.mkdir(parents=True, exist_ok=True)
        stamp = f"{int(rec['ts'] * 1000)}_{rec['ply']:03d}_{rec['move']}_{label}"
        saved = {}
        for name, arr in (imgs or {}).items():
            if arr is None:
                continue
            fn = f"{stamp}_{name}.png"
            if cv2.imwrite(str(img_dir / fn), arr):
                saved[name] = f"frames/{fn}"
        out = dict(rec)
        out["feedback"] = label
        out["images"] = saved
        with (out_dir / "feedback.jsonl").open("a", encoding="utf-8") as f:
            f.write(json.dumps(out, ensure_ascii=False) + "\n")
        return len(saved)

    # -- Session recording: a correctly tracked game = free auto-labeled data (frame+FEN+corners
    #    per position); `chesslab slice` derives 64 labeled square crops from each. --
    def _start_recorder_locked(self, notes: str = ""):
        """Build the SessionWriter (assumes self.lock held). Returns it or None if no frame yet."""
        from .. import config
        from ..collect import SessionWriter, generate_session_id
        if self._recorder is not None:
            return self._recorder
        if self._last_frame is None or self._last_corners is None:
            return None
        sid = generate_session_id()
        h, w = self._last_frame.shape[:2]
        self._recorder = SessionWriter(config.DATA.sessions / sid, session_id=sid,
                                       profile=self.profile_name, mode="track", camera_index=0,
                                       frame_size=(w, h), notes=notes or "move-tracker recording")
        return self._recorder

    def _record_inventory_violations(self, fen: str) -> list[str]:
        if not self.record_inventory_filter:
            return []
        from ..state import physical_inventory_violations

        return physical_inventory_violations(fen)

    def _skip_recording_for_inventory(self, fen: str) -> bool:
        violations = self._record_inventory_violations(fen)
        if not violations:
            return False
        self._record_skipped_inventory += 1
        self._record_skip_reason = ", ".join(violations)
        log.info("session capture skipped: physical inventory exceeded (%s)", self._record_skip_reason)
        return True

    def _queue_session_capture(self, move_san) -> None:
        """Defer the session photo for the just-committed move. Flushes immediately when the
        board is clean (no occlusion); defers to the quiet re-anchor only when hands are
        still visible. Under self.lock."""
        if self._recorder is None and not self.auto_record:
            return
        if self._skip_recording_for_inventory(self.board.fen()):
            self._pending_capture = None
            return
        self._pending_capture = {"ply": self.board.ply(), "fen": self.board.fen(),
                                  "san": move_san}
        if not self._motion_occluded_squares and not self._tainted:
            self._flush_session_capture()

    def _flush_session_capture(self) -> None:
        """Take the deferred session photo now that the board has a clean stable view (quiet
        re-anchor: nothing changed, no occlusion vetoes). Auto-starts the recorder on the first
        flushed move when `auto_record` is on. Under self.lock. A move left standing = good
        auto-labeled data; a WRONG move is removed again on undo."""
        pc = self._pending_capture
        if pc is None:
            return
        if self._skip_recording_for_inventory(pc["fen"]):
            self._pending_capture = None
            return
        if self._recorder is None:
            if not self.auto_record or self._start_recorder_locked() is None:
                return
        if self._last_frame is None or self._last_corners is None:
            return
        self._pending_capture = None
        try:
            self._recorder.capture(self._last_frame, ply=pc["ply"], fen=pc["fen"],
                                   move_san=pc["san"], corners=self._last_corners)
        except Exception as e:  # noqa: BLE001 — recording is best-effort, never break tracking
            log.warning("session record capture failed: %s", e)

    def start_recording(self, notes: str = "") -> dict:
        """Explicitly begin recording (also captures the CURRENT position as ply 0). Normally
        auto-started on the first move; this lets the user start it before any move."""
        with self.lock:
            if self._recorder is not None:
                return {"ok": False, "error": "already recording",
                        "session_id": self._recorder.session_id}
            rec = self._start_recorder_locked(notes)
            if rec is None:
                return {"ok": False, "error": "no camera frame/corners yet — start the tracker first"}
            if self._skip_recording_for_inventory(self.board.fen()):
                return {"ok": True, "session_id": rec.session_id,
                        "skipped_inventory": True, "reason": self._record_skip_reason}
            try:
                rec.capture(self._last_frame, ply=self.board.ply(), fen=self.board.fen(),
                            move_san=None, corners=self._last_corners)
            except Exception as e:  # noqa: BLE001
                return {"ok": False, "error": f"could not start recording: {e}"}
            sid = rec.session_id
        return {"ok": True, "session_id": sid}

    def stop_recording(self) -> dict:
        """End the session gracefully: finalize session.yaml. The surviving (un-undone) frames
        are the good, auto-labeled dataset for `chesslab slice`. Returns id + frame count."""
        with self.lock:
            rec, self._recorder = self._recorder, None
        if rec is None:
            return {"ok": False, "error": "not recording"}
        rec.close()
        return {"ok": True, "session_id": rec.session_id, "frames": rec.count}

    def _try_detect(self, cur, cur_bgr=None):
        """Ordered detection pipeline (one numbered step per phase; the flow diagram in
        docs/move-tracker-flow.md mirrors these steps):
          1. guards            — pending verify/promotion, base-truth invariant, geometry
          2. evidence          — diff vs base truth → median norm → z-scores
          3. vetoes            — cast shadow (HSV+census), opaque occlusion (color gamut)
          4. noise learning    — EMA per square, never from candidate/vetoed squares
          5. quiet / re-anchor — nothing changed → pull reference forward; ALSO the clean
                                 moment for deferred jobs (gamut rebuild, session photo)
          6. hypothesis        — single move (+ambiguity/prior/promotion) → pair → endpoint
          7. motion gate       — no hand since reference → drift/light, no commit
          8. confirmer         — same candidate over N stable frames
          9. dispatch          — CNN pre-commit verify (pending) or direct commit
        Fall-through from step 6 marks stuck and runs the anomaly patcher. Under self.lock."""
        # 1. Guards.
        if not self._detect_guards():
            return
        # 2. Evidence: all gates and the LL-scoring operate on the SAME z-values.
        diffs, z = self._compute_evidence(cur)
        # Baseline-absdiff occlusion with CNN arbitration: real moves (CNN disagrees
        # with FEN) pass through — don't taint. Occlusion (CNN unconfident) and noise
        # (CNN agrees with FEN) get tainted. Falls back to >2 heuristic without CNN.
        if self._motion_occluded_squares:
            tainted = self._cnn_occlusion_filter(self._motion_occluded_squares, self.board)
            for sq in tainted:
                z[sq] = 0.0
                self._tainted[sq] = time.time() + self.motion_hold_s
        self._occluded_vetoed = sorted(self._motion_occluded_squares)
        self._motion_occluded_squares = set()
        self._occlusion_expiry = {sq: exp for sq, exp in self._occlusion_expiry.items()
                                  if time.time() < exp}
        changed = {s for s, v in z.items() if v >= self.z_thr}
        self._changed_vals = sorted(              # debug also shows squares just below z_thr
            ((s, round(v, 1)) for s, v in z.items() if v >= self.z_thr * 0.5),
            key=lambda kv: -kv[1])[:8]
        # 3. Vetoes (shadow keeps z as vacate evidence; occlusion zeroes z).
        changed, shadow_veto, occluded_set = self._apply_vetoes(cur, cur_bgr, z, changed)
        self._changed = sorted(changed)
        # 4. Noise model learns on EVERY stable frame the non-candidate squares — even in the
        # stuck state, otherwise jitter (marker/exposure) can never be adapted away. Shadowed
        # and occluded squares are excluded too: learning a shadow/hand into the EMA would
        # inflate that square's std and desensitize later real moves there.
        self.noise.update(diffs, exclude=changed | shadow_veto)
        # Clean up expired tainted entries (set by baseline-absdiff occlusion).
        _now = time.time()
        for sq in list(self._tainted):
            if _now > self._tainted[sq]:
                del self._tainted[sq]

        # 5. LL-scoring + quiet/re-anchor. A move is viable only if BOTH endpoints carry at
        #    least weak evidence (z ≥ z_thr/2, Spec 10 part 1): otherwise a single hot square
        #    (nudge!) would score moves with completely cold target squares net-positive. All
        #    physically touched squares must pass (move_touched_squares — castling adds rook
        #    squares, en passant adds the captured pawn square).
        #    White-on-white (target just below z_thr) remains viable.
        scored = loglik_scores(self.board, z, self.z_thr, self.ll_k)
        soft = self.z_thr * 0.5
        viable = [(mv, s) for mv, s in scored
                  if all(z[sq] >= soft
                         for sq in move_touched_squares(self.board, mv))]
        obs_move, best = viable[0] if viable else (None, -1e9)
        second = viable[1][1] if len(viable) > 1 else -1e9
        self._best_score = best if viable else (scored[0][1] if scored else 0.0)
        self._second_score = second
        self._candidate_uci = obs_move.uci() if obs_move else None
        if not changed:
            # Scale reanchor floor by number of physically changed squares: a castling
            # move (4 squares) must not be penalised relative to a normal move (2 squares)
            # when per-square evidence is equally weak.
            n_touched = len(move_touched_squares(self.board, obs_move)) if obs_move else 2
            scaled_floor = self.reanchor_ll_floor * (n_touched / 2.0)
            if obs_move is None or best < scaled_floor:
                # Occlusion latch active → do NOT re-anchor (the latched squares may still
                # show the hand; a re-anchor would bake it into the reference). Mark stuck so
                # the CNN recovery resolves the standoff within its cooldown (~2 s) instead
                # of waiting for the gamut escape.
                if self._tainted:
                    self._mark_stuck("occluded")
                    self.note = "waiting for occluded squares to clear…"
                    return
                # Quiet board → re-anchor. This is also the only verifiably CLEAN moment:
                # run the deferred jobs (gamut rebuild via _set_ref, session photo) here.
                self._confirmer.reset()
                self._clear_stuck()
                self._anomaly_since = {}
                self._set_ref(cur, cur_bgr)
                if not occluded_set:
                    self._flush_session_capture()
                return
            if best < 0.0:
                # weak but move-consistent evidence (white-on-white?) → KEEP reference,
                # neither re-anchor nor report stuck; the confirmer keeps collecting.
                self.note = f"weak move evidence ({self.board.san(obs_move)}?) — waiting"
                return

        # 6. Hypothesis: exactly ONE place that turns evidence into a candidate (or into a
        #    stuck/ambiguous state). Every candidate — single, pair, endpoint — continues
        #    through the SAME motion gate and dispatch below (previously the pair path
        #    committed directly and skipped both).
        cand = self._generate_hypothesis(z, scored, viable, changed, obs_move, best, second,
                                         cur, cur_bgr)
        if cand is None:
            return
        moves = cand["moves"]

        # 7. Motion prerequisite: a real move is always preceded by a hand entering the
        #    frame, and it becomes visible WITHIN SECONDS of the hand leaving (settle +
        #    confirm). No motion since the reference, or only motion long ago (high
        #    stable count): this "move" is drift/light/shadow → do not commit.
        #    `_motion_since_ref` alone was not enough — one wobble spike armed it forever.
        if self.require_motion_for_move:
            age = time.time() - self._last_motion_ts
            if not self._motion_since_ref or age > self.motion_recency_s:
                self._confirmer.reset()
                why = ("no motion since last move" if not self._motion_since_ref
                       else f"last motion {age:.0f}s ago")
                self.note = (f"{' + '.join(self._san_sequence(moves))}? ignored — {why} "
                             f"(drift/light, not a real move)")
                return

        # 8. Confirmer voting (same candidate over N stable frames). The endpoint candidate
        #    skips voting — the CNN verify IS its multi-frame confirmation.
        key = " ".join(m.uci() for m in moves)
        self._candidate_uci = key
        if cand["vote"] and not self._confirmer.feed(key):
            self.note = (f"detecting {' + '.join(self._san_sequence(moves))}… "
                         f"({self._confirmer.count}/{self.confirm_frames})")
            return
        self._anomaly_since = {}

        # 9. Dispatch: the ONE commit gate.
        self._dispatch(moves, cur, cur_bgr, cand["prior_used"], note=cand.get("note"))

    def _detect_guards(self) -> bool:
        """Step 1 — abort conditions before any evidence is computed. Under self.lock."""
        # Pending verification/promotion running: do not generate a new candidate.
        if self._pending is not None or self._promo_pending is not None:
            return False
        # Invariant: base truth is (image, FEN). If the FEN no longer matches the current
        # board, ref_gray is stale → force re-capture instead of detecting against it.
        if self.ref_gray is None or self.ref_fen != self.board.fen():
            self.ref_gray = self.ref_bgr = None
            self.ref_fen = None
            return False
        # Geometry invalidation: warp corners have jumped since the reference capture
        # (marker refound/camera moved) → re-capture base truth instead of chasing phantom
        # diffs. Move evidence is not lost: the move remains visible on the board and
        # will be detected against the NEW reference on the next move.
        if self._corners_jumped():
            self.ref_gray = self.ref_bgr = None
            self.ref_fen = None
            self._confirmer.reset()
            self._clear_stuck()
            self.note = "Board geometry shifted (marker/camera) — re-capturing reference"
            return False
        return True

    def _compute_evidence(self, cur):
        """Step 2 — per-square diff vs base truth → median normalization (global exposure
        jump) → z-scores (per-square noise model; local drift/square characteristics)."""
        _t0 = time.perf_counter()
        diffs = per_square_diff(self.ref_gray, cur, self._det_size,
                                self.profile.white_pov, extend_up=self.overhang)
        diffs = normalize_diffs(diffs)
        z = self.noise.z(diffs)
        self._diff_ms = (time.perf_counter() - _t0) * 1000.0
        return diffs, z

    def _apply_vetoes(self, cur, cur_bgr, z, changed):
        """Step 3 — two vetoes with different semantics:
        - Cast shadow (HSV per Cucchiara + census confirmation): vetoed squares only leave
          the changed set (gates); their z-values are PRESERVED for scoring. A VACATED square
          often looks like a darkening to the HSV test (piece gone → board color) — zeroing z
          would lose the real move's from-evidence.
        - Opaque occlusion (color outlier vs board gamut: hand/arm/sleeve): NEUTRALIZED, z is
          zeroed — an occluder carries no real move information and must neither serve as a
          move endpoint nor penalize other moves as a "hot untouched" square.
        Returns (changed, shadow_veto, occluded_set)."""
        self._shadow_vetoed = []
        shadow_veto: set[str] = set()
        if cur_bgr is not None and self.ref_bgr is not None and changed:
            bs = self._det_size
            cand_boxes = [square_region(s, bs, self.profile.white_pov,
                                        extend_up=self.overhang) for s in changed]
            rows = (min(b[1] for b in cand_boxes) - 1, max(b[3] for b in cand_boxes) + 1)
            cens = per_square_census_change(self.ref_gray, cur, bs,
                                            self.profile.white_pov, extend_up=self.overhang,
                                            ref_codes=self._ref_census_codes(), rows=rows)
            shadows = hsv_shadow_squares(self.ref_bgr, cur_bgr, self._det_size,
                                         self.profile.white_pov, changed,
                                         extend_up=self.overhang)
            shadow_veto = {s for s in changed if s in shadows and cens[s] < self.census_thr}
            if shadow_veto:
                changed -= shadow_veto
                self._shadow_vetoed = sorted(shadow_veto)
        return changed, shadow_veto, set()

    def _ref_census_codes(self):
        """Census codes of the current reference, cached — the reference changes rarely
        (commit/re-anchor) while the shadow veto needs the codes every stable frame with
        candidates. Cell patches mutate ref_gray IN PLACE, so they must invalidate the
        cache explicitly (_maybe_patch_anomaly)."""
        if self._ref_census_for is not self.ref_gray:
            self._ref_census = census_transform(self.ref_gray)
            self._ref_census_for = self.ref_gray
        return self._ref_census

    def _generate_hypothesis(self, z, scored, viable, changed, obs_move, best, second,
                             cur, cur_bgr, blocked_n: int = 0):
        """Step 6 — turn the evidence into exactly one candidate, or handle the frame
        (stuck marked + anomaly patcher, ambiguous note, promotion pending) and return None.
        Candidate: {"moves": [mv] | [mv1, mv2], "prior_used": bool, "vote": bool,
        "note": str | None}. Under self.lock."""
        # Too much change: occlusion/instability (base truth stays) — unless a move PAIR
        # explains it (fast play: 2 half-moves = up to ~8 changed squares). Occluded/latched
        # squares count as changed here; a pair is never trusted while a hand is detected.
        if len(changed) + blocked_n > self.max_changed:
            if blocked_n == 0 and len(changed) <= self.max_changed + 2:
                pair = self._pair_candidate(z, best)
                if pair is not None:
                    return pair
            self._confirmer.reset()
            self._mark_stuck("too_many_changed")   # Spec 09: recovery trigger via _cnn_tick
            self._maybe_patch_anomaly(changed, best, cur, cur_bgr)
            if self._stuck_reason is not None:
                self.note = (f"Much change ({len(changed)} squares + {blocked_n} occluded) — "
                             f"occluded/unstable, no move committed (base truth unchanged)")
            return None

        # Pair check BEFORE the single commit (fast play): a reply that landed in the same
        # settle window leaves a net-POSITIVE single move (it explains its own 2 squares just
        # fine) — committing it would silently swallow the reply and desync the game.
        # ONLY with CNN verify: the pair goes pending and must match the post-pair position,
        # which kills ghost pairs. Without CNN a garbage pair covering 4 residue squares
        # always outscores the true single (clip01 replay) — keep the conservative order
        # there (pair only when no single fits, below).
        cnn_on = self.cnn_verify and self.cnn_run and not self._cnn_failed
        if cnn_on:
            pair = self._pair_candidate(z, best)
            if pair is not None:
                return pair

        # No single move explains the change → pair (fast play, direct-commit path) →
        # destination-only candidate (low-contrast vacated square; CNN-confirmed ONLY)
        # → stuck + self-healing.
        if obs_move is None or best < 0.0:
            if not cnn_on:
                pair = self._pair_candidate(z, best)
                if pair is not None:
                    return pair
            if self.cnn_verify and self.cnn_run and not self._cnn_failed:
                sm = self._single_endpoint_candidate(z, scored)
                if sm is not None:
                    return {"moves": [sm], "prior_used": False, "vote": False,
                            "note": f"low-contrast move {self.board.san(sm)}? verifying via CNN…"}
            self._confirmer.reset()
            self._mark_stuck("no_legal_move")      # Spec 09: recovery trigger via _cnn_tick
            self._maybe_patch_anomaly(changed, best, cur, cur_bgr)   # nudge/drift (part 4)
            if self._stuck_reason is not None:
                self.note = (f"Change on {len(changed)} squares, but no legal move fits — "
                             f"possible wrong move, base truth unchanged (resync needed?)")
            return None

        # Ambiguity gate (LL units, light-independent) + prior tie-break (part 2).
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
                    return None
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
                    return None
            else:
                self._confirmer.reset()
                self.note = "ambiguous change — please move cleanly / wait briefly"
                return None
        return {"moves": [obs_move], "prior_used": prior_used, "vote": True}

    def _pair_candidate(self, z, best_single):
        """Fast play: 2 half-moves landed in one settle window. Candidate only when the best
        pair is clearly better than the best single move AND the second-best pair (LL margin);
        otherwise None and the normal stuck logic applies. Under self.lock."""
        pairs = loglik_pair_scores(self.board, z, self.z_thr, self.ll_k)
        if not pairs:
            return None
        seq, best = pairs[0]
        second = pairs[1][1] if len(pairs) > 1 else -1e9
        if best < 0.0 or best - max(second, best_single) < self.ambiguity_margin_ll:
            return None
        self._best_score, self._second_score = best, max(second, best_single)
        return {"moves": list(seq), "prior_used": False, "vote": True}

    def _san_sequence(self, moves: list[chess.Move]) -> list[str]:
        """SANs of a not-yet-pushed move sequence (board stays untouched)."""
        b = self.board.copy(stack=False)
        sans = []
        for mv in moves:
            sans.append(b.san(mv))
            b.push(mv)
        return sans

    def _dispatch(self, moves: list[chess.Move], cur, cur_bgr, prior_used: bool,
                  note: str | None = None) -> None:
        """Step 9 — the ONE commit gate for every candidate kind: with CNN verify the
        candidate becomes pending and must survive occupancy verification (single AND pair);
        without CNN it commits directly. Under self.lock."""
        sans = self._san_sequence(moves)
        if self.cnn_verify and self.cnn_run and not self._cnn_failed:
            self._pending = {"ucis": [m.uci() for m in moves], "uci": moves[0].uci(),
                             "fen": self.board.fen(), "cur": cur, "cur_bgr": cur_bgr,
                             "frames": 0, "prior_used": prior_used}
            self._recovery_confirmer.reset()
            self._verify_state = "verifying"
            self.note = note or f"checking {' + '.join(sans)} via CNN…"
            return
        # Standard: diff commits directly (fast). Shadows are already removed via HSV veto;
        # on stuck/deviation, CNN recovery/control kicks in via _cnn_tick.
        if len(moves) == 1:
            self._commit_move(moves[0], cur, cur_bgr, recovered=False, prior_used=prior_used)
        else:
            self._commit_sequence(moves, cur, cur_bgr, decider="diff_pair")

    def _single_endpoint_candidate(self, z: dict[str, float], scored):
        """Best legal move that is strongly evidenced at its DESTINATION only — the origin is
        below the both-endpoints viability gate (low-contrast vacated square). Returns the move
        only if UNAMBIGUOUS (the top such candidate is clearly ahead of any candidate to a
        DIFFERENT destination), so the CNN then just confirms this one move. `scored` is the
        loglik ranking (from `loglik_scores`)."""
        strong = {s for s in _ALL if z.get(s, 0.0) >= self.z_thr}
        if len(strong) != 1:                              # exactly one strongly-changed square
            return None
        cands = [(mv, sc) for mv, sc in scored
                 if chess.square_name(mv.to_square) in strong and sc > 0.0]
        if not cands:
            return None
        best_mv, best_sc = cands[0]
        # Ambiguous if another candidate targets a DIFFERENT square with comparable score.
        for mv, sc in cands[1:]:
            if mv.to_square != best_mv.to_square and best_sc - sc < self.ambiguity_margin_ll:
                return None
        return best_mv

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
        # Maintain timer: start new squares, remove disappeared ones. The patcher also runs
        # WITH CNN configured: CNN recovery needs stuck_count ≥ settle_frames + cooldown +
        # voting before it can heal — a long window in which commit-frame hand residue keeps
        # producing phantom candidates. The cell patch is cheap, local and guarded (only
        # persistent squares that no viable move explains), so it complements recovery.
        self._anomaly_since = {sq: self._anomaly_since.get(sq, now) for sq in changed}
        if not changed or best_ll >= 0.0 or len(changed) > self.max_changed + 2:
            return
        patched, why = [], ""
        for sq in sorted(changed):
            occupied = self.board.piece_at(chess.parse_square(sq)) is not None
            needed = self.nudge_timeout_s if occupied else self.drift_window_s
            if now - self._anomaly_since[sq] < needed:
                continue
            # Patch the SAME pixels the diff looks at (incl. overhang), else the extended
            # strip above the cell stays hot forever and the healing never converges.
            x0, y0, x1, y1 = square_region(sq, self._det_size, self.profile.white_pov,
                                           inset=0.0, extend_up=self.overhang)
            self.ref_gray[y0:y1, x0:x1] = cur[y0:y1, x0:x1]
            if cur_bgr is not None and self.ref_bgr is not None:
                self.ref_bgr[y0:y1, x0:x1] = cur_bgr[y0:y1, x0:x1]
            patched.append(sq)
            why = "piece moved/hand residue" if occupied else "light drift"
        if not patched:
            return
        for sq in patched:
            self._anomaly_since.pop(sq, None)
        self._ref_census_for = None                     # ref_gray mutated in place → recode
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
        # Grid lines
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
        # Squares occluded by hand (baseline absdiff + dilation) — orange.
        for sq in self._occluded_vetoed:
            x0, y0, x1, y1 = square_region(sq, bs, self.profile.white_pov, inset=0.06)
            cv2.rectangle(img, (x0, y0), (x1, y1), (0, 200, 255), 2)
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
        # State badge + grid coverage
        badge = {"moving": (0, 0, 255), "move": (0, 200, 0), "waiting": (0, 180, 0),
                 "occluded": (0, 140, 255)}.get(self.state, (160, 160, 160))
        extra = ""
        gc = getattr(self, "_grid_coverage", None)
        if gc is not None and gc < 0.95:
            extra = f"  grid={gc:.2f}"
        cv2.putText(img, f"{self.state}{extra}  {self.note}", (10, 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, badge, 2, cv2.LINE_AA)
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
                # Who decided the last move + whether it's been rated (good/bad feedback UI).
                "decisions": list(self._decision_log),
                "last_decision": (None if not self._recent_decisions else
                                  {k: self._recent_decisions[-1]["rec"][k]
                                   for k in ("ply", "move", "san", "decider", "reason")}),
                # Session recording state (auto-labeled dataset from a correct game).
                "recording": self._recorder is not None,
                "record_session": None if self._recorder is None else self._recorder.session_id,
                "record_count": 0 if self._recorder is None else self._recorder.count,
                "record_inventory_filter": self.record_inventory_filter,
                "record_skipped_inventory": self._record_skipped_inventory,
                "record_skip_reason": self._record_skip_reason,
                # Camera health: False = no frames arriving (feed dropped / device gone).
                "camera_ok": self._camera_ok,
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
                    "motion_since_ref": self._motion_since_ref,
                    "motion_age_s": round(time.time() - self._last_motion_ts, 1) if self._last_motion_ts else None,
                    "hold_left_s": round(max(0.0, self._hold_until - time.time()), 2),
                    "frames_used": self.avg_frames,
                    "settle_frames": self.settle_frames,
                    "n_changed": len(self._changed),
                    "changed": list(self._changed),
                    "changed_vals": [[s, v] for s, v in self._changed_vals],
                    "shadow_vetoed": list(self._shadow_vetoed),
                    "occluded_vetoed": list(self._occluded_vetoed),
                    "tainted": sorted(self._tainted),
                    "grid_coverage": round(self._grid_coverage, 2),
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
                    "pending_move": (None if self._pending is None else
                                     " ".join(self._pending_ucis(self._pending))),
                    "verify_frames": 0 if self._pending is None else self._pending["frames"],
                    "verify_votes": self._recovery_confirmer.count,
                    "cnn_agreement": round(self._cnn_agreement, 3),
                    "cnn_best_move": self._cnn_best_move,
                    "cnn_conf_thr": self.cnn_conf_thr,
                },
            }

    def current_fen(self) -> str:
        """Thread-safe snapshot of the current position FEN (for the Stockfish analyzer)."""
        with self.lock:
            return self.board.fen()

    def mark_viewer(self) -> None:
        """Called by the MJPEG stream on every poll: keeps the overlay encode alive
        while ANY viewer is connected — restart-proof (the stream re-resolves the
        current tracker per iteration, so a tracker created after the browser
        connected still gets the heartbeat; a bound counter did not)."""
        self._last_viewer_ts = time.time()

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
        # Draw the motion ROI polygon (green, board-aligned) — the
        # centre-expanded quadrilateral that _roi_motion covers via its AABB.
        pts = self._roi_polygon(corners, self.motion_margin)
        cv2.polylines(img, [np.array(pts, np.int32)], True, (0, 255, 0), 1, cv2.LINE_AA)
        h, w = img.shape[:2]
        if w > width:
            img = cv2.resize(img, (width, max(1, int(h * width / w))))
        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 80])
        return buf.tobytes() if ok else None

    def undo(self):
        """Undo the last move. Implicit feedback: the undone move was WRONG → log it as a
        hard-negative (bad) and drop its frame from the session so it never becomes a mislabeled
        crop. Repeatable: each undo pops one move (handles a cascade of wrong decisions)."""
        bad = None
        with self.lock:
            if self.history:
                self.board.pop()
                self.history.pop()
                self.last_move = None
                self.ref_gray = self.ref_bgr = None                # re-capture the reference
                self.ref_fen = None
                self._confirmer.reset()
                self._gray_buf.clear()
                self._bgr_buf.clear()      # keep gray/color averages aligned (vetoes/gamut)
                self._clear_stuck()
                self.recovered_last = False
                self._pending, self._verify_state = None, None
                self._promo_pending = None
                self._anomaly_since = {}
                self._tainted = {}
                self.prior_last = False
                if self._recent_decisions:
                    bad = self._recent_decisions.pop()
                while self._decision_log and self._decision_log[-1]["ply"] > len(self.history):
                    self._decision_log.pop()
                # Drop the undone move's photo: still deferred → just forget it; already
                # captured → remove the frame from the recorded session.
                if self._pending_capture is not None:
                    self._pending_capture = None
                elif self._recorder is not None:
                    self._recorder.undo()
                self.note = "last move undone (logged as bad example)"
        # File I/O outside the lock: the undone move is a hard-negative for retraining/tuning.
        if bad is not None:
            try:
                self._write_feedback_example(bad["rec"], bad["imgs"], "bad")
            except Exception as e:  # noqa: BLE001 — best-effort logging, never break undo
                log.warning("undo feedback write failed: %s", e)
