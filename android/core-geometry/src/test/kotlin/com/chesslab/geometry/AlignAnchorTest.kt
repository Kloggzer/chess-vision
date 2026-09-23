package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import kotlin.math.hypot

/** The measured `[a8, h8, h1, a1]` of `2026-09-19-16-26-22`, whose h8 the detector reads on 8 of 100 frames. */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class AlignAnchorTest {
    private val geom = BoardGeometry(boardSize = 928)

    private val markers =
        mapOf(
            0 to doubleArrayOf(795.88, 1291.08),
            1 to doubleArrayOf(670.53, 380.80),
            2 to doubleArrayOf(1544.32, 271.46),
            3 to doubleArrayOf(1686.47, 1127.03),
        )

    private val anchor = (0..3).map { markers.getValue(it).copyOf() }

    @Test
    fun `a corner whose marker was never read keeps the anchor instead of being extrapolated`() {
        val quad = requireNotNull(boardCornersFromMarkers(markers - 1, geom, MarkerTracker(), anchor = anchor))
        assertEquals(anchor[1][0], quad[1][0], 0.01, "h8 x")
        assertEquals(anchor[1][1], quad[1][1], 0.01, "h8 y")
    }

    @Test
    fun `without an anchor the fourth corner is guessed 57 px away — the defect this pins`() {
        val quad = requireNotNull(boardCornersFromMarkers(markers - 1, geom, MarkerTracker()))
        val off = hypot(quad[1][0] - anchor[1][0], quad[1][1] - anchor[1][1])
        assertTrue(off > CORNER_JUMP_PX, "the affine guess must be the far one, else the anchor test proves nothing")
    }

    @Test
    fun `the missing marker arriving must not jump the quad past cornerJumpPx`() {
        val tracker = MarkerTracker()
        val warm = requireNotNull(boardCornersFromMarkers(markers - 1, geom, tracker, anchor = anchor))
        val full = requireNotNull(boardCornersFromMarkers(markers, geom, tracker, anchor = warm))
        val worst = (0..3).maxOf { hypot(full[it][0] - warm[it][0], full[it][1] - warm[it][1]) }
        assertTrue(worst <= CORNER_JUMP_PX, "the quad moved %.1f px when h8 arrived".format(worst))
    }

    /** `MarkerTracker` holds a vanished marker's last point, so a drop-out AFTER measurement never moved the quad. */
    @Test
    fun `losing a marker that was already measured does not move the quad`() {
        val tracker = MarkerTracker()
        val four = requireNotNull(boardCornersFromMarkers(markers, geom, tracker, anchor = anchor))
        val three = requireNotNull(boardCornersFromMarkers(markers - 1, geom, tracker, anchor = four))
        for (i in four.indices) {
            assertEquals(four[i][0], three[i][0], 0.01, "corner $i x")
            assertEquals(four[i][1], three[i][1], 0.01, "corner $i y")
        }
    }

    @Test
    fun `a full marker set is untouched by the anchor`() {
        val plain = requireNotNull(boardCornersFromMarkers(markers, geom, MarkerTracker()))
        val anchored = requireNotNull(boardCornersFromMarkers(markers, geom, MarkerTracker(), anchor = FAR))
        for (i in plain.indices) {
            assertEquals(plain[i][0], anchored[i][0], 0.0, "corner $i x")
            assertEquals(plain[i][1], anchored[i][1], 0.0, "corner $i y")
        }
    }

    private companion object {
        /** `TrackerConfig.cornerJumpPx`, the threshold that fired 36 s before the first move. */
        const val CORNER_JUMP_PX = 6.0

        val FAR = List(4) { doubleArrayOf(it * 10.0, it * 10.0) }
    }
}
