package com.chesslab.tracker.record

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private const val START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

private const val THREE_BISHOPS = "rnbqkbnr/pppppppp/8/8/8/5B2/PPPPPPPP/RNBQKB1R w KQkq - 0 1"

class RecordingGatesTest {
    @Test
    fun startPositionHasNoViolations() {
        assertTrue(physicalInventoryViolations(START).isEmpty())
    }

    @Test
    fun recorderSkipsInventoryViolation() {
        assertEquals(listOf("wB 3/2"), physicalInventoryViolations(THREE_BISHOPS))
        val gates = RecordingGates()
        assertTrue(gates.inventorySkips(THREE_BISHOPS))
        assertEquals(1, gates.skipped)
        assertTrue(gates.reason.orEmpty().contains("wB 3/2"), gates.reason)
    }

    @Test
    fun inventoryFilterOffDisablesTheGate() {
        val gates = RecordingGates(inventoryFilter = false)
        assertFalse(gates.inventorySkips(THREE_BISHOPS))
        assertEquals(0, gates.skipped)
        assertNull(gates.reason)
    }

    @Test
    fun aSecondQueenIsAViolationButATrackedPromotionIsNot() {
        assertEquals(listOf("wQ 2/1"), physicalInventoryViolations("4k3/8/8/8/8/8/8/3QKQ2 w - - 0 1"))
        assertTrue(physicalInventoryViolations("4k3/8/8/8/8/8/8/3QK3 w - - 0 1").isEmpty())
    }

    @Test
    fun geometryNoteIsNullOnlyWhenTheSizesMatch() {
        assertNull(geometryNote(1920, 1080, 1920, 1080))
        assertTrue(geometryNote(1920, 1080, 1280, 720).orEmpty().contains("1280x720"))
    }

    @Test
    fun geometryMismatchSuspendsWithAReason() {
        val gates = RecordingGates()
        assertTrue(gates.blocks(START, geometryNote(1920, 1080, 1280, 720)))
        assertTrue(gates.reason.orEmpty().startsWith("Recording paused"), gates.reason)
        // The remedy must be in the string: it is the only diagnostic the user is shown.
        assertTrue(gates.reason.orEmpty().contains("Recalibrate"), gates.reason)
        assertEquals(1, gates.skipped)
    }
}
