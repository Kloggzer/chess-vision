package com.chesslab.cnn

import kotlin.math.exp

/** Class indices come from the run's `classes` list, never assumed. The argmax keeps the FIRST maximum
 *  (strict `>`) and runs over the CLASSES only: a row may carry one more value (`pOccluded`). */
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
            // The `occluded` class where the run has one, else the coverage column one past the classes. Without it a
            // 13-class run reads 0.0 and the CNN arm of the hand veto is blind.
            val po =
                when {
                    iOccluded >= 0 -> probs[iOccluded]
                    probs.size > classes.size -> probs[classes.size]
                    else -> 0.0
                }
            pEmpty[square] = pe
            pOccluded[square] = po
            // The coverage column is an independent sigmoid, no softmax class: it gates `confident` without sharing the denominator.
            pOcc[square] = if (iOccluded >= 0) maxOf(0.0, 1.0 - pe - po) else 1.0 - pe
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
    // The rows ride RAW on both views: an engine searching legal moves must not get a prior-weighted distribution.
    // Trimmed to the CLASS columns: the coverage column would otherwise be softmaxed with the rest.
    val rows = CnnProbs(classes, perSquareProbs.mapValues { (_, row) -> row.copyOf(classes.size) })
    val raw = read(perSquareProbs).copy(invalidMassBySquare = invalid, probs = rows)
    if (priorLambda <= 0.0 || possible == null) return raw
    val conditioned =
        perSquareProbs.mapValues { (square, probs) ->
            applyPrior(probs, classes, possible[square], priorLambda)
        }
    return read(conditioned).copy(invalidMassBySquare = invalid, raw = raw, probs = rows)
}

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

fun OccupancyObservation.confident(thr: Double): Map<String, Boolean> = pOcc.keys.associateWith { confident(it, thr) }

/** Without labels every key maps to `false`, never to an empty map. */
fun OccupancyObservation.labelConfident(thr: Double): Map<String, Boolean> = pOcc.keys.associateWith { labelConfident(it, thr) }

fun OccupancyObservation.confidentSquares(thr: Double): List<String> = ALL_SQUARES.filter { pOcc.containsKey(it) && confident(it, thr) }

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

/** Auf `softmax(z/T)` landet die Staerke als `lambda*T` auf den rohen Logits: 4,0 lief als 5,98 und waere
 *  mit jedem neuen Modell mitgewandert. */
fun priorOnTempered(
    lambda: Double,
    temperature: Double,
): Double = if (temperature <= 0.0) lambda else lambda / temperature

/** [lambda] ist die Staerke IN DIESEM Raum; eine Zahl auf den rohen Logits geht durch [priorOnTempered].
 *  FINIT: a wrong committed move must stay arguable by the pixels. `occluded` is never penalised. */
fun applyPrior(
    probs: DoubleArray,
    classes: List<String>,
    allowed: Set<String>?,
    lambda: Double,
): DoubleArray {
    // Immer eine Kopie: `observationFromProbs` legt das Ergebnis als `conditioned` ab, und eine geteilte
    // Zeile schriebe bei spaeterer Aenderung auch die ROHE um.
    if (lambda <= 0.0 || allowed == null) return probs.copyOf()
    val penalty = exp(-lambda)
    val out = probs.copyOf()
    var sum = 0.0
    for (i in classes.indices) {
        if (classes[i] !in allowed && classes[i] != "occluded") out[i] = probs[i] * penalty
        sum += out[i]
    }
    if (sum <= 0.0) return probs.copyOf()
    for (i in classes.indices) out[i] /= sum
    return out
}

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
