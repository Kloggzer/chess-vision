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
        for (dy in -j..j) {
            for (dx in -j..j) {
                if (dx == 0 && dy == 0) continue
                applyShift(signed, grayA, grayB, dx, dy)
            }
        }
    }

    private fun applyShift(
        signed: IntArray,
        grayA: GrayImage,
        grayB: GrayImage,
        dx: Int,
        dy: Int,
    ) {
        val width = grayA.width
        val height = grayA.height
        for (y in 0 until height) {
            val sourceY = (y + dy).coerceIn(0, height - 1)
            val rowA = y * width
            val rowB = sourceY * width
            for (x in 0 until width) {
                val sourceX = (x + dx).coerceIn(0, width - 1)
                val d = grayA.data[rowA + x].px() - grayB.data[rowB + sourceX].px()
                if (kotlin.math.abs(d) < kotlin.math.abs(signed[rowA + x])) signed[rowA + x] = d
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
     * Zero-mean normalized cross-correlation of ONE square between two grays — the literature's
     * shadow test (Sanin et al. survey; ZNCC ≥ thr ⇒ same structure up to a LINEAR lighting
     * change ⇒ shadow/illumination, not a piece change). Returns null when the REFERENCE square
     * lacks structure (std < [minRefStd]): NCC is meaningless on a flat empty square, and a veto
     * there would kill real arrivals (the dark-rook-on-f8 castle lesson).
     */
    fun squareZncc(
        grayA: GrayImage,
        grayB: GrayImage,
        box: Box,
        minRefStd: Double = MIN_REF_STD,
    ): Double? {
        if (box.area <= 0) return null
        val w = grayA.width
        var sumA = 0.0
        var sumB = 0.0
        for (y in box.y0 until box.y1) {
            val row = y * w
            for (x in box.x0 until box.x1) {
                sumA += grayA.data[row + x].px()
                sumB += grayB.data[row + x].px()
            }
        }
        val n = box.area.toDouble()
        val meanA = sumA / n
        val meanB = sumB / n
        var cov = 0.0
        var varA = 0.0
        var varB = 0.0
        for (y in box.y0 until box.y1) {
            val row = y * w
            for (x in box.x0 until box.x1) {
                val da = grayA.data[row + x].px() - meanA
                val db = grayB.data[row + x].px() - meanB
                cov += da * db
                varA += da * da
                varB += db * db
            }
        }
        val stdA = kotlin.math.sqrt(varA / n)
        if (stdA < minRefStd) return null
        val denom = kotlin.math.sqrt(varA) * kotlin.math.sqrt(varB)
        return if (denom < EPS) 0.0 else cov / denom
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

    /** Below this reference-square std there is no structure to correlate against. */
    private const val MIN_REF_STD = 6.0
    private const val EPS = 1e-9
}
