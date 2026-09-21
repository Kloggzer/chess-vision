package com.chesslab.engine

import com.chesslab.engine.api.TrackerEngine
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test

/**
 * `diffClaheClip` ist live-tunable und verschiebt die Grauwerte: `GrayPipeline.onConfigChanged`
 * baut CLAHE neu, `updateConfig` verwirft die Referenz aber nur bei geaendertem `detSize`.
 */
class ClaheReferenceStaleBugTest {
    @Disabled("BUG: eine live geaenderte Messebene laesst eine unvergleichbare Referenz stehen — Fix braucht einen Replay-Lauf")
    @Test
    fun `a changed clahe clip discards the visual reference`() {
        val engine = TrackerEngine(detectConfig())
        val state = engine.state
        state.refGray = grayFrame(listOf("e2"))
        state.refFen = state.board.fen()

        engine.updateConfig(state.config.copy(diffClaheClip = state.config.diffClaheClip + 1.5))

        assertNull(state.refGray, "die Referenz stammt aus einer anderen Grauwert-Transformation")
    }
}
