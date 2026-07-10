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
    private val initialStd = initStd
    val mean: MutableMap<String, Double> = Squares.all.associateWith { 0.0 }.toMutableMap()
    val std: MutableMap<String, Double> = Squares.all.associateWith { initStd }.toMutableMap()

    /** Forget statistics tied to an old position, camera geometry, or calibration. */
    fun reset() {
        for (sq in Squares.all) {
            mean[sq] = 0.0
            std[sq] = initialStd
        }
    }

    /**
     * Learn from a stable frame; `exclude` = current candidate/vetoed squares.
     *
     * `excludeAlphaScale` = 0 (default): excluded squares learn NOTHING — the gray channel's
     * hard-won invariant (learning a shadow/hand inflates std and desensitizes real moves
     * there). The census channel passes 0.125 (SLOW LANE): full exclusion deadlocks it — a
     * flat square whose census tie-flip noise fires from frame one is excluded from learning,
     * so the model can never absorb the jitter and it stays hot forever (observed live: empty
     * b1/b8 after baseline). The slow lane heals such phantoms within seconds while a real
     * move commits (and re-anchors) long before it could be learned away.
     */
    fun update(
        diffs: Map<String, Double>,
        exclude: Set<String> = emptySet(),
        excludeAlphaScale: Double = 0.0,
    ) {
        for ((sq, d) in diffs) {
            val a = if (sq in exclude) alpha * excludeAlphaScale else alpha
            if (a == 0.0) continue
            val m = mean.getValue(sq)
            mean[sq] = (1 - a) * m + a * d
            val dev = abs(d - m)
            std[sq] = maxOf(stdFloor, (1 - a) * std.getValue(sq) + a * dev)
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
