package com.chesslab.engine

import com.chesslab.engine.api.CnnEvaluator
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.DeriveResult
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.IdentityResult
import com.chesslab.engine.api.ResyncResult
import com.chesslab.engine.api.TrackerConfig
import com.github.bhlangonijr.chesslib.move.Move

// Fakes for VerifyPairTest only. Mirrors `_FakeObs` / `_FakeRecovery` in
// `tests/test_move_tracker.py` — canned occupancy/confidence and canned resync results, so the
// pair ladder is tested without any CNN.

/** `_FakeObs`: per-square occupancy plus the confident set; every other axis is unused here. */
internal class PairObs(
    private val occupancy: Map<String, Boolean> = emptyMap(),
    private val sure: Set<String> = emptySet(),
) : CnnObservation {
    override fun occupied(square: String): Boolean = occupancy[square] ?: false

    override fun confident(
        square: String,
        thr: Double,
    ): Boolean = square in sure

    override fun labelConfident(
        square: String,
        thr: Double,
    ): Boolean = false

    override fun label(square: String): String? = null

    override fun conf(square: String): Double = 0.0

    override fun pOccluded(square: String): Double = 0.0

    override fun occupancyOnly(): CnnObservation = this
}

/**
 * `_FakeRecovery`, occupancy path. [matchFen] is the `_check` closure the Python after-match test
 * installs: match exactly one position, everything else mismatches.
 *
 * [minConfidentBoard] defaults to 0 — permissive, so the occupancy-axis tests need no 32-square
 * confidence map; the blind-glance guard is exercised explicitly with the real default.
 */
internal class PairRecovery(
    override val confThr: Double = 0.85,
    override val minAgreement: Double = 0.97,
    override val minConfidentBoard: Int = 0,
    private val match: Boolean = false,
    private val conflicts: List<String> = emptyList(),
    private val matchFen: String? = null,
) : CnnEvaluator {
    override fun verifyMove(
        boardFen: String,
        moveUci: String,
        obs: CnnObservation,
    ): Pair<Double, Int> = 0.0 to 0

    override fun resyncCheck(
        boardFen: String,
        obs: CnnObservation,
    ): ResyncResult =
        if (matchFen != null) {
            ResyncResult(boardFen == matchFen, emptyList(), 0)
        } else {
            ResyncResult(match, conflicts, 0)
        }

    override fun boardMatchesIdentity(
        boardFen: String,
        obs: CnnObservation,
    ): IdentityResult = IdentityResult(match = false, inconclusive = true, conflicts = emptyList())

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

/** A state with an armed pair candidate, mirroring `_pending_tracker`. */
internal fun pairState(
    fen: String = STARTPOS,
    ucis: List<String> = listOf("e2e4", "e7e5"),
    verifyWindow: Int = 8,
    cur: GrayImage = grayFrame(listOf("e4", "e5")),
): EngineState {
    val state = EngineState(TrackerConfig(verifyWindow = verifyWindow), fen, whitePov = true)
    state.refGray = grayFrame(listOf("e2", "e7"))
    state.refFen = state.board.fen()
    state.pending =
        PendingVerify(
            ucis = ucis,
            uci = ucis[0],
            fen = state.board.fen(),
            cur = cur,
            curBgr = null,
            frames = 0,
            priorUsed = false,
            seq = 0,
        )
    return state
}

/** The two half-moves, the second one resolved on the MID board — it is illegal before the first. */
internal fun pairMoves(
    state: EngineState,
    ucis: List<String>,
): List<Move> {
    val board = state.board.copy()
    val first = board.legalMoves().first { uciOf(it) == ucis[0] }
    board.push(first)
    return listOf(first, board.legalMoves().first { uciOf(it) == ucis[1] })
}

/** One observer glance at the pair candidate. */
internal fun pairTick(
    state: EngineState,
    cnn: CnnEvaluator,
    moves: List<Move>,
    obs: CnnObservation,
) = VerifyPair.tick(state, cnn, moves, state.board.copy(), snapshotOf(state, obs))

/** FEN of the position after both half-moves. */
internal fun afterFen(
    state: EngineState,
    moves: List<Move>,
): String {
    val board = state.board.copy()
    for (move in moves) board.push(move)
    return board.fen()
}
