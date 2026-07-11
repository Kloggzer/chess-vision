package com.chesslab.engine.api

/**
 * Immutable configuration snapshot for the move tracker.
 * Defaults match `config.TRACK_DEFAULTS` in the Python reference (tracker.py).
 * Consumed by phase 01.
 */
data class TrackerConfig(
    val motionThr: Double = DEFAULT_MOTION_THR,
    val motionPxThr: Double = DEFAULT_MOTION_PX_THR,
    val zThr: Double = DEFAULT_Z_THR,
    val ambiguityMarginLl: Double = DEFAULT_AMBIGUITY_MARGIN_LL,
    val reanchorLlFloor: Double = DEFAULT_REANCHOR_LL_FLOOR,
    val nudgeTimeoutS: Double = DEFAULT_NUDGE_TIMEOUT_S,
    val driftWindowS: Double = DEFAULT_DRIFT_WINDOW_S,
    val maxChanged: Int = DEFAULT_MAX_CHANGED,
    val censusThr: Double = DEFAULT_CENSUS_THR,
    val censusZWeight: Double = DEFAULT_CENSUS_Z_WEIGHT,
    val occlCensusThr: Double = DEFAULT_OCCL_CENSUS_THR,
    val occlusionColorThr: Double = DEFAULT_OCCLUSION_COLOR_THR,
    val motionMargin: Double = DEFAULT_MOTION_MARGIN,
    val overhang: Double = DEFAULT_OVERHANG,
    val motionHoldS: Double = DEFAULT_MOTION_HOLD_S,
    val diffClaheClip: Double = DEFAULT_DIFF_CLAHE_CLIP,
    /** Wobble tolerance of the gray diff in px (min-diff vs shifted reference); 0 = exact (Python parity). */
    val diffJitterPx: Int = DEFAULT_DIFF_JITTER_PX,
    /** Cancel each square's own mean brightness shift (lighting robustness); false = Python parity. */
    val diffIllumCancel: Boolean = DEFAULT_DIFF_ILLUM_CANCEL,
    /** Census-quiet vetoes changed squares WITHOUT the chroma shadow test; false = Python parity. */
    val diffLightVeto: Boolean = DEFAULT_DIFF_LIGHT_VETO,
    /** Minimum absolute loglik score a voting candidate needs to commit; 0 = off (Python parity). */
    val commitLlFloor: Double = DEFAULT_COMMIT_LL_FLOOR,
    val requireMotionForMove: Boolean = DEFAULT_REQUIRE_MOTION_FOR_MOVE,
    val motionRecencyS: Double = DEFAULT_MOTION_RECENCY_S,
    val confirmFrames: Int = DEFAULT_CONFIRM_FRAMES,
    val pairLookAhead: Boolean = DEFAULT_PAIR_LOOK_AHEAD,
    val usePrior: Boolean = DEFAULT_USE_PRIOR,
    /** Unsafe legacy self-healing; off by default so unexplained changes stay visible. */
    val autoPatchReference: Boolean = DEFAULT_AUTO_PATCH_REFERENCE,
    val cornerJumpPx: Double = DEFAULT_CORNER_JUMP_PX,
    val detectScale: Double = DEFAULT_DETECT_SCALE,
) {
    companion object {
        const val DEFAULT_MOTION_THR: Double = 0.25
        const val DEFAULT_MOTION_PX_THR: Double = 20.0
        const val DEFAULT_Z_THR: Double = 3.0
        const val DEFAULT_AMBIGUITY_MARGIN_LL: Double = 2.0
        const val DEFAULT_REANCHOR_LL_FLOOR: Double = -4.0
        const val DEFAULT_NUDGE_TIMEOUT_S: Double = 5.0
        const val DEFAULT_DRIFT_WINDOW_S: Double = 30.0
        const val DEFAULT_MAX_CHANGED: Int = 6
        const val DEFAULT_CENSUS_THR: Double = 160.0

        /** Structural evidence fusion: z_eff = max(z_gray, w * z_census). 0 = off (legacy single-channel). */
        const val DEFAULT_CENSUS_Z_WEIGHT: Double = 1.0

        /**
         * Baseline occlusion needs census structure above this (0..255 ~ Hamming 0.75): strong absdiff
         * WITHOUT structure/chroma anomaly is a cast shadow, not a hand. 0 = legacy (any strong absdiff).
         */
        const val DEFAULT_OCCL_CENSUS_THR: Double = 24.0

        // NOTE: the historic 1.5 was "tuned" while the gamut was never built (veto dead code);
        // now that it is live, 1.5 over-fires — 3.0 is the validated-conservative start.
        const val DEFAULT_OCCLUSION_COLOR_THR: Double = 3.0
        const val DEFAULT_MOTION_MARGIN: Double = 0.10
        const val DEFAULT_OVERHANG: Double = 0.25
        const val DEFAULT_MOTION_HOLD_S: Double = 0.4
        const val DEFAULT_DIFF_CLAHE_CLIP: Double = 2.0

        /**
         * 0 = Python parity (clip replays are a parity gate; jitter=1 costs weak dark-on-dark
         * evidence — blender-opera loses its last 3 moves). The Android app defaults to 1
         * ([com.chesslab.tracker.service.TrackerSettings]) where phone-mount wobble dominates.
         */
        const val DEFAULT_DIFF_JITTER_PX: Int = 0

        /**
         * false = Python parity (clip replays are the gate). The Android app defaults to true
         * ([com.chesslab.tracker.service.TrackerSettings]) — live lighting shifts (clouds, lamps,
         * auto-exposure) are square-uniform and cancel; a piece blob keeps ~half its signal.
         */
        const val DEFAULT_DIFF_ILLUM_CANCEL: Boolean = false

        /**
         * false = Python parity. The Android app enables it together with [DEFAULT_DIFF_ILLUM_CANCEL]
         * (one "lighting robustness" switch): illum-cancel covers empty squares/gradients (uniform
         * shift cancels), the light veto covers OCCUPIED squares where lighting scales the piece's
         * sharp edges in place — gray fires but census structure stays put.
         */
        const val DEFAULT_DIFF_LIGHT_VETO: Boolean = false

        /**
         * Python parity (config.TRACK_DEFAULTS commit_ll_floor — added together): real moves
         * score ~12-24 live, while the phantom that swallowed a castle (f6h5, sole viable
         * candidate) committed at 0.44 — a sole-viable candidate has an infinite margin, so
         * only an ABSOLUTE floor can stop it. All 20 blender clips pass with the floor active.
         */
        const val DEFAULT_COMMIT_LL_FLOOR: Double = 2.0
        const val DEFAULT_REQUIRE_MOTION_FOR_MOVE: Boolean = true
        const val DEFAULT_MOTION_RECENCY_S: Double = 20.0
        const val DEFAULT_CONFIRM_FRAMES: Int = 2
        const val DEFAULT_PAIR_LOOK_AHEAD: Boolean = true
        const val DEFAULT_USE_PRIOR: Boolean = true
        const val DEFAULT_AUTO_PATCH_REFERENCE: Boolean = false
        const val DEFAULT_CORNER_JUMP_PX: Double = 6.0
        const val DEFAULT_DETECT_SCALE: Double = 0.5
    }
}
