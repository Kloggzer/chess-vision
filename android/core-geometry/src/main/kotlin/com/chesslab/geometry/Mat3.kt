package com.chesslab.geometry

import kotlin.math.abs

// Row-major 3x3 arithmetic on plain `DoubleArray`s, for the alignment correction.
//
// Not `Mat`: `correctQuad` chains four of these per iteration and three iterations per frame, and
// each `Mat` is a native allocation that has to be released on every path out. Nine doubles on the
// heap cost nothing and cannot leak.
//
// The elements are named rather than indexed in [invert3] on purpose — the adjugate written with
// bare subscripts is the kind of code where a transposed index survives review, and it is also
// the shape detekt's MagicNumber rule cannot tell from a tuning constant.

/** Below this determinant the matrix is treated as singular. */
private const val MIN_DET: Double = 1e-12

/** Below this homogeneous coordinate a point is on the line at infinity. */
private const val MIN_W: Double = 1e-9

private const val N: Int = 3

/** Row-major 3x3 product. */
internal fun mul3(
    a: DoubleArray,
    b: DoubleArray,
): DoubleArray {
    val out = DoubleArray(N * N)
    for (r in 0 until N) {
        for (c in 0 until N) {
            var s = 0.0
            for (k in 0 until N) s += a[r * N + k] * b[k * N + c]
            out[r * N + c] = s
        }
    }
    return out
}

/** Row-major 3x3 inverse by adjugate, or null when singular. */
internal fun invert3(m: DoubleArray): DoubleArray? {
    val a = m[0]
    val b = m[1]
    val c = m[2]
    val d = m[N]
    val e = m[N + 1]
    val f = m[N + 2]
    val g = m[2 * N]
    val h = m[2 * N + 1]
    val i = m[2 * N + 2]
    val ca = e * i - f * h
    val cb = f * g - d * i
    val cc = d * h - e * g
    val det = a * ca + b * cb + c * cc
    if (abs(det) < MIN_DET) return null
    val k = 1.0 / det
    return doubleArrayOf(
        ca * k,
        (c * h - b * i) * k,
        (b * f - c * e) * k,
        cb * k,
        (a * i - c * g) * k,
        (c * d - a * f) * k,
        cc * k,
        (b * g - a * h) * k,
        (a * e - b * d) * k,
    )
}

/** A point through a row-major projective map, or null when it lands on the line at infinity. */
internal fun project3(
    m: DoubleArray,
    p: DoubleArray,
): DoubleArray? {
    val x = m[0] * p[0] + m[1] * p[1] + m[2]
    val y = m[N] * p[0] + m[N + 1] * p[1] + m[N + 2]
    val w = m[2 * N] * p[0] + m[2 * N + 1] * p[1] + m[2 * N + 2]
    val usable = abs(w) >= MIN_W && x.isFinite() && y.isFinite() && w.isFinite()
    return if (usable) doubleArrayOf(x / w, y / w) else null
}
