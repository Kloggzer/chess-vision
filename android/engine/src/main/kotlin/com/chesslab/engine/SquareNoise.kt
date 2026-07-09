package com.chesslab.engine

import kotlin.math.abs

/**
 * Running per-square noise model: EMA of mean and absolute deviation on the already
 * median-normalized diffs (ports tracker.py:388-420 `SquareNoise`, incl. the mandatory
 * std floor — against a fresh reference the EMA would otherwise collapse).
 */
class SquareNoise(
    private val alpha: Double = DEFAULT_ALPHA,
    initStd: Double = DEFAULT_INIT_STD,
    private val stdFloor: Double = DEFAULT_STD_FLOOR,
) {
    val mean: MutableMap<String, Double> = Squares.all.associateWith { 0.0 }.toMutableMap()
    val std: MutableMap<String, Double> = Squares.all.associateWith { initStd }.toMutableMap()

    /** Learn from a stable frame; `exclude` = current candidate/vetoed squares. */
    fun update(
        diffs: Map<String, Double>,
        exclude: Set<String> = emptySet(),
    ) {
        for ((sq, d) in diffs) {
            if (sq in exclude) continue
            val m = mean.getValue(sq)
            mean[sq] = (1 - alpha) * m + alpha * d
            val dev = abs(d - m)
            std[sq] = maxOf(stdFloor, (1 - alpha) * std.getValue(sq) + alpha * dev)
        }
    }

    /** z-scores of the given diffs against the model. */
    fun z(diffs: Map<String, Double>): Map<String, Double> = diffs.mapValues { zOf(it.key, it.value) }

    private fun zOf(
        sq: String,
        d: Double,
    ): Double = (d - mean.getValue(sq)) / std.getValue(sq)

    companion object {
        const val DEFAULT_ALPHA: Double = 0.05
        const val DEFAULT_INIT_STD: Double = 6.0
        const val DEFAULT_STD_FLOOR: Double = 3.0
    }
}
