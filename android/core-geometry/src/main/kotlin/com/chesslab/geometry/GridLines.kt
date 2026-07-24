package com.chesslab.geometry

import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc
import kotlin.math.max
import kotlin.math.min

// Port of `tracker.py:1293 _grid_line_coverage`.
//
// Fraction of the board's 14 interior grid lines (7 vertical + 7 horizontal) that are actually
// visible in the rectified board image. On a clear board every grid line runs edge to edge; a
// hand/arm/sleeve lying across the board erases the lines beneath it. Pieces sit ON
// intersections but never hide a whole line, so a clear board with pieces still scores ~1.0.

private const val CANNY_LO: Double = 40.0
private const val CANNY_HI: Double = 120.0

/** Half-width of the search band around a grid line, as a fraction of the smaller cell side. */
private const val BAND_FRACTION: Double = 0.12

/** A line counts when at least this fraction of its rows/columns carries an edge pixel. */
private const val LINE_HIT_FRACTION: Double = 0.5

/** 7 vertical + 7 horizontal interior lines. */
private const val INTERIOR_LINES: Double = 14.0

/** Below this side length the measurement is meaningless — report a clear board. */
private const val MIN_SIDE: Int = 16

/** Fraction of the 14 interior grid lines visible in [gray] (a rectified board image). */
fun gridLineCoverage(gray: Mat): Double {
    val h = gray.rows()
    val w = gray.cols()
    var coverage = 1.0
    if (h >= MIN_SIDE && w >= MIN_SIDE) {
        val edges = Mat()
        Imgproc.Canny(gray, edges, CANNY_LO, CANNY_HI)
        val buf = ByteArray(w * h)
        edges.get(0, 0, buf)
        val cellX = w / BOARD_SIDE_D
        val cellY = h / BOARD_SIDE_D
        val band = max(1, (min(cellX, cellY) * BAND_FRACTION).toInt())
        val hits = verticalHits(buf, w, h, cellX, band) + horizontalHits(buf, w, h, cellY, band)
        coverage = hits / INTERIOR_LINES
    }
    return coverage
}

/** Interior vertical lines: max-projection over a column band, per row. */
private fun verticalHits(
    edges: ByteArray,
    w: Int,
    h: Int,
    cellX: Double,
    band: Int,
): Int {
    var hits = 0
    for (i in 1 until BOARD_SIDE) {
        val x = pyRound(i * cellX)
        val x0 = max(0, x - band)
        val x1 = min(w, x + band + 1)
        // An empty band never counts as a hit.
        if (x1 > x0 && litRowFraction(edges, w, h, x0, x1) >= LINE_HIT_FRACTION) hits++
    }
    return hits
}

/** Interior horizontal lines: max-projection over a row band, per column. */
private fun horizontalHits(
    edges: ByteArray,
    w: Int,
    h: Int,
    cellY: Double,
    band: Int,
): Int {
    var hits = 0
    for (j in 1 until BOARD_SIDE) {
        val y = pyRound(j * cellY)
        val y0 = max(0, y - band)
        val y1 = min(h, y + band + 1)
        if (y1 > y0 && litColumnFraction(edges, w, y0, y1) >= LINE_HIT_FRACTION) hits++
    }
    return hits
}

private fun litRowFraction(
    edges: ByteArray,
    w: Int,
    h: Int,
    x0: Int,
    x1: Int,
): Double {
    var lit = 0
    for (y in 0 until h) {
        if (anyEdge(edges, y * w + x0, y * w + x1, 1)) lit++
    }
    return lit.toDouble() / h
}

private fun litColumnFraction(
    edges: ByteArray,
    w: Int,
    y0: Int,
    y1: Int,
): Double {
    var lit = 0
    for (x in 0 until w) {
        if (anyEdge(edges, y0 * w + x, y1 * w + x, w)) lit++
    }
    return lit.toDouble() / w
}

/** True when any of `[from, until)` stepped by [step] is a non-zero edge pixel. */
private fun anyEdge(
    edges: ByteArray,
    from: Int,
    until: Int,
    step: Int,
): Boolean {
    var i = from
    var found = false
    while (i < until && !found) {
        found = edges[i] != 0.toByte()
        i += step
    }
    return found
}
