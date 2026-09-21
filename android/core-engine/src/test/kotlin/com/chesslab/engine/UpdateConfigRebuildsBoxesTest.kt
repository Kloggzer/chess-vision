package com.chesslab.engine

import com.chesslab.engine.api.TrackerEngine
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test

/**
 * `overhang` ist live-tunable und bestimmt, wie weit die Beweis-Box nach OBEN reicht — ohne
 * Neubau misst der naechste Frame die gestellte Figur mit den Boxen von vorher.
 */
class UpdateConfigRebuildsBoxesTest {
    @Test
    fun `a tuned overhang rebuilds the evidence boxes`() {
        val engine = TrackerEngine(detectConfig())
        val state = engine.state
        val before = state.evidenceBoxes.y0.copyOf()

        engine.updateConfig(state.config.copy(overhang = state.config.overhang + 0.5))

        assertNotEquals(
            before.toList(),
            state.evidenceBoxes.y0.toList(),
            "die Beweis-Boxen tragen noch den alten Ueberhang",
        )
    }

    @Test
    fun `a config change that moves no box leaves them alone`() {
        val engine = TrackerEngine(detectConfig())
        val state = engine.state
        val before = state.evidenceBoxes.y0.copyOf()

        engine.updateConfig(state.config.copy(zThr = state.config.zThr + 1.0))

        assertEquals(before.toList(), state.evidenceBoxes.y0.toList())
    }
}
