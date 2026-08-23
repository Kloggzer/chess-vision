package com.chesslab.geometry

import kotlin.math.abs
import kotlin.math.floor
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

/** Simultaneous evaluations per point — three leaves the residual far inside a pixel. */
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

/** A curvature this far off the cross-line trend was measured on pieces, not optics — twin of
 *  `calibration.CURV_TREND_LIMIT`, where the number is explained. */
const val CURV_TREND_LIMIT: Double = 0.02

private fun median(values: DoubleArray): Double {
    val s = values.sorted()
    return if (s.size % 2 == 1) s[s.size / 2] else 0.5 * (s[s.size / 2 - 1] + s[s.size / 2])
}

private fun trendReplaced(values: DoubleArray): DoubleArray {
    val slopes = ArrayList<Double>()
    for (i in 0 until GRID_LINES_PER_AXIS) {
        for (j in i + 1 until GRID_LINES_PER_AXIS) slopes.add((values[j] - values[i]) / (j - i))
    }
    val m = median(slopes.toDoubleArray())
    val b = median(DoubleArray(GRID_LINES_PER_AXIS) { values[it] - m * it })
    return DoubleArray(GRID_LINES_PER_AXIS) { k ->
        val trend = m * k + b
        if (abs(values[k] - trend) > CURV_TREND_LIMIT) trend else values[k]
    }
}

/**
 * Curvature is optics and optics are smooth across parallel lines — a line breaking out of the
 * others' Theil-Sen trend was measured on whatever stood ON it and takes the trend's value.
 * Twin: `calibration.smooth_mesh_curvature`, pinned by `curvature_trend_parity.json`.
 */
fun smoothMeshCurvature(mesh: GridMesh): GridMesh {
    val cx = mesh.cx ?: return mesh
    val cy = mesh.cy ?: return mesh
    return GridMesh(mesh.xs, mesh.ys, mesh.tx, mesh.ty, trendReplaced(cx), trendReplaced(cy))
}

/** Where line [k] of one axis sits at run [t] along it, in field fractions (`pos(t)`). */
private fun lineAt(
    offs: DoubleArray,
    tilts: DoubleArray,
    curvs: DoubleArray?,
    k: Int,
    t: Double,
): Double {
    val d = t - HALF
    return offs[k] + tilts[k] * d + (curvs?.let { it[k] * d * d } ?: 0.0)
}

/**
 * The point of the MEASURED board belonging to the ideal one at ([u], [v]) — field fractions both
 * ways. The two bounding lines of a cell blend linearly and the axes are coupled, so the pair is
 * solved by [CORNER_ITERATIONS] simultaneous evaluations. A mesh without tilts is carried as tilt
 * 0: its offsets alone are still a correction. Twins: `calibration.mesh_point`, `lib/warp.ts`.
 */
fun meshPoint(
    u: Double,
    v: Double,
    mesh: GridMesh,
): DoubleArray {
    val tx = mesh.tx ?: DoubleArray(GRID_LINES_PER_AXIS)
    val ty = mesh.ty ?: DoubleArray(GRID_LINES_PER_AXIS)
    val cu = floor(u * BOARD_SIDE_D).toInt().coerceIn(0, BOARD_SIDE - 1)
    val cv = floor(v * BOARD_SIDE_D).toInt().coerceIn(0, BOARD_SIDE - 1)
    val fu = u * BOARD_SIDE_D - cu
    val fv = v * BOARD_SIDE_D - cv
    var x = u
    var y = v
    repeat(CORNER_ITERATIONS) {
        x = lineAt(mesh.xs, tx, mesh.cx, cu, y) * (1.0 - fu) + lineAt(mesh.xs, tx, mesh.cx, cu + 1, y) * fu
        y = lineAt(mesh.ys, ty, mesh.cy, cv, x) * (1.0 - fv) + lineAt(mesh.ys, ty, mesh.cy, cv + 1, x) * fv
    }
    return doubleArrayOf(x, y)
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
