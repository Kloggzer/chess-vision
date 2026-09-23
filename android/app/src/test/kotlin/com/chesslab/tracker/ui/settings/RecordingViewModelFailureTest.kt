package com.chesslab.tracker.ui.settings

import com.chesslab.tracker.record.RecordingPrefs
import com.chesslab.tracker.record.RecordingSettings
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.settings.ConfigStore
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.io.IOException

private class UnwritableStore : ConfigStore {
    override suspend fun read(slot: String): String? = null

    override suspend fun write(
        slot: String,
        text: String,
    ): Unit = throw IOException("disk full")
}

private class UnreadableStore : ConfigStore {
    override suspend fun read(slot: String): String? = throw IOException("slot gone")

    override suspend fun write(
        slot: String,
        text: String,
    ) = Unit
}

/** The recording page's three actions, each failing the way the device fails: the page has to say so. */
@OptIn(ExperimentalCoroutinesApi::class)
class RecordingViewModelFailureTest {
    @TempDir
    lateinit var root: File

    @Test
    fun aToggleThatCouldNotBeSavedSaysSoAndShowsWhatCaptureRuns() =
        runTest {
            val settings = RecordingSettings(UnwritableStore())
            val model = RecordingViewModel(SessionStore(root), settings, this, StandardTestDispatcher(testScheduler))

            model.setPrefs(RecordingPrefs(enabled = true))
            advanceUntilIdle()

            assertNotNull(model.ui.value.error)
            assertEquals(settings.prefs.value, model.ui.value.prefs, "the switch must show what the capture path reads")
        }

    @Test
    fun aRefreshThatCannotReadTheSettingsSaysWhy() =
        runTest {
            val settings = RecordingSettings(UnreadableStore())
            val model = RecordingViewModel(SessionStore(root), settings, this, StandardTestDispatcher(testScheduler))

            model.refresh()
            advanceUntilIdle()

            assertEquals("Storage error: slot gone", model.ui.value.error)
        }

    @Test
    fun aDeletionThatLeftFilesBehindSaysSo() =
        runTest {
            val session = File(root, "20260923-120000").apply { mkdirs() }
            val pinned = File(session, "video.mp4").apply { writeText("x") }
            // Windows refuses to delete an open file, POSIX a file in a read-only directory.
            val open = pinned.inputStream()
            session.setWritable(false)
            try {
                val settings = RecordingSettings(UnwritableStore())
                val model = RecordingViewModel(SessionStore(root), settings, this, StandardTestDispatcher(testScheduler))
                model.deleteSession(session.name)
                advanceUntilIdle()

                assertTrue(session.exists(), "precondition: the file system refused the delete")
                assertNotNull(model.ui.value.error, "a session still on disk must not vanish silently")
                val listed = model.ui.value.sessions
                assertTrue(listed.any { it.id == session.name })
            } finally {
                session.setWritable(true)
                open.close()
            }
        }
}
