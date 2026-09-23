package com.chesslab.engine

import com.chesslab.engine.api.TrackerEngine
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** `overhang` is live-tunable: without a rebuild the next frame measures with the old evidence boxes. */
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

    /** Der Census-Cache haengt an der IDENTITAET von `refGray` — die bleibt, also galten die Codes der alten Boxen. */
    @Test
    fun aTunedOverhangRecodesTheReference() {
        val engine = TrackerEngine(detectConfig(overhang = 0.0))
        val state = engine.state
        val ref = texturedFrame(seed = 7)
        state.refGray = ref
        state.refCensusCodes(ref)

        engine.updateConfig(state.config.copy(overhang = 0.4))

        val fresh = censusCodesInBoxes(ref, state.evidenceBoxes, ByteArray(ref.width * ref.height))
        assertArrayEquals(fresh, state.refCensusCodes(ref), "die Codes stammen noch aus den alten Boxen")
    }

    /** `diffClaheClip` verschiebt die Grauwerte; `updateConfig` verwarf die Referenz nur bei geaendertem `detSize`. */
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
