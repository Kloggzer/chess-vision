package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.board.BOARD_PX
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Das Intervall gilt nur, solange nichts scharf steht: `armed == null && seq < due` laesst die
 * Sperre fallen, sobald ein Bild wartet, und ein Paar, dessen Ecken nie zusammenpassen, schaltet
 * einfach neu scharf — ohne `due` weiterzudrehen. `LiveAlign` misst den Quad genau so neu, also
 * rechnet die Messung dann JEDEN Frame statt zweimal je Intervall, wie ihr KDoc verspricht.
 */
class NoiseFloorRearmBudgetTest {
    @Test
    fun `corners that never match do not turn the interval off`() {
        val floor = NoiseFloor(everyFrames = INTERVAL)
        var pulls = 0

        for (seq in 1L..2 * INTERVAL) {
            floor.observe(seq, FloatArray(CORNERS) { seq.toFloat() }) {
                pulls += 1
                board()
            }
        }

        assertTrue(pulls <= BUDGET, "zwei Intervalle duerfen hoechstens $BUDGET Bretter kosten, gerechnet wurden $pulls")
    }

    private fun board(): BgrImage = BgrImage(BOARD_PX, BOARD_PX, ByteArray(BOARD_PX * BOARD_PX * CHANNELS))

    private companion object {
        const val CORNERS = 8
        const val CHANNELS = 3
        const val INTERVAL = 15L
        const val BUDGET = 10
    }
}
