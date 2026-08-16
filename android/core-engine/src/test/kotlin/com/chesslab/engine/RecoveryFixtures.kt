package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.DeriveResult
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.IdentityResult
import com.chesslab.engine.api.ResyncResult
import com.chesslab.engine.api.TrackerConfig

// Fakes for CnnTickTest / AlarmLatchTest only. Mirrors `_AlarmStub` and `_FakeRecovery` in
// `tests/test_move_tracker.py`: canned identity/occupancy verdicts, so the recovery and alarm
// state machines are driven without any model.

/** Position after 1.Nf3 with castling rights removed — the board every alarm scenario runs on. */
internal const val NF3_NO_CASTLING = "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b - - 1 1"

internal const val LABEL_EMPTY = "empty"

/** `_AlarmStub._build_obs`: one confidence for every square, identity present unless stripped. */
internal class RecoveryObs(
    private val labels: Map<String, String>,
    private val identity: Boolean = true,
    private val confidence: Double = 0.99,
    private val runnerUpConfidence: Double = 0.0,
    /** Squares whose `occluded` class dominates — a hand, as the observer itself reports it. */
    private val occluded: Set<String> = emptySet(),
) : CnnObservation {
    override fun occupied(square: String): Boolean = labelOf(square) != LABEL_EMPTY

    override fun confident(
        square: String,
        thr: Double,
    ): Boolean = confidence >= thr

    override fun labelConfident(
        square: String,
        thr: Double,
    ): Boolean = identity && confidence >= thr

    override fun label(square: String): String? = if (identity) labelOf(square) else null

    override fun conf(square: String): Double = confidence

    override fun runnerUpConf(square: String): Double = runnerUpConfidence

    override fun pOccluded(square: String): Double = if (square in occluded) 1.0 else 0.0

    override fun occupancyOnly(): CnnObservation = RecoveryObs(labels, identity = false, confidence, runnerUpConfidence, occluded)

    private fun labelOf(square: String): String = labels[square] ?: LABEL_EMPTY
}

/** `_AlarmStub.set_obs_for_board`: what the game state expects, plus the squares the CNN misreads. */
internal fun obsForBoard(
    game: Game,
    overrides: Map<String, String> = emptyMap(),
    identity: Boolean = true,
): RecoveryObs = RecoveryObs(Squares.ALL.associateWith { game.labelAt(it) } + overrides, identity)

/** `_AlarmStub` / `_FakeRecovery`: every verdict is a field, so a test states exactly one thing. */
internal class RecoveryEvaluator(
    var match: Boolean = false,
    var conflicts: List<String> = emptyList(),
    var moves: List<String> = emptyList(),
    var agreement: Double = 1.0,
    var occupancyMatch: Boolean = false,
    var occupancyConflict: Boolean = true,
    var guess: String? = null,
) : CnnEvaluator {
    /** 0 keeps every existing test permissive; the blind-glance guard needs a real bar. */
    override var minConfidentBoard: Int = 0

    var inconclusive: Boolean = false

    /** What `resync_check` itself names — the occupancy arm must prefer THIS over the deep search. */
    var resyncMove: String? = null
    var resyncAgreement: Double = 0.0

    override val confThr: Double = 0.85

    override val minAgreement: Double = 0.97

    override fun verifyMove(
        boardFen: String,
        moveUci: String,
        obs: CnnObservation,
    ): Pair<Double, Int> = 0.0 to 0

    override fun resyncCheck(
        boardFen: String,
        obs: CnnObservation,
    ): ResyncResult = ResyncResult(occupancyMatch, conflicts, 0, resyncMove, resyncAgreement)

    override fun boardMatchesIdentity(
        boardFen: String,
        obs: CnnObservation,
    ): IdentityResult = IdentityResult(match, inconclusive, conflicts)

    override fun deriveMovesDeep(
        boardFen: String,
        obs: CnnObservation,
        maxPlies: Int,
    ): DeriveResult = DeriveResult(moves, agreement, moves.isEmpty())

    override fun hasOccupancyConflict(
        boardFen: String,
        obs: CnnObservation,
        thr: Double,
        conflicts: List<String>,
    ): Boolean = occupancyConflict

    override fun guessIllegalMove(
        boardFen: String,
        obs: CnnObservation,
        thr: Double,
    ): String? = guess
}

/**
 * A state whose `_cnn_tick` gates are open through the STUCK path (`cnn_cooldown_s = 0`,
 * `settle_frames = 1`), with the periodic check pushed out of reach — mirrors the `_make_tracker`
 * kwargs of every alarm test.
 */
internal fun recoveryConfig(
    confirmFrames: Int = 1,
    desyncObsN: Int = 3,
): TrackerConfig =
    TrackerConfig(
        boardSize = TEST_BOARD_SIZE,
        detectScale = 1.0,
        cnnCooldownS = 0.0,
        cnnCheckIntervalS = 3600.0,
        desyncObsN = desyncObsN,
        settleFramesOverride = 1,
        confirmFramesOverride = confirmFrames,
    )

internal fun recoveryState(
    fen: String = STARTPOS,
    confirmFrames: Int = 1,
    desyncObsN: Int = 3,
): EngineState = EngineState(recoveryConfig(confirmFrames, desyncObsN), fen, whitePov = true).armed()

/** The stuck precondition every `_cnn_tick` gate test needs, plus the deterministic clock. */
internal fun EngineState.armed(): EngineState {
    cnnRun = true
    nowS = 1000.0
    markStuck(STUCK_NO_LEGAL_MOVE)
    return this
}

/**
 * A game already under way. The alarm may not latch before the first commit (`alarmable` in
 * `Alarm.kt`), so a scenario that needs a latched alarm has to put a ply on the record — which is
 * what any run that has been tracking for a while has. [san] defaults to the move `NF3_NO_CASTLING`
 * was reached by.
 */
internal fun EngineState.underWay(san: String = "Nf3"): EngineState = apply { history.add(san) }

/** One observation of the current position. [gray] is the anchor warp (`null` = none delivered). */
internal fun recoverySnap(
    state: EngineState,
    obs: CnnObservation,
    seq: Long,
    gray: GrayImage? = null,
    fen: String = state.board.fen(),
    warped: BgrImage? = null,
    gridOccluded: Long = 0L,
): CnnSnapshot = CnnSnapshot(obs, seq, 0L, 0.0, warped, gray, fen, gridOccluded)

/** Monotonic snapshot seqs for [recoveryGlances] — far above the hand-numbered ones in tests. */
private var glanceSeq = 9000L

/**
 * The two agreeing clean glances a bridge demands since specs/39 phase 02 — one snapshot, one
 * vote, so a single `cnnTick` no longer commits a recovery anywhere. Tests that assert what a
 * COMMITTED bridge does drive it through this; tests about the voting itself tick by hand.
 * The anchor-carrying snapshot is the SECOND one, because that is the glance that commits.
 */
internal fun EngineState.recoveryGlances(
    cnn: CnnEvaluator,
    obs: CnnObservation,
    gray: GrayImage? = null,
    warped: BgrImage? = null,
): List<com.chesslab.engine.api.TrackerEvent> {
    cnnTick(cnn, recoverySnap(this, obs, seq = ++glanceSeq))
    return cnnTick(cnn, recoverySnap(this, obs, seq = ++glanceSeq, gray = gray, warped = warped))
}

/** Latch the alarm the way `_alarmed_tracker` does: three distinct stable mismatching glances. */
internal fun alarmedState(): Pair<EngineState, RecoveryEvaluator> {
    val state = recoveryState(NF3_NO_CASTLING).underWay()
    val cnn = RecoveryEvaluator(conflicts = listOf("e1", "g1"), guess = "e1g1")
    val obs = obsForBoard(state.board, mapOf("e1" to LABEL_EMPTY, "g1" to "wK"))
    for (seq in 1L..3L) state.cnnTick(cnn, recoverySnap(state, obs, seq))
    check(state.alarm != null) { "precondition: the alarm must be latched" }
    return state to cnn
}
