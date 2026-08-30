package com.chesslab.engine.changeset

import com.chesslab.engine.board.GRID
import com.chesslab.engine.board.busyLevel
import com.chesslab.engine.board.cellDeltas

/**
 * How much each square changed against the last understood board, as evidence for or against
 * "a piece moved here".
 *
 * This is the whole difference to the second engine. That one asks the model to name all 64
 * squares and searches for the continuation that fits; measured live on 2026-08-26, ten of about
 * thirty pieces came back with the wrong identity in EVERY reading (`c1:wN`, `f1:wR`, `e8:bN`,
 * stable over eight readings) while occupancy and colour held. Identity is the weakest thing the
 * model produces, so nothing here depends on it. The first engine has always known that — it
 * decides on the diff channel and lets the model confirm.
 */
class ChangeEvidence(
    private val logits: DoubleArray,
    /** Raw grey levels beside the log-odds: a threshold can only be tuned against what it saw. */
    private val deltas: DoubleArray = DoubleArray(0),
    private val threshold: Double = 0.0,
    /**
     * How much of the WHOLE board moved — the upper quartile of the cell deltas.
     *
     * This is the hand detector, and it had to be: on `VID_20260726_233432` a hand crossed the
     * queenside, seven cells moved by 26 to 48 grey levels, and the model reported `covered=[]`.
     * A guard that asks the model about hands is blind exactly when it matters. A chess move
     * touches two to four cells out of 64, so a high QUARTILE cannot be a move.
     */
    val busy: Double = 0.0,
) {
    /** Log-odds that this square changed. Positive means it did; the size is the confidence. */
    fun at(square: Int): Double = logits[deltaIndexOf(square)]

    /** Sum over a move's touched squares — a square shared by two plies counts once. */
    fun sum(squares: Set<Int>): Double = squares.sumOf { at(it) }

    /** Squares the picture says changed, for the alarm and the log. */
    fun changed(): List<Int> = (0 until SQUARES).filter { at(it) > 0.0 }

    fun describe(): String {
        val listed =
            changed()
                .sortedByDescending { at(it) }
                .joinToString(" ") { "${nameOf(it)}@${round1(at(it))}/${round1(deltas.getOrElse(deltaIndexOf(it)) { 0.0 })}" }
        return "${listed.ifEmpty { "none" }} thr=${round1(threshold)}"
    }

    companion object {
        const val SQUARES = 64

        /** One decimal, without `String.format` — a German locale would emit a comma into JSON. */
        fun round1(value: Double): Double = (value * TENTHS).toInt() / TENTHS.toDouble()

        private const val TENTHS = 10

        /**
         * The board picture has rank 8 at the top (the warp's corners are `[a8, h8, h1, a1]`),
         * while a square index counts from `a1`. Getting this backwards is a tracker that looks
         * plausible and commits mirrored moves, so it lives in one named function with a test.
         */
        fun deltaIndexOf(square: Int): Int = (GRID - 1 - square / GRID) * GRID + square % GRID

        fun nameOf(square: Int): String = "${'a' + square % GRID}${square / GRID + 1}"

        /**
         * Grey-level deltas per cell into log-odds.
         *
         * Absolute grey levels, because that is what [CHANGE_THR] was measured in — with a floor
         * under it from this frame's own upper quartile, so a noisy exposure cannot make every
         * cell look moved.
         *
         * The slope matters more than it looks. Measured 2026-08-26 on `11-55-19`: with a steep
         * one every changed square saturated at the clip, a shadow on `f7` weighed exactly as much
         * as the knight that really left `g8`, and `f7f6` tied `g8f6` at 10.0 — a true move lost
         * to a shadow because the evidence had no gradations left.
         */
        fun of(
            before: ByteArray,
            after: ByteArray,
        ): ChangeEvidence {
            val deltas = cellDeltas(before, after)
            val busy = busyLevel(deltas)
            val threshold = maxOf(FLOOR_THR, NOISE_MULT * busy)
            return ChangeEvidence(
                // Relative to the board's own quiet level, not to a fixed grey level. Measured
                // 2026-08-26: a real move moves 11 to 15 grey levels on `13-52-38` and over 25 on
                // `11-55-19`; one absolute threshold serves one of them and starves the other.
                DoubleArray(deltas.size) { i ->
                    (K * (deltas[i] / threshold - 1.0)).coerceIn(-CLIP, CLIP)
                },
                deltas,
                threshold,
                busy,
            )
        }

        /** Under this the picture is flat and a relative bar would divide by its own noise. */
        private const val FLOOR_THR = 4.0

        /** The bar is this many times the board's quiet level. */
        private const val NOISE_MULT = 3.0

        /**
         * Log-odds per multiple of the bar. A square at four times it reaches the clip, one at
         * twice it does not — which is the gap that separates a moved piece from its shadow.
         */
        private const val K = 2.5

        /**
         * Above this quiet level the picture is of something crossing the board, or of a
         * reference that has gone stale — not of a position.
         *
         * Measured 2026-08-26 across two recordings, and the two distributions barely touch: a
         * working arm on `VID_20260824_153751` sits at a median of 2.1 with a 90th percentile of
         * 8.4, while `VID_20260726_233432` against a stale reference sits at a MEDIAN of 18.6. A
         * The bar sits at the low end on purpose: raising it to 12 was measured WORSE on both
         * (`233432` fell from 19 back to 1), because a reading just under the bar reaches the
         * search and decides badly, where a skipped one costs only a retry.
         */
        const val CROWDED = 5.0

        /**
         * No single square may decide alone. The second engine let one confidently wrong square
         * (`d4:bQ@1.00`, worth -9.2 nats against a commit price of 6) veto a whole three-ply
         * explanation; a bound is what stops that from being possible at all.
         */
        private const val CLIP = 6.0
    }
}
