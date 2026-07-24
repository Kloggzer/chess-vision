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

    fun pOccluded(square: String): Double

    // identity stripped (the _cnn_tick fallback)
    fun occupancyOnly(): CnnObservation
}

data class ResyncResult(
    val match: Boolean,
    val conflicts: List<String>,
    val checked: Int,
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

// implemented by :core-cnn CnnRecovery
interface CnnEvaluator {
    val confThr: Double

    fun verifyMove(
        board: Any,
        moveUci: String,
        obs: CnnObservation,
    ): Pair<Double, Int>

    fun resyncCheck(
        board: Any,
        obs: CnnObservation,
    ): ResyncResult

    fun boardMatchesIdentity(
        board: Any,
        obs: CnnObservation,
    ): IdentityResult

    fun deriveMovesDeep(
        board: Any,
        obs: CnnObservation,
        maxPlies: Int,
    ): DeriveResult

    fun hasOccupancyConflict(
        board: Any,
        obs: CnnObservation,
        thr: Double,
        conflicts: List<String>,
    ): Boolean

    fun guessIllegalMove(
        board: Any,
        obs: CnnObservation,
        thr: Double,
    ): String?

    val minConfidentBoard: Int

    val minAgreement: Double
}
