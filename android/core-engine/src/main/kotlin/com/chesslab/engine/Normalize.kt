package com.chesslab.engine

import kotlin.math.max

/**
 * Python normalize_diffs.
 *
 * Removes global brightness/exposure drift: every value minus the robust baseline, the UPPER
 * median `sorted[n / 2]` of all values (index 32 for 64 squares — NOT the average of 31 and 32),
 * clamped at 0. Empty input yields a baseline of 0.0.
 *
 * [values] is never mutated: the raw channel feeds noise learning afterwards.
 */
internal fun normalizeDiffs(
    values: DoubleArray,
    out: DoubleArray,
): DoubleArray {
    require(out.size >= values.size) { "out too small: ${out.size} < ${values.size}" }
    val n = values.size
    val baseline =
        if (n == 0) {
            0.0
        } else {
            val sorted = values.copyOf()
            sorted.sort()
            sorted[n / 2]
        }
    for (i in 0 until n) {
        out[i] = max(0.0, values[i] - baseline)
    }
    return out
}
