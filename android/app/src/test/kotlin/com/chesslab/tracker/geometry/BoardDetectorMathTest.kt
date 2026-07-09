package com.chesslab.tracker.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class BoardDetectorMathTest {
    @Test
    fun `grid progression recovers base and spacing of a clean 9-term grid`() {
        val base = 100.0
        val spacing = 40.0
        val positions = (0..8).map { base + it * spacing }
        val prog = BoardDetector.gridProgression(positions)
        assertNotNull(prog)
        assertEquals(base, prog!![0], 1e-6)
        assertEquals(spacing, prog[1], 1e-6)
    }

    @Test
    fun `grid progression tolerates missing inner lines and noise`() {
        val base = 50.0
        val spacing = 30.0
        // Drop slots 3 and 5, jitter the rest slightly.
        val kept = listOf(0, 1, 2, 4, 6, 7, 8)
        val jitter = doubleArrayOf(0.0, 1.0, -1.0, 0.5, -0.5, 1.2, -0.8)
        val positions = kept.mapIndexed { idx, slot -> base + slot * spacing + jitter[idx] }
        val prog = BoardDetector.gridProgression(positions)
        assertNotNull(prog)
        assertEquals(spacing, prog!![1], spacing * 0.15)
    }

    @Test
    fun `grid progression rejects too few lines`() {
        assertNull(BoardDetector.gridProgression(listOf(0.0, 40.0, 80.0)))
    }

    @Test
    fun `grid progression rejects unstructured positions`() {
        // No consistent spacing / no distinct arithmetic slots.
        assertNull(BoardDetector.gridProgression(listOf(1.0, 2.0, 3.0, 4.0, 5.0, 6.0)))
    }
}
