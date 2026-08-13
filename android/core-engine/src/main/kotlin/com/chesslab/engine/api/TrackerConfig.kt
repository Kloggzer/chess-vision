package com.chesslab.engine.api

// TrackerConfig.kt — every knob from src/chesslab/config.py TRACK_DEFAULTS, plus the
// constructor-only knobs that have no CLI flag. Defaults copied VERBATIM from config.py — NOT
// from the tracker.py constructor signature, which disagrees on occlusionColorThr
// (constructor 1.5, TRACK_DEFAULTS 3.0). TRACK_DEFAULTS WINS.
//
// **No default here is measured by a plain `:app:testDebugUnitTest -Pchesslab.sim=true`.** The
// 18-clip simulation builds its config field-for-field out of each clip's recorded
// `effectiveConfig` (`sim/SimClips.kt`), and all 18 fixtures still record the values Python ran
// with — motionHoldS 0.34, cnnCooldownS 2.0, cnnCheckIntervalS 10.0. Proven on 2026-08-02 by
// setting `motionHoldS` to 5.00, a value that would freeze the tracker for longer than most clips
// run, and re-running: the 18 diff-only baselines and all six CNN-arm divergences came back
// byte-identical. So a green suite is not evidence for a default, it is evidence that the default
// was never in play. Since 2026-08-07 adding `-Pchesslab.sim.defaults=true` runs the same clips
// WITH these defaults (report-only, no gate) — that run is the one that puts a value here in
// play. Retune against that measurement, the live device, or a physical argument, and say which
// in the comment.
data class TrackerConfig(
    val motionThr: Double = 0.25,
    val motionPxThr: Double = 20.0,
    val zThr: Double = 3.0,
    val ambiguityMarginLl: Double = 2.0,
    // Inert at this value, and the arithmetic says so rather than the clips. A move is viable only
    // if EVERY touched square carries `z >= zThr * 0.5` (`Hypothesis.scoreViableMoves`), and a
    // square's logit is `LL_K * (z - zThr)`, so a viable move scores at worst `-1.5` per touched
    // square. `quietOutcome` compares that against `reanchorLlFloor * touched / 2`, i.e. `-2.0` per
    // square — always the smaller number. The comparison therefore cannot be true for any viable
    // move, at 2 touched squares or at castling's 4, and the re-anchor branch is reached only
    // through its other disjunct, "no viable move at all". The knob comes alive above -3.0, where
    // it starts throwing away references the tracker should keep, so its useful range is empty in
    // both directions. Kept for `TRACK_DEFAULTS` parity, not offered as a setting.
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
    // What one extra half-move costs the deep recovery search, in explained squares — see
    // `CnnConfig.plyCostSquares` for the full record. 0 was the historical behaviour (length
    // free); 1 since 2026-08-09, after 003957's reference confirm caught the served config
    // fabricating a 3-ply bridge.
    val cnnPlyCostSquares: Int = 1,
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
    // **There is no measured floor here, and there never was one on this side.** This read 0.34
    // with the note that 0.32 cost `blender-scholars` its mate. That measurement is real but it is
    // PYTHON's, taken with `pytest -m clips` at 30 fps; `config.py` still carries it. The Kotlin
    // 18-clip simulation cannot reproduce or refute it, because it never reads this default at all
    // (see the file header) and its clips run at 12 fps, where 0.34 and 0.32 are a quarter of one
    // frame apart. The runs recorded as "green at 0.32, at 0.20 and at 0.10" were three runs at
    // 0.34.
    //
    // So 0.20 is chosen for a PHYSICAL reason and not a measured one: it is the time a hand needs
    // to leave the board after releasing a piece. It buys ~140 ms off every announcement. What it
    // risks is Python's recorded failure mode — detection firing while more squares are still
    // covered than `maxChanged` allows, which is refused as `too_many_changed` and can swallow the
    // move that follows. That is a real hazard, it is unmeasured on this side, and the live game is
    // the only instrument that can settle it. If moves start committing while a hand is still over
    // the board, or a mating move goes missing, this is the knob.
    val motionHoldS: Double = 0.20,
    /**
     * The same length of time, for the OCCLUDER instead of the motion — split off `motionHoldS` on
     * 2026-08-12 so that one of the two can be turned off without the other.
     *
     * `motionHoldS` had four readers and only one of them was the settle delay it is named after
     * and documented as. The other three are the occlusion latch: how long a tainted square holds
     * (`applyTaints`, `restingHandVeto`), the window in which motion counts as having happened
     * since the taint (`releaseLatches`, which reconstructs the taint's time as `expiry - hold` and
     * therefore MUST read the same knob that set it), and the doubled hold after the grid-occlusion
     * gate clears, whose comment says "never optimise this away" because residual hand pixels
     * pollute the first detection.
     *
     * So `motionHoldS = 0` did not mean "read the move sooner". It also expired every hand taint
     * the moment it was set, i.e. it disarmed the occlusion veto that was supposed to take over —
     * the opposite of the experiment anyone would be running by setting it. Same default, same
     * behaviour, until one of them is deliberately moved.
     */
    val occluderHoldS: Double = 0.20,
    val occlusionColorThr: Double = 3.0,
    val minGridLineCoverage: Double = 0.5,
    val diffClaheClip: Double = 2.0,
    val requireMotionForMove: Boolean = true,
    val motionRecencyS: Double = 20.0,
    val commitLlFloor: Double = 2.0,
    val detectScale: Double = 0.5,
    val desyncObsN: Int = 3,
    /**
     * EXPERIMENT (2026-08-08, unmeasured until the A/B run that motivates it): commits and
     * verify votes only while NOTHING reads as a hand — no engine-side occlusion latch and no
     * occluded-reading square in a fresh observation. The shipped behaviour (false) tolerates a
     * hand and blocks only the covered squares, which has worked well live; this knob exists to
     * MEASURE that judgement instead of asserting it. Expected costs when on: commit latency and
     * lost moves under continuous fast play; expected gain: no commit ever lands mid-reach.
     */
    val cleanCommitsOnly: Boolean = false,
    /**
     * The MODEL-FREE hand veto (2026-08-09): while the observed frame's own grid grooves read a
     * locally erased cluster (`CnnSnapshot.gridOccluded`), verify votes are skipped, recovery
     * votes are refused and `handInFrame` reads true. It exists because `pOccluded` is identically
     * 0.0 under every 13-class model (CLAUDE.md pitfall) — 003957's fabricated `g4` committed
     * through a resting hand that the coverage gate, the census core and the model all missed,
     * while the groove read shows an 11-of-144 cluster exactly where the hand lay. On by default;
     * the off position exists so a replay can A/B the gate, not because off is a candidate.
     */
    val gridHandGate: Boolean = true,
    /**
     * EXPERIMENT (2026-08-12, unmeasured until the replay that follows it): commit while the hand
     * is still in frame, as long as it keeps this many cells of clearance from the move's own
     * squares. **0 is off and is the shipped behaviour.**
     *
     * ONE knob for three gates, because opening any of them alone is measurably the worst of both
     * worlds — that is the lesson of the same day's distance-rule attempt, which relaxed only the
     * verify gate: it gave up the safety and unlocked no time at all (65 -> 38 plies, 0 ms earlier),
     * because the frame loop had already refused to look while the hand moved. The three, in the
     * order a move meets them:
     *
     * 1. `FrameLoop`: motion no longer stops detection outright when the CNN's grid map says WHERE
     *    the hand is. The motion bookkeeping stays — `requireMotionForMove` still needs it.
     * 2. `Hypothesis.tooMuchChangeGate`: a hand covers ~8 squares and `maxChanged` is 6, so
     *    invariant 4 (latched squares COUNT) would refuse every hypothesis formed with a hand on
     *    the board. Under this knob the latched squares stop counting — the pair path keeps its
     *    `blockedN == 0` precondition, which is a different question.
     * 3. `VerifySingle`: the vote is refused only for a hand WITHIN this clearance of the
     *    candidate's squares, instead of anywhere on the board.
     *
     * What it can win is measured and small: 0.60 s median per move (rec-20260808-003957, the time
     * between the hand leaving the move's squares and the commit). What it risks is the incident
     * this whole sensor exists for — `g4` fabricated one cell from the hand that caused it.
     */
    val handTolerantCells: Int = 0,
    /**
     * Distinct desync observations after which an unreconcilable conflict set raises the alarm
     * even without a move-shaped guess. `0` = off, the way 0 means off for every other knob in
     * the catalog.
     *
     * A castling is the everyday case (`rec-20260807`, 2026-08-08): it vacates TWO squares and
     * fills TWO, so `guessIllegalMove`'s 1-and-1 shape can never name it and the engine held a
     * silent standoff to the end of the video. 12 is a placeholder chosen for its ORDER of
     * magnitude, not measured — at `cnnCheckIntervalS = 3.0` it is under a minute of standoff.
     * specs/39 phase 00's query 3 is what sets it; until that data exists this number is a guess
     * and must be labelled as one wherever it is quoted.
     */
    val desyncStandoffObsN: Int = 12,
    /**
     * Auto-resync after this many CONSECUTIVE consistent looks — 0 (the default, and the
     * phone's) is OFF: specs/37-02 built the resync as a door, and on a device it stays one.
     * A REPLAY may open the auto arm (`set:autoResyncObsN=<n>`): with the alarm latched, n
     * consecutive identity observations that carry no engine-side hand signal and agree on the
     * SAME adopted position resync the engine — the path stays unknown, one `cnn_resync` row
     * records the discontinuity, the history is kept. A legal recovery bridge always wins over
     * a resync when both are reachable in the same window.
     */
    val autoResyncObsN: Int = 0,
    val verifyObsVotes: Int = 2,
    val observerIntervalS: Double = 0.0,
    // constructor-only in Python (no CLI flag, not in TRACK_DEFAULTS):
    val darkLumaThr: Double = 18.0,
    val cnnVerify: Boolean = true,
    val liveAlign: Boolean = true,
    val usePrior: Boolean = true,
    // NOT a preference and not really a default: the calibration profile MEASURES the board size
    // from the detected quad and the app copies it in here, because `detSize` is derived twice —
    // once from this field for the engine's square boxes, once from the profile for the warp — and
    // `FrameLoop.step` refuses a plane whose size disagrees with its boxes. `config.py`'s 1600 is
    // only what stands here until the first sync; the profile can never produce it (it clamps to
    // 320..1280), so a config that reaches a frame carrying 1600 stops detection outright, one
    // silently dropped frame at a time.
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
