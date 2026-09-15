package com.chesslab.engine.api

interface CnnObservation {
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

    fun runnerUpConf(square: String): Double = 1.0

    fun pOccluded(square: String): Double

    /**
     * Die gemessene Verdeckungsschwelle des MODELLS annehmen (`docs/occlusion-gate.md`); ohne sie
     * gatet [confident] mit `1.0 - thr`, also am KLASSEN-Schwellwert.
     *
     * `CnnObservation by x` MUSS das ueberschreiben — sonst gibt die Delegation `x` zurueck.
     */
    fun withCoverageThr(thr: Double): CnnObservation = this

    fun invalidMass(square: String): Double = 0.0

    fun invalidConfident(
        square: String,
        thr: Double,
    ): Boolean = invalidMass(square) >= thr

    /** Full identity distribution for likelihood scoring; coverage remains separate in [pOccluded]. */
    fun classProbs(square: String): DoubleArray = DoubleArray(0)

    val classNames: List<String> get() = emptyList()

    fun rawObservation(): CnnObservation = this

    fun withoutPriorSafety(): CnnObservation = this

    fun occupancyOnly(): CnnObservation
}

data class ResyncResult(
    val match: Boolean,
    val conflicts: List<String>,
    val checked: Int,
    // The sole legal occupancy explanation and its agreement are required for CNN overrule.
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

/** FEN crosses the module seam because engine and CNN use incompatible board types. */
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
