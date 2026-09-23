package com.chesslab.tracker.service

import com.chesslab.engine.api.EngineAction
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotSame
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.concurrent.thread

/** Records what the switch was holding at each step: a frame during the teardown must find NO stack. */
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

    /** A restart builds a NEW [EngineHost]: the old one keeps rejecting foreign threads, the new one latches afresh. */
    @Test
    fun aRebuiltEngineHostRelatchesOnItsNewOwningThread() {
        val old = EngineHost(RecordingOps())
        old.tick(null)

        val fresh = EngineHost(RecordingOps())
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
        val ops = RecordingOps()
        val old = EngineHost(ops)
        old.submit(EngineAction.Undo)

        val fresh = EngineHost(RecordingOps())
        fresh.tick(null)

        assertEquals(emptyList<String>(), ops.calls, "an action queued before the restart must not resurface after it")
    }
}
