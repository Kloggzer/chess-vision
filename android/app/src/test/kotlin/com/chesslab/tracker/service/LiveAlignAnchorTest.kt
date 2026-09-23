package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.OpenCvGate
import com.chesslab.tracker.camera.DeliveredSize
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import kotlin.math.hypot

/**
 * The calibrated quad reaches the resolve. `2026-09-19-16-26-22` starts with h8 unread for 42 align
 * ticks, so the live path emitted an affine guess and `cornersJumped` fired 36 s before ply 1.
 */
@EnabledIf(OpenCvGate.REF)
class LiveAlignAnchorTest {
    @Test
    fun `an unread corner stays on the calibration and does not jump when its marker arrives`() {
        val applied = mutableListOf<FloatArray>()
        val align =
            LiveAlign(
                CoroutineScope(Dispatchers.Unconfined),
                { BoardGeometry(boardSize = BOARD_PX) },
                { TrackerConfig().copy(alignEvery = 1) },
                { applied += it },
                dispatcher = Dispatchers.Unconfined,
                cachedMarkers = { frame -> if (frame == 1L) MARKERS - 1 else MARKERS },
                calibrated = CALIBRATED,
            )
        val size = DeliveredSize(FRAME_PX, FRAME_PX, 0)
        val blank = BlankFrames(FRAME_PX)
        align.maybeAlign(blank, size)
        align.maybeAlign(blank, size)
        assertEquals(2, applied.size, "both aligns must have applied, else this proves nothing")
        assertEquals(CALIBRATED[2], applied[0][2], 0.01f, "h8 x must still be the calibrated one")
        assertEquals(CALIBRATED[3], applied[0][3], 0.01f, "h8 y must still be the calibrated one")
        val worst =
            (0..3).maxOf {
                val dx = (applied[1][it * 2] - applied[0][it * 2]).toDouble()
                val dy = (applied[1][it * 2 + 1] - applied[0][it * 2 + 1]).toDouble()
                hypot(dx, dy)
            }
        assertTrue(worst <= CORNER_JUMP_PX, "the quad moved %.1f px when h8 arrived".format(worst))
    }

    private companion object {
        const val FRAME_PX = 1920
        const val BOARD_PX = 928
        const val CORNER_JUMP_PX = 6.0

        /** `[a8, h8, h1, a1]` as `2026-09-19-16-26-22` measured them. */
        val MARKERS =
            mapOf(
                0 to doubleArrayOf(795.88, 1291.08),
                1 to doubleArrayOf(670.53, 380.80),
                2 to doubleArrayOf(1544.32, 271.46),
                3 to doubleArrayOf(1686.47, 1127.03),
            )

        val CALIBRATED = floatArrayOf(795.88f, 1291.08f, 670.53f, 380.80f, 1544.32f, 271.46f, 1686.47f, 1127.03f)
    }
}
