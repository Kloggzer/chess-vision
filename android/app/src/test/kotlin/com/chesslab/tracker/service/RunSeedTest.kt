package com.chesslab.tracker.service

import android.app.Application
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.settings.FrameRateMode
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** Die BILDRATE ist restart-pflichtig und skaliert `motionThr`. Gelesen wurde sie am laufenden
 *  Stapel aus den AKTUELLEN Einstellungen: wer die Rate umstellt und danach einen der zwoelf
 *  Live-Knoepfe anfasst, verschob die Schwelle auf eine Rate, die die Kamera nicht liefert. */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, application = Application::class)
class RunSeedTest {
    private val geometry = BoardGeometry(boardSize = 928)

    @Test
    fun `a frame rate changed but not restarted does not move the running threshold`() {
        val run = RunSeed(TrackerConfig(boardSize = 928, motionThr = 0.25), FrameRateMode.FPS30)
        val stored = run.config.copy(motionThr = 0.40)

        val out = liveConfig(run, stored, FrameRateMode.FPS15, geometry, null)

        assertEquals("der Live-Knopf kommt durch", 0.40, out.motionThr, 1e-9)
    }

    @Test
    fun `without a running stack the stored rate decides`() {
        val stored = TrackerConfig(boardSize = 928, motionThr = 0.25)

        val out = liveConfig(null, stored, FrameRateMode.FPS15, geometry, null)

        assertEquals("halbe Rate heisst doppelt", 0.5, out.motionThr, 1e-9)
    }
}

/** `CameraRate` faellt beim Anhalten auf 0, ein Neustart baut mit einer anderen Rate. Ohne
 *  Neubewaffnung lief der Abgleich genau einmal im Prozessleben. */
class RateRetuneTest {
    @Test
    fun `it fires once per run, at the warm-up frame`() {
        val retune = RateRetune()
        val fired = (1..WARM_PLUS).count { retune.onFrame(FrameRateMode.FPS15, 7.5) }

        assertEquals(1, fired)
    }

    @Test
    fun `a resumed camera re-arms the correction`() {
        val retune = RateRetune()
        repeat(WARM_PLUS) { retune.onFrame(FrameRateMode.FPS15, 7.5) }

        retune.rearm()
        val fired = (1..WARM_PLUS).count { retune.onFrame(FrameRateMode.FPS15, 7.5) }

        assertEquals("sonst bleibt die Schwelle auf einer Rate, die der Sensor nicht liefert", 1, fired)
    }

    @Test
    fun `a sensor that holds the rate is left alone`() {
        val retune = RateRetune()

        assertEquals(0, (1..WARM_PLUS).count { retune.onFrame(FrameRateMode.FPS15, 15.0) })
    }
}

/** Ein paar Bilder ueber die Aufwaermzeit hinaus. */
private const val WARM_PLUS = 90
