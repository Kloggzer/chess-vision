package com.chesslab.cnn

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The rows an engine needs to score by likelihood, and the two ways they can go missing: dropped
 * on the way through, or silently weighted by a prior that the engine's own legality search will
 * apply a second time.
 */
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

    /** A prior weights by legality; a legality search would count it twice. */
    @Test
    fun `the rows stay raw under a prior`() {
        val possible = ALL_SQUARES.associateWith { setOf("empty") }
        val conditioned = observationFromProbs(rows(), classes, possible, priorLambda = 1.0)
        assertArrayEquals(doubleArrayOf(0.1, 0.9) + DoubleArray(11), conditioned.classProbs("e4"), 1e-9)
        assertArrayEquals(conditioned.classProbs("e4"), conditioned.rawObservation().classProbs("e4"), 1e-9)
    }

    /** Identity stripped means the distribution goes too, or the claim is false. */
    @Test
    fun `occupancyOnly keeps no rows`() {
        val stripped = observationFromProbs(rows(), classes).occupancyOnly()
        assertTrue(stripped.classProbs("e4").isEmpty())
        assertTrue(stripped.classNames.isEmpty())
    }

    /** An implementation that keeps none must say so rather than pretend a uniform guess. */
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
