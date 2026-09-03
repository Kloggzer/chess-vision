package com.chesslab.engine

import kotlin.math.abs
import kotlin.math.max

/** Gray-lane EMA rate. */
internal const val NOISE_ALPHA_DEFAULT: Double = 0.05

internal const val NOISE_INIT_STD_DEFAULT: Double = 6.0

/** Gray lane std floor — mandatory, or the EMA collapses against a fresh reference. */
internal const val NOISE_STD_FLOOR_DEFAULT: Double = 3.0

/** Census lane initial std — flat squares tie-flip from frame one, so it starts wide. */
internal const val CENSUS_NOISE_INIT_STD: Double = 8.0

/** Census lane std floor — tighter than gray; census is illumination-invariant. */
internal const val CENSUS_NOISE_STD_FLOOR: Double = 2.5

/** A 1/8-rate slow lane prevents excluded flat squares from staying hot forever. */
internal const val CENSUS_NOISE_EXCLUDE_ALPHA_SCALE: Double = 0.125

/**
 * Per-square EMA runs on median-normalized values. Gray exclusions learn nothing; census
 * exclusions use [CENSUS_NOISE_EXCLUDE_ALPHA_SCALE] so tie-flip noise can cool down.
 */
internal class SquareNoise(
    private val alpha: Double = NOISE_ALPHA_DEFAULT,
    initStd: Double = NOISE_INIT_STD_DEFAULT,
    private val stdFloor: Double = NOISE_STD_FLOOR_DEFAULT,
) {
    val mean = DoubleArray(Squares.COUNT)
    val std = DoubleArray(Squares.COUNT) { initStd }

    /**
     * Deviation uses the pre-update mean. Exact `a == 0.0` prevents a hand or shadow from inflating
     * an excluded square's deviation and desensitizing a later move.
     */
    fun update(
        diffs: DoubleArray,
        exclude: Long = 0L,
        excludeAlphaScale: Double = 0.0,
    ) {
        require(diffs.size >= Squares.COUNT) { "diffs too small: ${diffs.size} < ${Squares.COUNT}" }
        for (i in 0 until Squares.COUNT) {
            val a = if (exclude.has(i)) alpha * excludeAlphaScale else alpha
            if (a == 0.0) continue
            val d = diffs[i]
            val m = mean[i]
            mean[i] = (1.0 - a) * m + a * d
            std[i] = max(stdFloor, (1.0 - a) * std[i] + a * abs(d - m))
        }
    }

    fun z(
        diffs: DoubleArray,
        out: DoubleArray,
    ): DoubleArray {
        require(diffs.size >= Squares.COUNT) { "diffs too small: ${diffs.size} < ${Squares.COUNT}" }
        require(out.size >= Squares.COUNT) { "out too small: ${out.size} < ${Squares.COUNT}" }
        for (i in 0 until Squares.COUNT) {
            out[i] = (diffs[i] - mean[i]) / std[i]
        }
        return out
    }
}
