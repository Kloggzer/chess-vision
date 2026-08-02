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
    // Both were sized for a CNN that cost 100-300 ms. It costs 16 ms.
    //
    // Measured live on the SM8650 on 2026-08-02 over 534 observations of a real game with the
    // shipped `id35-80`: 10 min / 16 median / 23 p90 / 49 max ms for 64 crops, against a 23.1 ms
    // median whole frame at 26-28 fps. The old figures these two were chosen against — 146 ms and
    // 290 ms per observation — belonged to the wide GroupNorm model, which no longer ships.
    //
    // [cnnCooldownS] is the throttle on the STUCK arm, so it is the floor on how fast a recovery can
    // answer a board that has gone wrong: at 2.0 a bridge could not arrive sooner than two seconds
    // after the tracker noticed, and any confirmer above one vote pays it again per vote. At 0.7 the
    // whole-board read costs about 2 % of one frame's budget per second.
    val cnnCooldownS: Double = 0.7,
    // [cnnCheckIntervalS] is the STABLE arm: a whole-board sanity read while nothing is happening.
    // Every 10 s was a 0.16 % duty cycle; every 3 s is 0.5 %, and it is the only thing that notices
    // a board that drifted out from under a quiet game.
    val cnnCheckIntervalS: Double = 3.0,
    val verifyWindow: Int = 8,
    // ...and the same deadline in SECONDS, which is the unit the player experiences.
    // `verifyWindow` counts OBSERVATIONS and what one costs is set by the CNN — unbounded if the
    // observer stalls. A pending candidate blinds BOTH paths, so that is dead time, and the SECONDS
    // deadline is what bounds it. The figures this was written against (146 ms and 290 ms per
    // observation) were the wide GroupNorm model's; `id35-80` measures 16 ms median for 64 crops
    // live, so eight observations is now a fraction of the timeout rather than well past it. The
    // timeout stays because it guards a STALLED observer, which no model speed fixes.
    // See `config.py` and specs/19-live-hardening/STATUS.md §14.
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
    // move within 0.2 s of the same wall time. See `config.py` and specs/19-live-hardening §7.
    //
    // **The old floor is gone, and so is the suite's guidance.** This read 0.34 with the note that
    // 0.32 cost `blender-scholars` its mate. Re-measured 2026-08-02 with the shipped `id35-80`
    // (16 ms per observation against the 146-290 ms the original figure was taken under): the
    // 18-clip simulation is green at 0.32, at 0.20 and at 0.10. The constraint did not move — it
    // disappeared, which means the suite can no longer tell us what this should be either.
    //
    // So 0.20 is chosen for a PHYSICAL reason and not a measured one, and this comment says so
    // rather than implying a floor it does not have: it is the time a hand needs to leave the board
    // after releasing a piece, and the clips' synthetic arm sweeps are cleaner and faster than a
    // real one. It buys ~140 ms off every announcement against the old value. If moves start
    // committing while a hand is still over the board, this is the knob, and the live game is the
    // only instrument that can say so.
    val motionHoldS: Double = 0.20,
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
