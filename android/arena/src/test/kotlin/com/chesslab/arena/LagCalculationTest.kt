package com.chesslab.arena

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Lag is the frame offset between when the truth saw a move and when the run committed it.
 * It's only meaningful when the truth has frame information (frame >= 0); PGN references
 * have frame = -1 and are filtered out (see line 110 of Score.kt).
 */
class LagCalculationTest {
    @Test
    fun `lag filters out truth plies without frame information`() {
        val truth =
            listOf(
                TruthPly("e4", frame = 0), // has frame
                TruthPly("e5", frame = -1), // PGN, no frame
                TruthPly("Nf3", frame = 100), // has frame
            )
        val run =
            listOf(
                RunPly("e4", 10, 0.0),
                RunPly("e5", 110, 0.0),
                RunPly("Nf3", 150, 0.0),
            )
        val scored = score(truth, run)
        // Only two lags: 10-0=10 and 150-100=50. The e5 with frame=-1 is filtered out.
        assertEquals(listOf(10L, 50L), scored.lag)
    }

    @Test
    fun `lag is run frame minus truth frame`() {
        val truth =
            listOf(
                TruthPly("e4", frame = 50),
                TruthPly("e5", frame = 100),
            )
        val run =
            listOf(
                RunPly("e4", 60, 0.0),
                RunPly("e5", 110, 0.0),
            )
        val scored = score(truth, run)
        assertEquals(listOf(10L, 10L), scored.lag)
    }

    @Test
    fun `lag can be negative when run commits before truth frame`() {
        val truth =
            listOf(
                TruthPly("e4", frame = 100),
            )
        val run =
            listOf(
                RunPly("e4", 50, 0.0),
            )
        val scored = score(truth, run)
        assertEquals(listOf(-50L), scored.lag)
    }

    @Test
    fun `medianLag of empty lag list is null`() {
        val truth = listOf(TruthPly("e4", frame = -1)) // no frame info
        val run = listOf(RunPly("e4", 10, 0.0))
        val scored = score(truth, run)
        assertTrue(scored.lag.isEmpty())
        assertEquals(null, scored.medianLag)
    }

    @Test
    fun `medianLag is the middle value`() {
        val truth =
            listOf(
                TruthPly("e4", frame = 0),
                TruthPly("e5", frame = 100),
                TruthPly("Nf3", frame = 200),
            )
        val run =
            listOf(
                RunPly("e4", 10, 0.0),
                RunPly("e5", 90, 0.0), // lag = -10
                RunPly("Nf3", 220, 0.0), // lag = 20
            )
        val scored = score(truth, run)
        // lags = [10, -10, 20]
        // sorted = [-10, 10, 20]
        // median at index 1 = 10
        assertEquals(10L, scored.medianLag)
    }
}
