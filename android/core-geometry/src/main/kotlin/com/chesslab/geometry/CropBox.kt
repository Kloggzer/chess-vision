package com.chesslab.geometry

import kotlin.math.max
import kotlin.math.min

// Per-square boxes in the rectified board image. Ports of `calibration.py:347
// square_to_crop_box`, `:377 square_center`, `:384 crop_border_px` and
// `tracker.py:120 square_region`.
//
// OpenCV-free ON PURPOSE (see Corners.kt).

/** `config.CROP_WARP_BORDER_CELLS` (config.py:70) — minimum crop-warp border in cells. */
const val CROP_WARP_BORDER_CELLS: Double = 0.1

/** Default inset of `square_region` (tracker.py:120) — guards against grid-line/neighbour noise. */
const val SQUARE_REGION_INSET: Double = 0.16

/**
 * Python's `round()` on a float: half-to-EVEN (banker's rounding), which on the JVM is
 * `Math.rint`. NOT `Math.round` (half-up) and not `Double.roundToInt` (half-away-from-zero).
 */
internal fun pyRound(v: Double): Int = Math.rint(v).toInt()

/**
 * `'e4' -> (x0, y0, x1, y1)` in the rectified `boardSize` image.
 * Port of `calibration.py:347 square_to_crop_box`.
 *
 * The base cell is expanded symmetrically by `padSide * cell` and additionally upward by
 * `padUp * cell`. `clamp = true` clips to the image (box may shrink); `clamp = false` returns
 * the raw box — `cropSquare` then pads the overhang with black so the box geometry is
 * constant across all 64 squares.
 */
fun squareToCropBox(
    square: String,
    geom: BoardGeometry,
    clamp: Boolean = true,
): IntArray {
    val (col, row) = squareToColRow(square, geom.whitePov)
    val cell = geom.cell
    val bs = geom.boardSize.toDouble()
    val x0 = col * cell - geom.padSide * cell
    val x1 = (col + 1) * cell + geom.padSide * cell
    val y0 = row * cell - geom.padSide * cell - geom.padUp * cell
    val y1 = (row + 1) * cell + geom.padSide * cell

    fun fix(v: Double): Int = pyRound(if (clamp) max(0.0, min(bs, v)) else v)

    return intArrayOf(fix(x0), fix(y0), fix(x1), fix(y1))
}

/**
 * Border in pixels the board is warped with for the DATA crop, so edge squares have real
 * content for their `padSide`/`padUp` extension. Port of `calibration.py:384 crop_border_px`.
 *
 * Defaults (`boardSize = 1600`, `padSide = 0.10`, `cell = 200`): `0.10 * 200.0 = 20`.
 */
fun cropBorderPx(geom: BoardGeometry): Int = pyRound(max(CROP_WARP_BORDER_CELLS, max(geom.padSide, geom.padUp)) * geom.cell)

/** Grid lines per axis: 8 cells share 9 boundaries. */
const val GRID_LINES_PER_AXIS: Int = 9

/** A steeper line is a misfit, not a lens — shared with realgames.py and `lib/warp.ts`. */
const val MESH_TILT_LIMIT: Double = 0.05

/** The same for the parabola term — realgames.py `MESH_CURV_LIMIT` explains the number. */
const val MESH_CURV_LIMIT: Double = 0.08

/** Simultaneous corner evaluations — argued at [meshCellQuadExact], shared with the fixture. */
const val CORNER_ITERATIONS: Int = 3

/**
 * The 18 MEASURED grid lines of one frame (`quad-fit.json` `grid_lines`, realgames.py), as
 * fractions of the playing-field side — `xs` left to right, `ys` top to bottom, white POV.
 * [tx]/[ty] are the lines' dimensionless tilts about the board centre, [cx]/[cy] their parabola
 * terms; each pair comes complete or not at all, and curvature only on top of tilts, so a
 * consumer can never cut half a stage.
 */
class GridMesh(
    val xs: DoubleArray,
    val ys: DoubleArray,
    val tx: DoubleArray? = null,
    val ty: DoubleArray? = null,
    val cx: DoubleArray? = null,
    val cy: DoubleArray? = null,
) {
    init {
        require(xs.size == GRID_LINES_PER_AXIS && ys.size == GRID_LINES_PER_AXIS) {
            "a mesh is 9 + 9 line positions, got ${xs.size} + ${ys.size}"
        }
        requirePair(tx, ty, "tilts")
        requirePair(cx, cy, "curvatures")
        require(cx == null || tx != null) { "curvature rides on tilts, never alone" }
    }

    private fun requirePair(
        a: DoubleArray?,
        b: DoubleArray?,
        what: String,
    ) {
        require((a == null) == (b == null)) { "$what come for both axes or neither" }
        require(a == null || (a.size == GRID_LINES_PER_AXIS && b?.size == GRID_LINES_PER_AXIS)) {
            "$what are 9 + 9 values, got ${a?.size} + ${b?.size}"
        }
    }
}

/**
 * The crop box cut at the square's four NEIGHBOUR-LINE intersections instead of the nominal
 * eighth — the lens-agnostic mesh cut. Pads scale with the square's own measured cell, so the
 * composition matches [squareToCropBox]. Parity twin: `squareMeshBox` (`lib/warp.ts`).
 */
fun meshCropBoxExact(
    square: String,
    geom: BoardGeometry,
    mesh: GridMesh,
): DoubleArray {
    val (col, row) = squareToColRow(square, geom.whitePov)
    val bs = geom.boardSize.toDouble()
    val cw = mesh.xs[col + 1] - mesh.xs[col]
    val ch = mesh.ys[row + 1] - mesh.ys[row]
    return doubleArrayOf(
        (mesh.xs[col] - geom.padSide * cw) * bs,
        (mesh.ys[row] - (geom.padSide + geom.padUp) * ch) * bs,
        (mesh.xs[col + 1] + geom.padSide * cw) * bs,
        (mesh.ys[row + 1] + geom.padSide * ch) * bs,
    )
}

/** [meshCropBoxExact] rounded like [squareToCropBox] (unclamped) — what `cropSquare` cuts. */
fun meshCropBox(
    square: String,
    geom: BoardGeometry,
    mesh: GridMesh,
): IntArray {
    val box = meshCropBoxExact(square, geom, mesh)
    return IntArray(box.size) { pyRound(box[it]) }
}

private fun intersect(
    xi: Double,
    ti: Double,
    yj: Double,
    tj: Double,
): DoubleArray {
    val den = 1.0 - ti * tj
    val x = (xi + ti * (yj - HALF * (1.0 + tj))) / den
    val y = yj + tj * (x - HALF)
    return doubleArrayOf(x, y)
}

private fun curvedCorner(
    lx: Double,
    tx: Double,
    cx: Double,
    ly: Double,
    ty: Double,
    cy: Double,
): DoubleArray {
    var x = lx
    var y = ly
    repeat(CORNER_ITERATIONS) {
        val u = x - HALF
        val v = y - HALF
        x = lx + tx * v + cx * v * v
        y = ly + ty * u + cy * u * u
    }
    return doubleArrayOf(x, y)
}

/**
 * The square's padded cell as a QUADRILATERAL `[tl, tr, br, bl]` flat in board px: its four
 * neighbour lines (offset + tilt + optional parabola term), pad-shifted, intersected — curved
 * corners via [CORNER_ITERATIONS] simultaneous evaluations, residual < 0.1 px at the limits.
 * Parity twin: `squareMeshQuad` (`lib/warp.ts`), pinned on the shared fixture.
 */
fun meshCellQuadExact(
    square: String,
    geom: BoardGeometry,
    mesh: GridMesh,
): DoubleArray {
    val tx = requireNotNull(mesh.tx) { "meshCellQuadExact needs tilts" }
    val ty = requireNotNull(mesh.ty)
    val (col, row) = squareToColRow(square, geom.whitePov)
    val bs = geom.boardSize.toDouble()
    val cw = mesh.xs[col + 1] - mesh.xs[col]
    val ch = mesh.ys[row + 1] - mesh.ys[row]
    val lx0 = mesh.xs[col] - geom.padSide * cw
    val lx1 = mesh.xs[col + 1] + geom.padSide * cw
    val ly0 = mesh.ys[row] - (geom.padSide + geom.padUp) * ch
    val ly1 = mesh.ys[row + 1] + geom.padSide * ch
    val cx = mesh.cx
    val cy = mesh.cy
    val corners =
        if (cx != null && cy != null) {
            arrayOf(
                curvedCorner(lx0, tx[col], cx[col], ly0, ty[row], cy[row]),
                curvedCorner(lx1, tx[col + 1], cx[col + 1], ly0, ty[row], cy[row]),
                curvedCorner(lx1, tx[col + 1], cx[col + 1], ly1, ty[row + 1], cy[row + 1]),
                curvedCorner(lx0, tx[col], cx[col], ly1, ty[row + 1], cy[row + 1]),
            )
        } else {
            arrayOf(
                intersect(lx0, tx[col], ly0, ty[row]),
                intersect(lx1, tx[col + 1], ly0, ty[row]),
                intersect(lx1, tx[col + 1], ly1, ty[row + 1]),
                intersect(lx0, tx[col], ly1, ty[row + 1]),
            )
        }
    return DoubleArray(corners.size * 2) { corners[it / 2][it % 2] * bs }
}

/** Pixel centre of the base cell. Port of `calibration.py:377 square_center`. */
fun squareCenter(
    square: String,
    geom: BoardGeometry,
): IntArray {
    val (col, row) = squareToColRow(square, geom.whitePov)
    val cell = geom.cell
    return intArrayOf(((col + HALF) * cell).toInt(), ((row + HALF) * cell).toInt())
}

/**
 * Pixel box `(x0, y0, x1, y1)` of the cell in a `boardSize` rectified image, slightly INSET
 * against grid-line/neighbour noise. Port of `tracker.py:120 square_region` — this is the
 * region the detection evidence is measured over, NOT the crop box.
 *
 * `extendUp` (fraction of a cell) extends the box toward the top of the image; extended cells
 * may overlap, which the soft LL scoring tolerates. Truncation (`int()`), not rounding.
 */
fun squareRegion(
    square: String,
    boardSize: Int,
    whitePov: Boolean,
    inset: Double = SQUARE_REGION_INSET,
    extendUp: Double = 0.0,
): IntArray {
    val (col, row) = squareToColRow(square, whitePov)
    val cell = boardSize / BOARD_SIDE_D
    val m = cell * inset
    val y0 = row * cell + m - extendUp * cell
    return intArrayOf(
        (col * cell + m).toInt(),
        max(0, y0.toInt()),
        ((col + 1) * cell - m).toInt(),
        ((row + 1) * cell - m).toInt(),
    )
}
