package com.chesslab.geometry

import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import org.opencv.core.Mat
import java.util.stream.IntStream

// The coverage gate (GridLines.kt) counts WHOLE lines, so a hand in a corner cannot reach it:
// erasing a third of three lines leaves every line above its 50 % hit fraction and coverage near
// 1.0 — measured on rec-20260808-003957 frame 5421, where a resting hand over eight squares read
// `waiting · occluded 0` and a fabricated `g4` committed through it. This sensor reads the SAME
// grooves the alignment fit reads (GrooveProfile.kt), band by band, and keeps what the fit throws
// away: WHICH segment of which line found no groove. 2 axes x 9 lines x 8 bands is one segment
// per cell edge; a hand erases a spatially CLUSTERED block on both axes, pieces cost scattered
// singles (same recording: 2 / 11 / 2 of 144 segments missing on clean / hand / clean frames).
//
// Resolution is load-bearing: at detSize the grooves are 1-2 px and the noise floor is 30-40
// missing segments, drowning the signal. This reads the FULL-resolution crop warp — the frame the
// observer actually classifies — which exists exactly once per observation (BoardWarps.kt), so
// the cost lands on the observer thread, per observation, never on the per-frame path.

/** A square reads occluded when at least this many of its four edge segments lost their groove. */
private const val MIN_MISSING_EDGES = 2

/**
 * Squares whose bordering grooves are locally erased — a model-free hand map, as a bitboard in
 * the engine's square order: bit `i` is square `Squares.ALL[i]`, lexicographic (a1=0, a2=1, .. h8).
 *
 * [pad] is where nominal line 0 sits in [warped] (`cropBorderPx` for the crop warp). The two
 * OUTER lines per axis are read only when the pad fits their search window; otherwise they are
 * treated as FOUND — deliberately the opposite of alignment's UNREAD convention, because here a
 * missing line accuses rather than voids, and an unmeasurable line must not read as a hand.
 */
fun gridOccludedSquares(
    warped: Mat,
    geom: BoardGeometry,
    pad: Int,
    parallel: Boolean = false,
): Long =
    WorkProfiler.span(WorkOperation.GRID_OCCLUSION) {
        // BoardGray owns one row-major and one transposed byte plane for this call.
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

/**
 * `found[axis][k][band]` — the uncollapsed groove read [gridLines] fits its lines from. Bands are
 * cell-sized, so band `b` of a vertical line is the segment beside warp row `b`, and band `b` of a
 * horizontal line the segment beside warp column `b`. Unread outer lines come back pre-FOUND.
 */
private fun gridSegments(
    g: BoardGray,
    boardSize: Int,
    pad: Int,
    p: ProfileParams,
    readOuter: Boolean,
    parallel: Boolean,
): Array<Array<BooleanArray>> {
    val bh = boardSize.toDouble() / BOARD_SIDE
    val found =
        Array(2) {
            Array(LINES_PER_AXIS) { k ->
                BooleanArray(BOARD_SIDE) { !readOuter && (k == 0 || k == BOARD_SIDE) }
            }
        }
    // One flat loop over axis x band, not two nested ones — the slot arithmetic is the whole
    // difference and it keeps the groove-marking loop inside detekt's depth budget.
    val slots = IntStream.range(0, 2 * BOARD_SIDE).let { if (parallel) it.parallel() else it }
    slots.forEach { slot ->
        val axis = slot / BOARD_SIDE
        val b = slot % BOARD_SIDE
        val s0 = pyRound(pad + b * bh)
        val s1 = pyRound(pad + (b + 1) * bh)
        if (s1 <= s0) return@forEach
        val prof =
            WorkProfiler.span(WorkOperation.GRID_OCCLUSION_PROFILE) {
                if (axis == 0) g.columnMedians(s0, s1) else g.rowMedians(s0, s1)
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

/** Warp cell `(col, row)` as the engine-order bit — the inverse of [squareToColRow]. */
private fun squareBit(
    col: Int,
    row: Int,
    whitePov: Boolean,
): Long {
    val file = if (whitePov) col else BOARD_SIDE - 1 - col
    val rank = if (whitePov) BOARD_SIDE - row else row + 1
    return 1L shl (file * BOARD_SIDE + rank - 1)
}
