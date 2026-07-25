package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.DeriveResult
import com.chesslab.engine.api.IdentityResult
import com.chesslab.engine.api.ResyncResult

// Fakes for VerifySingleTest. `:core-engine` cannot depend on `:core-cnn` (cycle), so the seam is
// implemented by hand, mirroring `_FakeObs` / `_FakeRecovery` in `tests/test_move_tracker.py`.

/** `_FakeObs` — per-square occupancy and confidence, everything else unknown. */
internal class VerifyObs(
    private val occupancy: Map<String, Boolean> = mapOf("e4" to true, "e2" to false),
    private val confidence: Map<String, Boolean> = mapOf("e4" to true, "e2" to true),
) : CnnObservation {
    override fun occupied(square: String): Boolean = occupancy[square] == true

    override fun confident(
        square: String,
        thr: Double,
    ): Boolean = confidence[square] == true

    override fun labelConfident(
        square: String,
        thr: Double,
    ): Boolean = confidence[square] == true

    override fun label(square: String): String? = null

    override fun conf(square: String): Double = if (confidence[square] == true) 1.0 else 0.0

    override fun pOccluded(square: String): Double = 0.0

    override fun occupancyOnly(): CnnObservation = this
}

/**
 * `_FakeRecovery` — canned evaluation results, no model.
 *
 * `minConfidentBoard` defaults to 0 (permissive) so the occupancy-axis scenarios need no 32-square
 * confidence map; the blind-glance guard is exercised explicitly with the real default.
 */
internal class VerifyEvaluator(
    private val match: Boolean = false,
    private val occAgree: Double = 0.0,
    private val occN: Int = 2,
    private val deriveMove: String? = null,
    private val deriveAgreement: Double = 0.99,
    private val conflicts: List<String> = emptyList(),
    override val minConfidentBoard: Int = 0,
) : CnnEvaluator {
    override val confThr: Double = 0.85
    override val minAgreement: Double = 0.97

    override fun verifyMove(
        boardFen: String,
        moveUci: String,
        obs: CnnObservation,
    ): Pair<Double, Int> = occAgree to occN

    override fun resyncCheck(
        boardFen: String,
        obs: CnnObservation,
    ): ResyncResult =
        ResyncResult(
            match = match,
            conflicts = conflicts,
            checked = conflicts.size,
            move = deriveMove,
            agreement = if (deriveMove != null) deriveAgreement else 0.0,
        )

    override fun boardMatchesIdentity(
        boardFen: String,
        obs: CnnObservation,
    ): IdentityResult = IdentityResult(match = match, inconclusive = true, conflicts = conflicts)

    override fun deriveMovesDeep(
        boardFen: String,
        obs: CnnObservation,
        maxPlies: Int,
    ): DeriveResult = DeriveResult(emptyList(), 0.0, true)

    override fun hasOccupancyConflict(
        boardFen: String,
        obs: CnnObservation,
        thr: Double,
        conflicts: List<String>,
    ): Boolean = false

    override fun guessIllegalMove(
        boardFen: String,
        obs: CnnObservation,
        thr: Double,
    ): String? = null
}

/** A tracker with an active (stubbed) CNN and a pending candidate, like `_pending_tracker`. */
internal fun pendingState(
    uci: String = "e2e4",
    fen: String = STARTPOS,
    verifyWindow: Int = 8,
): EngineState {
    val state = EngineState(testConfig().copy(verifyWindow = verifyWindow), fen)
    state.cnnRun = true
    state.refGray = grayFrame(listOf("e2"))
    state.refFen = state.board.fen()
    state.verifyState = VERIFY_STATE_VERIFYING
    state.pending =
        PendingVerify(
            ucis = listOf(uci),
            uci = uci,
            fen = state.board.fen(),
            cur = grayFrame(listOf(uci.substring(2, 4))),
            curBgr = null,
            frames = 0,
            priorUsed = false,
            seq = 0,
        )
    return state
}

/** `_mk_snap` — a seq-tagged snapshot as the free-running observer would deliver it. */
internal fun snapOf(
    state: EngineState,
    obs: CnnObservation,
    seq: Long = 0,
): CnnSnapshot =
    CnnSnapshot(
        obs = obs,
        seq = seq,
        tsMs = 0L,
        inferMs = 0.0,
        warped = null,
        gray = null,
        fen = state.board.fen(),
    )
