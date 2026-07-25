package com.chesslab.tracker.record

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
private const val THREE_BISHOPS = "rnbqkbnr/pppppppp/8/8/8/5B2/PPPPPPPP/RNBQKB1R w KQkq - 0 1"

private class FakeSource(
    var note: String? = null,
    var frameBytes: Int = 1000,
) : CaptureSource {
    var grabs = 0

    override fun grab(): CaptureFrame? {
        grabs++
        return CaptureFrame(1920, 1080, CORNERS, fakeFrame(frameBytes))
    }

    override fun geometryNote(): String? = note
}

class SessionCaptureTest {
    @TempDir
    lateinit var dir: File

    private var opened = 0
    private var prefs = RecordingPrefs(enabled = true)
    private var existing = 0L
    private val source = FakeSource()
    private val gates = RecordingGates()

    private fun controller() =
        SessionCaptureController(
            source = source,
            open = {
                opened++
                SessionRecorder(File(dir, "s$opened").also(File::mkdirs), SessionMeta("s$opened", "default", it.width, it.height))
            },
            gates = gates,
            prefs = { prefs },
            existingBytes = { existing },
        )

    @Test
    fun cleanBoardCapturesImmediately() {
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = true)
        assertEquals(1, controller.recorder?.count)
    }

    @Test
    fun captureDefersWhileOccludedOrTainted() {
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = false)
        assertNull(controller.recorder)
        assertEquals(0, source.grabs)
        assertNotNull(controller.flush())
        assertEquals(1, controller.recorder?.count)
    }

    @Test
    fun recorderSuspendsOnGeometryMismatch() {
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = true)
        val recorder = controller.recorder
        source.note = "profile 1920x1080, camera delivers 1280x720"
        controller.queue(2, FEN, "e5", clean = true)
        // Suspended, not stopped: the recorder and the frame already written are untouched.
        assertEquals(recorder, controller.recorder)
        assertEquals(1, controller.recorder?.count)
        assertTrue(gates.reason.orEmpty().contains("board geometry unresolved"))
        source.note = null
        controller.queue(3, FEN, "Nf3", clean = true)
        assertEquals(2, controller.recorder?.count)
    }

    @Test
    fun recorderSkipsInventoryViolation() {
        val controller = controller()
        controller.queue(1, THREE_BISHOPS, "Bf3", clean = true)
        assertNull(controller.recorder)
        assertTrue(gates.reason.orEmpty().contains("wB 3/2"))
    }

    @Test
    fun deferredCaptureRerunsBothGatesOnFlush() {
        val controller = controller()
        controller.queue(1, THREE_BISHOPS, "Bf3", clean = false)
        // Queued while clean, mismatched at flush time — Python re-checks, so nothing is written.
        controller.queue(2, FEN, "e4", clean = false)
        source.note = "profile 1920x1080, camera delivers 1280x720"
        assertNull(controller.flush())
        assertNull(controller.recorder)
    }

    @Test
    fun recorderDoesNotAutoStartWhenToggleOff() {
        prefs = RecordingPrefs(enabled = false)
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = true)
        controller.flush()
        assertNull(controller.recorder)
        assertEquals(0, opened)
        assertFalse(File(dir, "s1").exists())
    }

    @Test
    fun undoRemovesTheCapturedFrame() {
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = true)
        controller.queue(2, FEN, "e5", clean = true)
        controller.undo()
        assertEquals(1, controller.recorder?.count)
    }

    @Test
    fun sizeCapStopsRecording() {
        existing = 1100L
        prefs = RecordingPrefs(enabled = true, capBytes = 2000L)
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = true)
        assertEquals(1, controller.recorder?.count)
        controller.queue(2, FEN, "e5", clean = true)
        assertNull(controller.recorder)
        assertTrue(controller.stoppedReason.orEmpty().contains("limit reached"), controller.stoppedReason)
        // Nothing is wrapped or overwritten: the frame written before the cap is still there.
        assertTrue(File(dir, "s1/frames/0000.jpg").isFile)
        assertEquals(1, File(dir, "s1/log.jsonl").readLines().size)
    }

    @Test
    fun stopFinishesTheSession() {
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = true)
        assertEquals(1, controller.stop()?.frames)
        assertNull(controller.recorder)
        assertNull(controller.stop())
    }
}
