package com.chesslab.geometry

import org.opencv.core.Mat

/** A point on a physical board line, in RAW pixels. `fitAxis` forces straight lines and absorbs the arc as
 *  noise — that arc IS the lens. Points sharing (axis, line) are collinear in the world, so any bow is optics. */
class GridSample(
    val axis: Int,
    val line: Int,
    val x: Double,
    val y: Double,
)

/** The warp is the SEARCH TOOL, not the measurement: samples go back through the same homography. A line the
 *  profile cannot find contributes nothing. More [bands] means less smear per sample, more noise in each. */
fun gridSamples(
    frame: Mat,
    geom: BoardGeometry,
    quad: List<DoubleArray>,
    bands: Int = ALIGN_BANDS,
    searchFrac: Double = SEARCH_FRAC,
): List<GridSample> {
    val (warped, pad) = warpForGrid(frame, geom, quad)
    try {
        val inverse = invert3(paddedHomography(quad, geom, pad)) ?: return emptyList()
        val gray = BoardGray(warped)
        val params = ProfileParams(geom.boardSize, searchFrac, outer = true)
        val bh = geom.boardSize.toDouble() / bands
        return (0..1).flatMap { axis ->
            axisSamples(gray, axis, bands, bh, pad, params).mapNotNull { (k, lever, position) ->
                // Axis 0 pins an x, so the sample sits at (position, lever); axis 1 the other way.
                val inWarp = if (axis == 0) doubleArrayOf(position, lever) else doubleArrayOf(lever, position)
                project3(inverse, inWarp)?.let { GridSample(axis, k.toInt(), it[0], it[1]) }
            }
        }
    } finally {
        warped.release()
    }
}

/** The translation `warpFromCornersPadded` folds in. Kept here, not in `Warp.kt`: the warps release their
 *  matrices, and a caller that inverts one needs it back. */
internal fun paddedHomography(
    quad: List<DoubleArray>,
    geom: BoardGeometry,
    pad: Int,
): DoubleArray {
    val shift = doubleArrayOf(1.0, 0.0, pad.toDouble(), 0.0, 1.0, pad.toDouble(), 0.0, 0.0, 1.0)
    return mul3(shift, homographyOf(quad, geom))
}

private operator fun DoubleArray.component1(): Double = this[0]

private operator fun DoubleArray.component2(): Double = this[1]

private operator fun DoubleArray.component3(): Double = this[2]
