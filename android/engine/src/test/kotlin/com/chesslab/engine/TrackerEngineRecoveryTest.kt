package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Phase 05 recovery seams: external commit + reference resync. */
class TrackerEngineRecoveryTest {
    private fun gray() = GrayImage(8, 8, ByteArray(64))

    @Test
    fun `applyRecoveredMoves commits the sequence and anchors on the observed frame`() {
        val engine = TrackerEngine()
        val ok = engine.applyRecoveredMoves(listOf("e2e4", "e7e5"), STARTPOS, gray(), null)
        assertTrue(ok)
        val status = engine.status
        assertEquals(listOf("e4", "e5"), status.history)
        assertTrue(status.fen.startsWith("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w"))
        assertEquals(status.fen, status.refFen)
        // Recovery grants one motion window (the tracker WAS behind).
        assertTrue(status.motionSinceRef)
    }

    @Test
    fun `applyRecoveredMoves rejects a stale fen or illegal sequence`() {
        val engine = TrackerEngine()
        assertFalse(engine.applyRecoveredMoves(listOf("e2e4"), "wrong-fen", gray(), null))
        assertFalse(engine.applyRecoveredMoves(listOf("e2e5"), STARTPOS, gray(), null))
        assertFalse(engine.applyRecoveredMoves(emptyList(), STARTPOS, gray(), null))
        assertEquals(emptyList<String>(), engine.status.history)
    }

    @Test
    fun `resyncReference only acts on a stuck tracker`() {
        val engine = TrackerEngine()
        assertFalse(engine.resyncReference(STARTPOS, gray(), null))
    }
}
