package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** The rows go missing two ways: dropped on the way, or prior-weighted and then counted twice by a legality search. */
class ObservationProbsTest {
    private val classes = listOf("empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")

    private fun rows(): Map<String, DoubleArray> =
        ALL_SQUARES.associateWith { square ->
            DoubleArray(classes.size).also {
                it[0] = if (square == "e4") 0.1 else 0.9
                it[1] = if (square == "e4") 0.9 else 0.1
            }
        }

    @Test
    fun `the whole distribution survives the seam`() {
        val obs = observationFromProbs(rows(), classes)
        assertEquals(classes, obs.classNames)
        assertArrayEquals(doubleArrayOf(0.1, 0.9) + DoubleArray(11), obs.classProbs("e4"), 1e-9)
    }

    @Test
    fun `the rows stay raw under a prior`() {
        val possible = ALL_SQUARES.associateWith { setOf("empty") }
        val conditioned = observationFromProbs(rows(), classes, possible, priorLambda = 1.0)
        assertArrayEquals(doubleArrayOf(0.1, 0.9) + DoubleArray(11), conditioned.classProbs("e4"), 1e-9)
        assertArrayEquals(conditioned.classProbs("e4"), conditioned.rawObservation().classProbs("e4"), 1e-9)
    }

    @Test
    fun `occupancyOnly keeps no rows`() {
        val stripped = observationFromProbs(rows(), classes).occupancyOnly()
        assertTrue(stripped.classProbs("e4").isEmpty())
        assertTrue(stripped.classNames.isEmpty())
    }

    @Test
    fun `the default is empty, not invented`() {
        val bare =
            object : com.chesslab.engine.api.CnnObservation {
                override fun occupied(square: String) = false

                override fun confident(
                    square: String,
                    thr: Double,
                ) = false

                override fun labelConfident(
                    square: String,
                    thr: Double,
                ) = false

                override fun label(square: String): String? = null

                override fun conf(square: String) = 0.0

                override fun pOccluded(square: String) = 0.0

                override fun occupancyOnly() = this
            }
        assertTrue(bare.classProbs("e4").isEmpty())
    }
}
