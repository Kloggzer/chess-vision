package com.chesslab.cnn

import kotlin.math.exp

/**
 * Port of `cnn_recovery.py:63 observation_from_probs`.
 *
 * Class indices are ALWAYS derived from the run's `classes` list (13- and 14-class runs);
 * never assume a position. `pOcc` is the summed mass of the 12 piece classes, clamped at 0
 * against float drift. The argmax keeps the FIRST maximum (Python's `max(range(n), key=…)`),
 * so the comparison below is a strict `>` — and it runs over the CLASSES only, because a row
 * may carry one more value than that (see `pOccluded` below).
 */
fun observationFromProbs(
    perSquareProbs: Map<String, DoubleArray>,
    classes: List<String>,
    possible: Map<String, Set<String>>? = null,
    priorLambda: Double = 0.0,
): OccupancyObservation {
    val iEmpty = classes.indexOf("empty")
    require(iEmpty >= 0) { "class list has no \"empty\" entry: $classes" }
    val iOccluded = classes.indexOf("occluded")

    fun read(rows: Map<String, DoubleArray>): OccupancyObservation {
        val pOcc = LinkedHashMap<String, Double>(rows.size)
        val pEmpty = LinkedHashMap<String, Double>(rows.size)
        val pOccluded = LinkedHashMap<String, Double>(rows.size)
        val label = LinkedHashMap<String, String>(rows.size)
        val conf = LinkedHashMap<String, Double>(rows.size)
        val runnerUpConf = LinkedHashMap<String, Double>(rows.size)
        for ((square, probs) in rows) {
            require(probs.size == classes.size || probs.size == classes.size + 1) {
                "square $square carries ${probs.size} values for ${classes.size} classes"
            }
            val pe = probs[iEmpty]
            // The `occluded` class where the run has one; otherwise the occlusion head's coverage
            // value, which sits one past the classes (`ModelSpec.coverageOutput`). Until that
            // column existed this was identically 0.0 on every 13-class run and the CNN arm of the
            // hand veto was blind — a 13-class run WITHOUT coverage still reads 0.0.
            val po =
                when {
                    iOccluded >= 0 -> probs[iOccluded]
                    probs.size > classes.size -> probs[classes.size]
                    else -> 0.0
                }
            pEmpty[square] = pe
            pOccluded[square] = po
            pOcc[square] = maxOf(0.0, 1.0 - pe - po)
            val top = argmaxFirst(probs, classes.size)
            label[square] = classes[top]
            conf[square] = probs[top]
            runnerUpConf[square] = classes.indices.filter { it != top }.maxOfOrNull { probs[it] } ?: 0.0
        }
        return OccupancyObservation(
            pOcc = pOcc,
            pEmpty = pEmpty,
            pOccluded = pOccluded,
            label = label,
            conf = conf,
            runnerUpConf = runnerUpConf,
        )
    }

    val invalid =
        perSquareProbs.mapValues { (square, probs) ->
            invalidMass(probs, classes, possible?.get(square))
        }
    val raw = read(perSquareProbs).copy(invalidMassBySquare = invalid)
    if (priorLambda <= 0.0 || possible == null) return raw
    val conditioned =
        perSquareProbs.mapValues { (square, probs) ->
            applyPrior(probs, classes, possible[square], priorLambda)
        }
    return read(conditioned).copy(invalidMassBySquare = invalid, raw = raw)
}

/**
 * The [SquareClassifier] path: 64 probability rows in [ALL_SQUARES] order.
 */
fun observationFromProbs(
    probs: Array<FloatArray>,
    classes: List<String>,
    possible: Map<String, Set<String>>? = null,
    priorLambda: Double = 0.0,
): OccupancyObservation {
    require(probs.size == ALL_SQUARES.size) { "expected ${ALL_SQUARES.size} probability rows, got ${probs.size}" }
    val rows = LinkedHashMap<String, DoubleArray>(probs.size)
    for (i in probs.indices) {
        rows[ALL_SQUARES[i]] = DoubleArray(probs[i].size) { probs[i][it].toDouble() }
    }
    return observationFromProbs(rows, classes, possible, priorLambda)
}

/** Squares whose OCCUPANCY statement is reliable, in [ALL_SQUARES] order. */
fun OccupancyObservation.confidentSquares(thr: Double): List<String> = ALL_SQUARES.filter { pOcc.containsKey(it) && confident(it, thr) }

/** Squares whose IDENTITY statement is reliable, in [ALL_SQUARES] order. */
fun OccupancyObservation.labelConfidentSquares(thr: Double): List<String> =
    ALL_SQUARES.filter { pOcc.containsKey(it) && labelConfident(it, thr) }

private fun argmaxFirst(
    probs: DoubleArray,
    upTo: Int,
): Int {
    var top = 0
    for (i in 0 until upTo) {
        if (probs[i] > probs[top]) top = i
    }
    return top
}

/**
 * Reweight a square's classes by what chess allows, then renormalise. The head emits
 * log-probabilities, so this IS `logProb + lambda * logPrior` under the original softmax.
 * [lambda] stays FINITE: a wrong committed move must stay arguable by the pixels. `occluded`
 * is never penalised — a hand is a statement about SIGHT, not about chess.
 */
internal fun applyPrior(
    probs: DoubleArray,
    classes: List<String>,
    allowed: Set<String>?,
    lambda: Double,
): DoubleArray {
    if (lambda <= 0.0 || allowed == null) return probs
    val penalty = exp(-lambda)
    val out = probs.copyOf()
    var sum = 0.0
    for (i in classes.indices) {
        if (classes[i] !in allowed && classes[i] != "occluded") out[i] = probs[i] * penalty
        sum += out[i]
    }
    if (sum <= 0.0) return probs
    for (i in classes.indices) out[i] /= sum
    return out
}

/** Raw probability mass assigned to context-forbidden identity labels. */
internal fun invalidMass(
    probs: DoubleArray,
    classes: List<String>,
    allowed: Set<String>?,
): Double {
    if (allowed == null) return 0.0
    return classes.indices.sumOf { i ->
        if (classes[i] !in allowed && classes[i] != "occluded") probs[i] else 0.0
    }
}
