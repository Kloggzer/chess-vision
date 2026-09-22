package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Ohne Anker raeumt `commitRecovery` die Referenz von Hand und leert dabei nur `grayBuf`; der
 * Farbpuffer mittelt danach ueber Frames der Stellung VOR der Bruecke, und daraus wird `refBgr`.
 */
class RecoveryBufferClearBugTest {
    @Test
    fun anAnchorlessRecoveryDropsBothAveragingBuffers() {
        val state = recoveryState()
        state.lastCur = null
        state.lastCurBgr = null
        repeat(3) {
            state.grayBuf.append(grayFrame())
            state.bgrBuf.append(bgrFrame())
        }
        val cnn = RecoveryEvaluator(moves = listOf("e2e4"), agreement = 0.99)

        state.recoveryGlances(cnn, obsForBoard(state.board))

        assertEquals(listOf("e4"), state.history, "Vorbedingung: die Bruecke wurde begangen")
        assertEquals(0, state.grayBuf.size)
        assertEquals(0, state.bgrBuf.size, "der Farbpuffer traegt noch Frames der alten Stellung")
    }
}
