package com.chesslab.tracker.service

import android.app.Application
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.cnn.modelConfigJson
import com.chesslab.tracker.settings.ConfigCodec
import com.chesslab.tracker.settings.FrameRateMode
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** `settings.json` traegt EINE Art Konfiguration: die gespeicherte. Der Replay bedient sie selbst (`servingConfig`). */
@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE, application = Application::class)
class RecordedConfigTest {
    private val geometry = BoardGeometry(boardSize = 928)
    private val spec = ModelSpec.parse(modelConfigJson(extra = """, "temperature": 1.42"""))
    private val stored = TrackerConfig(motionThr = 0.25)

    @Test
    fun `the recorded config is the stored one with the measured board, not the served one`() {
        val recorded = recordedConfig(stored, geometry)

        assertEquals(stored.copy(boardSize = 928), recorded)
        assertEquals(
            "sonst liest ein Replay von settings.json bedient und bedient nochmal",
            setOf("motionThr", "pOccludedThr", "cnnConfThr"),
            ConfigCodec.changedKeys(recorded, engineConfig(stored, geometry, spec, FrameRateMode.FPS15, 15.0)).map { it.key }.toSet(),
        )
    }
}
