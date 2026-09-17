package com.chesslab.cnn

import kotlin.math.exp

/**
 * Ported from `cnn_recovery.py observation_from_probs` when Python still carried the tracker.
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
            // The coverage column is an independent sigmoid, no softmax class: it gates `confident`,
            // it does not share the denominator (only a real `occluded` class does).
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
    // The rows ride along RAW on both views: an engine that searches legal moves must not be
    // handed a distribution that `applyPrior` already weighted by legality.
    // Trimmed to the CLASS columns: a coverage run carries one more, and that one is `pOccluded`,
    // not a class. Handing it over as if it were would have it softmaxed with the rest.
    val rows = CnnProbs(classes, perSquareProbs.mapValues { (_, row) -> row.copyOf(classes.size) })
    val raw = read(perSquareProbs).copy(invalidMassBySquare = invalid, probs = rows)
    if (priorLambda <= 0.0 || possible == null) return raw
    val conditioned =
        perSquareProbs.mapValues { (square, probs) ->
            applyPrior(probs, classes, possible[square], priorLambda)
        }
    return read(conditioned).copy(invalidMassBySquare = invalid, raw = raw, probs = rows)
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

/** Every square's occupancy verdict — the whole-board form of [OccupancyObservation.confident]. */
fun OccupancyObservation.confident(thr: Double): Map<String, Boolean> = pOcc.keys.associateWith { confident(it, thr) }

/** Same for identity; without labels every key maps to `false`, never to an empty map. */
fun OccupancyObservation.labelConfident(thr: Double): Map<String, Boolean> = pOcc.keys.associateWith { labelConfident(it, thr) }

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

/** Multiplikativ auf `softmax(z/T)` landet die Staerke als `lambda*T` auf den rohen Logits:
 *  4,0 lief so als 5,98 und waere mit jedem neuen Modell mitgewandert (gemessen 2026-09-17). */
fun priorOnTempered(
    lambda: Double,
    temperature: Double,
): Double = if (temperature <= 0.0) lambda else lambda / temperature

/**
 * Reweight a square's classes by what chess allows, then renormalise. [lambda] ist die Staerke
 * IN DIESEM Raum — wer eine Zahl auf den rohen Logits meint, reicht sie durch [priorOnTempered].
 * Sie bleibt FINIT: a wrong committed move must stay arguable by the pixels. `occluded`
 * is never penalised — a hand is a statement about SIGHT, not about chess.
 */
fun applyPrior(
    probs: DoubleArray,
    classes: List<String>,
    allowed: Set<String>?,
    lambda: Double,
): DoubleArray {
    // Immer eine Kopie: `observationFromProbs` legt das Ergebnis als `conditioned` ab, und wer den
    // Rueckgabewert der Aufrufer-Zeile gibt, laesst eine spaetere Aenderung daran auch die ROHE
    // Zeile umschreiben — genau die Trennung, wegen der `raw` ueberhaupt mitgefuehrt wird.
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
