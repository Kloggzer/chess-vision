package com.chesslab.tracker.ui.settings

import com.chesslab.tracker.record.RecordingSettings
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.settings.ConfigStore
import com.chesslab.tracker.sync.TransferMark
import com.chesslab.tracker.sync.writeMark
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private class EmptyStore : ConfigStore {
    override suspend fun read(slot: String): String? = null

    override suspend fun write(
        slot: String,
        text: String,
    ) = Unit
}

/** Refresh and delete read the same on-disk picture: sessions, their bytes, which the PC holds. */
@OptIn(ExperimentalCoroutinesApi::class)
class RecordingViewModelTransferTest {
    @TempDir
    lateinit var root: File

    @Test
    fun refreshAndDeleteAgreeOnWhatThePcAlreadyHas() =
        runTest {
            val sent = File(root, "20260923-100000").apply { mkdirs() }
            File(sent, "video.mp4").writeText("12345")
            writeMark(sent, TransferMark(server = "pc", at = 1L, bytes = 5L, files = 1, status = "landed"))
            val kept = File(root, "20260923-110000").apply { mkdirs() }
            File(kept, "video.mp4").writeText("123")
            val model = RecordingViewModel(SessionStore(root), RecordingSettings(EmptyStore()), this, StandardTestDispatcher(testScheduler))

            model.refresh()
            advanceUntilIdle()
            assertEquals(setOf(sent.name), model.ui.value.transferred)
            assertEquals(2, model.ui.value.sessions.size)

            model.deleteSession("20260923-110000")
            advanceUntilIdle()
            assertEquals(setOf(sent.name), model.ui.value.transferred)
            val listed = model.ui.value.sessions
            assertEquals(listOf(sent.name), listed.map { it.id })
            assertEquals(SessionStore(root).totalBytes(), model.ui.value.sessionBytes)
            assertNull(model.ui.value.error)
        }
}
