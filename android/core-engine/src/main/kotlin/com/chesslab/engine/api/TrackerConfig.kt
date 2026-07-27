package com.chesslab.engine.api

// TrackerConfig.kt — every knob from src/chesslab/config.py TRACK_DEFAULTS (lines 590-646),
// plus the constructor-only knobs that have no CLI flag. Defaults copied VERBATIM from
// config.py — NOT from the tracker.py constructor signature, which disagrees on
// occlusionColorThr (constructor 1.5, TRACK_DEFAULTS 3.0). TRACK_DEFAULTS WINS.
data class TrackerConfig(
    val motionThr: Double = 0.25,
    val motionPxThr: Double = 20.0,
    val zThr: Double = 3.0,
    val ambiguityMarginLl: Double = 2.0,
    val reanchorLlFloor: Double = REANCHOR_LL_FLOOR_DEFAULT,
    val nudgeTimeoutS: Double = 5.0,
    val driftWindowS: Double = 30.0,
    val maxChanged: Int = 6,
    val censusThr: Double = 40.0,
    val censusZWeight: Double = 1.0,
    val occlCensusThr: Double = 24.0,
    val cnnConfThr: Double = 0.85,
    val cnnCooldownS: Double = 2.0,
    val cnnCheckIntervalS: Double = 10.0,
    val verifyWindow: Int = 8,
    // ...and the same deadline in SECONDS, which is the unit the player experiences.
    // `verifyWindow` counts OBSERVATIONS and what one costs is set by the CNN: 8 of them is 1.2 s
    // at a 146 ms observation and 2.4 s at the 290 ms measured on an SM8650 — unbounded if the
    // observer stalls. A pending candidate blinds BOTH paths, so that is dead time. See
    // `config.py` and specs/19-live-hardening/STATUS.md §14.
    val verifyTimeoutS: Double = 1.5,
    val cnnMinAgreement: Double = 0.97,
    val cnnMarginSquares: Int = 1,
    val recoveryMaxPlies: Int = 4,
    val minConfidentBoard: Int = 32,
    val minConfidentRecovery: Int = 8,
    val motionMargin: Double = 0.10,
    val overhang: Double = 0.25,
    val alignEvery: Int = 3,
    val alignScale: Double = 0.5,
    val cornerJumpPx: Double = 6.0,
    // This constant, not the frame rate, sets HALF the commit latency: last motion -> commit is
    // `motionHoldS + 0.05..0.07` at 30 fps, and the same clip replayed at 30/15/10 fps commits every
    // move within 0.2 s of the same wall time. 0.34 is the floor the clip suite allows — at 0.32
    // `blender-scholars` loses its mate. See `config.py` and specs/19-live-hardening/STATUS.md §7.
    val motionHoldS: Double = 0.34,
    val occlusionColorThr: Double = 3.0,
    val minGridLineCoverage: Double = 0.5,
    val reconnectGraceS: Double = 2.0,
    val diffClaheClip: Double = 2.0,
    val requireMotionForMove: Boolean = true,
    val motionRecencyS: Double = 20.0,
    val commitLlFloor: Double = 2.0,
    val detectScale: Double = 0.5,
    val desyncObsN: Int = 3,
    val verifyObsVotes: Int = 2,
    val observerIntervalS: Double = 0.0,
    // constructor-only in Python (no CLI flag, not in TRACK_DEFAULTS):
    val llK: Double = 1.0,
    val darkLumaThr: Double = 18.0,
    val cnnVerify: Boolean = true,
    val liveAlign: Boolean = true,
    val usePrior: Boolean = true,
    // config.DEFAULT_BOARD_SIZE
    val boardSize: Int = 1600,
    // Python takes settle/avg/confirm as constructor params defaulting to None, and only
    // then falls back to the CNN-conditional counts. A clip
    // manifest may override them (blender-castle sets confirm_frames: 3), so the seam must
    // be able to express an explicit value. null = "use the CNN-conditional default".
    val settleFramesOverride: Int? = null,
    val avgFramesOverride: Int? = null,
    val confirmFramesOverride: Int? = null,
) {
    // Python: settle/avg/confirm are CNN-conditional unless explicitly given
    fun settleFrames(cnnOn: Boolean) = settleFramesOverride ?: if (cnnOn) SETTLE_FRAMES_CNN else SETTLE_FRAMES_NO_CNN

    fun avgFrames(cnnOn: Boolean) = avgFramesOverride ?: if (cnnOn) AVG_FRAMES_CNN else AVG_FRAMES_NO_CNN

    fun confirmFrames(cnnOn: Boolean) = confirmFramesOverride ?: if (cnnOn) CONFIRM_FRAMES_CNN else CONFIRM_FRAMES_NO_CNN

    val detSize: Int get() = if (detectScale < 1.0) (boardSize * detectScale).toInt() else boardSize

    private companion object {
        // TRACK_DEFAULTS re_anchor_ll_floor. A named constant only because detekt's
        // MagicNumber does not recognise a NEGATIVE constructor default as a property
        // declaration; the value is verbatim from config.py.
        const val REANCHOR_LL_FLOOR_DEFAULT = -4.0

        // tracker.py settle/avg/confirm frame counts. Named only because detekt's
        // MagicNumber fires on 3 and 4 inside a function body; the values are verbatim.
        const val SETTLE_FRAMES_CNN = 3
        const val SETTLE_FRAMES_NO_CNN = 4
        const val AVG_FRAMES_CNN = 2
        const val AVG_FRAMES_NO_CNN = 3
        const val CONFIRM_FRAMES_CNN = 1
        const val CONFIRM_FRAMES_NO_CNN = 2
    }
}
