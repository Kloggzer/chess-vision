package com.chesslab.engine

import com.chesslab.engine.api.BgrImage

/**
 * Color "gamut" of the reference board and the opaque-occlusion veto
 * (ports tracker.py:225,263 `board_color_gamut`, `occlusion_color_squares`).
 * Feature per square: (Lab a*, Lab b*, HSV S) — lightness is dropped for shadow robustness.
 */
object OcclusionGamut {
    private const val FEATURES = 3
    private const val COV_REG = 4.0
    private const val MIN_SQUARES = 8
    private const val DET_EPS = 1e-12

    /** mean + inverse covariance + per-square features of the reference board, or null if unusable. */
    class Gamut(
        val mu: DoubleArray,
        val inv: Array<DoubleArray>,
        val feats: List<DoubleArray>,
    )

    fun boardColorGamut(
        refBgr: BgrImage,
        geom: BoardGeometry,
    ): Gamut? {
        val base = BoardGeometry(geom.boardSize, geom.whitePov)
        val feats = Squares.all.mapNotNull { sq -> squareFeature(refBgr, Squares.region(sq, base)) }
        if (feats.size < MIN_SQUARES) return null
        val mu = DoubleArray(FEATURES)
        for (f in feats) for (k in 0 until FEATURES) mu[k] += f[k] / feats.size
        // Sample covariance (ddof=1, like np.cov) + regularization keeping the matrix invertible.
        val cov = Array(FEATURES) { DoubleArray(FEATURES) }
        for (f in feats) {
            for (i in 0 until FEATURES) {
                for (j in 0 until FEATURES) {
                    cov[i][j] += (f[i] - mu[i]) * (f[j] - mu[j]) / (feats.size - 1)
                }
            }
        }
        for (i in 0 until FEATURES) cov[i][i] += COV_REG
        return invert3x3(cov)?.let { Gamut(mu, it, feats) }
    }

    /**
     * Opaque-occlusion veto: squares whose current color lies farther than `thr` sigma
     * (nearest-neighbor Mahalanobis over the 64 reference squares) from EVERY reference square.
     * Checks the base box and, when `geom.extendUp > 0`, also the extended box.
     */
    fun occlusionColorSquares(
        curBgr: BgrImage,
        gamut: Gamut?,
        geom: BoardGeometry,
        candidates: Set<String>,
        thr: Double,
    ): Set<String> {
        if (gamut == null || candidates.isEmpty() || thr <= 0) return emptySet()
        val thr2 = thr * thr
        val base = BoardGeometry(geom.boardSize, geom.whitePov)
        return candidates.filterTo(mutableSetOf()) { sq ->
            isOutlier(curBgr, Squares.region(sq, base), gamut, thr2) ||
                (geom.extendUp > 0 && isOutlier(curBgr, Squares.region(sq, geom), gamut, thr2))
        }
    }

    private fun isOutlier(
        bgr: BgrImage,
        box: Box,
        gamut: Gamut,
        thr2: Double,
    ): Boolean {
        val f = squareFeature(bgr, box) ?: return false
        // Flat Mahalanobis loop without the per-reference DoubleArray (64 allocations per
        // call showed up in the on-device occlusion stage, 2026-07-22). Same math.
        var minD = Double.MAX_VALUE
        val inv = gamut.inv
        for (ref in gamut.feats) {
            val d0 = ref[0] - f[0]
            val d1 = ref[1] - f[1]
            val d2 = ref[2] - f[2]
            // Accumulation order matches the original i-major/j-inner loop bit-exactly.
            var acc = 0.0
            acc += d0 * inv[0][0] * d0
            acc += d0 * inv[0][1] * d1
            acc += d0 * inv[0][2] * d2
            acc += d1 * inv[1][0] * d0
            acc += d1 * inv[1][1] * d1
            acc += d1 * inv[1][2] * d2
            acc += d2 * inv[2][0] * d0
            acc += d2 * inv[2][1] * d1
            acc += d2 * inv[2][2] * d2
            if (acc < minD) minD = acc
        }
        return minD > thr2
    }

    /** Mean (Lab a*, Lab b*, HSV S) over the box, or null for degenerate boxes. */
    private fun squareFeature(
        bgr: BgrImage,
        box: Box,
    ): DoubleArray? {
        if (box.area <= 0) return null
        // Per-pixel features are 0..255 ints (see ColorSpace.packedGamutFeature): integer
        // sums of whole-number doubles are exact, so the means match the unfused original.
        var a = 0
        var b = 0
        var s = 0
        val data = bgr.data
        val w = bgr.width
        for (y in box.y0 until box.y1) {
            var i = (y * w + box.x0) * CHANNELS
            repeat(box.x1 - box.x0) {
                val packed =
                    ColorSpace.packedGamutFeature(
                        data[i].toInt() and BYTE_MASK,
                        data[i + 1].toInt() and BYTE_MASK,
                        data[i + 2].toInt() and BYTE_MASK,
                    )
                a += (packed ushr ColorSpace.PACK_HI) and BYTE_MASK
                b += (packed ushr ColorSpace.PACK_MID) and BYTE_MASK
                s += packed and BYTE_MASK
                i += CHANNELS
            }
        }
        val n = box.area.toDouble()
        return doubleArrayOf(a / n, b / n, s / n)
    }

    private fun invert3x3(m: Array<DoubleArray>): Array<DoubleArray>? {
        val det =
            m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
                m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
                m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
        if (kotlin.math.abs(det) < DET_EPS) return null
        val inv = Array(FEATURES) { DoubleArray(FEATURES) }
        inv[0][0] = (m[1][1] * m[2][2] - m[1][2] * m[2][1]) / det
        inv[0][1] = (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / det
        inv[0][2] = (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / det
        inv[1][0] = (m[1][2] * m[2][0] - m[1][0] * m[2][2]) / det
        inv[1][1] = (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / det
        inv[1][2] = (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / det
        inv[2][0] = (m[1][0] * m[2][1] - m[1][1] * m[2][0]) / det
        inv[2][1] = (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / det
        inv[2][2] = (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / det
        return inv
    }
}
