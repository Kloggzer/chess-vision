package com.chesslab.tracker.ui.settings

import com.chesslab.tracker.record.RecordingSettings
import com.chesslab.tracker.record.SessionStore
import com.chesslab.tracker.settings.ConfigStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.io.FilterOutputStream
import java.io.IOException
import java.io.OutputStream
import java.util.zip.ZipFile
import kotlin.random.Random

private class NoStore : ConfigStore {
    override suspend fun read(slot: String): String? = null

    override suspend fun write(
        slot: String,
        text: String,
    ) = Unit
}

/** A SAF export cannot be renamed into place, so an abandoned one must not stay behind looking finished. */
@OptIn(ExperimentalCoroutinesApi::class)
class RecordingExportAbortTest {
    @TempDir
    lateinit var root: File

    private val id = "20260923-120000"

    private val target by lazy { File(File(root, "picked").apply { mkdirs() }, "$id.zip") }

    private fun session() {
        val dir = File(root, "sessions/$id").apply { mkdirs() }
        File(dir, "video.mp4").writeBytes(Random(7).nextBytes(256 * 1024))
        File(dir, "log.jsonl").writeText("{}\n")
    }

    private fun TestScope.model(screen: CoroutineScope) =
        RecordingViewModel(
            SessionStore(File(root, "sessions")),
            RecordingSettings(NoStore()),
            screen,
            StandardTestDispatcher(testScheduler),
        )

    @Test
    fun leavingTheScreenMidwayLeavesNoZipBehind() =
        runTest {
            session()
            val screen = CoroutineScope(Job())
            val model = model(screen)
            model.exportSession(id, { LeaveAfter(target.outputStream(), 4096) { screen.cancel() } }, { target.delete() })
            advanceUntilIdle()

            assertFalse(target.exists(), "a half zip at the destination reads as a finished export")
            assertTrue(shown(model).contains("deleted"), "got ${shown(model)}")
        }

    @Test
    fun leavingBeforeTheExportStartedRemovesTheEmptyDocument() =
        runTest {
            session()
            target.writeBytes(ByteArray(0)) // SAF creates the document before the callback runs.
            val screen = CoroutineScope(Job())
            val model = model(screen)
            model.exportSession(id, { target.outputStream() }, { target.delete() })
            screen.cancel()
            advanceUntilIdle()

            assertFalse(target.exists())
        }

    @Test
    fun aWriteThatFailsMidwayDeletesTheHalfFileAndSaysSo() =
        runTest {
            session()
            val model = model(this)
            model.exportSession(id, { LeaveAfter(target.outputStream(), 4096) { throw IOException("disk full") } }, { target.delete() })
            advanceUntilIdle()

            assertFalse(target.exists())
            assertEquals("Storage error: disk full; the partial export was deleted", model.ui.value.error)
        }

    @Test
    fun aHalfFileThatCannotBeDeletedIsNamedAsSuch() =
        runTest {
            session()
            val model = model(this)
            model.exportSession(id, { LeaveAfter(target.outputStream(), 4096) { throw IOException("disk full") } }, { false })
            advanceUntilIdle()

            assertTrue(shown(model).contains("could not be deleted"), "got ${shown(model)}")
        }

    @Test
    fun aFinishedExportIsKept() =
        runTest {
            session()
            val model = model(this)
            var discarded = false
            val discard = {
                discarded = true
                true
            }
            model.exportSession(id, { target.outputStream() }, discard)
            advanceUntilIdle()

            assertFalse(discarded)
            assertNull(model.ui.value.error)
            assertEquals(2, ZipFile(target).use { it.size() })
        }
}

/** Runs [leave] once [limit] bytes have passed: the user navigating away, or the disk filling up. */
private class LeaveAfter(
    out: OutputStream,
    private val limit: Int,
    private val leave: () -> Unit,
) : FilterOutputStream(out) {
    private var written = 0L
    private var left = false

    override fun write(
        b: ByteArray,
        off: Int,
        len: Int,
    ) {
        out.write(b, off, len)
        written += len
        if (!left && written >= limit) {
            left = true
            leave()
        }
    }

    override fun write(b: Int) = write(byteArrayOf(b.toByte()), 0, 1)
}

private fun shown(model: RecordingViewModel): String =
    model.ui.value.error
        .orEmpty()
