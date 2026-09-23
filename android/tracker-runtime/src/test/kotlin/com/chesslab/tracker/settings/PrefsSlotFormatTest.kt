package com.chesslab.tracker.settings

import com.chesslab.tracker.record.RecordingPrefs
import com.chesslab.tracker.record.RecordingSettings
import com.chesslab.tracker.record.SLOT_RECORDING
import com.chesslab.tracker.sync.SLOT_SYNC
import com.chesslab.tracker.sync.SyncPrefs
import com.chesslab.tracker.sync.SyncSettings
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

private class MapStore(
    val slots: MutableMap<String, String> = mutableMapOf(),
) : ConfigStore {
    var writes = 0

    override suspend fun read(slot: String): String? = slots[slot]

    override suspend fun write(
        slot: String,
        text: String,
    ) {
        writes += 1
        slots[slot] = text
    }
}

/** Recording omits defaults, sync writes them — two formats on the device, kept. */
class PrefsSlotFormatTest {
    @Test
    fun recordingWritesOnlyWhatDiffersFromTheDefaults() =
        runBlocking {
            val store = MapStore()
            val settings = RecordingSettings(store)

            settings.save(RecordingPrefs(enabled = true))

            assertEquals("""{"enabled":true}""", store.slots[SLOT_RECORDING])
            assertEquals(RecordingPrefs(enabled = true), settings.prefs.value)
        }

    @Test
    fun syncWritesEveryFieldIncludingDefaults() =
        runBlocking {
            val store = MapStore()

            SyncSettings(store).save(SyncPrefs(token = "t"))

            assertEquals(
                """{"enabled":false,"token":"t","host":"","port":3000,"lastHost":"","retentionDays":7}""",
                store.slots[SLOT_SYNC],
            )
        }

    @Test
    fun anUnreadableOrForeignSlotLoadsTheSafeDefaults() =
        runBlocking {
            val store = MapStore(mutableMapOf(SLOT_RECORDING to "{not json", SLOT_SYNC to """{"port":8080,"future":1}"""))

            assertEquals(RecordingPrefs(), RecordingSettings(store).load())
            assertEquals(SyncPrefs(port = 8080), SyncSettings(store).load())
            assertEquals(RecordingPrefs(), RecordingSettings(MapStore()).load())
        }

    @Test
    fun rememberHostWritesOnlyAChange() =
        runBlocking {
            val store = MapStore()
            val settings = SyncSettings(store).apply { load() }

            settings.rememberHost("http://10.0.0.2:3000")
            settings.rememberHost("http://10.0.0.2:3000")

            assertEquals(1, store.writes)
            assertEquals("http://10.0.0.2:3000", settings.prefs.value.lastHost)
        }
}
