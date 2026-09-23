package com.chesslab.engine

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.clearReferenceState
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * The provisional mark outlived every path that clears `refGray`/`refFen`, so the first quiet frame
 * after a user correction overwrote that reference via `setRef(fromCommit = true)`, without `markGamutStale` (invariant 6).
 */
class RefProvisionalResetTest {
    private fun flagged(): EngineState =
        EngineState(TrackerConfig(), STARTPOS, whitePov = true).also {
            it.nowS = 10.0
            it.refProvisionalUntil = 10.2
        }

    @Test
    fun clearReferenceStateDropsIt() {
        val state = flagged()
        state.clearReferenceState()

        assertEquals(0.0, state.refProvisionalUntil)
    }

    @Test
    fun discardVisualReferenceDropsIt() {
        val state = flagged()
        state.discardVisualReference()

        assertEquals(0.0, state.refProvisionalUntil)
    }

    @Test
    fun adoptingAPositionDropsIt() {
        val state = flagged()
        state.adoptPosition(STARTPOS)

        assertEquals(0.0, state.refProvisionalUntil)
    }

    @Test
    fun clearRefDropsIt() {
        val state = detectState()
        state.nowS = 10.0
        state.refProvisionalUntil = 10.2

        state.clearRef()

        assertEquals(0.0, state.refProvisionalUntil, "der Merker beschreibt die Epoche, die gerade fiel")
    }
}
