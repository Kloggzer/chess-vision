package com.chesslab.tracker.service

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.concurrent.thread

/** Records the ORDER of the calls; the order is the contract this class exists to protect. */
private class RecordingOps : EngineOps {
    val calls = mutableListOf<String>()
    var configs = 0

    override fun onFrame(input: FrameInput): List<TrackerEvent> {
        calls += "frame:${input.seq}"
        return listOf(TrackerEvent.Note("frame"))
    }

    override fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent> {
        calls += "snap:${snap.seq}"
        return emptyList()
    }

    override fun apply(action: EngineAction): List<TrackerEvent> {
        calls += if (action is EngineAction.SetFen) "SetFen:${action.fen}" else action::class.simpleName.orEmpty()
        if (action is EngineAction.UpdateConfig) configs += 1
        return emptyList()
    }

    override fun status(): TrackerStatus = statusOf()

    override fun fen(): String = statusOf().fen
}

private fun frameInput(seq: Long) =
    FrameInput(
        seq = seq,
        grayDet = GrayImage(1, 1, ByteArray(1)),
        bgrDet = BgrImage(1, 1, ByteArray(3)),
        corners = FloatArray(8),
        motionRoiScore = 0.0,
        gridLineCoverage = 1.0,
        lumaPreClahe = 100.0,
        timestampMs = seq,
    )

private fun snapshot(seq: Long) =
    CnnSnapshot(obs = EmptyObservation, seq = seq, tsMs = seq, inferMs = 0.0, warped = null, gray = null, fen = null)

private object EmptyObservation : CnnObservation {
    override fun occupied(square: String) = false

    override fun confident(
        square: String,
        thr: Double,
    ) = false

    override fun labelConfident(
        square: String,
        thr: Double,
    ) = false

    override fun label(square: String): String? = null

    override fun conf(square: String) = 0.0

    override fun pOccluded(square: String) = 0.0

    override fun occupancyOnly(): CnnObservation = this
}

class EngineActionQueueTest {
    @Test
    fun actionsAndSnapshotsAreDrainedBeforeOnFrame() {
        val ops = RecordingOps()
        val host = EngineHost(ops)
        host.submit(EngineAction.Undo)
        host.submit(EngineAction.CaptureBaseline)
        host.submit(snapshot(7))
        host.tick(frameInput(1))
        assertEquals(listOf("Undo", "CaptureBaseline", "snap:7", "frame:1"), ops.calls)
    }

    @Test
    fun everyEngineCallHappensOnTheOwningThread() {
        val ops = RecordingOps()
        val host = EngineHost(ops)
        host.tick(frameInput(1))
        var failure: Throwable? = null
        thread { failure = runCatching { host.tick(frameInput(2)) }.exceptionOrNull() }.join()
        assertTrue(failure is IllegalStateException, "a second thread must not reach the engine, got $failure")
        assertEquals(listOf("frame:1"), ops.calls)
    }

    @Test
    fun queueIsBoundedAndDropsOldestRatherThanBlocking() {
        val ops = RecordingOps()
        val host = EngineHost(ops)
        repeat(100) { host.submit(EngineAction.SetFen("fen$it")) }
        host.tick(null)
        // Bounded, and what survived is the NEWEST — a stale action is worth less than a fresh
        // one, and blocking here would stall whichever UI thread submitted it.
        assertTrue(ops.calls.size < 100, "queue is unbounded: ${ops.calls.size} actions drained")
        assertEquals("SetFen:fen99", ops.calls.last())
    }

    @Test
    fun displacedEntriesAreCountedPerQueue() {
        val ops = RecordingOps()
        val host = EngineHost(ops)
        // Snapshot queue depth is 4: five submits displace exactly one.
        repeat(5) { host.submit(snapshot(it.toLong())) }
        assertEquals(1L, host.snapshotsDropped)
        assertEquals(0L, host.actionsDropped, "the two queues must count independently")
        repeat(100) { host.submit(EngineAction.SetFen("fen$it")) }
        assertTrue(host.actionsDropped > 0L)
        assertEquals(1L, host.snapshotsDropped)
    }

    @Test
    fun configUpdateReachesTheEngineExactlyOncePerChange() {
        val ops = RecordingOps()
        val host = EngineHost(ops)
        host.submit(EngineAction.UpdateConfig(TrackerConfig(censusThr = 50.0)))
        host.tick(null)
        host.tick(null)
        assertEquals(1, ops.configs)
    }
}
