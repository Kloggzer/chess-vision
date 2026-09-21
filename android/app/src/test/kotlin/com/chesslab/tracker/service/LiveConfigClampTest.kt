package com.chesslab.tracker.service

import android.app.Application
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.settings.FrameRateMode
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Was eine LAUFENDE Engine annehmen darf: `cnnVerify=false` stellt sie sofort auf diff-only
 * (`EngineState.cnnOn`), waehrend `CnnObserver.setEnabled` erst beim naechsten Stackbau faellt.
 */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, application = Application::class)
class LiveConfigClampTest {
    private val geometry = BoardGeometry(boardSize = 928)

    @Test
    fun `a restart-only knob does not reach the running engine`() {
        val run = TrackerConfig(boardSize = 928, cnnVerify = true, verifyWindow = 4)
        val stored = run.copy(cnnVerify = false, verifyWindow = 9)

        val out = liveConfig(run, stored, geometry, null, FrameRateMode.FPS30)

        assertTrue("der Beobachter laeuft weiter — die Engine darf nicht schon diff-only sein", out.cnnVerify)
        assertEquals("auch der Confirmer wird einmal beim Stackbau gebaut", 4, out.verifyWindow)
    }

    @Test
    fun `the twelve live knobs still get through`() {
        val run = TrackerConfig(boardSize = 928, motionThr = 0.25, diffClaheClip = 2.0)
        val stored = run.copy(motionThr = 0.40, diffClaheClip = 3.5)

        val out = liveConfig(run, stored, geometry, null, FrameRateMode.FPS30)

        assertEquals(0.40, out.motionThr, 1e-9)
        assertEquals(3.5, out.diffClaheClip, 1e-9)
    }

    @Test
    fun `the measured board still wins, calibration runs under the tracker`() {
        // `applyCalibration` schiebt die gemessene Brettgroesse bewusst in einen laufenden Stack:
        // die Ebene wechselt live mit, und `FrameLoop` weist eine Ebene ab, die den Boxen widerspricht.
        val run = TrackerConfig(boardSize = 800)

        val out = liveConfig(run, run, BoardGeometry(boardSize = 928), null, FrameRateMode.FPS30)

        assertEquals(928, out.boardSize)
    }

    @Test
    fun `the frame-rate correction is applied once, not on top of itself`() {
        val run = TrackerConfig(boardSize = 928, motionThr = 0.25)

        val out = liveConfig(run, run, geometry, null, FrameRateMode.FPS15)

        assertEquals("halbe Rate heisst doppelt, nicht vierfach", 0.5, out.motionThr, 1e-9)
    }
}
