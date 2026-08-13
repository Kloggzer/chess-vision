package com.chesslab.cnn

/**
 * Port of `cnn_recovery.py:63 classes_have_identity`.
 *
 * A 2-class occupancy run (`config.OCCUPANCY_CLASSES`) answers only empty-vs-occupied, so its
 * argmax label (`"occupied"`) is not an identity. `hasIdentity` (`CnnTick.kt:43`,
 * `Alarm.kt:77`) keys off `obs.label(sq) != null`, so such a run must report NO label — the
 * occupancy-only path is already the tested fallback.
 */
fun classesHaveIdentity(classes: List<String>): Boolean = classes.any { it !in setOf("empty", "occluded", "occupied") }

/**
 * Port of `cnn_recovery.py:63 observation_from_probs`.
 *
 * Class indices are ALWAYS derived from the run's `classes` list (2-, 13- and 14-class runs);
 * never assume a position. `pOcc` is the summed mass of the 12 piece classes, clamped at 0
 * against float drift. The argmax keeps the FIRST maximum (Python's `max(range(n), key=…)`),
 * so the comparison below is a strict `>`.
 */
fun observationFromProbs(
    perSquareProbs: Map<String, DoubleArray>,
    classes: List<String>,
): OccupancyObservation {
    val iEmpty = classes.indexOf("empty")
    require(iEmpty >= 0) { "class list has no \"empty\" entry: $classes" }
    val iOccluded = classes.indexOf("occluded")
    val pOcc = LinkedHashMap<String, Double>(perSquareProbs.size)
    val pEmpty = LinkedHashMap<String, Double>(perSquareProbs.size)
    val pOccluded = LinkedHashMap<String, Double>(perSquareProbs.size)
    val label = LinkedHashMap<String, String>(perSquareProbs.size)
    val conf = LinkedHashMap<String, Double>(perSquareProbs.size)
    val runnerUpConf = LinkedHashMap<String, Double>(perSquareProbs.size)
    for ((square, probs) in perSquareProbs) {
        val pe = probs[iEmpty]
        val po = if (iOccluded >= 0) probs[iOccluded] else 0.0
        pEmpty[square] = pe
        pOccluded[square] = po
        pOcc[square] = maxOf(0.0, 1.0 - pe - po)
        val top = argmaxFirst(probs)
        label[square] = classes[top]
        conf[square] = probs[top]
        runnerUpConf[square] = probs.indices.filter { it != top }.maxOfOrNull { probs[it] } ?: 0.0
    }
    if (!classesHaveIdentity(classes)) {
        return OccupancyObservation(pOcc = pOcc, pEmpty = pEmpty, pOccluded = pOccluded)
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

/**
 * The [SquareClassifier] path: 64 probability rows in [ALL_SQUARES] order.
 */
fun observationFromProbs(
    probs: Array<FloatArray>,
    classes: List<String>,
): OccupancyObservation {
    require(probs.size == ALL_SQUARES.size) { "expected ${ALL_SQUARES.size} probability rows, got ${probs.size}" }
    val rows = LinkedHashMap<String, DoubleArray>(probs.size)
    for (i in probs.indices) {
        rows[ALL_SQUARES[i]] = DoubleArray(probs[i].size) { probs[i][it].toDouble() }
    }
    return observationFromProbs(rows, classes)
}

/** Squares whose OCCUPANCY statement is reliable, in [ALL_SQUARES] order. */
fun OccupancyObservation.confidentSquares(thr: Double): List<String> = ALL_SQUARES.filter { pOcc.containsKey(it) && confident(it, thr) }

/** Squares whose IDENTITY statement is reliable, in [ALL_SQUARES] order. */
fun OccupancyObservation.labelConfidentSquares(thr: Double): List<String> =
    ALL_SQUARES.filter { pOcc.containsKey(it) && labelConfident(it, thr) }

private fun argmaxFirst(probs: DoubleArray): Int {
    var top = 0
    for (i in probs.indices) {
        if (probs[i] > probs[top]) top = i
    }
    return top
}
