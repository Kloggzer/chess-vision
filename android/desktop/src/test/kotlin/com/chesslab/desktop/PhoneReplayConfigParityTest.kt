package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.atFrameRate
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.cnn.withCoverageGateOf
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Der Regressionssatz misst nur dann das Handy, wenn der Replay dieselbe Engine-Konfiguration faehrt. */
class PhoneReplayConfigParityTest {
    private val geometry = BoardGeometry(boardSize = 928)

    private val spec =
        ModelSpec.parse(
            """{"backbone":"x","classes":["empty","wP","wN","wB","wR","wQ","wK","bP","bN","bB","bR","bQ","bK"],
               "out_size":[80,80],"normalize":{"mean":[0.485,0.456,0.406],"std":[0.229,0.224,0.225]},
               "coverage_output":true,"coverage_gate":0.25,"temperature":1.42}""",
        )

    /** Was `TrackerService.engineConfig` aus den Vorgaben macht. */
    private fun phone(fps: Double): TrackerConfig =
        TrackerConfig(boardSize = geometry.boardSize).withCoverageGateOf(spec) { }.copy(taintIdentityThr = 0.5).atFrameRate(fps)

    private fun replay(
        sourceFps: Double,
        stride: Int = 1,
    ): TrackerConfig =
        ReplayOptions(watch = false)
            .trackerConfig(geometry, live = false, replayEngineFps(sourceFps, stride, live = false), spec) { }
            .copy(observerIntervalS = TrackerConfig().observerIntervalS)

    @Test
    fun `a 30 fps video replays the phone's config`() {
        assertEquals(phone(30.0), replay(30.0))
    }

    @Test
    fun `a 15 fps phone video replays the phone's config at 15`() {
        assertEquals(phone(15.0), replay(15.0))
    }

    @Test
    fun `a 15 fps container rate of 14,97 scales like the phone's 15`() {
        assertEquals(phone(15.0), replay(6750.0 / 451.0))
    }

    @Test
    fun `a strided replay scales like a phone at the emulated rate`() {
        assertEquals(phone(15.0), replay(30.0, stride = 2))
    }
}
