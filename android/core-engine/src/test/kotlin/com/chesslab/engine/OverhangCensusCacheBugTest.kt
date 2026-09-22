package com.chesslab.engine

import com.chesslab.engine.api.TrackerEngine
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Test

/**
 * `overhang` baut die Beweis-Boxen neu ([UpdateConfigRebuildsBoxesTest]), aber der Census-Cache
 * haengt an der IDENTITAET von `refGray` — die bleibt, also gelten die Codes der alten Boxen.
 */
class OverhangCensusCacheBugTest {
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
}
