package com.chesslab.tracker.cnn

import com.chesslab.engine.Game

/** All 64 squares in the fixed observation order (ports `cnn_recovery.py:26` `_ALL`). */
val ALL_SQUARES: List<String> = (1..8).flatMap { r -> ('a'..'h').map { f -> "$f$r" } }

/** Model-vocabulary class of the piece on [square] (ports `config.label_from_piece`). */
fun expectedLabel(
    game: Game,
    square: String,
): String {
    val c = game.pieceCharAt(square) ?: return "empty"
    return (if (c.isUpperCase()) "w" else "b") + c.uppercaseChar()
}

/**
 * CNN view of the board (ports `cnn_recovery.py:29-84`). Carries occupancy
 * (pOcc/pEmpty/pOccluded) AND full piece identity per square (`label` = argmax
 * class, `conf` = its probability). Occupancy is derived from identity; identity
 * separates shadows (identity unchanged) from real moves.
 */
class OccupancyObservation(
    val pOcc: Map<String, Double>,
    val pEmpty: Map<String, Double>,
    val pOccluded: Map<String, Double>,
    val label: Map<String, String>,
    val conf: Map<String, Double>,
) {
    fun occupied(sq: String): Boolean = pOcc.getValue(sq) > pEmpty.getValue(sq)

    /**
     * Squares whose occupancy statement is reliable. IMPORTANT: occluded-dominant
     * squares are NEVER confident and NEVER count as occupied — a hand over the
     * board must neither trigger recovery nor "occupy" squares.
     */
    fun confident(thr: Double): Map<String, Boolean> =
        pOcc.mapValues { (sq, po) ->
            maxOf(po, pEmpty.getValue(sq)) >= thr && pOccluded.getValue(sq) < (1.0 - thr)
        }

    /** Squares whose IDENTITY statement is reliable: top conf >= thr and not `occluded`. */
    fun labelConfident(thr: Double): Map<String, Boolean> = label.mapValues { (sq, lbl) -> conf.getValue(sq) >= thr && lbl != OCCLUDED }

    companion object {
        const val EMPTY = "empty"
        const val OCCLUDED = "occluded"

        /**
         * Full softmax per square -> occupancy + identity (ports
         * `observation_from_probs`). Class indices ALWAYS derived from the run's
         * `classes` list (13- and 14-class runs, never guess positions).
         */
        fun fromProbs(
            perSquareProbs: Map<String, FloatArray>,
            classes: List<String>,
        ): OccupancyObservation {
            val iEmpty = classes.indexOf(EMPTY)
            require(iEmpty >= 0) { "run classes carry no 'empty' class" }
            val iOccl = classes.indexOf(OCCLUDED).takeIf { it >= 0 }
            val pOcc = mutableMapOf<String, Double>()
            val pEmpty = mutableMapOf<String, Double>()
            val pOccluded = mutableMapOf<String, Double>()
            val label = mutableMapOf<String, String>()
            val conf = mutableMapOf<String, Double>()
            for ((sq, probs) in perSquareProbs) {
                val pe = probs[iEmpty].toDouble()
                val po = iOccl?.let { probs[it].toDouble() } ?: 0.0
                pEmpty[sq] = pe
                pOccluded[sq] = po
                pOcc[sq] = (1.0 - pe - po).coerceAtLeast(0.0) // sum of the 12 piece classes
                val top = probs.indices.maxBy { probs[it] }
                label[sq] = classes[top]
                conf[sq] = probs[top].toDouble()
            }
            return OccupancyObservation(pOcc, pEmpty, pOccluded, label, conf)
        }
    }
}
