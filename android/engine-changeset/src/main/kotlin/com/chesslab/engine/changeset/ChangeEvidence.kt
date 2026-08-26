package com.chesslab.engine.changeset

import com.chesslab.engine.board.GRID
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
) {
    /** Log-odds that this square changed. Positive means it did; the size is the confidence. */
    fun at(square: Int): Double = logits[deltaIndexOf(square)]

    /** Sum over a move's touched squares — a square shared by two plies counts once. */
    fun sum(squares: Set<Int>): Double = squares.sumOf { at(it) }

    /** Squares the picture says changed, for the alarm and the log. */
    fun changed(): List<Int> = (0 until SQUARES).filter { at(it) > 0.0 }

    fun describe(): String =
        changed()
            .sortedByDescending { at(it) }
            .joinToString(" ") { "${nameOf(it)}@${round1(at(it))}" }
            .ifEmpty { "none" }

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
            val threshold = maxOf(CHANGE_THR, NOISE_MULT * quartile(deltas))
            return ChangeEvidence(
                DoubleArray(deltas.size) { i ->
                    (K * (deltas[i] - threshold)).coerceIn(-CLIP, CLIP)
                },
            )
        }

        /** The upper quartile: with four squares moved out of 64, this is still untouched board. */
        private fun quartile(values: DoubleArray): Double = values.sorted()[values.size * UPPER_QUARTILE_NUM / UPPER_QUARTILE_DEN]

        private const val UPPER_QUARTILE_NUM = 3
        private const val UPPER_QUARTILE_DEN = 4

        /** Grey levels of change before a square counts as moved — `StillPhase` measured this one. */
        private const val CHANGE_THR = 10.0

        /** On a noisy frame the bar rises with the noise: this many times the typical cell. */
        private const val NOISE_MULT = 3.0

        /** Log-odds per grey level. A piece arriving (~40) reaches the clip; a shadow (~12) does not. */
        private const val K = 0.4

        /**
         * No single square may decide alone. The second engine let one confidently wrong square
         * (`d4:bQ@1.00`, worth -9.2 nats against a commit price of 6) veto a whole three-ply
         * explanation; a bound is what stops that from being possible at all.
         */
        private const val CLIP = 6.0
    }
}
