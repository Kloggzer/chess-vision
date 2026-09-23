package com.chesslab.geometry

import kotlin.math.abs

// Plain `DoubleArray`s, not `Mat`: `correctQuad` chains four per iteration, and each native `Mat` must be
// released on every path. Elements are named in [invert3]: bare subscripts hide a transposed index.

private const val MIN_DET: Double = 1e-12

private const val MIN_W: Double = 1e-9

private const val N: Int = 3

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
