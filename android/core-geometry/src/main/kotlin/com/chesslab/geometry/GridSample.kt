package com.chesslab.geometry

import org.opencv.core.Mat

/**
 * One groove observation: a point that lies on a physical line of the board, in RAW frame pixels.
 *
 * This is what a straightness fit needs and what [gridLines] throws away. `fitAxis` forces a
 * straight line through the samples of each grid line — with a pooled slope and Huber reweighting —
 * so on a barrel-distorted frame the arc those samples actually lie on is absorbed as noise. That
 * arc IS the lens, and it is the only part of the picture no homography can represent.
 *
 * [axis] 0 is the family of lines that pin an x, 1 those that pin a y; [line] is 0..8 across the
 * board. Points sharing an (axis, line) are collinear in the world by construction — the board is
 * flat and the grooves are straight — so any bow between them is optics.
 */
class GridSample(
    val axis: Int,
    val line: Int,
    val x: Double,
    val y: Double,
)

/**
 * Every groove the board shows in [frame], in raw frame coordinates.
 *
 * The rectified warp is the SEARCH TOOL, not the measurement: `profileLines` needs a view where a
 * groove is a straight run of dark pixels at a predictable place, and that view is the warp. Where
 * the groove sits in the raw image is then a matter of inverting the same homography the warp was
 * built from — the round trip `applyFit` already performs on quad corners (`QuadRefine.kt`).
 *
 * Nothing here is assumed: a line the profile cannot find contributes no samples rather than a
 * guessed position, which is why this works on a board with pieces standing on it.
 *
 * [bands] samples per line. The band collapse takes a median across the band's width, so a curved
 * groove is smeared toward the band's mean — more bands means less smear per sample and more
 * samples per line, at more noise in each.
 */
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

/**
 * `T(pad, pad) · H` — the frame-to-PADDED-warp homography.
 *
 * The same translation `warpFromCornersPadded` folds into its matrix, so a point mapped through
 * this and a pixel the warp produced are the same point. Kept beside [gridSamples] rather than
 * inside `Warp.kt` because the warps release their matrices; a caller that needs to invert one
 * needs it back.
 */
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
