package com.chesslab.tracker.settings

import com.chesslab.engine.api.TrackerConfig
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.IOException

/** DataStore needs a Context and a real file; the repository's decisions do not. */
private class MemoryStore(
    text: String? = null,
) : ConfigStore {
    val slots = mutableMapOf<String, String>().apply { text?.let { put(SLOT_CONFIG, it) } }
    var writes = 0

    override suspend fun read(slot: String): String? = slots[slot]

    override suspend fun write(
        slot: String,
        text: String,
    ) {
        slots[slot] = text
        writes += 1
    }
}

/**
 * Stands in for the frame pipeline: it records what `onConfigChanged` was handed. The real reset
 * of `prevRoi` and the CLAHE rebuild are 05b's, and tested there — what this phase owns is that
 * the changed config REACHES it, on the engine thread, exactly once.
 */
private class FakePipeline {
    val applied = mutableListOf<TrackerConfig>()
}

@OptIn(ExperimentalCoroutinesApi::class)
class SettingsRepositoryTest {
    @Test
    fun updatePersistsAndSubmitsOneUpdateConfig() =
        runTest {
            val store = MemoryStore()
            val pipeline = FakePipeline()
            val repo = repository(store, pipeline)
            val result = repo.update(TrackerConfig(censusThr = 41.0))
            advanceUntilIdle()
            assertEquals(1, pipeline.applied.size)
            assertEquals(41.0, pipeline.applied.single().censusThr)
            assertEquals(1, store.writes)
            assertEquals(NOTE_TUNED_LIVE, result.note)
            assertEquals(41.0, repo.config.value.censusThr)
            // And it survives a restart: a fresh repository over the same store reads it back.
            val reloaded = repository(store, FakePipeline())
            reloaded.load()
            assertEquals(41.0, reloaded.config.value.censusThr)
        }

    @Test
    fun motionMarginChangeTriggersThePipelineRoiReset() =
        runTest {
            val pipeline = FakePipeline()
            val repo = repository(MemoryStore(), pipeline)
            val result = repo.update(TrackerConfig(motionMargin = 0.2))
            advanceUntilIdle()
            assertEquals(0.2, pipeline.applied.single().motionMargin)
            assertEquals(NOTE_TUNED_LIVE, result.note)
            assertTrue(result.restartRequired.isEmpty())
        }

    @Test
    fun claheClipChangeTriggersTheGrayPipelineRebuild() =
        runTest {
            val pipeline = FakePipeline()
            val repo = repository(MemoryStore(), pipeline)
            val result = repo.update(TrackerConfig(diffClaheClip = 4.0))
            advanceUntilIdle()
            assertEquals(4.0, pipeline.applied.single().diffClaheClip)
            assertEquals(NOTE_TUNED_LIVE, result.note)
        }

    @Test
    fun changingANonLiveKnobReportsRestartRequired() =
        runTest {
            val repo = repository(MemoryStore(), FakePipeline())
            val result = repo.update(TrackerConfig(verifyWindow = 12, boardSize = 800))
            advanceUntilIdle()
            assertNull(result.note)
            assertEquals(listOf("verifyWindow", "boardSize"), result.restartRequired)
        }

    @Test
    fun aConfigWrittenByAnOlderBuildKeepsThePythonDefaultForMissingKeys() =
        runTest {
            // A build that predates a knob simply has no key for it — the fallback must be the
            // Python default, never a zero, and never a crash that costs the user every setting.
            val store = MemoryStore("""{"version":$CONFIG_SCHEMA_VERSION,"values":{"censusThr":55.0}}""")
            val repo = repository(store, FakePipeline())
            repo.load()
            assertNull(repo.note.value)
            assertEquals(55.0, repo.config.value.censusThr)
            assertEquals(TrackerConfig().occlusionColorThr, repo.config.value.occlusionColorThr)
        }

    @Test
    fun appSettingsRoundTripAndFallBackToDefaults() =
        runTest {
            val store = MemoryStore()
            val repo = repository(store, FakePipeline())
            repo.updateApp(AppSettings(resolutionMode = ResolutionMode.R1440, debugEnabled = true))
            advanceUntilIdle()
            assertTrue(repo.debugEnabled.value)
            val reloaded = repository(store, FakePipeline())
            reloaded.load()
            assertEquals(ResolutionMode.R1440, reloaded.appSettings.value.resolutionMode)

            store.slots[SLOT_APP] = "not json"
            val broken = repository(store, FakePipeline())
            broken.load()
            assertEquals(AppSettings(), broken.appSettings.value)
        }

    /** Two taps in a burst are two coroutines on a thread POOL, and DataStore keeps the last one. */
    @Test
    fun aSlowFirstWriteCannotOverwriteTheNewerSetting() =
        runTest {
            val store = SlowFirstStore()
            val repo = repository(store, FakePipeline())
            repo.update(TrackerConfig(censusThr = 41.0))
            repo.update(TrackerConfig(censusThr = 42.0))
            advanceUntilIdle()

            val stored = ConfigCodec.decode(store.slots[SLOT_CONFIG]).config.censusThr
            assertEquals(
                42.0,
                stored,
                "the older write landed last: the store holds censusThr=$stored while the screen " +
                    "and the engine hold 42.0, and the next process start reads the stale one back",
            )
        }

    @Test
    fun anUnreadableStoreLoadsDefaultsWithANote() =
        runTest {
            val repo = repository(MemoryStore("garbage"), FakePipeline())
            repo.load()
            assertEquals(TrackerConfig(), repo.config.value)
            assertTrue(repo.note.value != null)
        }

    /** DataStore throws `IOException` on a broken file; before, `load` threw and `SettingsHost`
     *  never published the repository. */
    @Test
    fun aStoreThatCannotBeReadStillLoadsAndSaysSo() =
        runTest {
            val repo = repository(BrokenStore(failReads = true), FakePipeline())
            repo.load()
            repo.awaitLoaded()
            assertEquals(TrackerConfig(), repo.config.value)
            assertTrue(repo.note.value != null, "a store that could not be read must not read as defaults")
        }

    /** The screen and the engine take the value at once; a write that then fails must say so. */
    @Test
    fun aFailedWriteIsPublishedAndTheNextGoodOneClearsIt() =
        runTest {
            val store = BrokenStore(failWrites = true)
            val repo = repository(store, FakePipeline())
            repo.update(TrackerConfig(censusThr = 41.0))
            advanceUntilIdle()
            assertEquals(41.0, repo.config.value.censusThr)
            assertTrue(repo.saveError.value != null, "the store still holds the old value")

            store.failWrites = false
            repo.update(TrackerConfig(censusThr = 42.0))
            advanceUntilIdle()
            assertNull(repo.saveError.value)
            assertEquals(42.0, ConfigCodec.decode(store.slots[SLOT_CONFIG]).config.censusThr)
        }
}

private class BrokenStore(
    private val failReads: Boolean = false,
    var failWrites: Boolean = false,
) : ConfigStore {
    val slots = mutableMapOf<String, String>()

    override suspend fun read(slot: String): String? = if (failReads) throw IOException("unreadable") else slots[slot]

    override suspend fun write(
        slot: String,
        text: String,
    ) {
        if (failWrites) throw IOException("disk full")
        slots[slot] = text
    }
}

/**
 * The submit sink stands in for `EngineAction.UpdateConfig` -> `EngineHost` -> the engine thread
 * -> `FramePipeline.onConfigChanged`; that hop is covered by `EngineActionQueueTest`.
 */
private fun TestScope.repository(
    store: ConfigStore,
    pipeline: FakePipeline,
): SettingsRepository = SettingsRepository(store, this) { pipeline.applied += it }

/** The IO pool reordering two writes, made deterministic: the FIRST write is the slow one. */
private class SlowFirstStore : ConfigStore {
    val slots = mutableMapOf<String, String>()
    private var calls = 0

    override suspend fun read(slot: String): String? = slots[slot]

    override suspend fun write(
        slot: String,
        text: String,
    ) {
        delay(if (calls++ == 0) SLOW_MS else FAST_MS)
        slots[slot] = text
    }
}

private const val SLOW_MS = 100L
private const val FAST_MS = 1L
