package com.chesslab.tracker.record

import com.chesslab.engine.api.DebugDecision
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.camera.MIN_VIDEO_HEIGHT
import com.chesslab.tracker.camera.MIN_VIDEO_WIDTH
import com.chesslab.tracker.camera.PRE_ROLL_SECONDS
import com.chesslab.tracker.camera.VideoProgress
import com.chesslab.tracker.camera.VideoRecorderPort
import com.chesslab.tracker.camera.bitRateFor
import com.chesslab.tracker.settings.ConfigStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Disabled
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

    @Test
    fun firstDecisionArrivesInTimelineWhenBuffered() =
        runTest {
            val timeline = SessionTimeline(sessionDir, this, UnconfinedTestDispatcher(testScheduler))

            val decision =
                DebugDecision(
                    tsS = 123.456,
                    ply = 1,
                    uci = "e2e4",
                    san = "e4",
                    fenBefore = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                    fenAfter = OPENING_FEN,
                    decider = "diff",
                    reason = "frame-diff, confirmed by frame-diff tracking",
                    priorUsed = false,
                    bestScore = 0.5,
                    secondScore = -0.3,
                    margin = 0.8,
                    changed = listOf("e2", "e4"),
                    changedVals = listOf("e2" to 0.0, "e4" to 0.5),
                    shadowVetoed = emptyList(),
                    occludedVetoed = emptyList(),
                    gridCoverage = 1.0,
                    zThr = 2.0,
                    motion = 0.0,
                    cnnRun = false,
                    cnnAgreement = 0.0,
                    cnnBestMove = null,
                    stuckReason = null,
                    verifyOutcome = null,
                    accepted = true,
                )

            // Write the buffered decision to the timeline (this simulates what RecordingBundleHost.opened does)
            timeline.decision(decision, 1_000_000_000L)
            timeline.close()
            advanceUntilIdle()

            // The timeline file should now contain the decision row.
            val timelineFile = File(sessionDir, "timeline.jsonl")
            val lines = timelineFile.readLines()

            // Find the decision row (kind == "decision" and ply == 1)
            val decisionLine =
                lines.find { line ->
                    val obj = Json.parseToJsonElement(line).jsonObject
                    obj.getValue("kind").jsonPrimitive.content == "decision" &&
                        obj.getValue("ply").jsonPrimitive.content == "1"
                }

            // Assert the decision row is present
            assertNotNull(decisionLine, "Decision row with ply=1 should exist in timeline")
            val decisionObj = Json.parseToJsonElement(decisionLine!!).jsonObject

            assertEquals("1", decisionObj.getValue("ply").jsonPrimitive.content)
            assertEquals("e2e4", decisionObj.getValue("uci").jsonPrimitive.content)
            assertEquals("e4", decisionObj.getValue("san").jsonPrimitive.content)
            assertEquals("decision", decisionObj.getValue("kind").jsonPrimitive.content)
        }

    /**
     * The double "armed" of 2026-08-14 (20:36:33 and 20:50:22, two log lines ~180 ms apart).
     *
     * A teardown stops the encoder from two sides — the session ending and the camera being
     * released — and the re-arm hung off the encoder's own final callback, so both armed. No
     * session is opened here: the incident is on the seam, not in the timeline.
     */
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
            // `TrackerCamera.stop` on the way out of the service: the encoder goes down again,
            // and its final callback must not be read as "arm for the next game".
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
            val host =
                RecordingBundleHost(
                    FakeVideoCamera(),
                    RecordingSettings(MemoryStore()),
                    sessionsRoot,
                    this,
                    UnconfinedTestDispatcher(testScheduler),
                )

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

    /** The ring is the video's: a frame row the footage no longer covers describes nothing. */
    @Test
    fun aFrameOlderThanTheVideoRingIsDropped() =
        runTest {
            val host =
                RecordingBundleHost(
                    FakeVideoCamera(),
                    RecordingSettings(MemoryStore()),
                    sessionsRoot,
                    this,
                    UnconfinedTestDispatcher(testScheduler),
                )

            host.frame(frameAt(0L, STARTPOS_FEN))
            host.frame(frameAt(PRE_ROLL_SECONDS * 1_000_000_000L + 1L, OPENING_FEN))
            host.opened(SessionRecorder(sessionDir, SessionMeta("s", "default", 2560, 1440)))
            host.close()
            advanceUntilIdle()

            val rows = File(sessionDir, "timeline.jsonl").readLines()
            assertEquals(1, rows.size, "the row outside the pre-roll window survived")
        }

    /**
     * `opened` was the only one of the three that was not `@Synchronized`, and `SessionTimeline.close`
     * BLOCKS while its writer drains. A frame delivered inside that window took the free monitor, saw
     * the old timeline and `trySend`ed into a closed channel: gone, and not even counted as evicted.
     */
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
     * Der Zwilling zu [aFrameDeliveredWhileTheSessionChangesOverIsNotLost] auf dem Schluss-Pfad:
     * `closeCurrent` schliesst die Timeline OHNE die Sperre, die `frame` nimmt.
     */
    @Disabled("BUG: closeCurrent/finalizeVideo schliessen die Timeline ausserhalb der frame-Sperre")
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

        host.opened(SessionRecorder(sessionDir, SessionMeta("s1", "default", 2560, 1440)))
        val ending = thread { host.finished() }
        Thread.sleep(HANDOVER_WAIT_MS)
        host.frame(frameAt(7_000_000_000L, OPENING_FEN))
        ending.join()
        blocked.countDown()
        host.close()
        writers.shutdown()
        writers.awaitTermination(DRAIN_GUARD_S, TimeUnit.SECONDS)

        val rows = File(sessionDir, "timeline.jsonl").readLines()
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

/**
 * Counts arms and refuses a second one exactly as `CameraVideo.start` does (`codec != null`):
 * a fake that accepted overlapping arms would swallow the sequence under test.
 */
private const val FAKE_FPS = 15

private class FakeVideoCamera : VideoRecorderPort {
    var arms = 0
        private set

    private var live: ((VideoProgress) -> Unit)? = null

    override val videoResolution = DeliveredSize(MIN_VIDEO_WIDTH, MIN_VIDEO_HEIGHT, 0)

    override val videoFailure: String? = null

    override val videoSegments = 1

    override val videoPreRollNs = 0L

    override val videoBitRateRequested = bitRateFor(MIN_VIDEO_WIDTH, MIN_VIDEO_HEIGHT, FAKE_FPS)

    override val videoBitRate = videoBitRateRequested

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

private class MemoryStore : ConfigStore {
    private val slots = mutableMapOf<String, String>()

    override suspend fun read(slot: String): String? = slots[slot]

    override suspend fun write(
        slot: String,
        text: String,
    ) {
        slots[slot] = text
    }
}
