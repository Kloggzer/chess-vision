package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Drift is what tells `LiveAlign` that the pose its grid correction was fitted at is gone.
 *
 * Every assertion below is in CELLS. A raw pixel figure would be meaningless — four pixels is 4 %
 * of a square at `boardSize` 800 and 2 % at 1600 — and the whole point of the unit is that the
 * threshold transfers between the phone, the rig and the recorded clips.
 */
class QuadDriftTest {
    private val geom = BoardGeometry(boardSize = 800, margin = margins4(0.0))
    private val quad = floatArrayOf(0f, 0f, 800f, 0f, 800f, 800f, 0f, 800f)

    /** One cell at `boardSize` 800 is 100 px — the arithmetic every other case leans on. */
    @Test
    fun oneCellIsAnEighthOfTheBoard() {
        assertEquals(100.0, geom.cell, 1e-9)
    }

    @Test
    fun anUnmovedQuadHasNotDrifted() {
        assertEquals(0.0, quadDriftCells(quad, quad.copyOf(), geom), 1e-9)
    }

    /** A pure translation reads its own magnitude: every corner moved the same distance. */
    @Test
    fun aTranslationReadsItsOwnMagnitude() {
        val moved = FloatArray(8) { i -> quad[i] + if (i % 2 == 0) 50f else 0f }
        assertEquals(0.5, quadDriftCells(quad, moved, geom), 1e-6)
    }

    /**
     * A quarter cell is the threshold `LiveAlign` acts on, so it is worth pinning from both sides:
     * 20 px of an 100 px cell must not fire, 30 px must.
     */
    @Test
    fun theThresholdHasTeethOnBothSides() {
        val small = FloatArray(8) { i -> quad[i] + if (i % 2 == 0) 20f else 0f }
        val large = FloatArray(8) { i -> quad[i] + if (i % 2 == 0) 30f else 0f }
        assertTrue(quadDriftCells(quad, small, geom) <= 0.25)
        assertTrue(quadDriftCells(quad, large, geom) > 0.25)
    }

    /**
     * A rotation about the centre moves no corner's distance from the centre and every corner's
     * position — a translation-only metric would report zero, which is the blind spot that made the
     * old alignment metric worthless (`CLAUDE.md`: 0.01 px reported for a 3.05 px shear).
     */
    @Test
    fun aRotationAboutTheCentreIsNotInvisible() {
        val c = 400.0
        val rad = Math.toRadians(2.0)
        val turned =
            FloatArray(8) { i ->
                val x = quad[(i / 2) * 2] - c
                val y = quad[(i / 2) * 2 + 1] - c
                val nx = x * Math.cos(rad) - y * Math.sin(rad) + c
                val ny = x * Math.sin(rad) + y * Math.cos(rad) + c
                (if (i % 2 == 0) nx else ny).toFloat()
            }
        assertTrue(quadDriftCells(quad, turned, geom) > 0.1, "a 2 degree turn must be visible")
    }

    /** Malformed input cannot be acted on; a spurious large number would discard a good correction. */
    @Test
    fun malformedInputReadsZero() {
        assertEquals(0.0, quadDriftCells(floatArrayOf(1f, 2f), quad, geom), 1e-9)
        assertEquals(0.0, quadDriftCells(quad, FloatArray(0), geom), 1e-9)
    }
}
