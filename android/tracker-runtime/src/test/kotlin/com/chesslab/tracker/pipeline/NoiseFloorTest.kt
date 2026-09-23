package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.board.BOARD_PX
import com.chesslab.engine.board.GRID
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class NoiseFloorTest {
    private val still = FloatArray(CORNERS)

    @Test
    fun `a pair under the same corners reports the upper quartile of the cell deltas`() {
        val floor = NoiseFloor()
        floor.observe(1, still) { board(0) }
        assertEquals(NOISE_UNMEASURED, floor.busy)
        floor.observe(2, still) { board(RAISED) }
        // 20 of 64 cells moved, so the median is 0 and the quartile sits on the raised set.
        assertEquals(DELTA.toDouble(), floor.busy, EPS)
    }

    @Test
    fun `at most one pair per interval`() {
        val floor = NoiseFloor(everyFrames = INTERVAL)
        var pulls = 0
        for (seq in 1L..2 * INTERVAL) {
            floor.observe(seq, still) {
                pulls += 1
                board(0)
            }
        }
        assertEquals(4, pulls)
    }

    @Test
    fun `a re-alignment between the two frames is dropped, not measured`() {
        val floor = NoiseFloor()
        floor.observe(1, still) { board(0) }
        floor.observe(2, FloatArray(CORNERS) { 1f }) { board(RAISED) }
        assertEquals(NOISE_UNMEASURED, floor.busy)
        floor.observe(3, FloatArray(CORNERS) { 1f }) { board(RAISED) }
        assertEquals(0.0, floor.busy, EPS)
    }

    @Test
    fun `a disarm drops the armed frame`() {
        val floor = NoiseFloor()
        floor.observe(1, still) { board(0) }
        floor.disarm()
        floor.observe(2, still) { board(RAISED) }
        assertEquals(NOISE_UNMEASURED, floor.busy)
    }

    /** Corners that never match re-armed without advancing `due`, so `LiveAlign` made it measure EVERY frame. */
    @Test
    fun `corners that never match do not turn the interval off`() {
        val floor = NoiseFloor(everyFrames = INTERVAL)
        var pulls = 0
        for (seq in 1L..2 * INTERVAL) {
            floor.observe(seq, FloatArray(CORNERS) { seq.toFloat() }) {
                pulls += 1
                board(0)
            }
        }
        assertTrue(pulls <= 10, "zwei Intervalle duerfen hoechstens 10 Bretter kosten, gerechnet wurden $pulls")
    }

    private fun board(raisedCells: Int): BgrImage {
        val data = ByteArray(BOARD_PX * BOARD_PX * CHANNELS)
        val cell = BOARD_PX / GRID
        for (y in 0 until BOARD_PX) {
            for (x in 0 until BOARD_PX) {
                val value = (BASE + if ((y / cell) * GRID + x / cell < raisedCells) DELTA else 0).toByte()
                val i = (y * BOARD_PX + x) * CHANNELS
                data[i] = value
                data[i + 1] = value
                data[i + 2] = value
            }
        }
        return BgrImage(BOARD_PX, BOARD_PX, data)
    }

    private companion object {
        const val CORNERS = 8
        const val CHANNELS = 3
        const val BASE = 100
        const val DELTA = 10
        const val RAISED = 20
        const val INTERVAL = 15L
        const val EPS = 1e-9
    }
}
