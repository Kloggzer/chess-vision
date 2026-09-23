package com.chesslab.tracker.sim

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.margins4
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.io.File

/** ArUco quads at margin 0.0 oversize the board 6-8 % (2232 of 2996 frames without a commit, fixed
 *  in Python `721901a`); the DEFAULT must stay 0.0 so every Blender parity fixture stays byte-identical. */
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
