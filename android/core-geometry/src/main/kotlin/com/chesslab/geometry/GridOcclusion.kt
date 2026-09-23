package com.chesslab.geometry

import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import org.opencv.core.Mat
import java.util.stream.IntStream

// The coverage gate counts WHOLE lines, so a corner hand never reaches it (003957 frame 5421 committed `g4`
// through one). This keeps WHICH segment lost its groove; a hand erases a CLUSTER, pieces cost scattered
// singles. FULL-resolution crop warp: at detSize grooves are 1-2 px and noise drowns them; observer thread only.

private const val MIN_MISSING_EDGES = 2

/** Bit `i` is `Squares.ALL[i]`. Outer lines outside the pad's reach count as FOUND — the opposite of
 *  alignment's UNREAD: here a missing line accuses, and an unmeasurable one must not read as a hand. */
fun gridOccludedSquares(
    warped: Mat,
    geom: BoardGeometry,
    pad: Int,
    parallel: Boolean = false,
): Long =
    WorkProfiler.span(WorkOperation.GRID_OCCLUSION) {
        WorkProfiler.bytes(WorkOperation.GRID_OCCLUSION, 2L * warped.rows() * warped.cols())
        val p = ProfileParams(geom.boardSize, SEARCH_FRAC, outer = true)
        val readOuter = pad >= p.outerSpan
        val gray = WorkProfiler.span(WorkOperation.GRID_OCCLUSION_PREP) { BoardGray(warped) }
        val found = gridSegments(gray, geom.boardSize, pad, p, readOuter, parallel)
        var out = 0L
        for (col in 0 until BOARD_SIDE) {
            for (row in 0 until BOARD_SIDE) {
                var missing = 0
                if (!found[0][col][row]) missing++
                if (!found[0][col + 1][row]) missing++
                if (!found[1][row][col]) missing++
                if (!found[1][row + 1][col]) missing++
                if (missing >= MIN_MISSING_EDGES) out = out or squareBit(col, row, geom.whitePov)
            }
        }
        out
    }

/** Bands are cell-sized, so band `b` of a vertical line is the segment beside warp row `b`. Unread outer lines
 *  come back pre-FOUND. */
private fun gridSegments(
    g: BoardGray,
    boardSize: Int,
    pad: Int,
    p: ProfileParams,
    readOuter: Boolean,
    parallel: Boolean,
): Array<Array<BooleanArray>> {
    val bh = boardSize.toDouble() / BOARD_SIDE
    // Shared masks keep every sample profileLines reads; the sequential and parallel paths skip the same medians.
    val outerSpan = if (readOuter) p.outerSpan else 0
    val samples = arrayOf(g.width, g.height).map { profileSamples(it, p.cell, p.span, pad.toDouble(), outerSpan) }
    val found =
        Array(2) {
            Array(LINES_PER_AXIS) { k ->
                BooleanArray(BOARD_SIDE) { !readOuter && (k == 0 || k == BOARD_SIDE) }
            }
        }
    // One flat loop over axis x band keeps the groove-marking loop inside detekt's depth budget.
    val slots = IntStream.range(0, 2 * BOARD_SIDE).let { if (parallel) it.parallel() else it }
    slots.forEach { slot ->
        val axis = slot / BOARD_SIDE
        val b = slot % BOARD_SIDE
        val s0 = pyRound(pad + b * bh)
        val s1 = pyRound(pad + (b + 1) * bh)
        if (s1 <= s0) return@forEach
        val prof =
            WorkProfiler.span(WorkOperation.GRID_OCCLUSION_PROFILE) {
                if (axis == 0) g.columnMedians(s0, s1, samples[axis]) else g.rowMedians(s0, s1, samples[axis])
            }
        val pos =
            WorkProfiler.span(WorkOperation.GRID_OCCLUSION_LINES) {
                profileLines(prof, p.cell, p.span, p.csp, pad.toDouble(), if (readOuter) p.outerSpan else 0)
            }
        for (k in 0 until LINES_PER_AXIS) {
            if (!pos[k].isNaN()) found[axis][k][b] = true
        }
    }
    return found
}

/** The inverse of [squareToColRow]. */
private fun squareBit(
    col: Int,
    row: Int,
    whitePov: Boolean,
): Long {
    val file = if (whitePov) col else BOARD_SIDE - 1 - col
    val rank = if (whitePov) BOARD_SIDE - row else row + 1
    return 1L shl ((rank - 1) * BOARD_SIDE + file)
}
