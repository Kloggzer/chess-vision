package com.chesslab.engine.api

data class TrackerConfig(
    val motionThr: Double = 0.25,
    val motionPxThr: Double = 20.0,
    val zThr: Double = 3.0,
    val ambiguityMarginLl: Double = 2.0,
    val nudgeTimeoutS: Double = 5.0,
    val driftWindowS: Double = 30.0,
    val maxChanged: Int = 6,
    val censusThr: Double = 40.0,
    val censusZWeight: Double = 1.0,
    val occlCensusThr: Double = 24.0,
    val cnnConfThr: Double = 0.85,
    // 0.7 s throttles the first STUCK read; 64 crops measured 16 ms median on SM8650 (2026-08-02).
    val cnnCooldownS: Double = 0.7,
    // 3 s gives the quiet-board drift check a measured 0.5% CNN duty cycle.
    val cnnCheckIntervalS: Double = 3.0,
    // Lies, sobald das Brett einrastet, statt wenn die Uhr es erlaubt: 304/90/7 gegen 302/92/9,
    // und der 2-s-Latenzschwanz faellt weg (`docs/emission-correlation.md`).
    val cnnEvalOnSettle: Boolean = true,
    // Nur der Default: die Schwelle folgt aus der Modellguete und reist als `coverage_gate`
    // im Modell (0.02 fuer comp13, 0.15 fuer real13 — `docs/occlusion-gate.md`).
    val pOccludedThr: Double = 0.5,
    // Nach so vielen identischen Ablehnungen darf die CNN sehen, auch wenn kein anderes Tor
    // aufgeht — wiederholtes Scheitern hielt sie bisher AUS (`docs/refused-streak.md`).
    val refusedStreakForEval: Int = 3,
    // So viele Beobachtungen ueber `desyncObsN` hinaus wartet der Latch — Luft fuer den
    // Hand-Latch, in der Einheit, die der Rest des Desyncs benutzt (bei ~10 Obs/s ist 1 ~ 100 ms).
    // Die Serie laeuft weiter, nur das Einrasten haelt an. 0 = nur die Handpruefung.
    val alarmDeferObs: Int = 0,
    val verifyWindow: Int = 8,
    // Seconds bound pending-candidate dead time when the observer stalls; observation count cannot.
    val verifyTimeoutS: Double = 1.5,
    val cnnMinAgreement: Double = 0.97,
    val cnnMarginSquares: Int = 1,
    // One explained square per extra ply prevents the fabricated 3-ply bridge from 003957 (2026-08-09).
    val cnnPlyCostSquares: Int = 1,
    val recoveryMaxPlies: Int = 4,
    val minConfidentBoard: Int = 32,
    val minConfidentRecovery: Int = 8,
    val cnnColorAxis: Boolean = false,
    val motionMargin: Double = 0.10,
    val overhang: Double = 0.25,
    val alignEvery: Int = 3,
    val alignScale: Double = 0.5,
    val cornerJumpPx: Double = 6.0,
    // 0.20 s is the physical hand-clearance time; commit follows after another 0.05–0.07 s at 30 fps.
    val motionHoldS: Double = 0.20,
    // Separate 0.20 s occluder hold keeps hand-taint safety independent of motion settle (2026-08-12).
    val occluderHoldS: Double = 0.20,
    // Detection may open before `motionHoldS`; the reference is then re-captured once the full hold
    // has passed (2026-09-12). null = the motion hold: commit and reference on the same frame.
    val commitHoldS: Double? = null,
    // A commit INSIDE the motion hold (only with `commitHoldS`) needs this many consecutive
    // observations in which the move's squares were unoccluded and already showed the post-move
    // occupancy: evidence instead of the physical hold (2026-09-13). 0 = the hold alone.
    val earlyCommitObs: Int = 2,
    // "Seen" for the sight series: no hand at all, not `pOccludedThr` (0.15 is where the model still
    // has a chance at the piece). Hand-free squares read 0.001–0.02, covered ones 0.87–1.0.
    val sightCoverageMax: Double = 0.05,
    // A pending verify warps and observes the CURRENT frame on top of the observer's request/serve
    // alternation (every 2nd frame). 333 → 267 ms median at 15 fps, no score change on 12 recordings.
    val verifyObserveNow: Boolean = true,
    val occlusionColorThr: Double = 3.0,
    val minGridLineCoverage: Double = 0.5,
    val diffClaheClip: Double = 2.0,
    val requireMotionForMove: Boolean = true,
    val motionRecencyS: Double = 20.0,
    val commitLlFloor: Double = 2.0,
    val detectScale: Double = 0.5,
    val desyncObsN: Int = 3,
    // 1,5 s verhindert den 0,21-s-Fehlalarm aus `VID_20260824_154327` (2026-08-24; 107/117 Plies verloren).
    val alarmMinS: Double = 1.5,
    // Experiment (2026-08-08): require a completely hand-free frame to measure mid-reach safety.
    val cleanCommitsOnly: Boolean = false,
    // Model-free grid veto blocks the resting-hand failure that fabricated `g4` in 003957 (2026-08-09).
    val gridHandGate: Boolean = true,
    // Hand-shape and motion/grid evidence filter the phantom queenside from 20260814-142947 (2026-08-14).
    val modelHandGate: Boolean = true,
    // 0 = off. Castling caused a silent standoff in rec-20260807 (2026-08-08).
    // 12 is an unmeasured placeholder: at a 3 s check interval it bounds standoff below one minute.
    val desyncStandoffObsN: Int = 12,
    // 0 = off. Auto-resync requires consecutive hand-free identity matches to the same position.
    // Legal recovery always wins when both paths are available.
    val autoResyncObsN: Int = 0,
    val verifyObsVotes: Int = 2,
    // Window end accepts the diff only with BOTH endpoints readable (pairs: every touched square);
    // one readable square on a dark board is an empty conflict set, not a clear view. The path never
    // fires on the regression set (2026-09-05, 0 × diff_after_verify), so ON costs nothing measured.
    val windowEndBothEnds: Boolean = true,
    val observerIntervalS: Double = 0.0,
    val darkLumaThr: Double = 18.0,
    val cnnVerify: Boolean = true,
    val liveAlign: Boolean = true,
    val usePrior: Boolean = true,
    // Calibration supplies 320–1280 px; engine boxes and warp must share this size or frames are refused.
    val boardSize: Int = 1600,
    // null selects the CNN-conditional frame count; explicit values preserve per-clip overrides.
    val settleFramesOverride: Int? = null,
    val avgFramesOverride: Int? = null,
    val confirmFramesOverride: Int? = null,
) {
    fun settleFrames(cnnOn: Boolean) = settleFramesOverride ?: if (cnnOn) SETTLE_FRAMES_CNN else SETTLE_FRAMES_NO_CNN

    fun avgFrames(cnnOn: Boolean) = avgFramesOverride ?: if (cnnOn) AVG_FRAMES_CNN else AVG_FRAMES_NO_CNN

    fun confirmFrames(cnnOn: Boolean) = confirmFramesOverride ?: if (cnnOn) CONFIRM_FRAMES_CNN else CONFIRM_FRAMES_NO_CNN

    val detSize: Int get() = if (detectScale < 1.0) (boardSize * detectScale).toInt() else boardSize

    private companion object {
        const val SETTLE_FRAMES_CNN = 3
        const val SETTLE_FRAMES_NO_CNN = 4
        const val AVG_FRAMES_CNN = 2
        const val AVG_FRAMES_NO_CNN = 3
        const val CONFIRM_FRAMES_CNN = 1
        const val CONFIRM_FRAMES_NO_CNN = 2
    }
}
