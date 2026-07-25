package com.chesslab.engine

import kotlin.math.abs
import kotlin.math.max

/** Gray lane EMA rate — Python `SquareNoise.__init__`. */
internal const val NOISE_ALPHA_DEFAULT: Double = 0.05

/** Gray lane initial std. */
internal const val NOISE_INIT_STD_DEFAULT: Double = 6.0

/** Gray lane std floor — mandatory, or the EMA collapses against a fresh reference. */
internal const val NOISE_STD_FLOOR_DEFAULT: Double = 3.0

/** Census lane initial std — flat squares tie-flip from frame one, so it starts wide. */
internal const val CENSUS_NOISE_INIT_STD: Double = 8.0

/** Census lane std floor — tighter than gray; census is illumination-invariant. */
internal const val CENSUS_NOISE_STD_FLOOR: Double = 2.5

/**
 * The census lane's SLOW LANE exclusion rate.
 *
 * Full exclusion deadlocks the census channel: a flat square whose tie-flip noise fires from frame
 * one would be excluded from learning forever and stay hot (observed live on empty b1/b8).
 */
internal const val CENSUS_NOISE_EXCLUDE_ALPHA_SCALE: Double = 0.125

/**
 * Python `SquareNoise`. Per-square EMA of the mean and the mean absolute
 * deviation, run on the **median-normalized** channel (never normalize in here).
 *
 * Two instances with DIFFERENT constants exist and must not be unified:
 * - gray: `SquareNoise()` — [NOISE_ALPHA_DEFAULT] / [NOISE_INIT_STD_DEFAULT] /
 *   [NOISE_STD_FLOOR_DEFAULT], excluded squares learn NOTHING (`excludeAlphaScale = 0.0`);
 * - census: `SquareNoise(initStd = 8.0, stdFloor = 2.5)`, excluded squares learn
 *   at [CENSUS_NOISE_EXCLUDE_ALPHA_SCALE].
 *
 * There is no `reset()`: Python constructs a fresh instance when it needs one.
 */
internal class SquareNoise(
    private val alpha: Double = NOISE_ALPHA_DEFAULT,
    initStd: Double = NOISE_INIT_STD_DEFAULT,
    private val stdFloor: Double = NOISE_STD_FLOOR_DEFAULT,
) {
    val mean = DoubleArray(Squares.COUNT)
    val std = DoubleArray(Squares.COUNT) { initStd }

    /**
     * One EMA step over all 64 squares. An empty [exclude] bitboard excludes nothing.
     *
     * The deviation is measured against the **pre-update** mean, and the `a == 0.0` skip is an
     * exact `Double` comparison exactly as Python's: at scale `0.0` an excluded square learns
     * nothing at all, so a shadow or a hand can never inflate its std and desensitize a later real
     * move there.
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

    /** `z = (d - mean) / std`. [std] can never be 0 thanks to the floor. Returns [out]. */
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
