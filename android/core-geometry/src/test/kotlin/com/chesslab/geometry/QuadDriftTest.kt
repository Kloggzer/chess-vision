package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Everything is in CELLS, so the threshold transfers between phone, rig and clips. */
class QuadDriftTest {
    private val geom = BoardGeometry(boardSize = 800, margin = margins4(0.0))
    private val quad = floatArrayOf(0f, 0f, 800f, 0f, 800f, 800f, 0f, 800f)

    @Test
    fun oneCellIsAnEighthOfTheBoard() {
        assertEquals(100.0, geom.cell, 1e-9)
    }

    @Test
    fun anUnmovedQuadHasNotDrifted() {
        assertEquals(0.0, quadDriftCells(quad, quad.copyOf(), geom), 1e-9)
    }

    @Test
    fun aTranslationReadsItsOwnMagnitude() {
        val moved = FloatArray(8) { i -> quad[i] + if (i % 2 == 0) 50f else 0f }
        assertEquals(0.5, quadDriftCells(quad, moved, geom), 1e-6)
    }

    @Test
    fun theThresholdHasTeethOnBothSides() {
        val small = FloatArray(8) { i -> quad[i] + if (i % 2 == 0) 20f else 0f }
        val large = FloatArray(8) { i -> quad[i] + if (i % 2 == 0) 30f else 0f }
        assertTrue(quadDriftCells(quad, small, geom) <= 0.25)
        assertTrue(quadDriftCells(quad, large, geom) > 0.25)
    }

    /** A translation-only metric reads zero here — it reported 0.01 px for a 3.05 px shear. */
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

    @Test
    fun malformedInputReadsZero() {
        assertEquals(0.0, quadDriftCells(floatArrayOf(1f, 2f), quad, geom), 1e-9)
        assertEquals(0.0, quadDriftCells(quad, FloatArray(0), geom), 1e-9)
    }
}
