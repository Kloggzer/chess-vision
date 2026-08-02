package com.chesslab.tracker.sim

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.margins4
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.io.File

/**
 * A clip carries the fraction by which its corners lie OUTSIDE the playing field.
 *
 * `ClipPipeline` built `BoardGeometry(boardSize = clip.boardSize)` and left `margin` at its
 * `margins4(0.0)` default, which `warpFromCorners` then used to compute the homography. Correct
 * for the committed Blender renders — their corners ARE the field corners — and wrong for anything
 * detected from ArUco, whose markers are printed in the label border. The Python side measured
 * what that costs and fixed it in `721901a`: at 0.0 the board comes out 6-8 % too large, the grid
 * lines miss the coverage band and the tracker sits in `occluded` forever, 2232 of 2996 frames
 * with zero commits.
 *
 * Above all this pins that the margin still DEFAULTS to zero. Every committed parity fixture must
 * stay byte-identical, and that is the acceptance criterion of the change rather than an
 * aspiration — a Blender `labels.json` has no `margin` key, so the default is what it keeps
 * reading.
 */
class SimClipMarginTest {
    private fun clip(geometry: BoardGeometry) = SimClip("t", VIDEO, CORNERS, geometry, 30.0, TrackerConfig(), TRUTH)

    @Test
    fun `a geometry that does not say defaults to zero, so every Blender fixture is unchanged`() {
        assertEquals(margins4(0.0), clip(BoardGeometry(boardSize = 640)).margin())
    }

    @Test
    fun `a clip detected from ArUco carries its profile's margin`() {
        val geom = BoardGeometry(boardSize = 640, margin = margins4(0.06))
        assertEquals(margins4(0.06), clip(geom).margin())
        assertEquals(640, clip(geom).geometry.boardSize)
    }

    @Test
    fun `the margin is per corner, because the markers are glued on by hand`() {
        val uneven = listOf(0.05, 0.06, 0.055, 0.048)
        assertEquals(uneven, clip(BoardGeometry(boardSize = 640, margin = uneven)).margin())
        // `computeHomography` requires exactly four; a clip that carried fewer would throw deep
        // inside the warp instead of here.
        assertEquals(4, clip(BoardGeometry(boardSize = 640)).margin().size)
    }

    private fun SimClip.margin(): List<Double> = geometry.margin

    private companion object {
        val VIDEO = File("nonexistent.mp4")
        val TRUTH =
            SimTruth(
                sans = emptyList(),
                startFen = "",
                promotionPiece = 'q',
                fenPerFrame = emptyList(),
            )
        val CORNERS =
            listOf(
                doubleArrayOf(100.0, 100.0),
                doubleArrayOf(700.0, 100.0),
                doubleArrayOf(700.0, 700.0),
                doubleArrayOf(100.0, 700.0),
            )
    }
}
