package com.chesslab.tracker.ui.settings

import com.chesslab.tracker.settings.ConfigStore
import com.chesslab.tracker.sync.SyncPrefs
import com.chesslab.tracker.sync.SyncSettings
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import java.io.IOException

private class FullDisk : ConfigStore {
    override suspend fun read(slot: String): String? = null

    override suspend fun write(
        slot: String,
        text: String,
    ): Unit = throw IOException("disk full")
}

private class Accepting : ConfigStore {
    override suspend fun read(slot: String): String? = null

    override suspend fun write(
        slot: String,
        text: String,
    ) = Unit
}

/** The transfer page saves the way the recording page does: a failed write is named, never a crash. */
class TransferSaveFailureTest {
    @Test
    fun aPairingThatCouldNotBeSavedSaysSoAndKeepsWhatTheWorkerReads() =
        runTest {
            val settings = SyncSettings(FullDisk())
            val next = SyncPrefs(enabled = true, token = "abc")

            val error = saveSyncPrefs(settings, next)

            assertEquals("Not saved (disk full) — lost on restart", error)
            assertEquals(next, settings.prefs.value)
        }

    @Test
    fun aSaveThatLandedClearsTheMessage() =
        runTest {
            val settings = SyncSettings(Accepting())

            assertNull(saveSyncPrefs(settings, SyncPrefs(enabled = true)))
        }
}
