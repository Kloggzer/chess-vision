package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import kotlin.math.abs

/** Wo eine SCHAETZUNG als MESSUNG weitergereicht werden koennte — die Nachbarn des affinen 57-px-Falls. */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class CornerProvenanceTest {
    /** Zwei Marker rekonstruieren unter QUADRAT-Annahme; wer drei fordert, darf diese Annahme nicht bekommen. */
    @Test
    fun `too few markers yield nothing, not a square assumption`() {
        val tracker = MarkerTracker()
        tracker.update(mapOf(0 to doubleArrayOf(100.0, 100.0), 1 to doubleArrayOf(500.0, 110.0)))

        assertNull(boardCornersFromMarkers(emptyMap(), GEOM, tracker, minMarkers = 3))
        assertNotNull(boardCornersFromMarkers(emptyMap(), GEOM, tracker, minMarkers = 2))
    }

    /** Bei zwei nie gesehenen Ecken waere die Ergaenzung aus einer anderen Schaetzung gebaut — beide bleiben stehen. */
    @Test
    fun `two seeded corners are left alone instead of extrapolated`() {
        val tracker = MarkerTracker()
        tracker.seed(SEED)
        tracker.update(mapOf(1 to doubleArrayOf(505.0, 118.0), 3 to doubleArrayOf(108.0, 495.0)))

        val got = requireNotNull(boardCornersFromMarkers(emptyMap(), GEOM, tracker, minMarkers = 2))
        val want = requireNotNull(resolveBoardCorners(tracker.points(), GEOM.boardSize)).first
        for (i in 0 until CORNER_COUNT) assertArrayEquals(want[i], got[i], EXACT, "Ecke $i")
    }

    /** Vergleicht der Ein-Eintrag-Cache die Ecken nicht, liefert er die Geometrie des vorigen Bildes aus. */
    @Test
    fun `the homography cache refuses a hit for moved corners`() {
        val cache = HomographyCache()
        val first = matrix(QUAD, cache)
        val second = matrix(QUAD.map { doubleArrayOf(it[0] + 7.0, it[1]) }, cache)

        assertFalse(first.indices.all { abs(first[it] - second[it]) < EXACT }, "bewegte Ecken, gleiche Matrix")
        assertArrayEquals(first, matrix(QUAD, cache), EXACT, "dieselben Ecken duerfen treffen")
    }

    private fun matrix(
        quad: List<DoubleArray>,
        cache: HomographyCache,
    ): DoubleArray {
        val h = computeHomography(quad, GEOM.boardSize, GEOM.margin, cache)
        val out = DoubleArray(H_ELEMENTS)
        h.get(0, 0, out)
        h.release()
        return out
    }

    private companion object {
        const val EXACT = 1e-9
        val GEOM = BoardGeometry(boardSize = 800, margin = margins4(0.0))
        val QUAD: List<DoubleArray> =
            listOf(
                doubleArrayOf(100.0, 100.0),
                doubleArrayOf(500.0, 110.0),
                doubleArrayOf(505.0, 500.0),
                doubleArrayOf(105.0, 495.0),
            )
        val SEED: Map<Int, DoubleArray> = (0 until CORNER_COUNT).associateWith { QUAD[it] }
    }
}
