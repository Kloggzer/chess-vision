package com.chesslab.engine.api

// CnnObservation.kt — the engine-side CNN seam. `:core-engine` MUST NOT depend on
// `:core-cnn` (that would be a dependency cycle), so the engine consumes the observation
// model through these interfaces; `:core-cnn` implements them. Created by phase 00a.
interface CnnObservation {
    // pOcc > pEmpty
    fun occupied(square: String): Boolean

    fun confident(
        square: String,
        thr: Double,
    ): Boolean

    fun labelConfident(
        square: String,
        thr: Double,
    ): Boolean

    fun label(square: String): String?

    fun conf(square: String): Double

    /** Probability of the second-best identity class. Unknown implementations stay conservative. */
    fun runnerUpConf(square: String): Double = 1.0

    fun pOccluded(square: String): Double

    /** Raw mass on identity labels forbidden by the position context. */
    fun invalidMass(square: String): Double = 0.0

    /** Explicit "none of the context-allowed labels fits" outcome. */
    fun invalidConfident(
        square: String,
        thr: Double,
    ): Boolean = invalidMass(square) >= thr

    /** Pixels-only view. Conditioned observations override this for recovery/resync. */
    fun rawObservation(): CnnObservation = this

    /** Historical prior behaviour: trust the conditioned view everywhere, without invalid. */
    fun withoutPriorSafety(): CnnObservation = this

    // identity stripped (the _cnn_tick fallback)
    fun occupancyOnly(): CnnObservation
}

data class ResyncResult(
    val match: Boolean,
    val conflicts: List<String>,
    val checked: Int,
    // `resync_check` also names the ONE legal move whose occupancy explains the observation, and how
    // well it explains it. The verify ladder's overrule rung and `_cnn_tick`'s occupancy path are
    // both built on those two values, so dropping them makes `cnn_overrule` inexpressible (the
    // legacy D3 bug this pack exists to fix). Defaulted so an evaluator that derives no move stays
    // source-compatible — see STATUS D04a-1.
    val move: String? = null,
    val agreement: Double = 0.0,
)

data class IdentityResult(
    val match: Boolean,
    val inconclusive: Boolean,
    val conflicts: List<String>,
)

data class DeriveResult(
    val moves: List<String>,
    val agreement: Double,
    val inconclusive: Boolean,
)

/**
 * Implemented by `:core-cnn`'s `CnnRecovery`.
 *
 * The position crosses the seam as a **FEN**, not as a board object: neither module may name the
 * other's board type (`:core-engine` has `Game`, `:core-cnn` has chesslib's `Board`), and typing it
 * as `Any` only moved the mismatch to the first live call (STATUS D04a-5 / D04b-3). Parsing a FEN
 * per call is free at the rate these run — a few CNN OBSERVATIONS per second, not per frame — and
 * `getFen(true, true)` carries placement, side to move, castling rights and the en-passant target,
 * i.e. everything the occupancy/identity checks and the legal-move searches read. The move history
 * is the only thing it drops, and none of them looks at it.
 */
interface CnnEvaluator {
    val confThr: Double

    fun verifyMove(
        boardFen: String,
        moveUci: String,
        obs: CnnObservation,
    ): Pair<Double, Int>

    fun resyncCheck(
        boardFen: String,
        obs: CnnObservation,
    ): ResyncResult

    fun boardMatchesIdentity(
        boardFen: String,
        obs: CnnObservation,
    ): IdentityResult

    fun deriveMovesDeep(
        boardFen: String,
        obs: CnnObservation,
        maxPlies: Int,
    ): DeriveResult

    fun hasOccupancyConflict(
        boardFen: String,
        obs: CnnObservation,
        thr: Double,
        conflicts: List<String>,
    ): Boolean

    fun guessIllegalMove(
        boardFen: String,
        obs: CnnObservation,
        thr: Double,
    ): String?

    val minConfidentBoard: Int

    val minAgreement: Double
}
