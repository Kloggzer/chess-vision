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

    /**
     * The pre-roll rule (2026-08-14): until a ply commits, nothing exists on disk. This test used
     * to assert the OPPOSITE ("session can start before the first committed move") — that eager
     * open is what produced nine moveless recordings out of eleven transferred, 4.7 GB of board
     * setup, marker taping and calibration deleted by hand.
     */
    @Test
    fun noSessionDirectoryBeforeTheFirstCommittedMove() {
        val controller = controller()
        assertNull(controller.start(), "an eager open is the moveless-junk bug, not a feature")
        assertEquals(0, opened)
        assertFalse(File(dir, "s1").exists())
    }

    @Test
    fun aMovelessRunLeavesNothingOnDisk() {
        val controller = controller()
        // The status-boundary sync used to auto-open the session; now it may not, commits or none.
        controller.syncEnabled()
        assertNull(controller.stop())
        assertEquals(0, opened)
        assertTrue(dir.listFiles().isNullOrEmpty(), "a run without a move must leave no session directory")
    }

    @Test
    fun videoSessionOpensOnCommitWhileGeometryIsBroken() {
        source.note = "profile 2560x1440, camera delivers 1920x1080"
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = true)
        // The commit earns the video bundle; the broken geometry blocks only the labeled still.
        assertNotNull(controller.recorder, "geometry failures belong in the debug video instead of preventing it")
        assertEquals(0, controller.recorder?.count)
    }

    @Test
    fun captureDefersWhileOccludedOrTainted() {
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = false)
        // The commit opened the session (video bundle), but no still is written while unclean.
        assertEquals(0, controller.recorder?.count)
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
        assertTrue(gates.reason.orEmpty().contains("Recording paused"))
        source.note = null
        controller.queue(3, FEN, "Nf3", clean = true)
        assertEquals(2, controller.recorder?.count)
    }

    @Test
    fun recorderSkipsInventoryViolation() {
        val controller = controller()
        controller.queue(1, THREE_BISHOPS, "Bf3", clean = true)
        // The session opens — a committed ply is a game — but the impossible still is refused.
        assertEquals(0, controller.recorder?.count)
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
        assertEquals(0, controller.recorder?.count)
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
    fun videoBytesCountAgainstTheSessionCap() {
        prefs = RecordingPrefs(enabled = true, capBytes = 2000L)
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = false)
        val recorder = requireNotNull(controller.recorder)
        File(recorder.dir, "video.mp4").writeBytes(ByteArray(2000))
        assertTrue(controller.syncEnabled(), "the status-boundary check closes a video that reached the cap")
        assertNull(controller.recorder)
        assertTrue(controller.stoppedReason.orEmpty().contains("limit reached"))
    }

    /**
     * The cap has to see the WHOLE recording, not its first minute.
     *
     * `video.mp4` is segment 0; a long run rotates into `video-001.mp4` and up. Counting only the
     * first file made a 761 MB session read as 76,7 MB (`2026-09-11-20-00-52`), so the 1 GB cap
     * never fired and recordings really ran to ~10 GB. Each file here is under the cap on its own.
     */
    @Test
    fun everySegmentCountsAgainstTheSessionCap() {
        prefs = RecordingPrefs(enabled = true, capBytes = 2000L)
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = false)
        val recorder = requireNotNull(controller.recorder)
        listOf("video.mp4", "video-001.mp4", "video-002.mp4").forEach {
            File(recorder.dir, it).writeBytes(ByteArray(800))
        }
        assertTrue(controller.syncEnabled(), "2400 bytes over three segments are over the 2000 byte cap")
        assertNull(controller.recorder)
        assertTrue(controller.stoppedReason.orEmpty().contains("limit reached"), controller.stoppedReason)
    }

    /** A gap ends the count — segments are consecutive, and nothing here walks the directory. */
    @Test
    fun aSegmentBeyondAGapIsNotCounted() {
        prefs = RecordingPrefs(enabled = true, capBytes = 2000L)
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = false)
        val recorder = requireNotNull(controller.recorder)
        File(recorder.dir, "video.mp4").writeBytes(ByteArray(800))
        File(recorder.dir, "video-007.mp4").writeBytes(ByteArray(9000))
        assertFalse(controller.syncEnabled(), "only the contiguous run counts")
        assertNotNull(controller.recorder)
    }

    /**
     * D3. `startRecorder` ran `SessionRecorder.<init>` — which writes `frames/`, an empty
     * `log.jsonl` and a `session.yaml` — BEFORE the cap was evaluated, so a start that the cap
     * refuses left an empty session directory on disk that then counted against the next
     * `totalBytes()`. It is also the only path in the app that produces a session with a
     * zero-byte log.
     */
    @Test
    fun aCapBlockedStartCreatesNoSessionDirectory() {
        existing = 2000L
        prefs = RecordingPrefs(enabled = true, capBytes = 2000L)
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = true)
        assertNull(controller.recorder)
        assertTrue(controller.stoppedReason.orEmpty().contains("limit reached"), controller.stoppedReason)
        assertEquals(0, opened, "the cap is a reason not to open a recorder, not a reason to abandon one")
        assertFalse(File(dir, "s1").exists(), "no empty session directory may be left behind")
    }

    /**
     * D4. A frame that cannot be encoded or written was swallowed whole
     * (`SessionRecorder.kt:90`, `runCatching{}.getOrDefault(0L)`): no counter, no reason, no log,
     * while Python warns (`tracker.py:2878`). The UI went on showing a healthy session.
     */
    @Test
    fun aFailedFrameWriteIsReported() {
        source.frameBytes = 0
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = true)
        assertEquals(0, controller.recorder?.count)
        assertEquals(1, controller.failedWrites)
        assertTrue(controller.reason.orEmpty().contains("frame could not be written"), controller.reason)
        // A frame no log line references is not data — it is only bytes `slice` will trip over.
        assertFalse(File(dir, "s1/frames/0000.jpg").exists())
    }

    /**
     * D5. Nothing ever cleared [RecordingGates.reason], so one transient geometry blip left a
     * permanent skip reason on the only diagnostic the UI shows.
     */
    @Test
    fun theSkipReasonClearsWhenTheGateOpensAgain() {
        val controller = controller()
        source.note = "profile 1920x1080, camera delivers 1280x720"
        controller.queue(1, FEN, "e4", clean = true)
        assertTrue(gates.reason.orEmpty().contains("Recording paused"))
        source.note = null
        controller.queue(2, FEN, "e5", clean = true)
        assertEquals(1, controller.recorder?.count)
        assertNull(controller.reason, "a skip that no longer applies must stop being reported")
    }

    /** The acceptance shape `chesslab slice` needs: one log line per frame file, parseable yaml. */
    @Test
    fun aFinishedSessionHasOneLogLinePerFrameFile() {
        val controller = controller()
        repeat(5) { controller.queue(it + 1, FEN, "e4", clean = true) }
        assertEquals(5, controller.stop()?.frames)
        val session = File(dir, "s1")
        assertEquals(5, File(session, "frames").list()?.size)
        assertEquals(5, File(session, "log.jsonl").readLines().size)
        val yaml = File(session, "session.yaml").readLines().associate { it.substringBefore(":") to it.substringAfter(": ") }
        assertEquals("s1", yaml["session_id"])
        assertEquals("[1920, 1080]", yaml["frame_size"])
        assertEquals("-1", yaml["camera_index"])
    }

    @Test
    fun stopFinishesTheSession() {
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = true)
        assertEquals(1, controller.stop()?.frames)
        assertNull(controller.recorder)
        assertNull(controller.stop())
    }

    /**
     * D6. A move photo is lost when the board never goes quiet between two commits (2026-08-14:
     * ply Nc6 of session 20260814-204855 and ply Nf3 of session 20260814-210104 committed but
     * had no log.jsonl row). The loss was silent; this test verifies the supersededFrames counter
     * surfaces it and is reset after the session ends.
     */
    @Test
    fun supersededPendingFrameIsReported() {
        val controller = controller()
        controller.queue(1, FEN, "e4", clean = false)
        // ply 1 is now pending but not yet flushed.
        assertEquals(0, controller.supersededFrames)
        controller.queue(2, FEN, "e5", clean = false)
        // ply 1's pending frame is superseded by ply 2's.
        assertEquals(1, controller.supersededFrames)
        assertTrue(controller.reason.orEmpty().contains("move photo(s) lost"), controller.reason)
        assertTrue(controller.reason.orEmpty().contains("board never went quiet"), controller.reason)
        // Flush ply 2 and stop.
        controller.flush()
        assertEquals(1, controller.recorder?.count)
        val result = controller.stop()
        assertEquals(1, result?.frames)
        // Counter is reset after the session ends.
        controller.queue(3, FEN, "Nf3", clean = false)
        assertEquals(0, controller.supersededFrames)
    }
}
