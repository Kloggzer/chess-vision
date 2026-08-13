package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class TrainingVideoPackTest {
    @Test
    fun `accepts a unique known position and may skip unseen plateaus`() {
        val gate = VideoPositionGate()

        assertEquals(VideoPositionMatch(0, 0, "clean"), gate.accept(listOf(0, 2, 4, 6)))
        assertEquals(VideoPositionMatch(2, 0, "clean"), gate.accept(listOf(4, 2, 0, 2)))
    }

    @Test
    fun `rejects takebacks after a later position was observed`() {
        val gate = VideoPositionGate()
        gate.accept(listOf(3, 0, 2))
        gate.accept(listOf(4, 2, 0))

        assertEquals(VideoPositionMatch(null, 0, "takeback"), gate.accept(listOf(4, 0, 2)))
    }

    @Test
    fun `rejects unknown and occupancy ambiguous positions`() {
        val gate = VideoPositionGate()

        assertEquals(VideoPositionMatch(null, 2, "not_in_game"), gate.accept(listOf(2, 3, 4)))
        assertEquals(VideoPositionMatch(null, 0, "ambiguous_position"), gate.accept(listOf(0, 0, 3)))
    }
}
