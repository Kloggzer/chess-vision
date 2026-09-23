package com.chesslab.geometry

import org.opencv.core.Mat
import kotlin.math.abs
import kotlin.math.max

// A warp can be wrong with nothing failing — the whole corpus sat a few degrees off until re-cut (5.5x the
// empty-crop margin). Measured BAND-WISE: collapsing an axis averages tilt away (0.01 px for a 3.05 px shear);
// OUT TO THE EDGE in a padded warp: pinning lines 0/8 read a scale error 25 % short.

internal const val SEARCH_FRAC: Double = 0.25

/** Tighter: the printed rank/file border runs ~a third of a cell outside the field, and a window reaching it
 *  locks onto the wrong line. */
internal const val OUTER_SEARCH_FRAC: Double = 0.15

/** About one and a half groove widths. */
private const val CENTROID_FRAC: Double = 0.08

/** 8 gives each line eight samples, so a robust fit can drop the bands a piece stands in; 1 is the old
 *  tilt-blind collapse. */
const val ALIGN_BANDS: Int = 8

/** Must exceed [OUTER_SEARCH_FRAC] (the window has to fit) and stay under the ~0.33 cell of the label border. */
const val GRID_PAD_CELLS: Double = 0.25

/** Damaging corpora sat at 3.2-6.5 % of a cell, repaired sessions at 2.0-3.3 %: the gate sits at the seam. A
 *  FRACTION, so it means the same on the rig and on the phone (`docs/data-pipeline.md` 12). */
const val MAX_OFFSET_FRAC: Double = 0.04

private const val MIN_SEARCH_PX: Int = 4

internal const val LINES_PER_AXIS: Int = BOARD_SIDE + 1

internal const val H_ELEMENTS: Int = 9

class GridLine(
    val slope: Double,
    val offset: Double,
)

/** `axis` 0 is the VERTICAL lines (each pins an x), 1 the horizontal ones; null where a line was not located. */
class BoardGrid(
    private val lines: Array<Array<GridLine?>>,
    val pad: Int,
) {
    val unread: Int get() = lines.sumOf { axis -> axis.count { it == null } }

    fun at(
        axis: Int,
        k: Int,
    ): GridLine? = lines[axis][k]
}

class SquareOffsets(
    val offsets: Map<String, Double>,
    val unread: Int,
) {
    val worst: Double get() = offsets.values.maxOrNull() ?: Double.NaN
}

/** A verdict, not a number: every path producing a quad acts on it. [unread] is part of it — an edge not
 *  measured is no pass. Absolute: nothing here looks at another frame. */
class Alignment(
    val ok: Boolean,
    val worst: Double,
    val unread: Int,
    val limit: Double,
    val reason: String,
)

internal class ProfileParams(
    val cell: Double,
    val span: Int,
    val outerSpan: Int,
    val csp: Int,
) {
    constructor(boardSize: Int, searchFrac: Double, outer: Boolean) : this(
        boardSize / BOARD_SIDE_D,
        max(MIN_SEARCH_PX, pyRound(boardSize / BOARD_SIDE_D * searchFrac)),
        if (outer) max(MIN_SEARCH_PX, pyRound(boardSize / BOARD_SIDE_D * OUTER_SEARCH_FRAC)) else 0,
        max(2, pyRound(boardSize / BOARD_SIDE_D * CENTROID_FRAC)),
    )
}

/** The pad makes the outer lines measurable instead of assumed. **The caller owns the `Mat`.** */
fun warpForGrid(
    frame: Mat,
    geom: BoardGeometry,
    quad: List<DoubleArray>,
): Pair<Mat, Int> {
    val pad = pyRound(GRID_PAD_CELLS * geom.boardSize / BOARD_SIDE_D)
    return warpFromCornersPadded(frame, geom, quad, pad) to pad
}

/** Null where a line cannot be told from its neighbourhood — pieces hide grooves. Nothing is assumed: without
 *  a pad the outer lines are reported missing, never invented. */
fun gridLines(
    warped: Mat,
    boardSize: Int,
    pad: Int = 0,
    bands: Int = ALIGN_BANDS,
    searchFrac: Double = SEARCH_FRAC,
    outer: Boolean = pad > 0,
): BoardGrid {
    val g = BoardGray(warped)
    val p = ProfileParams(boardSize, searchFrac, outer)
    val bh = boardSize.toDouble() / bands
    val centre = pad + boardSize / 2.0
    val lines = Array(2) { arrayOfNulls<GridLine>(LINES_PER_AXIS) }
    for (axis in 0..1) {
        fitAxis(axisSamples(g, axis, bands, bh, pad, p), centre).forEach { (k, line) ->
            lines[axis][k] = line
        }
    }
    return BoardGrid(lines, pad)
}

internal fun axisSamples(
    g: BoardGray,
    axis: Int,
    bands: Int,
    bh: Double,
    pad: Int,
    p: ProfileParams,
): List<DoubleArray> =
    (0 until bands).flatMap { bi ->
        bandSamples(g, axis, pyRound(pad + bi * bh), pyRound(pad + (bi + 1) * bh), pad, p)
    }

private fun bandSamples(
    g: BoardGray,
    axis: Int,
    s0: Int,
    s1: Int,
    pad: Int,
    p: ProfileParams,
): List<DoubleArray> {
    if (s1 <= s0) return emptyList()
    val prof = if (axis == 0) g.columnMedians(s0, s1) else g.rowMedians(s0, s1)
    val pos = profileLines(prof, p.cell, p.span, p.csp, pad.toDouble(), p.outerSpan)
    val mid = (s0 + s1) / 2.0
    return (0 until LINES_PER_AXIS)
        .filter { !pos[it].isNaN() }
        .map { doubleArrayOf(it.toDouble(), mid, pos[it]) }
}

/** The largest displacement of the square's four boundaries — does the crop hold the square or its neighbour.
 *  Each edge WHERE IT PASSES the square, via the line's slope. `unread` counts out of 18 with a pad, 14 without. */
fun squareOffsets(
    warped: Mat,
    boardSize: Int,
    pad: Int = 0,
): SquareOffsets {
    val grid = gridLines(warped, boardSize, pad)
    val cell = boardSize / BOARD_SIDE_D
    val centre = grid.pad + boardSize / 2.0
    val off = LinkedHashMap<String, Double>()
    for (f in 0 until BOARD_SIDE) {
        for (r in 0 until BOARD_SIDE) {
            squareOffset(grid, f, r, cell, centre)?.let { off["${'a' + f}${r + 1}"] = it }
        }
    }
    return SquareOffsets(off, grid.unread)
}

private fun squareOffset(
    grid: BoardGrid,
    file: Int,
    rank: Int,
    cell: Double,
    centre: Double,
): Double? {
    // Rank 1 is the BOTTOM of the rectified board, so its row index counts from the far end.
    val cy = grid.pad + (BOARD_SIDE - 0.5 - rank) * cell
    val cx = grid.pad + (file + 0.5) * cell
    val top = BOARD_SIDE - 1 - rank
    val at = { axis: Int, k: Int, coord: Double ->
        grid.at(axis, k)?.let { it.slope * (coord - centre) + it.offset - grid.pad } ?: Double.NaN
    }
    val edges = doubleArrayOf(at(0, file, cy), at(0, file + 1, cy), at(1, top, cx), at(1, top + 1, cx))
    val want = doubleArrayOf(file * cell, (file + 1) * cell, top * cell, (top + 1) * cell)
    if (edges.any { it.isNaN() }) return null
    var worst = 0.0
    for (i in edges.indices) worst = max(worst, abs(edges[i] - want[i]))
    return worst
}

fun frameOffsets(
    frame: Mat,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
): SquareOffsets {
    val (warped, pad) = warpForGrid(frame, geom, quad)
    try {
        return squareOffsets(warped, geom.boardSize, pad)
    } finally {
        warped.release()
    }
}

fun worstOffset(
    frame: Mat,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
): Double = frameOffsets(frame, quad, geom).worst

/** Absolute, never self-referential: the script's `quad_spread` against the median of the same quads read a
 *  consistently wrong quad as 99.9 % "detected" and hid a 27-33 px error for a day. */
fun alignmentOf(
    frame: Mat,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
    maxFrac: Double = MAX_OFFSET_FRAC,
): Alignment {
    val limit = maxFrac * geom.boardSize / BOARD_SIDE_D
    val measured = frameOffsets(frame, quad, geom)
    val total = 2 * LINES_PER_AXIS
    val over = measured.offsets.count { it.value > limit }
    return when {
        measured.offsets.isEmpty() ->
            Alignment(false, Double.NaN, measured.unread, limit, "no square could be measured")
        measured.unread > 0 ->
            Alignment(
                false,
                measured.worst,
                measured.unread,
                limit,
                "${measured.unread} of $total grid lines could not be located",
            )
        measured.worst > limit ->
            Alignment(
                false,
                measured.worst,
                measured.unread,
                limit,
                "$over of 64 squares are cut off their grid",
            )
        else ->
            Alignment(true, measured.worst, measured.unread, limit, "every square edge is on its groove")
    }
}

internal fun homographyOf(
    quad: List<DoubleArray>,
    geom: BoardGeometry,
): DoubleArray {
    val h = computeHomography(quad, geom.boardSize, geom.margin)
    val out = DoubleArray(H_ELEMENTS)
    h.get(0, 0, out)
    h.release()
    return out
}
