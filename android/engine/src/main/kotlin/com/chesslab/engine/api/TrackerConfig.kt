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
    val requireMotionForMove: Boolean = DEFAULT_REQUIRE_MOTION_FOR_MOVE,
    val motionRecencyS: Double = DEFAULT_MOTION_RECENCY_S,
    val confirmFrames: Int = DEFAULT_CONFIRM_FRAMES,
    val pairLookAhead: Boolean = DEFAULT_PAIR_LOOK_AHEAD,
    val usePrior: Boolean = DEFAULT_USE_PRIOR,
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
        const val DEFAULT_REQUIRE_MOTION_FOR_MOVE: Boolean = true
        const val DEFAULT_MOTION_RECENCY_S: Double = 20.0
        const val DEFAULT_CONFIRM_FRAMES: Int = 2
        const val DEFAULT_PAIR_LOOK_AHEAD: Boolean = true
        const val DEFAULT_USE_PRIOR: Boolean = true
        const val DEFAULT_CORNER_JUMP_PX: Double = 6.0
        const val DEFAULT_DETECT_SCALE: Double = 0.5
    }
}
