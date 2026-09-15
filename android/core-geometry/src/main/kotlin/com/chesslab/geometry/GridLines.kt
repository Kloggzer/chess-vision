package com.chesslab.geometry

import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc
import kotlin.math.max
import kotlin.math.min

// Ported from `tracker.py _grid_line_coverage` when Python still carried the tracker.
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

/**
 * [gridLineCoverage] with its buffers held across frames.
 *
 * The free function allocated a `Mat` per frame and never released it — a native leak the
 * collector only reached through a finalizer — plus a fresh 640 KB `ByteArray` at 800x800. On
 * device this stage cost 7-20 ms against 0.87 ms on the desktop, and that gap is what it was.
 */
class GridCoverage : AutoCloseable {
    private val edges = Mat()
    private var buf = ByteArray(0)
    private var lit = BooleanArray(0)

    fun of(gray: Mat): Double =
        WorkProfiler.span(WorkOperation.GRID_COVERAGE) {
            val h = gray.rows()
            val w = gray.cols()
            if (h < MIN_SIDE || w < MIN_SIDE) return@span 1.0
            Imgproc.Canny(gray, edges, CANNY_LO, CANNY_HI)
            if (buf.size != w * h) buf = ByteArray(w * h)
            if (lit.size != w) lit = BooleanArray(w)
            edges.get(0, 0, buf)
            val cellX = w / BOARD_SIDE_D
            val cellY = h / BOARD_SIDE_D
            val band = max(1, (min(cellX, cellY) * BAND_FRACTION).toInt())
            val hits = verticalHits(buf, w, h, cellX, band) + horizontalHits(buf, lit, w, h, cellY, band)
            hits / INTERIOR_LINES
        }

    override fun close() {
        edges.release()
    }
}

/**
 * Fraction of the 14 interior grid lines visible in [gray] (a rectified board image).
 *
 * One-shot form, for tests and the offline clip harness. The live path holds a [GridCoverage].
 */
fun gridLineCoverage(gray: Mat): Double = GridCoverage().use { it.of(gray) }

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
    lit: BooleanArray,
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
        if (y1 > y0 && litColumnFraction(edges, lit, w, y0, y1) >= LINE_HIT_FRACTION) hits++
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

/**
 * Row-major, deliberately.
 *
 * The obvious transcription walks each column and steps by `w`, so every one of 800 columns
 * touches a different cache line per read. Sweeping the band's rows instead and OR-ing into a
 * per-column flag reads the same pixels contiguously; [lit] is the caller's reused buffer so
 * this stays allocation-free.
 */
private fun litColumnFraction(
    edges: ByteArray,
    lit: BooleanArray,
    w: Int,
    y0: Int,
    y1: Int,
): Double {
    lit.fill(false, 0, w)
    for (y in y0 until y1) {
        val row = y * w
        for (x in 0 until w) {
            if (edges[row + x] != 0.toByte()) lit[x] = true
        }
    }
    var count = 0
    for (x in 0 until w) {
        if (lit[x]) count++
    }
    return count.toDouble() / w
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
