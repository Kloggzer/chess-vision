package com.chesslab.engine

import kotlin.math.abs

/** Invariant 2: occlusion removes `changed` and zeroes z; shadow preserves z. Invariant 6: rebuild only on a
 *  quiet re-anchor, never after a commit. */

private const val BYTE_MASK = 0xFF
private const val CHANNELS = 3
private const val DIM = 3
private const val DIM_SQ = 9

private const val MIN_USABLE_SQUARES = 8

/** Keeps a flat chroma axis (a near-neutral board) from exploding the Mahalanobis distance. */
private const val COV_REGULARIZER = 4.0

private const val DET_EPS = 1e-12

private const val DEFAULT_OCCLUSION_THR = 4.0

// Without L*, `[a*, b*, S]` is robust to exposure and shadow; a*/b* stay in OpenCV's +128 encoding (thresholds use it).
private const val LAB_A = 1
private const val LAB_B = 2
private const val HSV_S = 1

/** The veto compares against [feats], never against [mu]. */
internal class ColorGamut(
    val mu: DoubleArray,
    val invCov: DoubleArray,
    val feats: DoubleArray,
    val n: Int,
)

/** Base boxes (`extendUp = 0.0`); null with fewer than 8 samples or a singular covariance. */
internal fun boardColorGamut(
    ref: ColorPlanes,
    geom: PlaneGeometry,
): ColorGamut? {
    val feats = DoubleArray(Squares.COUNT * DIM)
    var n = 0
    val feature = DoubleArray(DIM)
    for (i in 0 until Squares.COUNT) {
        val box = geom.region(i, 0.0) ?: continue
        squareFeature(ref, geom, box, feature)
        feature.copyInto(feats, n * DIM)
        n++
    }
    return colorGamutFromFeatures(feats, n)
}

internal fun colorGamutFromFeatures(
    feats: DoubleArray,
    n: Int,
): ColorGamut? {
    if (n < MIN_USABLE_SQUARES) return null

    val mu = DoubleArray(DIM)
    for (k in 0 until n) {
        for (j in 0 until DIM) {
            mu[j] += feats[k * DIM + j]
        }
    }
    for (j in 0 until DIM) {
        mu[j] /= n
    }

    // NumPy `cov` uses sample covariance with denominator n - 1.
    val cov = DoubleArray(DIM_SQ)
    for (k in 0 until n) {
        for (i in 0 until DIM) {
            val di = feats[k * DIM + i] - mu[i]
            for (j in 0 until DIM) {
                cov[i * DIM + j] += di * (feats[k * DIM + j] - mu[j])
            }
        }
    }
    val denom = (n - 1).toDouble()
    for (i in 0 until DIM) {
        for (j in 0 until DIM) {
            cov[i * DIM + j] /= denom
        }
        cov[i * DIM + i] += COV_REGULARIZER
    }

    return invert3x3(cov)?.let { inv -> ColorGamut(mu, inv, feats.copyOf(n * DIM), n) }
}

/** Farther than [thr] sigma from EVERY reference square: a piece can match another piece, a hand or sleeve
 *  usually cannot. Checks base and overhang. */
internal fun occlusionColorSquares(
    cur: ColorPlanes,
    geom: PlaneGeometry,
    gamut: ColorGamut?,
    candidates: Long,
    thr: Double = DEFAULT_OCCLUSION_THR,
): Long {
    if (gamut == null || candidates == 0L || thr <= 0.0) return 0L
    val thr2 = thr * thr
    var out = 0L
    candidates.forEachSquare { i ->
        val base = geom.region(i, 0.0)
        var outlier = base != null && nearestMahalanobis(cur, geom, base, gamut) > thr2
        if (!outlier && geom.extendUp > 0.0) {
            val ext = geom.region(i, geom.extendUp)
            outlier = ext != null && nearestMahalanobis(cur, geom, ext, gamut) > thr2
        }
        if (outlier) out = out.with(i)
    }
    return out
}

private fun nearestMahalanobis(
    cur: ColorPlanes,
    geom: PlaneGeometry,
    box: IntArray,
    gamut: ColorGamut,
): Double {
    val feature = DoubleArray(DIM)
    squareFeature(cur, geom, box, feature)
    val inv = gamut.invCov
    var best = Double.MAX_VALUE
    for (k in 0 until gamut.n) {
        val d0 = gamut.feats[k * DIM] - feature[0]
        val d1 = gamut.feats[k * DIM + 1] - feature[1]
        val d2 = gamut.feats[k * DIM + 2] - feature[2]
        val q0 = inv[0] * d0 + inv[1] * d1 + inv[2] * d2
        val q1 = inv[DIM] * d0 + inv[DIM + 1] * d1 + inv[DIM + 2] * d2
        val q2 = inv[2 * DIM] * d0 + inv[2 * DIM + 1] * d1 + inv[2 * DIM + 2] * d2
        val dist = d0 * q0 + d1 * q1 + d2 * q2
        if (dist < best) best = dist
    }
    return best
}

private fun squareFeature(
    planes: ColorPlanes,
    geom: PlaneGeometry,
    box: IntArray,
    out: DoubleArray,
) {
    val stride = geom.width * CHANNELS
    val x0 = box[0]
    val y0 = box[1]
    val x1 = box[2]
    val y1 = box[3]
    var sumA = 0L
    var sumB = 0L
    var sumS = 0L
    var pixels = 0
    for (y in y0 until y1) {
        val rowStart = y * stride + x0 * CHANNELS
        val rowEnd = y * stride + x1 * CHANNELS
        for (idx in rowStart until rowEnd step CHANNELS) {
            sumA += planes.lab[idx + LAB_A].toInt() and BYTE_MASK
            sumB += planes.lab[idx + LAB_B].toInt() and BYTE_MASK
            sumS += planes.hsv[idx + HSV_S].toInt() and BYTE_MASK
            pixels++
        }
    }
    out[0] = sumA.toDouble() / pixels
    out[1] = sumB.toDouble() / pixels
    out[2] = sumS.toDouble() / pixels
}

private fun invert3x3(m: DoubleArray): DoubleArray? {
    val a = m[0]
    val b = m[1]
    val c = m[2]
    val d = m[DIM]
    val e = m[DIM + 1]
    val f = m[DIM + 2]
    val g = m[2 * DIM]
    val h = m[2 * DIM + 1]
    val i = m[2 * DIM + 2]
    val det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
    if (abs(det) < DET_EPS) return null
    return doubleArrayOf(
        (e * i - f * h) / det,
        (c * h - b * i) / det,
        (b * f - c * e) / det,
        (f * g - d * i) / det,
        (a * i - c * g) / det,
        (c * d - a * f) / det,
        (d * h - e * g) / det,
        (b * g - a * h) / det,
        (a * e - b * d) / det,
    )
}
