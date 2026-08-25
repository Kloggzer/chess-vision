package com.chesslab.tracker.service

import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.EngineAction
import com.chesslab.engine.api.EngineOps
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotSame
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.concurrent.thread

/**
 * Records what happened, and — crucially — what the switch was holding at the moment it happened.
 * A frame arriving during the teardown must find NO stack, not a closing one.
 */
private class FakeStack(
    val id: Int,
    private val trace: MutableList<String>,
    private val visible: () -> FakeStack?,
) : AutoCloseable {
    var closed = false
        private set

    init {
        trace += "build:$id"
    }

    override fun close() {
        trace += "close:$id"
        trace += "visibleDuringClose:${visible()?.id}"
        closed = true
    }
}

/**
 * D07a-1: 34 of the 46 knobs are read at construction, so applying them means rebuilding the
 * tracker — in the running process, without a second camera owner and without two ONNX sessions.
 */
class TrackerRestartTest {
    private val trace = mutableListOf<String>()

    @Test
    fun restartDetachesThenClosesThenBuilds() {
        var next = 1
        lateinit var switch: StackSwitch<FakeStack>
        switch = StackSwitch { FakeStack(next++, trace) { switch.current } }

        switch.restart()
        val first = requireNotNull(switch.current)
        switch.restart()

        assertEquals(
            listOf("build:1", "close:1", "visibleDuringClose:null", "build:2"),
            trace,
            "the order is behaviour: detach so no frame enters, close so no two stacks coexist, then build",
        )
        assertTrue(first.closed, "the old stack must be closed, not dropped — it owns a thread and a native session")
        assertNotSame(first, switch.current)
    }

    @Test
    fun closeLeavesNothingBehind() {
        var next = 1
        lateinit var switch: StackSwitch<FakeStack>
        switch = StackSwitch { FakeStack(next++, trace) { switch.current } }
        switch.restart()
        val live = requireNotNull(switch.current)

        switch.close()

        assertNull(switch.current, "a service teardown must leave no stack for a late frame to reach")
        assertTrue(live.closed)
    }

    /**
     * A restart builds a NEW [EngineHost] on purpose. The old one keeps its claim (and keeps
     * rejecting foreign threads), the new one is unclaimed and latches onto whichever thread drives
     * it first — that is how the ownership `check` is re-established instead of defeated.
     */
    @Test
    fun aRebuiltEngineHostRelatchesOnItsNewOwningThread() {
        val old = EngineHost(CountingOps())
        old.tick(null)

        val fresh = EngineHost(CountingOps())
        var onFresh: Throwable? = null
        var onOld: Throwable? = null
        thread {
            onFresh = runCatching { fresh.tick(null) }.exceptionOrNull()
            onOld = runCatching { old.tick(null) }.exceptionOrNull()
        }.join()

        assertNull(onFresh, "the rebuilt engine must latch onto the thread that now drives it, got $onFresh")
        assertTrue(onOld is IllegalStateException, "the discarded engine must keep rejecting a foreign thread")
    }

    @Test
    fun aRebuiltEngineHostStartsWithEmptyQueues() {
        val ops = CountingOps()
        val old = EngineHost(ops)
        old.submit(EngineAction.Undo)

        val fresh = EngineHost(CountingOps())
        fresh.tick(null)

        assertEquals(0, ops.applied, "an action queued before the restart must not resurface after it")
        assertFalse(ops.claimed, "the discarded host must never have been ticked")
    }
}

private class CountingOps : EngineOps {
    var applied = 0
        private set
    var claimed = false
        private set

    override fun onFrame(input: FrameInput): List<TrackerEvent> {
        claimed = true
        return emptyList()
    }

    override fun onCnnSnapshot(snap: CnnSnapshot): List<TrackerEvent> = emptyList()

    override fun apply(action: EngineAction): List<TrackerEvent> {
        applied += 1
        return emptyList()
    }

    override fun status(): TrackerStatus = statusOf()

    override fun fen(): String = statusOf().fen
}
