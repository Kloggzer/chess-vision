package com.chesslab.engine

import com.chesslab.engine.api.GrayImage

/** Per-square brightness diff via integral image (ports tracker.py:59,88 `_region_means`, `per_square_diff`). */
object SquareDiff {
    /**
     * Mean absolute brightness difference per square between two rectified grayscale images.
     * `geom.boardSize` must equal the image size of both inputs.
     */
    fun perSquareDiff(
        grayA: GrayImage,
        grayB: GrayImage,
        geom: BoardGeometry,
    ): Map<String, Double> {
        require(grayA.width == grayB.width && grayA.height == grayB.height) { "image sizes differ" }
        val w = grayA.width
        val h = grayA.height
        val absDiff = IntArray(w * h)
        for (i in absDiff.indices) {
            absDiff[i] = kotlin.math.abs(grayA.data[i].px() - grayB.data[i].px())
        }
        val ii = integral(absDiff, w, h)
        return Squares.all.zip(regionMeans(ii, w, Squares.boxes(geom))).toMap()
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
