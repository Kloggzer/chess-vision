package com.chesslab.engine.board

import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * [REFERENCE] was read off the `CnnSnapshot` path BEFORE the map overload existed — a value taken
 * afterwards would only restate whatever the new code does.
 */
class ReadingFenTest {
    @Test
    fun aPartialMapFillsTheRestWithEmptySquares() {
        assertEquals("8/8/8/8/8/7Q/8/8 w - - 0 1", fenOf(mapOf("h3" to "wQ")))
    }

    @Test
    fun anEmptyMapIsAnEmptyBoard() {
        assertEquals("8/8/8/8/8/8/8/8 w - - 0 1", fenOf(emptyMap()))
    }

    @Test
    fun theSnapshotPathReadsWhatItReadBefore() {
        assertEquals(REFERENCE, fenOf(probeSnapshot()))
    }

    @Test
    fun theSameBoardAsAMapReadsTheSame() {
        assertEquals(REFERENCE, fenOf(PROBE_BOARD))
    }
}

private const val REFERENCE = "4k1n1/8/8/4p3/3P4/8/8/R3K3 w - - 0 1"

private val PROBE_BOARD =
    mapOf("a1" to "wR", "e1" to "wK", "d4" to "wP", "e5" to "bP", "g8" to "bN", "e8" to "bK")

/** One class per label, all mass on the square's own — the reading is then the map, unrounded. */
private class ProbeObs(
    private val labels: Map<String, String>,
) : CnnObservation {
    override val classNames: List<String> =
        listOf("empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK")

    override fun classProbs(square: String): DoubleArray {
        val hit = classNames.indexOf(labels[square] ?: "empty")
        return DoubleArray(classNames.size) { if (it == hit) 1.0 else 0.0 }
    }

    override fun occupied(square: String): Boolean = labels.containsKey(square)

    override fun confident(
        square: String,
        thr: Double,
    ): Boolean = true

    override fun labelConfident(
        square: String,
        thr: Double,
    ): Boolean = true

    override fun label(square: String): String? = labels[square]

    override fun conf(square: String): Double = 1.0

    override fun pOccluded(square: String): Double = 0.0

    override fun occupancyOnly(): CnnObservation = this
}

private fun probeSnapshot(): CnnSnapshot = CnnSnapshot(ProbeObs(PROBE_BOARD), 1L, 0L, 0.0, null, null, null)
