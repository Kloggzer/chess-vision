package com.chesslab.tracker.record

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.ConfigCodec
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/**
 * What `settings.json` says, on the JVM. The file exists so that "which config did this
 * recording run?" has an answer — so the tests read it back the way the PC will.
 */
class SessionSettingsTest {
    @TempDir
    lateinit var dir: File

    private var tick = 0

    private val json = Json { allowSpecialFloatingPointValues = true }

    private fun writer(
        config: TrackerConfig = TrackerConfig(),
        app: AppSettings = AppSettings(),
    ) = SessionSettingsWriter(dir, app, BuildStamp("0.1.0-test", 7L), config) { "t${tick++}" }

    private fun file() = json.parseToJsonElement(File(dir, SETTINGS_FILE).readText()).jsonObject

    @Test
    fun `opening a session writes the envelope, the app settings and the build`() {
        val config = TrackerConfig().copy(maxChanged = 7, boardSize = 1104)
        writer(config, AppSettings(modelDir = "real14-80"))
        val root = file()
        // The config block IS the ConfigCodec envelope — same wire form as the phone's DataStore
        // slot, so the desktop replay's `config=` can consume it without a second codec.
        assertEquals(json.parseToJsonElement(ConfigCodec.encode(config)), root.getValue("config"))
        assertEquals(
            "real14-80",
            root
                .getValue("app")
                .jsonObject
                .getValue("modelDir")
                .jsonPrimitive.content,
        )
        assertEquals("0.1.0-test", root.getValue("app_version_name").jsonPrimitive.content)
        assertEquals(
            7L,
            root
                .getValue("app_version_code")
                .jsonPrimitive.content
                .toLong(),
        )
        assertEquals("t0", root.getValue("recorded_at").jsonPrimitive.content)
        assertTrue(root.getValue("history").jsonArray.isEmpty())
    }

    @Test
    fun `the embedded envelope round-trips through ConfigCodec`() {
        val config = TrackerConfig().copy(confirmFramesOverride = 3, cleanCommitsOnly = true)
        writer(config)
        val envelope = json.encodeToString(JsonObject.serializer(), file().getValue("config").jsonObject)
        val decoded = ConfigCodec.decode(envelope)
        assertEquals(null, decoded.note)
        assertEquals(config, decoded.config)
    }

    @Test
    fun `a mid-session knob change rewrites the file and lands in the history`() {
        val w = writer()
        w.configChanged(TrackerConfig().copy(motionThr = 0.30))
        val root = file()
        assertEquals(
            0.30,
            root
                .getValue("config")
                .jsonObject
                .getValue("values")
                .jsonObject
                .getValue("motionThr")
                .jsonPrimitive.double,
        )
        val entry =
            root
                .getValue("history")
                .jsonArray
                .single()
                .jsonObject
        assertEquals("motionThr", entry.getValue("key").jsonPrimitive.content)
        assertEquals(0.25, entry.getValue("old").jsonPrimitive.double)
        assertEquals(0.30, entry.getValue("new").jsonPrimitive.double)
        assertEquals("t1", entry.getValue("at").jsonPrimitive.content)
        // `recorded_at` names the session OPEN, not the last rewrite — the rows carry their own clock.
        assertEquals("t0", root.getValue("recorded_at").jsonPrimitive.content)
    }

    @Test
    fun `a resubmitted unchanged config appends nothing`() {
        val w = writer()
        w.configChanged(TrackerConfig())
        assertTrue(file().getValue("history").jsonArray.isEmpty())
    }

    @Test
    fun `an optional-int knob going back to null survives as NaN`() {
        val w = writer(TrackerConfig().copy(confirmFramesOverride = 3))
        w.configChanged(TrackerConfig())
        val entry =
            file()
                .getValue("history")
                .jsonArray
                .single()
                .jsonObject
        assertEquals("confirmFramesOverride", entry.getValue("key").jsonPrimitive.content)
        assertEquals(3.0, entry.getValue("old").jsonPrimitive.double)
        assertTrue(
            entry
                .getValue("new")
                .jsonPrimitive.double
                .isNaN(),
        )
    }

    @Test
    fun `the host routes changes only into an open session`() {
        val host =
            SessionSettingsHost(
                BuildStamp("0.1.0-test", 7L),
                { AppSettings() },
                { TrackerConfig() },
            ) { "t${tick++}" }
        // Before a session: nothing to write into, nothing crashes.
        host.configChanged(TrackerConfig().copy(motionThr = 0.30))
        host.opened(dir)
        host.configChanged(TrackerConfig().copy(motionThr = 0.35))
        assertEquals(1, file().getValue("history").jsonArray.size)
        host.finished()
        host.configChanged(TrackerConfig().copy(motionThr = 0.40))
        // The closed session keeps its last state; a later change belongs to no recording.
        val entry =
            file()
                .getValue("history")
                .jsonArray
                .single()
                .jsonObject
        assertEquals(0.35, entry.getValue("new").jsonPrimitive.double)
    }
}
