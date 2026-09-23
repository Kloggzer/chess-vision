package com.chesslab.tracker.record

import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.camera.MIN_VIDEO_HEIGHT
import com.chesslab.tracker.camera.MIN_VIDEO_WIDTH
import com.chesslab.tracker.camera.PRE_ROLL_SECONDS
import com.chesslab.tracker.camera.VideoProgress
import com.chesslab.tracker.camera.VideoRecorderPort
import com.chesslab.tracker.camera.bitRateFor
import com.chesslab.tracker.camera.preRollWindowSeconds
import com.chesslab.tracker.settings.MemoryStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

private const val OPENING_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
private const val STARTPOS_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

/** Long enough that the changeover is provably still inside `close`, short enough to stay a test. */
private const val HANDOVER_WAIT_MS = 300L
private const val DRAIN_GUARD_S = 30L

private fun frameAt(
    elapsedNs: Long,
    fen: String,
) = TimelineFrame(elapsedNs, elapsedNs, elapsedNs / 1_000_000L, 2560, 1440, 0, fen, "waiting", null)

@OptIn(ExperimentalCoroutinesApi::class)
class RecordingBundleHostTest {
    @TempDir
    lateinit var sessionDir: File

    @TempDir
    lateinit var sessionsRoot: File

    private fun TestScope.host(camera: FakeVideoCamera = FakeVideoCamera()) =
        RecordingBundleHost(camera, RecordingSettings(MemoryStore()), sessionsRoot, this, UnconfinedTestDispatcher(testScheduler))

    /** The double "armed" of 2026-08-14 (two log lines ~180 ms apart): a teardown stops the encoder
     *  from two sides, and the re-arm hung off the encoder's own final callback, so both armed. */
    @Test
    fun aSessionChangeoverArmsTheEncoderExactlyOnce() =
        runTest {
            val camera = FakeVideoCamera()
            val settings = RecordingSettings(MemoryStore())
            settings.save(RecordingPrefs(enabled = true))
            val host = RecordingBundleHost(camera, settings, sessionsRoot, this)

            host.armVideo()
            assertEquals(1, camera.arms, "tracking start arms the pre-roll")

            host.finished()
            // `TrackerCamera.stop`: the encoder's final callback must not read as "arm for the next game".
            camera.stopVideo()

            assertEquals(2, camera.arms, "the changeover armed more than once and discarded the first ring")
            host.close()
        }

    /**
     * `rg-2026-08-30-14-33-02`: 6,27 s of video ahead of the commit, and a `timeline.jsonl` whose
     * first frame row already read the position after `e4 e5` — the rows of the armed phase fell
     * on a null timeline while the footage they describe was kept.
     */
    @Test
    fun theArmedPhasesFramesReachTheTimelineAheadOfTheCommit() =
        runTest {
            val host = host()

            host.frame(frameAt(1_000_000_000L, STARTPOS_FEN))
            host.frame(frameAt(2_000_000_000L, STARTPOS_FEN))
            host.opened(SessionRecorder(sessionDir, SessionMeta("s", "default", 2560, 1440)))
            host.frame(frameAt(3_000_000_000L, OPENING_FEN))
            host.close()
            advanceUntilIdle()

            val rows = File(sessionDir, "timeline.jsonl").readLines().map { Json.parseToJsonElement(it).jsonObject }
            assertEquals(
                listOf("1000000000", "2000000000", "3000000000"),
                rows.map { it.getValue("elapsedNs").jsonPrimitive.content },
                "the pre-roll rows are missing or out of order",
            )
            assertEquals(
                STARTPOS_FEN,
                rows
                    .first()
                    .getValue("fen")
                    .jsonPrimitive.content,
            )
        }

    /** A timeline write that fails (disk full) must neither kill the writer's scope nor go unreported. */
    @Test
    fun aTimelineThatCannotBeWrittenIsReportedPastItsClose() =
        runTest {
            val host = host()
            host.opened(SessionRecorder(sessionDir, SessionMeta("s", "default", 2560, 1440)))
            File(sessionDir, "timeline.jsonl").apply { delete() }.mkdirs()

            host.frame(frameAt(1_000_000_000L, OPENING_FEN))
            host.frame(frameAt(2_000_000_000L, OPENING_FEN))
            advanceUntilIdle()
            assertNotNull(host.timelineFailure, "the recording page must learn the timeline broke")

            host.finished()
            advanceUntilIdle()
            assertNotNull(host.timelineFailure, "the failure outlives the session it ended")
        }

    /** The ring is the video's: a frame row the footage no longer covers describes nothing. */
    @Test
    fun aFrameOlderThanTheVideoRingIsDropped() =
        runTest {
            val host = host()

            host.frame(frameAt(0L, STARTPOS_FEN))
            host.frame(frameAt(PRE_ROLL_SECONDS * 1_000_000_000L + 1L, OPENING_FEN))
            host.opened(SessionRecorder(sessionDir, SessionMeta("s", "default", 2560, 1440)))
            host.close()
            advanceUntilIdle()

            val rows = File(sessionDir, "timeline.jsonl").readLines()
            assertEquals(1, rows.size, "the row outside the pre-roll window survived")
        }

    /**
     * Die Zusage ist der BYTE-Deckel, nicht die 45 s: bei 1440p/30 traegt der Ring 22 s Video, die
     * Zeilen hielten aber weiter 45 — genau die Reihen ohne Footage, die das Fenster ausschliesst.
     */
    @Test
    fun theFrameWindowFollowsTheVideoRingAtThirtyFps() =
        runTest {
            val camera = FakeVideoCamera(fps = 30)
            val host = host(camera)
            val held = preRollWindowSeconds(camera.videoBitRateRequested, camera.videoBitRate)
            assertTrue(held < PRE_ROLL_SECONDS, "1440p/30 cannot hold the full window under the byte cap")

            host.frame(frameAt(0L, STARTPOS_FEN))
            host.frame(frameAt((held + 1L) * 1_000_000_000L, OPENING_FEN))
            host.opened(SessionRecorder(sessionDir, SessionMeta("s", "default", 2560, 1440)))
            host.close()
            advanceUntilIdle()

            val rows = File(sessionDir, "timeline.jsonl").readLines()
            assertEquals(1, rows.size, "a frame row the video has no footage for survived")
        }

    /** `opened` was not `@Synchronized` while `SessionTimeline.close` BLOCKS draining: a frame in that
     *  window `trySend`ed into a closed channel — gone, and not even counted as evicted. */
    @Test
    fun aFrameDeliveredWhileTheSessionChangesOverIsNotLost() {
        val blocked = CountDownLatch(1)
        val writers = Executors.newSingleThreadExecutor()
        writers.submit { blocked.await(DRAIN_GUARD_S, TimeUnit.SECONDS) }
        val scope = CoroutineScope(SupervisorJob())
        val host =
            RecordingBundleHost(
                FakeVideoCamera(),
                RecordingSettings(MemoryStore()),
                sessionsRoot,
                scope,
                writers.asCoroutineDispatcher(),
            )
        val second = File(sessionsRoot, "s2").also(File::mkdirs)

        host.opened(SessionRecorder(sessionDir, SessionMeta("s1", "default", 2560, 1440)))
        val changeover = thread { host.opened(SessionRecorder(second, SessionMeta("s2", "default", 2560, 1440))) }
        Thread.sleep(HANDOVER_WAIT_MS)
        host.frame(frameAt(7_000_000_000L, OPENING_FEN))
        changeover.join()
        blocked.countDown()
        host.close()
        writers.shutdown()
        writers.awaitTermination(DRAIN_GUARD_S, TimeUnit.SECONDS)

        val rows = listOf(sessionDir, second).flatMap { File(it, "timeline.jsonl").readLines() }
        assertTrue(rows.any { it.contains("7000000000") }, "the frame fell into the closed timeline: $rows")
    }

    /**
     * Nicht verloren heisst ZWEI erlaubte Ausgaenge: die endende Sitzung oder der Vorlauf der
     * naechsten. Verboten ist nur der dritte — senden in den schon geschlossenen Kanal.
     */
    @Test
    fun aFrameDeliveredWhileTheSessionFinishesIsNotLost() {
        val blocked = CountDownLatch(1)
        val writers = Executors.newSingleThreadExecutor()
        writers.submit { blocked.await(DRAIN_GUARD_S, TimeUnit.SECONDS) }
        val scope = CoroutineScope(SupervisorJob())
        val host =
            RecordingBundleHost(
                FakeVideoCamera(),
                RecordingSettings(MemoryStore()),
                sessionsRoot,
                scope,
                writers.asCoroutineDispatcher(),
            )

        val second = File(sessionsRoot, "s2").also(File::mkdirs)
        host.opened(SessionRecorder(sessionDir, SessionMeta("s1", "default", 2560, 1440)))
        val ending = thread { host.finished() }
        Thread.sleep(HANDOVER_WAIT_MS)
        host.frame(frameAt(7_000_000_000L, OPENING_FEN))
        ending.join()
        host.opened(SessionRecorder(second, SessionMeta("s2", "default", 2560, 1440)))
        blocked.countDown()
        host.close()
        writers.shutdown()
        writers.awaitTermination(DRAIN_GUARD_S, TimeUnit.SECONDS)

        val rows = listOf(sessionDir, second).flatMap { File(it, "timeline.jsonl").readLines() }
        assertTrue(rows.any { it.contains("7000000000") }, "the frame fell into the closed timeline: $rows")
    }

    @Test
    fun aFinishedSessionDoesNotArmWhileRecordingIsOff() =
        runTest {
            val camera = FakeVideoCamera()
            val host = RecordingBundleHost(camera, RecordingSettings(MemoryStore()), sessionsRoot, this)

            host.armVideo()
            host.finished()

            assertEquals(0, camera.arms, "recording is off — nothing may arm the encoder")
        }
}

private const val FAKE_FPS = 15

/** Refuses a second arm exactly as `CameraVideo.start` does (`codec != null`). */
private class FakeVideoCamera(
    private val fps: Int = FAKE_FPS,
) : VideoRecorderPort {
    var arms = 0
        private set

    private var live: ((VideoProgress) -> Unit)? = null

    override val videoResolution = DeliveredSize(MIN_VIDEO_WIDTH, MIN_VIDEO_HEIGHT, 0)

    override val videoFailure: String? = null

    override val videoSegments = 1

    override val videoPreRollNs = 0L

    override val videoBitRateRequested get() = bitRateFor(MIN_VIDEO_WIDTH, MIN_VIDEO_HEIGHT, fps)

    override val videoBitRate get() = videoBitRateRequested

    override fun startVideo(
        maxBytes: Long,
        onProgress: (VideoProgress) -> Unit,
    ): Boolean {
        if (live != null) return false
        arms++
        live = onProgress
        return true
    }

    override fun keepVideo(file: File) = Unit

    /** Clears the listener BEFORE it runs: the callback is where a re-arm would come from. */
    override fun stopVideo() {
        val ending = live ?: return
        live = null
        ending(VideoProgress(0L, 0L, final = true))
    }
}
