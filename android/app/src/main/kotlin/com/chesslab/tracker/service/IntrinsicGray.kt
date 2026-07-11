package com.chesslab.tracker.service

import org.opencv.core.CvType
import org.opencv.core.Mat
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Finlayson intrinsic image (specs/14): shadow-free gray from a BGR board Mat.
 *
 * Geometric-mean log-chromaticity projected onto the per-camera invariant
 * direction (Finlayson/Drew/Lu, "Intrinsic Images by Entropy Minimization").
 * A lighting change moves every pixel along one straight line in the 2-D
 * chi space; projecting orthogonally to it removes shadows from the signal
 * while material changes (a piece appearing/vanishing) remain.
 *
 * Numerics follow the closed-form contract in `tests/data/intrinsic_golden.json`
 * (basis u1=(1/sqrt2,-1/sqrt2,0), u2=(1/sqrt6,1/sqrt6,-2/sqrt6) on
 * (ln R~, ln G~, ln B~), channels clamped to >=1, fixed u8 mapping via lo/hi).
 * The core math operates on plain `ByteArray` + width/height so JVM unit tests
 * run without native OpenCV; [apply]/[calibrate] on [Mat] are thin adapters.
 */
class IntrinsicGray(
    val angleDeg: Double,
    val lo: Double,
    val hi: Double,
) {
    private val cosT = cos(Math.toRadians(angleDeg))
    private val sinT = sin(Math.toRadians(angleDeg))
    private val invRange = 1.0 / (hi - lo)

    /** In: CV_8UC3 BGR detect-res board. Out: NEW CV_8UC1 invariant gray, same size. */
    fun apply(bgr: Mat): Mat {
        require(bgr.type() == CvType.CV_8UC3) { "expected CV_8UC3, got ${bgr.type()}" }
        val width = bgr.cols()
        val height = bgr.rows()
        val buf = ByteArray(width * height * CHANNELS)
        bgr.get(0, 0, buf)
        val out = Mat(height, width, CvType.CV_8UC1)
        out.put(0, 0, apply(buf, width, height))
        return out
    }

    /** Core transform: interleaved BGR bytes -> u8 invariant gray bytes. */
    fun apply(
        bgr: ByteArray,
        width: Int,
        height: Int,
    ): ByteArray {
        val n = width * height
        require(bgr.size >= n * CHANNELS) { "buffer too small: ${bgr.size} < ${n * CHANNELS}" }
        val out = ByteArray(n)
        var src = 0
        for (i in 0 until n) {
            val lnB = LN_LUT[bgr[src].toInt() and 0xFF]
            val lnG = LN_LUT[bgr[src + 1].toInt() and 0xFF]
            val lnR = LN_LUT[bgr[src + 2].toInt() and 0xFF]
            src += CHANNELS
            // The geometric-mean log cancels algebraically in both projections:
            // chi1 = (rR - rG)/sqrt2, chi2 = (rR + rG - 2 rB)/sqrt6 with r = ln(c/p).
            val chi1 = (lnR - lnG) * INV_SQRT2
            val chi2 = (lnR + lnG - 2.0 * lnB) * INV_SQRT6
            val value = chi1 * cosT + chi2 * sinT
            val t = ((value - lo) * invRange).coerceIn(0.0, 1.0)
            out[i] = floor(t * U8_MAX + 0.5).toInt().toByte()
        }
        return out
    }

    companion object {
        private const val CHANNELS = 3
        private const val U8_MAX = 255.0
        private val INV_SQRT2 = 1.0 / sqrt(2.0)
        private val INV_SQRT6 = 1.0 / sqrt(6.0)
        private const val ANGLE_STEPS = 180
        private const val P_LO = 1.0
        private const val P_HI = 99.0
        private const val SCOTT_FACTOR = 3.5
        private const val MIN_RANGE = 1e-6

        /** 256-entry ln LUT; index 0 maps to ln(1) (clamp-to-1 contract, no log(0)). */
        private val LN_LUT = DoubleArray(256) { ln(maxOf(it, 1).toDouble()) }

        /** Entropy-minimization calibration on one warped board frame (Mat adapter). */
        fun calibrate(bgr: Mat): IntrinsicGray {
            require(bgr.type() == CvType.CV_8UC3) { "expected CV_8UC3, got ${bgr.type()}" }
            val width = bgr.cols()
            val height = bgr.rows()
            val buf = ByteArray(width * height * CHANNELS)
            bgr.get(0, 0, buf)
            return calibrate(buf, width, height)
        }

        /**
         * Core calibration: theta in 0..179 deg (1-deg steps), per theta keep the
         * P1..P99 band, Scott-rule bin width 3.5*std*N^(-1/3), Shannon entropy of
         * the normalized histogram; argmin wins. lo/hi = P1/P99 of the winner.
         * Deterministic, no RNG.
         */
        fun calibrate(
            bgr: ByteArray,
            width: Int,
            height: Int,
        ): IntrinsicGray {
            val n = width * height
            require(bgr.size >= n * CHANNELS) { "buffer too small: ${bgr.size} < ${n * CHANNELS}" }
            val chi1 = DoubleArray(n)
            val chi2 = DoubleArray(n)
            var src = 0
            for (i in 0 until n) {
                val lnB = LN_LUT[bgr[src].toInt() and 0xFF]
                val lnG = LN_LUT[bgr[src + 1].toInt() and 0xFF]
                val lnR = LN_LUT[bgr[src + 2].toInt() and 0xFF]
                src += CHANNELS
                chi1[i] = (lnR - lnG) * INV_SQRT2
                chi2[i] = (lnR + lnG - 2.0 * lnB) * INV_SQRT6
            }
            var bestDeg = 0
            var bestEntropy = Double.MAX_VALUE
            val proj = DoubleArray(n)
            for (deg in 0 until ANGLE_STEPS) {
                val rad = Math.toRadians(deg.toDouble())
                val c = cos(rad)
                val s = sin(rad)
                for (i in 0 until n) proj[i] = chi1[i] * c + chi2[i] * s
                val e = bandEntropy(proj)
                if (e < bestEntropy) {
                    bestEntropy = e
                    bestDeg = deg
                }
            }
            val rad = Math.toRadians(bestDeg.toDouble())
            val c = cos(rad)
            val s = sin(rad)
            for (i in 0 until n) proj[i] = chi1[i] * c + chi2[i] * s
            proj.sort()
            val lo = percentileSorted(proj, P_LO)
            var hi = percentileSorted(proj, P_HI)
            if (hi <= lo) hi = lo + MIN_RANGE // guarantee hi > lo (flat projection)
            return IntrinsicGray(bestDeg.toDouble(), lo, hi)
        }

        /** Shannon entropy of the Scott-binned histogram over the P1..P99 band of [values]. */
        internal fun bandEntropy(values: DoubleArray): Double {
            val sorted = values.copyOf()
            sorted.sort()
            val lo = percentileSorted(sorted, P_LO)
            val hi = percentileSorted(sorted, P_HI)
            // Band = middle 90-ish% (paper section 5: reject outliers).
            var from = 0
            while (from < sorted.size && sorted[from] < lo) from++
            var to = sorted.size
            while (to > from && sorted[to - 1] > hi) to--
            val count = to - from
            if (count <= 1) return 0.0
            var sum = 0.0
            for (i in from until to) sum += sorted[i]
            val mean = sum / count
            var varSum = 0.0
            for (i in from until to) {
                val d = sorted[i] - mean
                varSum += d * d
            }
            val std = sqrt(varSum / count)
            val binWidth = SCOTT_FACTOR * std * Math.cbrt(1.0 / count)
            if (binWidth <= 0.0) return 0.0 // constant band: perfectly tight histogram
            val bins = (floor((sorted[to - 1] - sorted[from]) / binWidth).toInt() + 1)
            val hist = IntArray(bins)
            for (i in from until to) {
                val bin = floor((sorted[i] - sorted[from]) / binWidth).toInt().coerceIn(0, bins - 1)
                hist[bin]++
            }
            var entropy = 0.0
            for (h in hist) {
                if (h == 0) continue
                val p = h.toDouble() / count
                entropy -= p * ln(p)
            }
            return entropy
        }

        /** NumPy-style linear-interpolation percentile on an already sorted array. */
        private fun percentileSorted(
            sorted: DoubleArray,
            q: Double,
        ): Double {
            if (sorted.isEmpty()) return 0.0
            val pos = q / 100.0 * (sorted.size - 1)
            val lower = floor(pos).toInt()
            val upper = minOf(lower + 1, sorted.size - 1)
            val frac = pos - lower
            return sorted[lower] * (1.0 - frac) + sorted[upper] * frac
        }
    }
}
