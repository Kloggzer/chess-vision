"""Golden-fixture emitter for the Kotlin port of the move tracker (specs/17, phase 00b).

Drives the **real** `chesslab.move_tracker.tracker.MoveTracker` synchronously over the
committed Blender test clips and dumps, per emitted frame:

* **Tier A** — the pure primitives (`per_square_diff`, `census_transform`,
  `per_square_census_change`, `normalize_diffs`, `SquareNoise`, `hsv_shadow_squares`,
  `board_color_gamut`, `occlusion_color_squares`, `motion_score`,
  `_baseline_occlusion_and_shadow` incl. the RAW undilated core, `loglik_scores`,
  `loglik_pair_scores`, `move_prior`, `move_touched_squares`, `move_destination_squares`,
  `square_region`, `square_to_crop_box`).
* **Tier B** — the `_try_detect` decision outcome (state, changed/veto/taint sets,
  best/second LL, candidate, stuck reason, confirmer, commit, note).
* **Tier C** — the native-dependent stage (source JPEG + corners + grid-line coverage +
  pre-CLAHE luma), consumed by `:core-geometry`, never by `:core-engine`.

Everything is byte-stable: a virtual clock replaces `time`, floats are rounded, sets are
sorted, gzip is written with `mtime=0`.

Usage::

    uv run python scripts/emit_parity_fixtures.py --all \
        --out android/core-engine/src/test/resources/parity
    uv run python scripts/emit_parity_fixtures.py --clip blender-opening --out <dir>
"""

from __future__ import annotations

import argparse
import gzip
import json
import shutil
import sys
import time as _real_time
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import yaml

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT / "src") not in sys.path:  # allow `python scripts/...` without an install
    sys.path.insert(0, str(_ROOT / "src"))

CLIPS_DIR = _ROOT / "tests" / "data" / "testclips"
MANIFEST = CLIPS_DIR / "manifest.yaml"

# ---------------------------------------------------------------------------------------
# Tuning constants (fixed in-file — the emitter must be reproducible from the repo alone)
# ---------------------------------------------------------------------------------------
SIZE_CAP_BYTES = 41_943_040          # 40 MiB, hard budget for parity/ (acceptance criterion)
GZIP_LEVEL = 6
FLOAT_NDIGITS = 6
VCLOCK_START = 1_700_000_000.0

# Sampling. The tracker is driven over EXACTLY the emitted frames, so the fixture is a
# self-consistent replay with no hidden inputs — but the sample set must keep enough
# CONSECUTIVE frames for the settle/averaging counters to behave like a full-rate run:
#   * WARMUP_FRAMES  — the first baseline needs `settle_frames` consecutive stable frames;
#   * DENSE_BEFORE/AFTER around each commit — settle, confirm and the post-commit reference.
WARMUP_FRAMES = 8
# Escalation ladder (denseBefore, denseAfter, sparseStep). A clip is emitted with the first
# rung that reproduces the manifest move list AND fits the remaining budget; a clip that
# matches on rung 0 never costs more than rung 0.
SAMPLING_LADDER = ((8, 4, 8), (14, 8, 4), (20, 12, 2))
BYTES_PER_FRAME_ESTIMATE = 45_000    # budget planning only (planes + frame JSON)
RESERVE_BYTES = 800_000              # slack (shared fixtures + tier-C JPEGs are counted live)

# Every field of `TrackerConfig` in specs/17-android-rewrite/entry.md, in declaration order,
# plus the four derived members. `meta.json -> effectiveConfig` MUST cover all of them; the
# generator aborts otherwise, so a knob added to the seam cannot silently go unfixtured.
TRACKER_CONFIG_FIELDS = (
    "motionThr", "motionPxThr", "zThr", "ambiguityMarginLl", "reanchorLlFloor",
    "nudgeTimeoutS", "driftWindowS", "maxChanged", "censusThr", "censusZWeight",
    "occlCensusThr", "cnnConfThr", "cnnCooldownS", "cnnCheckIntervalS", "verifyWindow",
    "cnnMinAgreement", "cnnMarginSquares", "recoveryMaxPlies", "minConfidentBoard",
    "minConfidentRecovery", "motionMargin", "overhang", "alignEvery", "alignScale",
    "cornerJumpPx", "motionHoldS", "occlusionColorThr", "minGridLineCoverage",
    "reconnectGraceS", "diffClaheClip", "requireMotionForMove", "motionRecencyS",
    "commitLlFloor", "detectScale", "desyncObsN", "verifyObsVotes", "observerIntervalS",
    "llK", "darkLumaThr", "cnnVerify", "liveAlign", "usePrior", "boardSize",
    # derived (TrackerConfig.settleFrames(cnnOn) / avgFrames / confirmFrames / detSize)
    "settleFrames", "avgFrames", "confirmFrames", "detSize",
)

CNN_FIXTURE_SEED = 20260724          # documented, fixed: the synthetic CNN probability seed
NATIVE_FRAMES_PER_CLIP = 3           # Tier C source JPEGs per clip
JPEG_QUALITY = 92
CENSUS_CROP = 16                     # census code crop edge length (px)
TOP_SCORES = 12                      # loglik/pair truncation

# Clips that must be present even if the budget forces a subset (phase-00b acceptance).
REQUIRED_CLIPS = (
    "blender-opening", "blender-capture", "blender-castle", "blender-queenside",
    "blender-enpassant", "blender-promotion", "blender-underpromo", "blender-takeback",
    "blender-phantom", "blender-illegal", "blender-hover", "blender-shadowsweep",
    "blender-resting",
)

_ALL_SQUARES = [f"{f}{r}" for r in range(1, 9) for f in "abcdefgh"]

# A NON-numeric camera source on purpose: a digit source makes `lens.should_undistort`
# report "this is a local camera, undistortion is active", the freshly written temp profile
# then reads STALE, and `ensure_profile` tries to auto-recalibrate — which opens the
# machine's REAL camera 0 (it calls `open_camera`, not the patched `open_source`). The
# fixtures must not depend on whether the dev box has a webcam or a lens calibration.
_SOURCE = "parity-clip"
COLORSPACE_SWEEP_STEP = 8


# ---------------------------------------------------------------------------------------
# Determinism helpers
# ---------------------------------------------------------------------------------------
class _VirtualClock:
    """Drop-in replacement for the `time` module inside `tracker.py`.

    The tracker reads wall clock for taint expiry, motion recency and the motion hold
    window; with the real clock the fixtures would depend on how fast the emitter runs.
    The clock is advanced explicitly by the driver, by the *video* time between two
    consumed frames — which is exactly what `tests/test_clips.py` produces with
    `realtime=True`, the mode the expected move lists were tuned under.
    """

    def __init__(self) -> None:
        self._t = VCLOCK_START

    def advance(self, seconds: float) -> None:
        self._t += seconds

    def time(self) -> float:
        return self._t

    def monotonic(self) -> float:
        return self._t

    def perf_counter(self) -> float:
        return self._t

    def time_ns(self) -> int:
        return int(self._t * 1e9)

    def sleep(self, _seconds: float = 0.0) -> None:
        return None


def _r(value: Any) -> float:
    """Round to the fixture float precision (and strip numpy scalar types)."""
    return round(float(value), FLOAT_NDIGITS)


def _rmap(mapping: dict[str, Any]) -> dict[str, float]:
    return {k: _r(v) for k, v in sorted(mapping.items())}


def _sset(values: Any) -> list[str]:
    return sorted(str(v) for v in values)


def _write_json(path: Path, obj: Any) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n"
    data = text.encode("utf-8")
    path.write_bytes(data)
    return len(data)


def _write_jsonl(path: Path, rows: list[dict]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = "".join(json.dumps(r, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n"
                   for r in rows)
    data = text.encode("utf-8")
    path.write_bytes(data)
    return len(data)


def _write_gz(path: Path, payload: bytes) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    buf = gzip.compress(payload, compresslevel=GZIP_LEVEL, mtime=0)
    path.write_bytes(buf)
    return len(buf)


def _delta(cur: np.ndarray, prev: np.ndarray | None) -> bytes:
    """Byte-exact delta of two uint8 planes (`prev + delta mod 256 == cur`)."""
    flat = np.ascontiguousarray(cur).reshape(-1)
    if prev is None:
        return flat.tobytes()
    base = np.ascontiguousarray(prev).reshape(-1)
    return (flat.astype(np.int16) - base.astype(np.int16)).astype(np.uint8).tobytes()


# ---------------------------------------------------------------------------------------
# Tracker driver
# ---------------------------------------------------------------------------------------
class _NullCapture:
    """`MoveTracker.__init__` opens a capture; the emitter feeds frames by hand."""

    def read(self):
        return False, None

    def release(self) -> None:
        return None

    def isOpened(self) -> bool:  # noqa: N802 — cv2 API shape
        return False

    def get(self, _prop):
        return 0.0

    def set(self, _prop, _value):
        return False


class ClipDriver:
    """Synchronous, single-threaded stand-in for `MoveTracker._loop`.

    Mirrors `tracker.py:1490-1763` step by step for everything that can run without a
    camera thread, a CNN worker or a recorder. Never calls `mt.start()`.
    """

    def __init__(self, entry: dict, trk_module, clock: _VirtualClock) -> None:
        self.entry = entry
        self.trk = trk_module
        self.clock = clock
        self.profile_name = "__parity_fixture__"
        self.mt = None
        self._profile_file = None

    # -- lifecycle ----------------------------------------------------------------
    def __enter__(self) -> ClipDriver:
        from chesslab.calibration import (
            CalibrationProfile,
            CropParams,
            compute_homography,
            profile_path,
        )

        entry = self.entry
        size = tuple(int(v) for v in entry["frame_size"])
        target = int(entry["board_size"])
        corners = entry["corners"]
        from chesslab import lens as _lens

        self._profile_file = profile_path(self.profile_name)
        prof = CalibrationProfile(
            profile=self.profile_name, camera_index=-1, frame_size=size, board_size=target,
            image_corners=corners, homography=compute_homography(corners, target, 0.0),
            white_pov=True, crop=CropParams.default(target), margin=0.0,
            source=entry["file"])
        # Stamp the lens state exactly as `profile_from_frame` does. Without it the
        # profile reads STALE and `ensure_profile` tries to auto-recalibrate — which
        # opens the REAL camera 0 (it uses `open_camera`, not the patched `open_source`)
        # and would make the fixtures depend on the machine's webcam.
        _lens.stamp_profile(prof, frame_size=size, source=_SOURCE)
        prof.save(self._profile_file)

        original_open_source = self.trk.open_source
        self.trk.open_source = lambda _src: _NullCapture()
        try:
            self.mt = self.trk.MoveTracker(
                profile=self.profile_name, source=_SOURCE, live_align=False, cnn_run=None,
                auto_record=False, **(entry.get("tracker") or {}))
        finally:
            self.trk.open_source = original_open_source
        self.mt.reset_to_start(entry.get("start_fen"))
        return self

    def __exit__(self, *_exc) -> None:
        if self.mt is not None and getattr(self.mt, "cap", None) is not None:
            self.mt.cap = None
        if self._profile_file is not None:
            self._profile_file.unlink(missing_ok=True)
            self._profile_file.with_suffix(self._profile_file.suffix + ".bak").unlink(
                missing_ok=True)

    # -- one frame ----------------------------------------------------------------
    def step(self, frame) -> dict | None:
        """Run one `_loop` iteration. Returns the per-frame observation dict, or None
        when the loop `continue`s before detection (no warp / too dark)."""
        mt = self.mt
        trk = self.trk
        mt._frame_seq += 1
        seq = mt._frame_seq
        target_size = mt._det_size if mt.detect_scale < 1.0 else None
        warped_det = mt._warp(frame, target_size)
        if warped_det is None:
            return None
        luma = float(cv2.mean(cv2.cvtColor(warped_det, cv2.COLOR_BGR2GRAY))[0])
        if mt.dark_luma_thr > 0 and luma < mt.dark_luma_thr:
            return None
        gray_det = mt._gray(warped_det)
        motion_roi = mt._roi_motion(frame)
        now = self.clock.time()
        mt._last_frame = frame

        if mt._last_loop_ts:
            dt = now - mt._last_loop_ts
            if dt > 0:
                mt._fps = 0.9 * mt._fps + 0.1 * (1.0 / dt) if mt._fps else 1.0 / dt
        mt._last_loop_ts = now

        prev_gray = gray_det if mt.prev_gray is None else mt.prev_gray
        mt.prev_gray = prev_gray
        motion_frame = trk.motion_score(mt.prev_gray, gray_det, mt.motion_px_thr)
        motion = max(motion_frame, motion_roi)
        mt.prev_gray = gray_det
        mt._motion = motion

        baseline = None
        if mt.ref_gray is not None and mt.state not in ("waiting", "move"):
            raw_occ, raw_shadow, occ_core = trk._baseline_occlusion_and_shadow(
                gray_det, mt.ref_gray, mt._det_size, mt.motion_px_thr * 4,
                mt.profile.white_pov, mt._det_boxes,
                ref_codes=mt._ref_census_codes(), occl_census_thr=mt.occl_census_thr,
                cur_bgr=warped_det, gamut=mt._ref_gamut, color_thr=mt.occlusion_color_thr)
            baseline = {"occludedDilated": _sset(raw_occ), "shadowDilated": _sset(raw_shadow),
                        "core": _sset(occ_core), "absThr": _r(mt.motion_px_thr * 4),
                        "occlCensusThr": _r(mt.occl_census_thr),
                        "colorThr": _r(mt.occlusion_color_thr)}
            # The "strong absdiff" candidate set the baseline classifier works on, plus the
            # chroma-outlier verdict on it — this is the hand-over-the-board case the
            # occlusion-colour veto exists for (it never fires on the quiet detection
            # frames, so without this the fixture would only ever carry empty sets).
            d_abs = cv2.absdiff(gray_det, mt.ref_gray)
            means = trk._region_means(cv2.integral(d_abs), mt._det_boxes)
            strong = [sq for sq, om in zip(trk._ALL, means, strict=True)
                      if om > mt.motion_px_thr * 4]
            baseline["strongCandidates"] = _sset(strong)
            baseline["chromaOutliers"] = _sset(trk.occlusion_color_squares(
                warped_det, mt._ref_gamut, mt._det_size, mt.profile.white_pov, strong,
                thr=mt.occlusion_color_thr))
            for sq in raw_occ:
                mt._occlusion_expiry[sq] = now + 0.1
            for sq in occ_core:
                mt._occl_core_expiry[sq] = now + 0.1
            mt._shadow_vetoed = sorted(raw_shadow)
        mt._motion_occluded_squares = {sq for sq, exp in mt._occlusion_expiry.items()
                                       if now < exp}
        mt._occluded_vetoed = sorted(mt._motion_occluded_squares)

        detected = False
        cur = cur_bgr = None
        cur_frames: list[int] = []
        hist_before = len(mt.history)
        if motion > mt.motion_thr:
            mt.stable_count = 0
            mt._motion_since_ref = True
            mt._last_motion_ts = now
            mt._confirmer.reset()
            mt._gray_buf.clear()
            mt._bgr_buf.clear()
            if mt._occluded_by_grid(gray_det):
                mt.state = "occluded"
                mt._occl_grid_active = True
            else:
                mt.state = "moving"
            mt._hold_until = now + mt.motion_hold_s
        else:
            mt.stable_count += 1
            mt._gray_buf.append(gray_det)
            mt._bgr_buf.append(warped_det)
            self._buf_frames.append(self._video_index)
            ready = mt.stable_count >= mt.settle_frames and now >= mt._hold_until
            if len(mt._gray_buf) >= mt.avg_frames:
                if mt._occluded_by_grid(gray_det):
                    mt._occl_grid_active = True
                    mt.state = "occluded"
                    mt.note = ("waiting for clear view of the board…" if mt.ref_gray is None
                               else "Board partly covered (grid lines hidden) — "
                                    "waiting for clear view")
                else:
                    if mt._occl_grid_active:
                        mt._occl_grid_active = False
                        mt._hold_until = max(mt._hold_until, now + mt.motion_hold_s)
                        mt._gray_buf.clear()
                        mt._bgr_buf.clear()
                        self._buf_frames.clear()
                        ready = False
                    cur = mt._mean_gray()
                    cur_bgr = mt._mean_bgr()
                    cur_frames = list(self._buf_frames)[-len(mt._gray_buf):]
                    mt._last_cur, mt._last_cur_bgr = cur, cur_bgr
                    if mt.ref_gray is None:
                        if ready:
                            mt._set_ref(cur, cur_bgr)
                            self._ref_frames = list(cur_frames)
                            self._gamut_frames = list(cur_frames)
                            self._ref_patched = False
                        else:
                            mt.note = "waiting for clear view of the board…"
                    elif ready and mt.state != "move":
                        core_now = {sq for sq, exp in mt._occl_core_expiry.items()
                                    if now < exp}
                        if len(core_now) > 2:
                            mt.state = "occluded"
                        else:
                            detected = True
                            ref_frames_in = None if self._ref_patched else list(self._ref_frames)
                            self._pre_detect_ref = (mt.ref_gray, mt.ref_bgr, mt._ref_gamut)
                            self._pre_detect = {"cur": cur, "curBgr": cur_bgr,
                                                "curFrames": list(cur_frames),
                                                "refFrames": ref_frames_in}
                            ref_census_for_before = mt._ref_census_for
                            mt._try_detect(cur, cur_bgr, seq=seq)
                            self._ref_patched = self._ref_patched or (
                                mt._ref_census_for is None
                                and ref_census_for_before is not None)
                            self._gamut_changed = mt._ref_gamut is not self._pre_detect_ref[2]
                            self._active_gamut_frames = list(self._gamut_frames)
                            if mt.ref_gray is not self._pre_detect_ref[0]:
                                self._ref_frames = list(cur_frames)
                                self._ref_patched = False
                            if self._gamut_changed:
                                self._gamut_frames = list(cur_frames)
            if mt.state not in ("move", "occluded"):
                mt.state = "waiting"

        promo = None
        if mt._promo_pending is not None:
            promo = {"from": mt._promo_pending["from"], "to": mt._promo_pending["to"]}
            mt.choose_promotion(self._promotion_piece)

        return {"seq": seq, "gray": gray_det, "bgr": warped_det, "luma": luma,
                "motion": motion, "motionFrame": motion_frame, "motionRoi": motion_roi,
                "baseline": baseline, "detected": detected, "cur": cur, "curBgr": cur_bgr,
                "curFrames": cur_frames, "histBefore": hist_before, "promo": promo,
                "corners": mt._last_corners}

    # -- per-run scratch ----------------------------------------------------------
    _buf_frames: list[int]
    _ref_frames: list[int]
    _ref_patched: bool
    _video_index: int
    _promotion_piece: str
    _pre_detect: dict | None
    _pre_detect_ref: tuple
    _gamut_changed: bool
    _gamut_frames: list[int]
    _active_gamut_frames: list[int]

    def reset_scratch(self, promotion_piece: str) -> None:
        self._buf_frames = []
        self._ref_frames = []
        self._ref_patched = False
        self._video_index = -1
        self._promotion_piece = promotion_piece
        self._pre_detect = None
        self._pre_detect_ref = (None, None, None)
        self._gamut_changed = False
        self._gamut_frames = []
        self._active_gamut_frames = []


# ---------------------------------------------------------------------------------------
# Tier A
# ---------------------------------------------------------------------------------------
def _tier_a(mt, trk, pre: dict, ref_gray, ref_bgr, gamut, first_frame: bool) -> dict:
    """Golden values of the pure primitives on the pair the tracker actually used."""
    det = mt._det_size
    pov = mt.profile.white_pov
    over = mt.overhang
    cur, cur_bgr = pre["cur"], pre["curBgr"]
    ref_codes = trk.census_transform(ref_gray)

    diffs_raw = trk.per_square_diff(ref_gray, cur, det, pov, extend_up=over)
    diffs = trk.normalize_diffs(diffs_raw)
    cens_raw = trk.per_square_census_change(ref_gray, cur, det, pov, extend_up=over)
    cens_norm = trk.normalize_diffs(cens_raw)

    x0, y0 = trk.square_region("e2", det, pov)[0:2]
    x0 = max(0, min(det - CENSUS_CROP, int(x0)))
    y0 = max(0, min(det - CENSUS_CROP, int(y0)))
    codes = trk.census_transform(cur)[y0:y0 + CENSUS_CROP, x0:x0 + CENSUS_CROP]

    board = mt.board
    scored = trk.loglik_scores(board, pre["z"], mt.z_thr, mt.ll_k)
    pairs = trk.loglik_pair_scores(board, pre["z"], mt.z_thr, mt.ll_k)
    legal = list(board.legal_moves)

    candidates = sorted(pre["changedPreVeto"])
    shadows = trk.hsv_shadow_squares(ref_bgr, cur_bgr, det, pov, candidates,
                                     extend_up=over) if ref_bgr is not None else set()
    occl_color = trk.occlusion_color_squares(cur_bgr, gamut, det, pov, candidates,
                                             thr=mt.occlusion_color_thr)
    occ_dil, sha_dil, core = trk._baseline_occlusion_and_shadow(
        cur, ref_gray, det, mt.motion_px_thr * 4, pov, mt._det_boxes,
        ref_codes=ref_codes, occl_census_thr=mt.occl_census_thr,
        cur_bgr=cur_bgr, gamut=gamut, color_thr=mt.occlusion_color_thr)

    out: dict[str, Any] = {
        "curFrames": pre["curFrames"],
        "refFrames": pre["refFrames"],
        "perSquareDiff": _rmap(diffs_raw),
        "normalizedDiffs": _rmap(diffs),
        "censusRaw": _rmap(cens_raw),
        "censusNormalized": _rmap(cens_norm),
        "censusCodeCrop": {"x0": x0, "y0": y0, "w": CENSUS_CROP, "h": CENSUS_CROP,
                           "codes": [int(v) for v in codes.reshape(-1)]},
        "noiseZ": _rmap(pre["noiseZ"]),
        "censusNoiseZ": None if pre["censusNoiseZ"] is None else _rmap(pre["censusNoiseZ"]),
        "zFused": _rmap(pre["z"]),
        "noiseExclude": _sset(pre["noiseExclude"]),
        "noiseMean": _rmap(mt.noise.mean),
        "noiseStd": _rmap(mt.noise.std),
        "censusNoiseMean": _rmap(mt.census_noise.mean),
        "censusNoiseStd": _rmap(mt.census_noise.std),
        "vetoCandidates": _sset(candidates),
        "hsvShadowSquares": _sset(shadows),
        "occlusionColorSquares": _sset(occl_color),
        "occlusionColorThr": _r(mt.occlusion_color_thr),
        "baselineAbsThr": _r(mt.motion_px_thr * 4),
        "occlCensusThr": _r(mt.occl_census_thr),
        "motionScore": _r(pre["motion"]),
        "baselineOcclusion": {"occludedDilated": _sset(occ_dil), "shadowDilated": _sset(sha_dil),
                              "core": _sset(core)},
        "loglikScores": [[mv.uci(), _r(sc)] for mv, sc in scored[:TOP_SCORES]],
        "loglikPairScores": [[[m.uci() for m in mvs], _r(sc)] for mvs, sc in pairs[:TOP_SCORES]],
        "movePrior": {mv.uci(): _r(trk.move_prior(board, mv)) for mv in legal},
        "moveTouchedSquares": {mv.uci(): _sset(trk.move_touched_squares(board, mv))
                               for mv in legal},
        "moveDestinationSquares": {mv.uci(): _sset(trk.move_destination_squares(board, mv))
                                   for mv in legal},
        "gamut": None,
        "activeGamutFrames": pre["activeGamutFrames"],
        "squareRegion": None,
        "squareToCropBox": None,
    }
    if pre["gamutFresh"] and mt._ref_gamut is not None:
        mu, inv, feats = mt._ref_gamut
        out["gamut"] = {"fromFrames": pre["gamutFrames"],
                        "mu": [_r(v) for v in mu],
                        "inv": [[_r(v) for v in row] for row in inv],
                        "feats": [[_r(v) for v in row] for row in feats]}
    if first_frame:
        out["squareRegion"] = {sq: [int(v) for v in trk.square_region(sq, det, pov,
                                                                     extend_up=over)]
                               for sq in _ALL_SQUARES}
        from chesslab.calibration import square_to_crop_box

        out["squareToCropBox"] = {sq: [int(v) for v in square_to_crop_box(sq, mt.profile)]
                                  for sq in _ALL_SQUARES}
    return out


def _install_evidence_probe(mt, trk, sink: dict) -> None:
    """Capture the intermediate evidence of `_try_detect` without touching `tracker.py`.

    `_compute_evidence` / `_apply_vetoes` are wrapped for the duration of the run so the
    fixture records the very values the decision was made on (z BEFORE the taint zeroing
    is not observable from outside, the post-veto sets are).
    """
    orig_evidence = mt._compute_evidence
    orig_vetoes = mt._apply_vetoes

    def compute_evidence(cur):
        diffs, cens, z = orig_evidence(cur)
        sink["diffs"] = dict(diffs)
        sink["cens"] = None if cens is None else dict(cens)
        sink["censRaw"] = None if mt._cens_raw is None else dict(mt._cens_raw)
        sink["noiseZ"] = mt.noise.z(diffs)
        sink["censusNoiseZ"] = None if cens is None else mt.census_noise.z(cens)
        sink["zPreTaint"] = dict(z)
        return diffs, cens, z

    def apply_vetoes(cur, cur_bgr, z, changed, cens=None):
        sink["z"] = dict(z)
        sink["changedPreVeto"] = set(changed)
        out = orig_vetoes(cur, cur_bgr, z, changed, cens=cens)
        sink["changed"] = set(out[0])
        sink["shadowVeto"] = set(out[1])
        sink["occludedSet"] = set(out[2])
        sink["noiseExclude"] = set(out[0]) | set(out[1])
        return out

    mt._compute_evidence = compute_evidence
    mt._apply_vetoes = apply_vetoes


# ---------------------------------------------------------------------------------------
# Sampling
# ---------------------------------------------------------------------------------------
def _sample_frames(n_frames: int, commit_frames: list[int],
                   rung: tuple[int, int, int]) -> list[int]:
    dense_before, dense_after, sparse_step = rung
    keep: set[int] = set(range(0, min(WARMUP_FRAMES, n_frames)))
    for m in commit_frames:
        keep.update(range(max(0, m - dense_before), min(n_frames, m + dense_after + 1)))
    keep.update(range(0, n_frames, sparse_step))
    return sorted(keep)


# ---------------------------------------------------------------------------------------
# Clip runs
# ---------------------------------------------------------------------------------------
def _decode(clip_path: Path) -> tuple[list[np.ndarray], float]:
    cap = cv2.VideoCapture(str(clip_path))
    if not cap.isOpened():
        raise SystemExit(f"cannot open {clip_path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 12.0
    frames = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frames.append(frame)
    cap.release()
    return frames, float(fps)


def _promotion_piece(entry: dict) -> str:
    return next((u[4] for u in (entry.get("moves_uci") or []) if len(u) == 5), "q")


def _effective_config(mt) -> dict:
    """EVERY knob the tracker actually ran with, read off the LIVE `MoveTracker` instance and
    keyed by the Kotlin `TrackerConfig` property names.

    Not re-derived from a kwargs dict on purpose: the fixtures were produced from
    `MoveTracker.__init__` defaults + the manifest overrides, and those disagree with
    `config.TRACK_DEFAULTS` on at least `occlusion_color_thr` (1.5 vs 3.0). A Kotlin parity
    test that builds `TrackerConfig` from its own defaults would diverge on Tier B for a
    reason that looks like a port bug and is not.
    """
    cfg = {
        "motionThr": _r(mt.motion_thr),
        "motionPxThr": _r(mt.motion_px_thr),
        "zThr": _r(mt.z_thr),
        "ambiguityMarginLl": _r(mt.ambiguity_margin_ll),
        "reanchorLlFloor": _r(mt.reanchor_ll_floor),
        "nudgeTimeoutS": _r(mt.nudge_timeout_s),
        "driftWindowS": _r(mt.drift_window_s),
        "maxChanged": int(mt.max_changed),
        "censusThr": _r(mt.census_thr),
        "censusZWeight": _r(mt.census_z_weight),
        "occlCensusThr": _r(mt.occl_census_thr),
        "cnnConfThr": _r(mt.cnn_conf_thr),
        "cnnCooldownS": _r(mt.cnn_cooldown_s),
        "cnnCheckIntervalS": _r(mt.cnn_check_interval_s),
        "verifyWindow": int(mt.verify_window),
        "cnnMinAgreement": _r(mt.cnn_min_agreement),
        "cnnMarginSquares": int(mt.cnn_margin_squares),
        "recoveryMaxPlies": int(mt.recovery_max_plies),
        "minConfidentBoard": int(mt.min_confident_board),
        "minConfidentRecovery": int(mt.min_confident_recovery),
        "motionMargin": _r(mt.motion_margin),
        "overhang": _r(mt.overhang),
        "alignEvery": int(mt.align_every),
        "alignScale": _r(mt.align_scale),
        "cornerJumpPx": _r(mt.corner_jump_px),
        "motionHoldS": _r(mt.motion_hold_s),
        "occlusionColorThr": _r(mt.occlusion_color_thr),
        "minGridLineCoverage": _r(mt.min_grid_line_coverage),
        "reconnectGraceS": _r(mt.reconnect_grace_s),
        "diffClaheClip": _r(mt.diff_clahe_clip),
        "requireMotionForMove": bool(mt.require_motion_for_move),
        "motionRecencyS": _r(mt.motion_recency_s),
        "commitLlFloor": _r(mt.commit_ll_floor),
        "detectScale": _r(mt.detect_scale),
        "desyncObsN": int(mt.desync_obs_n),
        "verifyObsVotes": int(mt.verify_obs_votes),
        "observerIntervalS": _r(mt.observer_interval_s),
        "llK": _r(mt.ll_k),
        "darkLumaThr": _r(mt.dark_luma_thr),
        "cnnVerify": bool(mt.cnn_verify),
        "liveAlign": bool(mt.live_align),
        "usePrior": bool(mt.use_prior),
        "boardSize": int(mt.profile.board_size),
        "settleFrames": int(mt.settle_frames),
        "avgFrames": int(mt.avg_frames),
        "confirmFrames": int(mt.confirm_frames),
        "detSize": int(mt._det_size),
    }
    missing = [f for f in TRACKER_CONFIG_FIELDS if f not in cfg]
    extra = [k for k in cfg if k not in TRACKER_CONFIG_FIELDS]
    if missing or extra:
        raise SystemExit(
            "effectiveConfig does not cover TrackerConfig: "
            f"missing={missing} unexpected={extra} — update _effective_config() and "
            "TRACKER_CONFIG_FIELDS together (specs/17-android-rewrite/entry.md).")
    return cfg


def _estimate_bytes(entry: dict) -> int:
    """Cheap, deterministic size estimate for the budget allocator (no decode)."""
    cap = cv2.VideoCapture(str(CLIPS_DIR / entry["file"]))
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    cap.release()
    n_moves = len(entry.get("moves_uci") or [])
    dense_before, dense_after, sparse_step = SAMPLING_LADDER[0]
    est_frames = min(n, WARMUP_FRAMES + n_moves * (dense_before + dense_after + 1)
                     + n // sparse_step)
    return est_frames * BYTES_PER_FRAME_ESTIMATE


def _run(entry: dict, frames: list[np.ndarray], indices: list[int], fps: float,
         collect: bool) -> dict:
    """Feed `indices` of `frames` through a fresh tracker. Returns the run record."""
    from chesslab.move_tracker import tracker as trk

    clock = _VirtualClock()
    original_time = trk.time
    trk.time = clock
    try:
        with ClipDriver(entry, trk, clock) as driver:
            driver.reset_scratch(_promotion_piece(entry))
            mt = driver.mt
            sink: dict = {}
            if collect:
                _install_evidence_probe(mt, trk, sink)
            records: list[dict] = []
            commit_frames: list[int] = []
            prev_index = indices[0] if indices else 0
            seen_tier_a = False
            for pos, idx in enumerate(indices):
                clock.advance((idx - prev_index) / fps if pos else 1.0 / fps)
                prev_index = idx
                driver._video_index = idx
                sink.clear()
                obs = driver.step(frames[idx])
                if obs is None:
                    records.append({"frame": idx, "skipped": True})
                    continue
                grew = len(mt.history) - obs["histBefore"]
                if grew:
                    commit_frames.append(idx)
                if collect:
                    rec = _frame_record(mt, trk, driver, idx, obs, sink, grew,
                                        first=not seen_tier_a)
                    seen_tier_a = seen_tier_a or rec["tierA"] is not None
                    records.append(rec)
                else:
                    records.append({"frame": idx, "skipped": False})
            return {"records": records, "commitFrames": commit_frames,
                    "sans": list(mt.history), "fen": mt.board.fen(),
                    "detSize": mt._det_size, "whitePov": mt.profile.white_pov,
                    "settleFrames": mt.settle_frames, "avgFrames": mt.avg_frames,
                    "confirmFrames": mt.confirm_frames, "overhang": mt.overhang,
                    "detectScale": mt.detect_scale, "censusZWeight": mt.census_z_weight,
                    "effectiveConfig": _effective_config(mt), "profile": mt.profile}
    finally:
        trk.time = original_time


def _frame_record(mt, trk, driver, idx: int, obs: dict, sink: dict, grew: int,
                  first: bool) -> dict:
    tier_b: dict[str, Any] = {
        "state": mt.state,
        "changed": _sset(sink.get("changed", mt._changed)),
        "shadowVeto": _sset(sink.get("shadowVeto", mt._shadow_vetoed)),
        "occlusionVetoed": _sset(mt._occluded_vetoed),
        "tainted": _sset(mt._tainted),
        "bestLl": _r(mt._best_score),
        "secondLl": _r(mt._second_score),
        "bestUci": mt._candidate_uci,
        "candidateUci": mt._candidate_uci,
        "stuckReason": mt._stuck_reason,
        "confirmerKey": mt._confirmer._cand[0] if mt._confirmer._cand else None,
        "confirmerCount": mt._confirmer.count,
        "commit": None,
        "note": mt.note or None,
        "detectionRan": obs["detected"],
        "motionScore": _r(obs["motion"]),
        "promotionPending": obs["promo"],
    }
    if grew == 1:
        rec = mt._decision_log[-1]
        tier_b["commit"] = {"uci": rec["move"], "san": rec["san"],
                            "fenAfter": rec["fen_after"], "decider": rec["decider"]}
    elif grew > 1:
        rec = mt._decision_log[-1]
        tier_b["commit"] = {"ucis": [rec["move"]], "sans": mt.history[-grew:],
                            "fenAfter": rec["fen_after"], "decider": rec["decider"]}

    tier_a: dict[str, Any] | None = None
    if obs["detected"] and "z" in sink:
        pre = dict(driver._pre_detect or {})
        pre.update({
            "z": sink["z"], "noiseZ": sink["noiseZ"], "censusNoiseZ": sink.get("censusNoiseZ"),
            "changedPreVeto": sink.get("changedPreVeto", set()),
            "noiseExclude": sink.get("noiseExclude", set()),
            "motion": obs["motion"], "gamutFresh": driver._gamut_changed,
            "gamutFrames": list(driver._gamut_frames),
            "activeGamutFrames": list(driver._active_gamut_frames),
        })
        ref_gray, ref_bgr, gamut = driver._pre_detect_ref
        tier_a = _tier_a(mt, trk, pre, ref_gray, ref_bgr, gamut, first_frame=first)
    return {"frame": idx, "seq": obs["seq"], "fen": mt.board.fen(), "skipped": False,
            "lumaPreClahe": _r(obs["luma"]), "motionRoiScore": _r(obs["motionRoi"]),
            "baselineOcclusion": obs["baseline"], "tierA": tier_a, "tierB": tier_b}


# ---------------------------------------------------------------------------------------
# Emission
# ---------------------------------------------------------------------------------------
def emit_clip(entry: dict, out_root: Path, tier_c: bool, budget_left: int = 1 << 62) -> dict:
    clip = Path(entry["file"]).stem
    frames, fps = _decode(CLIPS_DIR / entry["file"])
    n = len(frames)

    scout = _run(entry, frames, list(range(n)), fps, collect=False)
    expected = entry.get("erwartete_zugliste")
    full_ok = expected is None or scout["sans"] == list(expected)

    # Escalation ladder: take the cheapest rung that reproduces the manifest move list and
    # still fits the remaining budget. A clip that matches on rung 0 costs rung 0.
    run, rung = None, SAMPLING_LADDER[0]
    for candidate in SAMPLING_LADDER:
        cand_idx = _sample_frames(n, scout["commitFrames"], candidate)
        if run is not None and len(cand_idx) * BYTES_PER_FRAME_ESTIMATE > budget_left:
            break
        cand_run = _run(entry, frames, cand_idx, fps, collect=True)
        run, rung = cand_run, candidate
        if expected is None or cand_run["sans"] == list(expected):
            break

    san_ok = expected is None or run["sans"] == list(expected)
    print(f"  [{clip}] full-rate={scout['sans']} sampled={run['sans']} "
          f"rung={rung} commits={scout['commitFrames']}")

    clip_dir = out_root / clip
    if clip_dir.exists():
        shutil.rmtree(clip_dir)
    clip_dir.mkdir(parents=True)

    det = run["detSize"]
    total = 0
    prev_gray = prev_bgr = None
    emitted = [r["frame"] for r in run["records"] if not r.get("skipped")]
    by_index = {r["frame"]: r for r in run["records"]}
    native_pick: set[int] = set()
    if tier_c:
        commits = [c for c in run["commitFrames"] if c in set(emitted)]
        picks = ([emitted[0]] + commits[:NATIVE_FRAMES_PER_CLIP - 1]) if commits \
            else emitted[:NATIVE_FRAMES_PER_CLIP]
        native_pick = set(picks)

    # Planes are the detection warps the driver saw; re-derive them deterministically
    # (`_warp`/`_gray` depend only on the frame and the frozen profile geometry).
    planes = _plane_stream(entry, frames, emitted, fps)
    for idx in emitted:
        gray, bgr = planes[idx]
        total += _write_gz(clip_dir / "planes" / f"{idx:04d}.gray.bin.gz",
                           _delta(gray, prev_gray))
        total += _write_gz(clip_dir / "planes" / f"{idx:04d}.bgr.bin.gz",
                           _delta(bgr, prev_bgr))
        prev_gray, prev_bgr = gray, bgr
        total += _write_json(clip_dir / "frames" / f"{idx:04d}.json", by_index[idx])

    natives: dict[str, Any] = {"requiresNatives": True, "frames": [], "jpegQuality": JPEG_QUALITY}
    if tier_c:
        for idx in sorted(native_pick):
            ok, buf = cv2.imencode(".jpg", frames[idx], [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
            if not ok:
                continue
            data = buf.tobytes()
            p = clip_dir / "natives" / f"{idx:04d}.src.jpg"
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)
            total += len(data)
            frec = by_index[idx]
            natives["frames"].append({
                "frame": idx, "source": f"{idx:04d}.src.jpg",
                "corners": [[_r(x), _r(y)] for x, y in entry["corners"]],
                "boardSize": int(entry["board_size"]), "detSize": det,
                "lumaPreClahe": frec["lumaPreClahe"],
                "gridLineCoverage": _r(planes["_grid"][idx]),
                "expectedGrayPlane": f"../planes/{idx:04d}.gray.bin.gz",
                "expectedBgrPlane": f"../planes/{idx:04d}.bgr.bin.gz",
            })
        total += _write_json(clip_dir / "natives" / "meta.json", natives)

    prof = run["profile"]
    from chesslab.calibration import crop_border_px

    meta = {
        "avgFrames": run["avgFrames"],
        "boardSize": int(entry["board_size"]),
        "censusZWeight": _r(run["censusZWeight"]),
        "channelsBgr": 3,
        "clip": clip,
        "commitFrames": run["commitFrames"],
        "confirmFrames": run["confirmFrames"],
        "cropBorderPx": int(crop_border_px(prof)),
        "cropPadSide": _r(prof.crop.pad_side),
        "cropPadUp": _r(prof.crop.pad_up),
        "detSize": det,
        "detectScale": _r(run["detectScale"]),
        "effectiveConfig": run["effectiveConfig"],
        "expectedSans": list(expected) if expected is not None else None,
        "fps": _r(fps),
        "frames": emitted,
        "framesWithBgr": emitted,
        "gzipLevel": GZIP_LEVEL,
        "movesUci": list(entry.get("moves_uci") or []),
        "nativeFrames": sorted(native_pick),
        "overhang": _r(run["overhang"]),
        "planeEncoding": "delta-u8",
        "replayedFen": run["fen"],
        "replayedSans": run["sans"],
        "requiresNatives": False,
        "sampling": {"denseAfter": rung[1], "denseBefore": rung[0],
                     "sparseStep": rung[2], "videoFrames": n,
                     "warmupFrames": WARMUP_FRAMES},
        "sanMatchesManifest": bool(san_ok),
        "sanMatchesManifestAtFullRate": bool(full_ok),
        # False = this clip's frame stream does NOT reproduce Python's full-rate move list,
        # so it must be EXCLUDED from the strict full-clip Tier-B gate (03d).
        "tierBComplete": bool(san_ok),
        "settleFrames": run["settleFrames"],
        "startFen": entry.get("start_fen"),
        "trackerKwargs": dict(sorted((entry.get("tracker") or {}).items())),
        "whitePov": bool(run["whitePov"]),
    }
    total += _write_json(clip_dir / "meta.json", meta)
    return {"clip": clip, "bytes": total, "frames": len(emitted), "sanOk": san_ok,
            "expected": expected, "got": run["sans"]}


def _plane_stream(entry: dict, frames: list[np.ndarray], indices: list[int],
                  fps: float) -> dict:
    """Re-derive the detection warps for the sampled indices (same code path as the
    driver, but standalone so the emission loop can stream them)."""
    from chesslab.move_tracker import tracker as trk

    clock = _VirtualClock()
    original_time = trk.time
    trk.time = clock
    out: dict = {"_grid": {}}
    try:
        with ClipDriver(entry, trk, clock) as driver:
            driver.reset_scratch(_promotion_piece(entry))
            mt = driver.mt
            target = mt._det_size if mt.detect_scale < 1.0 else None
            for idx in indices:
                warped = mt._warp(frames[idx], target)
                if warped is None:
                    continue
                gray = mt._gray(warped)
                out[idx] = (gray, np.ascontiguousarray(warped))
                out["_grid"][idx] = mt._grid_line_coverage(gray)
    finally:
        trk.time = original_time
    return out


def emit_geometry(out_root: Path, entry: dict) -> int:
    """Shared, image-free geometry golden values (phases 01a and 02b): `square_region`,
    `square_center`, `square_to_crop_box`, `crop_border_px` and `compute_homography` over
    the full parameter cross-product the consuming specs ask for."""
    from chesslab.calibration import (
        CalibrationProfile,
        CropParams,
        compute_homography,
        crop_border_px,
        square_to_crop_box,
    )
    from chesslab.move_tracker import tracker as trk

    regions = []
    for board_size in (320, 640, 800, 1600):
        for white_pov in (True, False):
            for extend_up in (0.0, 0.25):
                regions.append({
                    "boardSize": board_size, "whitePov": white_pov,
                    "extendUp": _r(extend_up), "inset": 0.16,
                    "regions": {sq: [int(v) for v in trk.square_region(
                        sq, board_size, white_pov, extend_up=extend_up)]
                        for sq in _ALL_SQUARES},
                    "centers": {sq: [int(v) for v in trk.square_center(
                        sq, board_size, white_pov)] for sq in _ALL_SQUARES},
                })
    crops = []
    for board_size in (640, 1600):
        for pad_up in (0.0, 0.25):
            for pad_side in (0.0, 0.10):
                for white_pov in (True, False):
                    base = CropParams.default(board_size)
                    prof = CalibrationProfile(
                        profile="__parity_geometry__", camera_index=-1,
                        frame_size=(board_size, board_size), board_size=board_size,
                        image_corners=[[0, 0], [board_size, 0],
                                       [board_size, board_size], [0, board_size]],
                        homography=compute_homography(
                            [[0, 0], [board_size, 0], [board_size, board_size],
                             [0, board_size]], board_size, 0.0),
                        white_pov=white_pov,
                        crop=CropParams(cell=base.cell, pad_up=pad_up, pad_side=pad_side,
                                        out_size=base.out_size),
                        margin=0.0, source="parity")
                    for clamp in (True, False):
                        crops.append({
                            "boardSize": board_size, "padUp": _r(pad_up),
                            "padSide": _r(pad_side), "whitePov": white_pov, "clamp": clamp,
                            "cropBorderPx": int(crop_border_px(prof)),
                            "boxes": {sq: [int(v) for v in square_to_crop_box(
                                sq, prof, clamp=clamp)] for sq in _ALL_SQUARES},
                        })
    homographies = []
    for board_size in (320, 640, 1600):
        for margin in (0.0, 0.05):
            homographies.append({
                "boardSize": board_size, "margin": _r(margin),
                "corners": [[_r(x), _r(y)] for x, y in entry["corners"]],
                "h": [[_r(v) for v in row]
                      for row in compute_homography(entry["corners"], board_size, margin)],
            })
    out_dir = out_root / "_geometry"
    if out_dir.exists():
        shutil.rmtree(out_dir)
    total = _write_json(out_dir / "meta.json", {
        "kind": "geometry", "cornerOrder": ["a8", "h8", "h1", "a1"],
        "cropBoxes": crops, "homographies": homographies, "squareRegions": regions,
        "squares": _ALL_SQUARES,
    })
    total += _write_jsonl(out_dir / "resolve_corners.jsonl", _resolve_corner_rows())
    total += _emit_grid_coverage(out_dir, entry)
    return total


def _resolve_corner_rows() -> list[dict]:
    """`resolve_board_corners` is PURE — no marker detection needed. Synthetic marker point
    sets cover all four branches (4 = perspective, 3 = affine, 2 = similarity, <2 = null)
    plus rotation/scale, a mild perspective, a degenerate 2-point case and `board_size`."""
    from chesslab.calibration import resolve_board_corners

    square = {0: [100.0, 100.0], 1: [500.0, 100.0], 2: [500.0, 500.0], 3: [100.0, 500.0]}
    persp = {0: [120.0, 90.0], 1: [520.0, 110.0], 2: [560.0, 480.0], 3: [80.0, 520.0]}
    rot45 = {0: [300.0, 100.0], 1: [500.0, 300.0], 2: [300.0, 500.0], 3: [100.0, 300.0]}
    scaled = {0: [50.0, 50.0], 1: [250.0, 50.0], 2: [250.0, 250.0], 3: [50.0, 250.0]}
    cases: list[tuple[str, dict, int]] = [
        ("square4", square, 800),
        ("square4_bs320", square, 320),
        ("square4_bs1600", square, 1600),
        ("perspective4", persp, 800),
        ("perspective4_bs640", persp, 640),
        ("rotated4", rot45, 800),
        ("scaled4", scaled, 800),
        ("affine3_a", {k: v for k, v in square.items() if k != 3}, 800),
        ("affine3_b", {k: v for k, v in persp.items() if k != 2}, 800),
        ("affine3_parallelogram", {0: [100.0, 100.0], 1: [500.0, 140.0], 2: [540.0, 540.0]}, 800),
        ("similarity2_adjacent", {k: v for k, v in square.items() if k in (0, 1)}, 800),
        ("similarity2_diagonal", {k: v for k, v in square.items() if k in (0, 2)}, 800),
        ("similarity2_rotated", {k: v for k, v in rot45.items() if k in (0, 1)}, 800),
        ("similarity2_bs320", {k: v for k, v in square.items() if k in (0, 1)}, 320),
        ("degenerate2_identical", {0: [100.0, 100.0], 1: [100.0, 100.0]}, 800),
        ("single1", {0: [100.0, 100.0]}, 800),
        ("empty0", {}, 800),
    ]
    rows = []
    for name, points, board_size in cases:
        res = resolve_board_corners({k: tuple(v) for k, v in points.items()},
                                    board_size=board_size)
        rows.append({
            "name": name,
            "pointsById": {str(k): [_r(v[0]), _r(v[1])] for k, v in sorted(points.items())},
            "boardSize": board_size,
            "corners": None if res is None else [[_r(x), _r(y)] for x, y in res[0]],
            "nUsed": None if res is None else res[1],
        })
    return rows


def _emit_grid_coverage(out_dir: Path, entry: dict) -> int:
    """`_grid_line_coverage` golden values on self-contained gray planes: real warped clip
    frames (clear board, hand over the board) plus synthetic edge cases."""
    from chesslab.move_tracker import tracker as trk

    frames, _fps = _decode(CLIPS_DIR / entry["file"])
    clock = _VirtualClock()
    original_time = trk.time
    trk.time = clock
    planes: list[tuple[str, np.ndarray]] = []
    try:
        with ClipDriver(entry, trk, clock) as driver:
            driver.reset_scratch("q")
            mt = driver.mt
            for label, idx in (("clear", 0), ("hand", 32), ("late", 56)):
                warped = mt._warp(frames[min(idx, len(frames) - 1)], mt._det_size)
                if warped is not None:
                    planes.append((label, mt._gray(warped)))
            coverage = {name: mt._grid_line_coverage(img) for name, img in planes}
            # Synthetic: a clean 8x8 grid, the same grid with 3 horizontal lines blanked,
            # a flat image (no edges at all) and an 8x8 pixel image (size guard).
            grid = np.zeros((320, 320), dtype=np.uint8)
            grid[:, :] = 30
            for i in range(9):
                p = min(319, int(round(i * 40)))
                grid[:, p] = 230
                grid[p, :] = 230
            blanked = grid.copy()
            blanked[100:260, :] = 30
            flat = np.full((320, 320), 128, dtype=np.uint8)
            tiny = np.zeros((8, 8), dtype=np.uint8)
            for name, img in (("synthetic_grid", grid), ("synthetic_blanked", blanked),
                              ("synthetic_flat", flat), ("synthetic_tiny", tiny)):
                planes.append((name, img))
                coverage[name] = mt._grid_line_coverage(img)
    finally:
        trk.time = original_time

    total = 0
    rows = []
    for name, img in planes:
        rel = f"planes/{name}.gray.bin.gz"
        total += _write_gz(out_dir / rel, np.ascontiguousarray(img).tobytes())
        rows.append({"name": name, "plane": rel, "width": int(img.shape[1]),
                     "height": int(img.shape[0]), "coverage": _r(coverage[name])})
    return total + _write_jsonl(out_dir / "grid_coverage.jsonl", rows)


def _cnn_probs(board, classes: list[str], *, conf: float = 0.95,
               overrides: dict[str, tuple[str, float]] | None = None) -> dict[str, list[float]]:
    """Synthetic 64x`len(classes)` softmax rows over a real position.

    Deterministic by construction: the leftover mass `1 - conf` is spread over the other
    classes with weights from a `random.Random` seeded per square from `CNN_FIXTURE_SEED`,
    so the fixture is reproducible without depending on dict iteration order. `overrides`
    forces `{square: (class_label, confidence)}`.
    """
    import random

    from chesslab.move_tracker.cnn_recovery import expected_labels

    exp = expected_labels(board)
    overrides = overrides or {}
    out: dict[str, list[float]] = {}
    for sq in _ALL_SQUARES:
        label, top = overrides.get(sq, (exp[sq], conf))
        if label not in classes:                       # e.g. "occluded" on a 13-class run
            label = "empty"
        rng = random.Random(f"{CNN_FIXTURE_SEED}:{sq}")
        weights = [rng.random() + 0.1 for _ in classes]
        idx = classes.index(label)
        weights[idx] = 0.0
        scale = (1.0 - top) / sum(weights) if sum(weights) > 0 else 0.0
        probs = [round(w * scale, FLOAT_NDIGITS) for w in weights]
        probs[idx] = round(top, FLOAT_NDIGITS)
        out[sq] = probs
    return out


def _cnn_recovery(classes: list[str], **kwargs):
    """A `CnnRecovery` with no model behind it — every function 00b exercises is pure. Its
    constructor only insists that `run_dir/config.json` exists, so a throwaway dir is enough
    (its path never reaches the fixtures)."""
    import tempfile

    from chesslab.move_tracker.cnn_recovery import CnnRecovery

    tmp = tempfile.mkdtemp(prefix="parity_cnn_")
    (Path(tmp) / "config.json").write_text("{}", encoding="utf-8")
    rec = CnnRecovery(Path(tmp), profile=None, device="cpu", **kwargs)
    rec._classes = classes
    shutil.rmtree(tmp, ignore_errors=True)
    return rec


def emit_cnn(out_root: Path) -> int:
    """Pure-function CNN fixtures (phase 02c) built from SYNTHETIC probability arrays.

    No trained model is involved: `observation_from_probs`, `score_moves`, `verify_move`,
    `board_matches_identity`, `derive_moves_identity/deep`, `resync_check`,
    `has_occupancy_conflict` and `guess_illegal_move` are all pure given probabilities and a
    board. That is strictly better than model-derived fixtures — deterministic, tiny, and it
    tests the logic instead of the weights."""
    import chess

    from chesslab import config as _cfg
    from chesslab.move_tracker.cnn_recovery import (
        expected_labels,
        guess_illegal_move,
        has_occupancy_conflict,
        observation_from_probs,
    )

    classes14 = list(_cfg.CLASSES)
    classes13 = [c for c in classes14 if c != "occluded"]
    thr = 0.85
    rec = _cnn_recovery(classes14, conf_thr=thr, min_agreement=0.97, margin_squares=1,
                        min_confident_board=32, min_confident_recovery=8)

    start = chess.Board()
    after_e4 = chess.Board()
    after_e4.push_uci("e2e4")
    after_e4e5 = after_e4.copy()
    after_e4e5.push_uci("e7e5")
    deep = chess.Board()
    for uci in ("e2e4", "e7e5", "g1f3", "b8c6"):
        deep.push_uci(uci)
    transposed_a, transposed_b = chess.Board(), chess.Board()
    for uci in ("g1f3", "e7e5"):
        transposed_a.push_uci(uci)
    for uci in ("e2e3", "e7e5"):
        transposed_b.push_uci(uci)

    def unconfident(squares, level: float = 0.5) -> dict:
        return {sq: (expected_labels(start)[sq], level) for sq in squares}

    # ---- cnn_observation.jsonl -------------------------------------------------------
    obs_rows = []
    obs_cases = [
        ("start_confident", start, classes14, 0.95, {}),
        ("start_13class", start, classes13, 0.95, {}),
        ("occluded_hand", start, classes14, 0.95,
         dict.fromkeys(("d4", "e4", "d5", "e5"), ("occluded", 0.9))),
        ("low_confidence_band", start, classes14, 0.95, unconfident(["a1", "b1", "c1", "h8"], 0.6)),
        ("occluded_just_over_gate", start, classes14, 0.95, {"e2": ("occluded", 0.20)}),
        ("after_e4", after_e4, classes14, 0.95, {}),
        ("mislabelled_knight", start, classes14, 0.95, {"b1": ("wB", 0.93)}),
    ]
    for name, board, classes, conf, ov in obs_cases:
        probs = _cnn_probs(board, classes, conf=conf, overrides=ov)
        obs = observation_from_probs(probs, classes)
        obs_rows.append({
            "name": name, "fen": board.fen(), "classes": classes, "confThr": thr,
            "probs": probs,
            "pOcc": _rmap(obs.p_occ), "pEmpty": _rmap(obs.p_empty),
            "pOccluded": _rmap(obs.p_occluded),
            "label": dict(sorted(obs.label.items())), "conf": _rmap(obs.conf),
            "confident": {k: bool(v) for k, v in sorted(obs.confident(thr).items())},
            "labelConfident": {k: bool(v) for k, v in sorted(obs.label_confident(thr).items())},
            "occupied": {sq: bool(obs.occupied(sq)) for sq in _ALL_SQUARES},
        })

    # ---- cnn_score.jsonl / cnn_verify.jsonl / cnn_identity.jsonl ---------------------
    score_rows, verify_rows, ident_rows = [], [], []
    score_cases = [
        ("clean_e2e4", start, {}, _cnn_probs(after_e4, classes14)),
        # Occluded-dominant squares are NEVER confident (cnn_recovery.py:46-52) — that is
        # the only way to push the confident count below min_confident_recovery, since a
        # merely low IDENTITY confidence still leaves p_occ high on an occupied square.
        ("too_few_confident", start, {},
         _cnn_probs(after_e4, classes14, conf=0.95,
                    overrides=dict.fromkeys(_ALL_SQUARES[:58], ("occluded", 0.9)))),
        ("promotion_variants", chess.Board("6k1/4P3/8/8/8/8/8/6K1 w - - 0 1"), {},
         _cnn_probs(chess.Board("4Q1k1/8/8/8/8/8/8/6K1 b - - 0 1"), classes14)),
    ]
    for name, board, _ov, probs in score_cases:
        obs = observation_from_probs(probs, classes14)
        mv, best, second = rec.score_moves(board, obs)
        score_rows.append({"name": name, "fen": board.fen(), "classes": classes14,
                           "confThr": thr, "probs": probs,
                           "move": mv.uci() if mv else None,
                           "best": _r(best), "second": _r(second)})
    verify_cases = [
        ("both_endpoints_confident", start, "e2e4", _cnn_probs(after_e4, classes14)),
        ("target_occluded", start, "e2e4",
         _cnn_probs(after_e4, classes14, overrides={"e4": ("occluded", 0.9)})),
        ("far_misread_does_not_hurt", start, "e2e4",
         _cnn_probs(after_e4, classes14, overrides={"c6": ("wQ", 0.97)})),
        ("castling_rook_square_occluded",
         chess.Board("r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1"), "e1g1",
         _cnn_probs(chess.Board("r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R4RK1 b kq - 1 1"),
                    classes14, overrides={"f1": ("occluded", 0.9)})),
    ]
    for name, board, uci, probs in verify_cases:
        obs = observation_from_probs(probs, classes14)
        agree, checked = rec.verify_move(board, chess.Move.from_uci(uci), obs)
        agree_id, checked_id = rec.verify_move_identity(board, chess.Move.from_uci(uci), obs)
        verify_rows.append({"name": name, "fen": board.fen(), "uci": uci,
                            "classes": classes14, "confThr": thr, "probs": probs,
                            "agreement": _r(agree), "checked": checked,
                            "identityAgreement": _r(agree_id), "identityChecked": checked_id})
    ident_cases = [
        ("all_match", start, _cnn_probs(start, classes14)),
        ("one_conflict", start, _cnn_probs(start, classes14, overrides={"b1": ("wB", 0.93)})),
        ("inconclusive_31_confident", start,
         _cnn_probs(start, classes14, conf=0.95,
                    overrides={sq: (expected_labels(start)[sq], 0.5)
                               for sq in _ALL_SQUARES[:33]})),
    ]
    for name, board, probs in ident_cases:
        obs = observation_from_probs(probs, classes14)
        res = rec.board_matches_identity(board, obs)
        ident_rows.append({"name": name, "fen": board.fen(), "classes": classes14,
                           "confThr": thr, "probs": probs, "match": bool(res["match"]),
                           "conflicts": sorted(res["conflicts"]), "n": res["n"],
                           "inconclusive": bool(res["inconclusive"]),
                           "minConfidentBoard": rec.min_confident_board})

    # ---- cnn_derive.jsonl ------------------------------------------------------------
    derive_rows = []
    derive_cases = [
        ("identity_single_e2e4", start, "identity", 1, _cnn_probs(after_e4, classes14)),
        ("identity_single_not_a_pair", start, "identity", 2, _cnn_probs(after_e4, classes14)),
        ("identity_blitz_pair", start, "identity", 2, _cnn_probs(after_e4e5, classes14)),
        ("identity_nothing_changed", start, "identity", 2, _cnn_probs(start, classes14)),
        ("deep_four_ply", start, "deep", 4, _cnn_probs(deep, classes14)),
        ("deep_already_matching", start, "deep", 4, _cnn_probs(start, classes14)),
        ("deep_transposition_a", start, "deep", 4, _cnn_probs(transposed_a, classes14)),
        ("deep_transposition_b", start, "deep", 4, _cnn_probs(transposed_b, classes14)),
        ("deep_two_ply_preferred", start, "deep", 4, _cnn_probs(after_e4e5, classes14)),
        ("deep_nonsense_observation", start, "deep", 4,
         _cnn_probs(start, classes14,
                    overrides=dict.fromkeys(("d4", "e4", "d5", "e5", "c3"), ("bQ", 0.95)))),
    ]
    for name, board, mode, max_plies, probs in derive_cases:
        obs = observation_from_probs(probs, classes14)
        if mode == "identity":
            seq, best, second = rec.derive_moves_identity(board, obs, max_plies=max_plies)
        else:
            seq, best, second = rec.derive_moves_deep(board, obs, max_plies=max_plies)
        derive_rows.append({"name": name, "fen": board.fen(), "classes": classes14,
                            "confThr": thr, "probs": probs, "mode": mode,
                            "maxPlies": max_plies, "beam": 8,
                            "seq": [m.uci() for m in seq],
                            "best": _r(best), "second": _r(second),
                            "minAgreement": _r(rec.min_agreement),
                            "marginSquares": rec.margin_squares,
                            "minConfidentRecovery": rec.min_confident_recovery})

    # ---- cnn_resync.jsonl / cnn_guess.jsonl ------------------------------------------
    resync_rows, guess_rows = [], []
    resync_cases = [
        ("match", start, _cnn_probs(start, classes14)),
        ("conflict_with_move", start, _cnn_probs(after_e4, classes14)),
        ("conflict_without_move", start,
         _cnn_probs(start, classes14,
                    overrides={"a1": ("empty", 0.95), "h8": ("empty", 0.95),
                               "d5": ("wQ", 0.95)})),
    ]
    for name, board, probs in resync_cases:
        obs = observation_from_probs(probs, classes14)
        res = rec.resync_check(board, obs)
        conflicts = list(res["conflicts"])
        resync_rows.append({"name": name, "fen": board.fen(), "classes": classes14,
                            "confThr": thr, "probs": probs, "match": bool(res["match"]),
                            "conflicts": conflicts, "move": res["move"],
                            "agreement": _r(res["agreement"]),
                            "hasOccupancyConflict": bool(
                                has_occupancy_conflict(board, obs, thr, conflicts))})
    guess_cases = [
        ("one_source_one_destination", start,
         {"e2": ("empty", 0.95), "e5": ("wP", 0.95)}),
        ("two_sources", start,
         {"e2": ("empty", 0.95), "d2": ("empty", 0.95), "e5": ("wP", 0.95)}),
        ("no_conflict", start, {}),
        ("identity_only_conflict", start, {"b1": ("wB", 0.95)}),
    ]
    for name, board, ov in guess_cases:
        probs = _cnn_probs(board, classes14, overrides=ov)
        obs = observation_from_probs(probs, classes14)
        conflicts = [sq for sq, ok in obs.label_confident(thr).items()
                     if ok and obs.label[sq] != expected_labels(board)[sq]]
        guess_rows.append({"name": name, "fen": board.fen(), "classes": classes14,
                           "confThr": thr, "probs": probs,
                           "conflicts": sorted(conflicts),
                           "guess": guess_illegal_move(board, obs, thr),
                           "hasOccupancyConflict": bool(
                               has_occupancy_conflict(board, obs, thr, conflicts))})

    out_dir = out_root / "_cnn"
    if out_dir.exists():
        shutil.rmtree(out_dir)
    total = _write_json(out_dir / "meta.json", {
        "kind": "cnn", "seed": CNN_FIXTURE_SEED, "classes14": classes14,
        "classes13": classes13, "confThr": _r(thr),
        "recovery": {"minAgreement": _r(rec.min_agreement),
                     "marginSquares": rec.margin_squares,
                     "minConfidentBoard": rec.min_confident_board,
                     "minConfidentRecovery": rec.min_confident_recovery},
        "note": "synthetic probabilities — no trained model is involved",
    })
    for fname, rows in (("cnn_observation.jsonl", obs_rows),
                        ("cnn_score.jsonl", score_rows),
                        ("cnn_verify.jsonl", verify_rows),
                        ("cnn_identity.jsonl", ident_rows),
                        ("cnn_derive.jsonl", derive_rows),
                        ("cnn_resync.jsonl", resync_rows),
                        ("cnn_guess.jsonl", guess_rows)):
        if not rows:
            raise SystemExit(f"{fname} is empty — a CNN fixture family was not produced")
        total += _write_jsonl(out_dir / fname, rows)
    return total


def emit_colorspace(out_root: Path, entry: dict) -> int:
    """Shared BGR->HSV/Lab conversion fixture (phase 01c): a dense BGR sweep plus a real
    board crop, with OpenCV's outputs. Not a clip — the loader skips `_`-prefixed dirs."""
    step = COLORSPACE_SWEEP_STEP
    levels = list(range(0, 256, step))
    n = len(levels)
    grid = np.zeros((n * n, n, 3), dtype=np.uint8)
    for bi, b in enumerate(levels):
        for gi, g in enumerate(levels):
            row = bi * n + gi
            grid[row, :, 0] = b
            grid[row, :, 1] = g
            grid[row, :, 2] = levels
    frames, _fps = _decode(CLIPS_DIR / entry["file"])
    from chesslab.calibration import (
        CalibrationProfile,
        CropParams,
        compute_homography,
        warp_from_corners,
    )

    corners = entry["corners"]
    bs = int(entry["board_size"])
    prof = CalibrationProfile(
        profile="__parity_colorspace__", camera_index=-1,
        frame_size=tuple(int(v) for v in entry["frame_size"]), board_size=bs,
        image_corners=corners, homography=compute_homography(corners, bs, 0.0),
        white_pov=True, crop=CropParams.default(bs), margin=0.0, source=entry["file"])
    board = np.ascontiguousarray(warp_from_corners(frames[0], prof, corners, bs // 2))

    out_dir = out_root / "_colorspace"
    if out_dir.exists():
        shutil.rmtree(out_dir)
    total = 0
    for name, img in (("sweep", grid), ("board", board)):
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        total += _write_gz(out_dir / "planes" / f"{name}.bgr.bin.gz", img.tobytes())
        total += _write_gz(out_dir / "planes" / f"{name}.hsv.bin.gz", hsv.tobytes())
        total += _write_gz(out_dir / "planes" / f"{name}.lab.bin.gz", lab.tobytes())
    total += _write_json(out_dir / "meta.json", {
        "kind": "colorspace",
        "planeEncoding": "raw",
        "patches": [
            {"name": "sweep", "width": int(grid.shape[1]), "height": int(grid.shape[0]),
             "channels": 3, "sweepStep": step},
            {"name": "board", "width": int(board.shape[1]), "height": int(board.shape[0]),
             "channels": 3, "sweepStep": None},
        ],
    })
    return total


# ---------------------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------------------
def _entries() -> list[dict]:
    data = yaml.safe_load(MANIFEST.read_text(encoding="utf-8")) or {}
    return [e for e in data.get("clips", []) if (CLIPS_DIR / e["file"]).exists()]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--clip", action="append", default=[],
                    help="clip stem (repeatable), e.g. blender-opening")
    ap.add_argument("--all", action="store_true", help="every clip in the manifest")
    ap.add_argument("--out", required=True, help="output directory (parity root)")
    ap.add_argument("--tier-c", dest="tier_c", action="store_true", default=None)
    ap.add_argument("--no-tier-c", dest="tier_c", action="store_false")
    args = ap.parse_args()

    entries = _entries()
    if args.all:
        wanted = entries
    elif args.clip:
        by_stem = {Path(e["file"]).stem: e for e in entries}
        missing = [c for c in args.clip if c not in by_stem]
        if missing:
            print(f"unknown clip(s): {', '.join(missing)}", file=sys.stderr)
            return 2
        wanted = [by_stem[c] for c in args.clip]
    else:
        print("nothing to do: pass --all or --clip", file=sys.stderr)
        return 2
    tier_c = args.all if args.tier_c is None else args.tier_c

    out_root = Path(args.out).resolve()
    out_root.mkdir(parents=True, exist_ok=True)

    # Required clips first (they exercise the veto/alarm paths and must be committed),
    # then the rest in manifest order while the 40 MiB budget allows it.
    required = [e for e in wanted if Path(e["file"]).stem in REQUIRED_CLIPS]
    optional = [e for e in wanted if Path(e["file"]).stem not in REQUIRED_CLIPS]

    t0 = _real_time.perf_counter()
    # Shared pure-function fixtures FIRST: they are cheap, high-value and must never be
    # dropped for clip frames (orchestrator instruction, 2026-07-24).
    shared = (emit_cnn(out_root) + emit_colorspace(out_root, wanted[0])
              + emit_geometry(out_root, wanted[0]))
    print(f"{'_cnn + _colorspace + _geometry':<24}      shared  {shared / 1e6:>6.2f} MB")

    total = shared
    results = []
    skipped: list[str] = []
    for entry, is_required in [(e, True) for e in required] + [(e, False) for e in optional]:
        clip = Path(entry["file"]).stem
        left = SIZE_CAP_BYTES - RESERVE_BYTES - total
        if not is_required and _estimate_bytes(entry) > left:
            skipped.append(clip)
            shutil.rmtree(out_root / clip, ignore_errors=True)
            continue
        res = emit_clip(entry, out_root, tier_c, budget_left=left)
        results.append(res)
        total += res["bytes"]
        flag = "" if res["sanOk"] else "   <-- SAN MISMATCH"
        print(f"{res['clip']:<24} {res['frames']:>4} frames  "
              f"{res['bytes'] / 1e6:>6.2f} MB{flag}")
    # A classpath has no directory listing, so the loader reads this index instead of
    # poking at the file system (`ParityFixtures.clips()`).
    total += _write_json(out_root / "index.json", {
        "clips": sorted(r["clip"] for r in results),
        "generator": "scripts/emit_parity_fixtures.py",
        "shared": ["_cnn", "_colorspace", "_geometry"],
        "skipped": sorted(skipped),
        # Clips whose emitted frame stream reproduces Python's full-rate move list; only
        # these belong in the strict full-clip Tier-B gate (03d).
        "tierBComplete": sorted(r["clip"] for r in results if r["sanOk"]),
        "tierBDegraded": sorted(r["clip"] for r in results if not r["sanOk"]),
    })
    if skipped:
        print(f"\nskipped (over budget, not in the required set): {', '.join(skipped)}")

    bad = [r for r in results if not r["sanOk"]]
    if bad:
        print("\n!! replayed move list differs from tests/data/testclips/manifest.yaml:")
        for r in bad:
            print(f"   {r['clip']}: got {r['got']} expected {r['expected']}")
        print("   (recorded per clip in meta.json -> sanMatchesManifest)")
    ok_clips = [r for r in results if r["sanOk"]]
    print(f"\nelapsed: {_real_time.perf_counter() - t0:.1f}s   "
          f"san-match: {len(ok_clips)}/{len(results)}")
    print(f"total: {total} bytes ({total / 1e6:.2f} MB) over {len(results)} clips")
    if total > SIZE_CAP_BYTES:
        print(f"\nBUDGET EXCEEDED: {total} > {SIZE_CAP_BYTES} bytes (40 MiB). "
              f"Lower DENSE_RADIUS / MAX_FRAMES_PER_CLIP or raise SPARSE_STEP.",
              file=sys.stderr)
        return 2
    if not ok_clips:
        print("\nNO CLIP reproduced its expected move list — fixtures are not trustworthy.",
              file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
