package com.chesslab.geometry

import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

// Ports of `calibration.py square_to_crop_box` and `crop_border_px`; the detection region lives in `:core-engine`.
// OpenCV-free ON PURPOSE (see Corners.kt).

const val CROP_WARP_BORDER_CELLS: Double = 0.1

/** Python's `round()`: half-to-EVEN, i.e. `Math.rint` — NOT `Math.round` (half-up) nor `roundToInt`. */
internal fun pyRound(v: Double): Int = Math.rint(v).toInt()

/** Expanded symmetrically by `padSide * cell`, so the box stays square. `clamp = false` returns the raw box;
 *  `cropSquare` pads the overhang black, keeping the geometry constant across all 64 squares. */
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
    val y0 = row * cell - geom.padSide * cell
    val y1 = (row + 1) * cell + geom.padSide * cell

    fun fix(v: Double): Int = pyRound(if (clamp) max(0.0, min(bs, v)) else v)

    return intArrayOf(fix(x0), fix(y0), fix(x1), fix(y1))
}

/** Der Kasten folgt aus `outW` und `pad_side`, nicht aus dem Kalibrierprofil (`docs/data-pipeline.md` 3.1). */
fun BoardGeometry.forNativeCrops(): BoardGeometry = copy(boardSize = BOARD_SIDE * nativeCell())

/** GESUCHT, nicht gerechnet: [squareToCropBox] rundet die ENDPUNKTE einzeln — bei `outW` 80 gibt die Formel 73
 *  und einen 81er Kasten, richtig ist 72. Trifft keine Zelle exakt, gewinnt die naechstkleinere. */
private fun BoardGeometry.nativeCell(): Int {
    val guess = (outW / (1.0 + 2.0 * padSide)).toInt()
    val candidates = (max(1, guess - 3)..guess + 3).toList()
    return candidates.minByOrNull { cell ->
        val width = cell + 2 * pyRound(padSide * cell)
        abs(width - outW) * 2 + if (width > outW) 1 else 0
    } ?: guess
}

/** Edge squares need real content for their `padSide` extension. At the defaults the 0.1 floor decides: 20 px. */
fun cropBorderPx(geom: BoardGeometry): Int = pyRound(max(CROP_WARP_BORDER_CELLS, geom.padSide) * geom.cell)

const val GRID_LINES_PER_AXIS: Int = 9

/** A steeper line is a misfit, not a lens — shared with realgames/mesh.py. */
const val MESH_TILT_LIMIT: Double = 0.05

/** realgames/mesh.py `MESH_CURV_LIMIT` explains the number. */
const val MESH_CURV_LIMIT: Double = 0.08

/** Three leaves the residual far inside a pixel. */
const val CORNER_ITERATIONS: Int = 3

/** Fractions of the field side, white POV. Tilt and curvature pairs come complete or not at all, and
 *  curvature only on top of tilts, so a consumer can never cut half a stage. */
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

/** Twin of `calibration.CURV_TREND_LIMIT`, where the number is explained. */
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

/** Optics are smooth across parallel lines: a line breaking out of the Theil-Sen trend was measured on what
 *  stood ON it and takes the trend's value. Pinned by `curvature_trend_parity.json`. */
fun smoothMeshCurvature(mesh: GridMesh): GridMesh {
    val cx = mesh.cx ?: return mesh
    val cy = mesh.cy ?: return mesh
    return GridMesh(mesh.xs, mesh.ys, mesh.tx, mesh.ty, trendReplaced(cx), trendReplaced(cy))
}

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

/** The two bounding lines of a cell blend linearly and the axes are coupled, so the pair is solved by
 *  [CORNER_ITERATIONS] evaluations. Twin: `calibration.mesh_point`. */
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
