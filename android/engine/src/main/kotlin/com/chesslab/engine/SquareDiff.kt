package com.chesslab.engine

import com.chesslab.engine.api.GrayImage

/** Per-square brightness diff via integral image (ports tracker.py:59,88 `_region_means`, `per_square_diff`). */
object SquareDiff {
    /**
     * Mean absolute brightness difference per square between two rectified grayscale images.
     * `geom.boardSize` must equal the image size of both inputs.
     *
     * Kotlin-only extensions (no Python counterparts, both off by default for parity):
     * - [jitterPx] > 0 makes the diff wobble-tolerant ("virtual wobble"): each pixel of [grayA]
     *   is compared against the (2j+1)² neighborhood of [grayB] and the MINIMUM-|·| difference
     *   is kept, so a ≤j px camera/board shake produces ~zero diff at edges while a real piece
     *   change (a blob, not a thin edge) still scores fully.
     * - [illumCancel] subtracts each square's OWN mean signed diff before scoring: a lighting
     *   change shifts a whole square roughly uniformly (cancels to ~0), while a piece change is
     *   a localized blob whose structure survives the mean removal (~half signal retained).
     *   Complements [normalizeDiffs], whose global median only cancels board-wide shifts.
     */
    fun perSquareDiff(
        grayA: GrayImage,
        grayB: GrayImage,
        geom: BoardGeometry,
        jitterPx: Int = 0,
        illumCancel: Boolean = false,
    ): Map<String, Double> {
        require(grayA.width == grayB.width && grayA.height == grayB.height) { "image sizes differ" }
        val w = grayA.width
        val h = grayA.height
        val signed = IntArray(w * h)
        for (i in signed.indices) {
            signed[i] = grayA.data[i].px() - grayB.data[i].px()
        }
        if (jitterPx > 0) minAbsAgainstShifted(signed, grayA, grayB, jitterPx)
        val boxes = Squares.boxes(geom)
        val means =
            if (illumCancel) {
                meanCancelledMeans(signed, w, boxes)
            } else {
                val absDiff = IntArray(signed.size) { kotlin.math.abs(signed[it]) }
                regionMeans(integral(absDiff, w, h), w, boxes)
            }
        return Squares.all.zip(means).toMap()
    }

    /** Keep per pixel the SIGNED diff of the ≤[j] px translation of [grayB] with minimal |·|. */
    private fun minAbsAgainstShifted(
        signed: IntArray,
        grayA: GrayImage,
        grayB: GrayImage,
        j: Int,
    ) {
        val w = grayA.width
        val h = grayA.height
        for (dy in -j..j) {
            for (dx in -j..j) {
                if (dx == 0 && dy == 0) continue
                for (y in 0 until h) {
                    val sy = (y + dy).coerceIn(0, h - 1)
                    val rowA = y * w
                    val rowB = sy * w
                    for (x in 0 until w) {
                        val sx = (x + dx).coerceIn(0, w - 1)
                        val d = grayA.data[rowA + x].px() - grayB.data[rowB + sx].px()
                        if (kotlin.math.abs(d) < kotlin.math.abs(signed[rowA + x])) signed[rowA + x] = d
                    }
                }
            }
        }
    }

    /** Per-box mean of |signed - boxMean(signed)| — the square's uniform brightness shift cancels. */
    private fun meanCancelledMeans(
        signed: IntArray,
        w: Int,
        boxes: List<Box>,
    ): List<Double> {
        val stride = w + 1
        val ii = integral(signed, w, signed.size / w)
        return boxes.map { b ->
            if (b.area <= 0) {
                0.0
            } else {
                val sum =
                    ii[b.y1 * stride + b.x1] - ii[b.y0 * stride + b.x1] -
                        ii[b.y1 * stride + b.x0] + ii[b.y0 * stride + b.x0]
                val mean = sum.toDouble() / b.area
                var acc = 0.0
                for (y in b.y0 until b.y1) {
                    val row = y * w
                    for (x in b.x0 until b.x1) acc += kotlin.math.abs(signed[row + x] - mean)
                }
                acc / b.area
            }
        }
    }

    /**
     * Remove global brightness/exposure drift: per-square diff minus the median over all squares,
     * clamped at 0 (ports tracker.py:375 `normalize_diffs`; upper median like Python `vals[n // 2]`).
     */
    fun normalizeDiffs(diffs: Map<String, Double>): Map<String, Double> {
        val vals = diffs.values.sorted()
        val baseline = if (vals.isEmpty()) 0.0 else vals[vals.size / 2]
        return diffs.mapValues { (_, v) -> maxOf(0.0, v - baseline) }
    }

    /** Summed-area table with a zero top row/left column, shape (h+1) x (w+1). */
    internal fun integral(
        values: IntArray,
        w: Int,
        h: Int,
    ): LongArray {
        val stride = w + 1
        val ii = LongArray(stride * (h + 1))
        for (y in 1..h) {
            var rowSum = 0L
            for (x in 1..w) {
                rowSum += values[(y - 1) * w + (x - 1)]
                ii[y * stride + x] = ii[(y - 1) * stride + x] + rowSum
            }
        }
        return ii
    }

    /** Per-box means from an integral image; 0.0 for zero-area boxes (ports tracker.py:59). */
    internal fun regionMeans(
        ii: LongArray,
        w: Int,
        boxes: List<Box>,
    ): List<Double> {
        val stride = w + 1
        return boxes.map { b ->
            if (b.area <= 0) {
                0.0
            } else {
                val s =
                    ii[b.y1 * stride + b.x1] - ii[b.y0 * stride + b.x1] -
                        ii[b.y1 * stride + b.x0] + ii[b.y0 * stride + b.x0]
                s.toDouble() / b.area
            }
        }
    }
}
