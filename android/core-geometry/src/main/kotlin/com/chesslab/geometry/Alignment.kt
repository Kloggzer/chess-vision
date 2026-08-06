package com.chesslab.geometry

import org.opencv.core.Mat
import kotlin.math.abs
import kotlin.math.max

// Port of `alignment.py`. Where the board's squares REALLY sit in a rectified frame.
//
// A warp can be wrong without anything failing: the corners resolve, 64 crops come out, every count
// looks healthy, and the grid sits a few degrees off with every crop straddling its groove. That is
// what happened to the whole Python corpus until 2026-07-31, and re-cutting it moved the champion's
// empty-crop margin 5.5x — more than nine training experiments had managed.
//
// **The lattice is measured BAND-WISE.** Collapsing the whole board along an axis locates a line
// precisely and averages its TILT away completely, so a rotation or shear inside the warp used to
// be invisible AND uncorrectable: 0.01 px reported for a 3.05 px shear. That version passed every
// directional test ("the shear is visible") and certified 302 frames whose grid the eye can see is
// wrong. `AlignmentTruthTest` is calibrated against analytic truth for exactly that reason — this
// file's whole history is a plausible-looking measurement being silently wrong for months.
//
// **The lines are measured OUT TO THE EDGE, in a padded warp** (2026-08-03, `specs/41`). Index 0
// and 8 used to be pinned at 0 and `boardSize` — the values the warp puts there by construction —
// which made a uniform SCALE error read 25 % short and made the metric partly a statement about its
// own assumption. [warpForGrid] keeps [GRID_PAD_CELLS] of surrounding board so the playing-field
// boundary is measured like every other line, and a line that cannot be found is REPORTED missing
// rather than assumed.

/** How far either side of an expected INTERIOR line to look, as a fraction of a cell. */
internal const val SEARCH_FRAC: Double = 0.25

/**
 * The same for the two OUTER lines, and deliberately tighter: the reference board carries a printed
 * rank/file border whose own boundary runs about a third of a cell outside the playing field
 * (measured on `VID_20260802_222741.mp4` frame 0: 33 px apart on a 100 px cell), and a window that
 * reaches it locks onto the wrong line and reports a small offset for a board scaled wrong by half
 * a square.
 */
internal const val OUTER_SEARCH_FRAC: Double = 0.15

/** Cap on the centroid half-width, as a fraction of a cell — about one and a half groove widths. */
private const val CENTROID_FRAC: Double = 0.08

/**
 * Bands per axis. 1 reproduces the old tilt-blind collapse. 8 gives each of the 18 lines eight
 * samples, which is what lets a robust fit throw away the bands a piece is standing in and still
 * have a line left; 4 was the previous value and lands within 0.2 px of it on clean frames.
 */
const val ALIGN_BANDS: Int = 8

/**
 * Cells of surrounding board [warpForGrid] keeps beyond the playing field, so the two OUTER lines
 * per axis are measured rather than assumed. Must exceed [OUTER_SEARCH_FRAC] (the window has to
 * fit) and stay under the ~0.33 cell at which the board's printed label border begins.
 */
const val GRID_PAD_CELLS: Double = 0.25

/**
 * The gate: a square edge this far off, as a fraction of a cell, fails the frame.
 *
 * Argued from `docs/data-pipeline.md` 12, not invented. The corpus that cost this project 5.5x its
 * empty-crop margin sat at 3.2-6.5 % of a cell; re-fitting brought every session to 2.0-3.3 %
 * median, max 4.3 %. So 3.2 % is the lowest error measured as damaging and 3.3 % the highest a
 * repaired session carries — the bands touch, and the gate sits at the seam. A FRACTION of a cell,
 * so it means the same on the rig (cell 100) and on the phone (cell up to 200).
 */
const val MAX_OFFSET_FRAC: Double = 0.04

/** Floor on a search half-width, so a tiny board still gets a window a notch fits in. */
private const val MIN_SEARCH_PX: Int = 4

internal const val LINES_PER_AXIS: Int = BOARD_SIDE + 1

/** Elements of a row-major 3x3. */
internal const val H_ELEMENTS: Int = 9

/** One measured grid line: its tilt, and where it crosses the board's centre. */
class GridLine(
    /** Position change per unit of the OTHER axis. */
    val slope: Double,
    /** Position at the board's centre, in the coordinates of the padded warp. */
    val offset: Double,
)

/**
 * The board's real grid: `[axis][k]`, null where a line could not be located.
 *
 * `axis` 0 is the family of VERTICAL lines (each pins an x), 1 the horizontal ones.
 */
class BoardGrid(
    private val lines: Array<Array<GridLine?>>,
    /** Where nominal line 0 sits in the warp these were measured in. */
    val pad: Int,
) {
    val unread: Int get() = lines.sumOf { axis -> axis.count { it == null } }

    fun at(
        axis: Int,
        k: Int,
    ): GridLine? = lines[axis][k]
}

/** Per-square offsets in rectified pixels, and how many grid lines could not be located. */
class SquareOffsets(
    val offsets: Map<String, Double>,
    val unread: Int,
) {
    /** The largest square offset, or `NaN` when nothing was measurable. */
    val worst: Double get() = offsets.values.maxOrNull() ?: Double.NaN
}

/**
 * The verdict on one quad, and the numbers behind it.
 *
 * A verdict and not a number, because every path that produces a quad has to act on it. [unread] is
 * part of the verdict, not a footnote — a frame whose outer lines could not be found has not been
 * measured at its edges, and calling that a pass is how the pinned metric certified 302 bad frames.
 *
 * Absolute, never self-referential: nothing here looks at any other frame.
 */
class Alignment(
    val ok: Boolean,
    val worst: Double,
    val unread: Int,
    val limit: Double,
    val reason: String,
)

/** Search windows and centroid width, derived once per measurement from the cell size. */
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

/**
 * `(warped, pad)` — the rectified board plus [GRID_PAD_CELLS] of what surrounds it.
 *
 * The pad is what makes the two outer lines per axis measurable instead of assumed. **The caller
 * owns the `Mat`.**
 */
fun warpForGrid(
    frame: Mat,
    geom: BoardGeometry,
    quad: List<DoubleArray>,
): Pair<Mat, Int> {
    val pad = pyRound(GRID_PAD_CELLS * geom.boardSize / BOARD_SIDE_D)
    return warpFromCornersPadded(frame, geom, quad, pad) to pad
}

/**
 * The board's REAL 9 lines per axis, measured band by band.
 *
 * A line that cannot be told from its neighbourhood comes back as null, so a caller can see which
 * boundary is a guess: pieces sit ON the grooves and legitimately hide some. **Nothing here is
 * assumed** — with [pad] `> 0` the outer lines are looked for like any other, and without a pad they
 * are reported missing rather than invented.
 */
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

/** `(k, lever, position)` for every groove one axis contributed, over all its bands. */
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

/** The grooves ONE band of one axis contributes, as `(k, lever, position)`. */
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

/**
 * Per-square offset: the largest displacement of any of the square's four boundaries from where the
 * grid says it should be — the quantity that decides whether the crop cut at that cell contains the
 * square or a slice of its neighbour.
 *
 * Each edge is evaluated WHERE IT PASSES THAT SQUARE, using the line's measured slope, so a grid
 * rotated inside the warp no longer reads as perfectly aligned because its lines happen to cross the
 * middle in the right place.
 *
 * `unread` counts out of 18 when [pad] `> 0` and out of 14 when it is 0 — without surrounding board
 * the outer lines are not measurable, and they are reported missing rather than assumed perfect.
 */
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

/** The worst of one square's four boundary displacements, or null if any of them is unmeasured. */
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

/** [squareOffsets] for a RAW frame and its corner quad, measured out to the board's edge. */
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

/** The largest square offset in this frame, or `NaN` when nothing was measurable. */
fun worstOffset(
    frame: Mat,
    quad: List<DoubleArray>,
    geom: BoardGeometry,
): Double = frameOffsets(frame, quad, geom).worst

/**
 * Measure [quad] against the board's own grid and say pass or fail.
 *
 * Absolute, never self-referential. The script path's `quad_spread` compares each frame's quad
 * against the MEDIAN OF THE SAME QUADS, so a consistently wrong quad scores p90 0.93 rectified px
 * and 99.9 % "detected" — precision reported as accuracy, and it hid a 27-33 px error for a day.
 */
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
