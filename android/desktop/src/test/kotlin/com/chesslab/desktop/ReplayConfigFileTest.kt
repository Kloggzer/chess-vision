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

/**
 * `config=<file>`: the recorded knobs win, the measured geometry wins harder. This is the path
 * that replays a phone recording under the phone's TRUE config (`settings.json`) instead of a
 * guess at it — the question `2026-08-13-19-34-23` could not answer.
 */
class ReplayConfigFileTest {
    @TempDir
    lateinit var dir: File

    private val geometry = BoardGeometry(boardSize = 1104)

    private fun envelope(config: TrackerConfig): String = ConfigCodec.encode(config)

    @Test
    fun `a recorded knob survives, the recorded boardSize does not`() {
        val recorded = TrackerConfig().copy(maxChanged = 7, cleanCommitsOnly = true, boardSize = 1600)
        val file = File(dir, "settings.json")
        // The wrapper the phone writes: the envelope sits under `config`, history beside it.
        file.writeText("""{"recorded_at":"t","config":${envelope(recorded)},"history":[]}""")
        val config = ReplayOptions(configFile = file.path).trackerConfig(geometry, live = false)
        assertEquals(7, config.maxChanged)
        assertTrue(config.cleanCommitsOnly)
        assertEquals(1104, config.boardSize)
        assertEquals(552, config.detSize)
    }

    /**
     * The whole-object invariant behind every `config=` measurement: an envelope whose values
     * equal `TrackerConfig()` yields a config EQUAL — data class equality, every field — to the
     * one the no-config path builds from the same geometry. Written for the 2026-08-14
     * three-run discriminator on `2026-08-13-19-34-23`, which suspected this exact seam; the
     * divergence turned out to live in the runs' QUAD source (label-plan scan median vs
     * `locateBoard`'s first frames — the open specs/52 geometry A/B), not here, and this test is
     * what keeps that diagnosis cheap next time. `cnnOn` never enters this construction:
     * settle/avg/confirm are resolved from the config INSIDE the engine, so there is no arm here
     * to skip.
     *
     * Re-measured end to end on 2026-08-14 against `20260814-143233` (`real14-80`, `quiet`): the
     * no-config run and the all-defaults-envelope run produced the same 15 decision rows and the
     * same 9 commits, differing only in the config banner and the timings. This seam is a no-op
     * where it must be; the one below is what was not.
     */
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
        // The hand-readable form the discriminator's fixture files used — bare NaN literals and
        // one-key-per-line — must decode to the very same object as ConfigCodec's compact output.
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

    /**
     * The other half of `config=`: a knob the file DOES carry must reach what reads it.
     * `alignEvery`/`alignScale`/`liveAlign` did not — `LiveAlign` and the marker prepass took them
     * off the settings repository, which a replay leaves at defaults, so 20260814-143233's
     * recorded `alignEvery=2` replayed every 3rd frame, bit-identical to the defaults run.
     */
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
        // ...and a defaults run must still sign as one, or every existing cache is invalidated.
        val plain = ReplayOptions().trackerConfig(geometry, live = false)
        assertTrue(signatureOf(plain).contains("align=true,3,0.5"), signatureOf(plain))
    }

    /** The signature's non-config inputs are fixed here; only the config under test varies. */
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
        // Absence: the recorded `false` stands rather than the default stamping `true` back.
        assertFalse(ReplayOptions(configFile = file.path).trackerConfig(geometry, live = false).requireMotionForMove)
        // Presence: `nomotion` still forces the arm off over a file that had it on.
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
