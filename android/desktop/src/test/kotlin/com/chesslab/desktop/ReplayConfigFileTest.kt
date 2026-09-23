package com.chesslab.desktop

import com.chesslab.desktop.testutil.StillSource
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.settings.CONFIG_SCHEMA_VERSION
import com.chesslab.tracker.settings.ConfigCodec
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** The measured geometry wins over the file. */
class ReplayConfigFileTest {
    @TempDir
    lateinit var dir: File

    private val geometry = BoardGeometry(boardSize = 1104)

    private fun envelope(config: TrackerConfig): String = ConfigCodec.encode(config)

    @Test
    fun `a recorded knob survives, the recorded boardSize does not`() {
        val recorded = TrackerConfig().copy(maxChanged = 7, cleanCommitsOnly = true, boardSize = 1600)
        val file = File(dir, "settings.json")
        file.writeText("""{"recorded_at":"t","config":${envelope(recorded)},"history":[]}""")
        val config = ReplayOptions(configFile = file.path).trackerConfig(geometry, live = false)
        assertEquals(7, config.maxChanged)
        assertTrue(config.cleanCommitsOnly)
        assertEquals(1104, config.boardSize)
        assertEquals(552, config.detSize)
    }

    /** An all-defaults envelope must equal the no-config path field for field. */
    @Test
    fun `an all-defaults envelope reproduces the no-config path exactly`() {
        val file = File(dir, "defaults.json")
        file.writeText(envelope(TrackerConfig()))
        val noConfig = ReplayOptions(watch = false).trackerConfig(geometry, live = false)
        val withFile = ReplayOptions(watch = false, configFile = file.path).trackerConfig(geometry, live = false)
        assertEquals(noConfig, withFile)
    }

    @Test
    fun `a pretty-printed envelope with NaN optional-ints decodes like the compact one`() {
        // Bare NaN literals and one-key-per-line must decode like ConfigCodec's compact output.
        val file = File(dir, "pretty.json")
        file.writeText(
            """
            {
             "version": $CONFIG_SCHEMA_VERSION,
             "values": {
              "alignEvery": 2.0,
              "settleFramesOverride": NaN,
              "avgFramesOverride": NaN,
              "confirmFramesOverride": NaN
             }
            }
            """.trimIndent(),
        )
        val config = ReplayOptions(configFile = file.path).trackerConfig(geometry, live = false)
        assertEquals(TrackerConfig().copy(alignEvery = 2, boardSize = 1104), config)
    }

    /** Read off the settings repository, 20260814-143233's recorded `alignEvery=2` replayed every 3rd frame. */
    @Test
    fun `the recorded alignment knobs reach the run, not the settings defaults`() {
        val file = File(dir, "settings.json")
        file.writeText(envelope(TrackerConfig().copy(alignEvery = 2, alignScale = 0.25)))
        val config = ReplayOptions(configFile = file.path).trackerConfig(geometry, live = false)
        assertEquals(2, config.alignEvery)
        assertEquals(0.25, config.alignScale)
        assertTrue(
            signatureOf(config).contains("align=true,2,0.25"),
            "the visual cache signed a run under alignment knobs it did not run: ${signatureOf(config)}",
        )
        // A defaults run must still sign as one, or every existing cache is invalidated.
        val plain = ReplayOptions().trackerConfig(geometry, live = false)
        assertTrue(signatureOf(plain).contains("align=true,3,0.5"), signatureOf(plain))
    }

    private fun signatureOf(config: TrackerConfig): String =
        visualCacheSignature(
            config,
            geometry,
            FloatArray(8) { it.toFloat() },
            StillSource,
            stride = 1,
            lens = false,
            model = "m",
            startFrame = 0L,
            limitFrames = null,
            recordedFrames = null,
            priorLambda = 0.0,
            priorSafety = true,
        )

    @Test
    fun `a raw envelope loads the same as a settings file`() {
        val file = File(dir, "tracker_config_json.json")
        file.writeText(envelope(TrackerConfig().copy(motionThr = 0.30)))
        val config = ReplayOptions(configFile = file.path).trackerConfig(geometry, live = false)
        assertEquals(0.30, config.motionThr)
    }

    @Test
    fun `the CLI arms override the file, their absence does not`() {
        val file = File(dir, "settings.json")
        file.writeText(envelope(TrackerConfig().copy(requireMotionForMove = false)))
        assertFalse(ReplayOptions(configFile = file.path).trackerConfig(geometry, live = false).requireMotionForMove)
        val on = File(dir, "on.json").apply { writeText(envelope(TrackerConfig())) }
        val forced = ReplayOptions(configFile = on.path, motionGate = false).trackerConfig(geometry, live = false)
        assertFalse(forced.requireMotionForMove)
    }

    @Test
    fun `set overrides beat the file — the file is the base, not the last word`() {
        val file = File(dir, "settings.json")
        file.writeText(envelope(TrackerConfig().copy(maxChanged = 7)))
        val config =
            ReplayOptions(configFile = file.path, overrides = mapOf("maxChanged" to 6.0))
                .trackerConfig(geometry, live = false)
        assertEquals(6, config.maxChanged)
    }

    @Test
    fun `an unreadable file is refused, never silently the defaults`() {
        val file = File(dir, "settings.json")
        file.writeText("""{"version":999,"values":{}}""")
        assertThrows(IllegalStateException::class.java) {
            ReplayOptions(configFile = file.path).trackerConfig(geometry, live = false)
        }
    }

    @Test
    fun `the word is parsed like its siblings`() {
        assertEquals("x/settings.json", ReplayOptions.parse(listOf("config=x/settings.json")).configFile)
        assertTrue(ReplayOptions.parse(listOf("workprofile")).workProfile)
        val prior = ReplayOptions.parse(listOf("prior=4", "prior-mode=old"))
        assertEquals(4.0, prior.priorLambda)
        assertFalse(prior.priorSafety)
    }
}
