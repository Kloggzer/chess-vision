package com.chesslab.cnn

import com.chesslab.engine.api.CnnObservation

/** Implements the engine seam [CnnObservation], so `:core-engine` consumes it without `:core-cnn`. */
data class OccupancyObservation(
    val pOcc: Map<String, Double>,
    val pEmpty: Map<String, Double>,
    val pOccluded: Map<String, Double>,
    val label: Map<String, String>? = null,
    val conf: Map<String, Double>? = null,
    val runnerUpConf: Map<String, Double>? = null,
    val invalidMassBySquare: Map<String, Double> = emptyMap(),
    val raw: OccupancyObservation? = null,
    /** In a class, not inline: `data class` compares a `DoubleArray` by identity. */
    val probs: CnnProbs? = null,
    /** Die gemessene Schwelle des Modells; null heisst "noch keine", dann gilt `1.0 - thr`. */
    val coverageThr: Double? = null,
) : CnnObservation {
    override fun withCoverageThr(thr: Double): OccupancyObservation = copy(coverageThr = thr, raw = raw?.withCoverageThr(thr))

    private fun coveredOut(
        square: String,
        thr: Double,
    ): Boolean = pOccluded.getValue(square) >= (coverageThr ?: (1.0 - thr))

    override fun classProbs(square: String): DoubleArray = probs?.rows?.get(square) ?: DoubleArray(0)

    override val classNames: List<String> get() = probs?.classes.orEmpty()

    override fun occupied(square: String): Boolean = pOcc.getValue(square) > pEmpty.getValue(square)

    /** Occluded-dominant squares are NEVER confident and NEVER occupied: a hand must not trigger recovery. */
    override fun confident(
        square: String,
        thr: Double,
    ): Boolean =
        maxOf(pOcc.getValue(square), pEmpty.getValue(square)) >= thr &&
            !coveredOut(square, thr) &&
            !invalidConfident(square, thr)

    /** The same coverage gate as [confident]: on a coverage model a covered square keeps its class guess, and
     *  that guess reached `boardMatchesIdentity`, the deep search and `cnnAdoptedFen`. */
    override fun labelConfident(
        square: String,
        thr: Double,
    ): Boolean {
        val labels = label
        val confs = conf
        return labels != null &&
            confs != null &&
            confs.getValue(square) >= thr &&
            labels.getValue(square) != "occluded" &&
            !coveredOut(square, thr) &&
            !invalidConfident(square, thr)
    }

    override fun label(square: String): String? = label?.get(square)

    override fun conf(square: String): Double = conf?.get(square) ?: 0.0

    override fun runnerUpConf(square: String): Double = runnerUpConf?.get(square) ?: 1.0

    override fun pOccluded(square: String): Double = pOccluded.getValue(square)

    override fun invalidMass(square: String): Double = invalidMassBySquare[square] ?: 0.0

    override fun invalidConfident(
        square: String,
        thr: Double,
    ): Boolean = raw != null && invalidMass(square) >= thr

    override fun rawObservation(): OccupancyObservation = raw ?: this

    override fun withoutPriorSafety(): OccupancyObservation =
        copy(
            invalidMassBySquare = emptyMap(),
            raw = null,
        )

    override fun occupancyOnly(): OccupancyObservation =
        copy(
            label = null,
            conf = null,
            runnerUpConf = null,
            raw = raw?.occupancyOnly(),
            probs = null,
        )
}

/** Raw on purpose: `applyPrior` weights by legality, and a legal-move search would count it twice. */
class CnnProbs(
    val classes: List<String>,
    val rows: Map<String, DoubleArray>,
)
