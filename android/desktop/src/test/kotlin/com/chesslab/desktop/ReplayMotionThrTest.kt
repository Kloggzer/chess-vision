package com.chesslab.desktop

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * `fps=<n>` emulates the phone's frame drops, so it has to emulate the phone's answer to them:
 * `motionThr` is a percent of pixels changed against the PREVIOUS frame, and `TrackerService`
 * scales it by `30 / fps` before the engine ever sees it. A replay that skipped the scaling
 * measured a tracker the phone never runs — the same hand at half the rate crossed a threshold
 * calibrated for the full one.
 */
class ReplayMotionThrTest {
    private val geometry = BoardGeometry(boardSize = 1104)
    private val reference = TrackerConfig().motionThr

    @Test
    fun `half the frame rate doubles the motion threshold`() {
        val config = ReplayOptions(fps = 15.0).trackerConfig(geometry, live = false)
        assertEquals(
            reference * 2.0,
            config.motionThr,
            TOLERANCE,
            "fps=15 halves the rate but left motionThr at the 30 fps value — the phone runs $reference * 30/15",
        )
    }

    @Test
    fun `without fps and at the reference rate nothing moves`() {
        assertEquals(reference, ReplayOptions().trackerConfig(geometry, live = false).motionThr, TOLERANCE)
        assertEquals(reference, ReplayOptions(fps = 30.0).trackerConfig(geometry, live = false).motionThr, TOLERANCE)
    }

    /** A live camera drops its own frames and `TrackerService` scales for them; scaling twice would be the bug. */
    @Test
    fun `a live run is left alone`() {
        assertEquals(reference, ReplayOptions(fps = 15.0).trackerConfig(geometry, live = true).motionThr, TOLERANCE)
    }

    /** Same order as the phone: the knob is the motion, the scale is the frame period. */
    @Test
    fun `an explicit knob is scaled like the default`() {
        val config = ReplayOptions(fps = 10.0, overrides = mapOf("motionThr" to 0.6)).trackerConfig(geometry, live = false)
        assertEquals(0.6 * 3.0, config.motionThr, TOLERANCE)
    }

    /** What `replayRun` passes: the rate the stride REALLY produces, not the word on the command line. */
    @Test
    fun `the measured emulated rate wins over the cli word`() {
        val config = ReplayOptions(fps = 15.0).trackerConfig(geometry, live = false, emulatedFps = null)
        assertEquals(reference, config.motionThr, TOLERANCE)
    }

    private companion object {
        const val TOLERANCE = 1e-9
    }
}
