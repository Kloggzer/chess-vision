package com.chesslab.engine

import kotlin.math.max

/**
 * Removes exposure drift with the upper median (`sorted[n/2]`, index 32 of 64), clamped at zero.
 * [values] stays raw because noise learning consumes it afterward; empty input uses baseline 0.0.
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
