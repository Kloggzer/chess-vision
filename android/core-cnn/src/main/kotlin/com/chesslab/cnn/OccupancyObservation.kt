package com.chesslab.cnn

import com.chesslab.engine.api.CnnObservation

/**
 * Port of `cnn_recovery.py:29 OccupancyObservation`. Immutable; the maps are keyed by all
 * 64 squares. Implements the frozen engine seam [CnnObservation] (created by phase 00a) so
 * `:core-engine` can consume it without depending on `:core-cnn`.
 */
data class OccupancyObservation(
    val pOcc: Map<String, Double>,
    val pEmpty: Map<String, Double>,
    val pOccluded: Map<String, Double>,
    // predicted class per square ('wP','bK','empty', …); null when the run has no identity
    val label: Map<String, String>? = null,
    // top-class confidence per square
    val conf: Map<String, Double>? = null,
    // second-best class probability; used to reject uncertain automatic promotion choices
    val runnerUpConf: Map<String, Double>? = null,
    val invalidMassBySquare: Map<String, Double> = emptyMap(),
    /** Non-null only when this observation has been conditioned on a position prior. */
    val raw: OccupancyObservation? = null,
    /**
     * The undivided classifier output, for an engine that scores by likelihood rather than by
     * top label. Held in a class rather than inline because `data class` compares a `DoubleArray`
     * by identity — one reference comparison that is visible beats 64 that are not.
     */
    val probs: CnnProbs? = null,
) : CnnObservation {
    override fun classProbs(square: String): DoubleArray = probs?.rows?.get(square) ?: DoubleArray(0)

    override val classNames: List<String> get() = probs?.classes.orEmpty()

    /** `cnn_recovery.py:43` — strict `>`. */
    override fun occupied(square: String): Boolean = pOcc.getValue(square) > pEmpty.getValue(square)

    /**
     * `cnn_recovery.py:46` — occluded-dominant squares are NEVER confident and NEVER count
     * as occupied: a hand over the board must neither trigger recovery nor "occupy" squares.
     */
    fun confident(thr: Double): Map<String, Boolean> = pOcc.keys.associateWith { confident(it, thr) }

    override fun confident(
        square: String,
        thr: Double,
    ): Boolean =
        maxOf(pOcc.getValue(square), pEmpty.getValue(square)) >= thr &&
            pOccluded.getValue(square) < (1.0 - thr) &&
            !invalidConfident(square, thr)

    /**
     * `cnn_recovery.py:54` — top confidence >= thr and not `occluded`. Without identity every
     * key maps to `false` (never an empty map: the 64-key size is asserted).
     */
    fun labelConfident(thr: Double): Map<String, Boolean> = pOcc.keys.associateWith { labelConfident(it, thr) }

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

    /** The `_cnn_tick` fallback: identity stripped, occupancy preserved — the rows go too. */
    override fun occupancyOnly(): OccupancyObservation =
        copy(
            label = null,
            conf = null,
            runnerUpConf = null,
            raw = raw?.occupancyOnly(),
            probs = null,
        )
}

/**
 * The classifier's rows as they came out of the graph, before any position prior.
 *
 * Raw on purpose: `applyPrior` weights by legality, and an engine that searches legal moves would
 * count that prior a second time.
 */
class CnnProbs(
    val classes: List<String>,
    val rows: Map<String, DoubleArray>,
)
