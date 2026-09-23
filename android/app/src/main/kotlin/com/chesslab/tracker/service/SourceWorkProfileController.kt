package com.chesslab.tracker.service

import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProbe
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.tracker.perf.RecordingWorkProbe
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.Closeable
import java.util.Locale

internal class SourceWorkProfileController(
    val available: Boolean,
    private val header: () -> String,
    private val nanoTime: () -> Long = System::nanoTime,
) : Closeable {
    private val enabledFlow = MutableStateFlow(false)
    val enabled: StateFlow<Boolean> = enabledFlow.asStateFlow()

    private var probe: RecordingWorkProbe? = null
    private val switch = SwitchableWorkProbe()
    private val installation: AutoCloseable? = if (available) WorkProfiler.install(switch) else null
    private var startedNanos = 0L
    private var stoppedNanos: Long? = null

    @Synchronized
    fun setEnabled(on: Boolean) {
        if (!available || enabledFlow.value == on) return
        if (on) startFresh() else stop()
    }

    @Synchronized
    fun report(): String? {
        val recording = probe ?: return null
        val end = stoppedNanos ?: nanoTime()
        val elapsedMs = (end - startedNanos).coerceAtLeast(0L) / NANOS_PER_MILLISECOND
        return buildString {
            appendLine(header())
            appendLine(String.format(Locale.ROOT, "elapsed ms: %.1f", elapsedMs))
            appendLine("collector: exact source spans; profiler overhead is included")
            appendLine()
            append(recording.snapshot().report())
        }
    }

    @Synchronized
    override fun close() {
        stop()
        installation?.close()
    }

    private fun startFresh() {
        probe = RecordingWorkProbe(nanoTime)
        startedNanos = nanoTime()
        stoppedNanos = null
        switch.active = probe
        enabledFlow.value = true
    }

    private fun stop() {
        if (!enabledFlow.value) return
        stoppedNanos = nanoTime()
        switch.active = null
        enabledFlow.value = false
    }

    private companion object {
        const val NANOS_PER_MILLISECOND = 1_000_000.0
    }
}

/** Installed before the tracker threads start. Each span keeps its exact delegate, so stopping mid-frame is safe. */
private class SwitchableWorkProbe : WorkProbe {
    private data class Entered(
        val probe: WorkProbe,
        val token: Long,
    )

    @Volatile
    var active: WorkProbe? = null

    private val entered = ThreadLocal.withInitial { ArrayDeque<Entered>() }

    override fun enter(
        operation: WorkOperation,
        input: Long,
    ): Long {
        val selected = active ?: return NO_TOKEN
        val token = selected.enter(operation, input)
        calls().addLast(Entered(selected, token))
        return token
    }

    override fun exit(token: Long) {
        if (token == NO_TOKEN) return
        val call = calls().removeLastOrNull()
        check(call?.token == token) { "switched profiling spans closed out of order" }
        call.probe.exit(call.token)
    }

    override fun bytes(
        operation: WorkOperation,
        count: Long,
        input: Long,
    ) {
        active?.bytes(operation, count, input)
    }

    override fun cache(
        operation: WorkOperation,
        hit: Boolean,
        input: Long,
    ) {
        active?.cache(operation, hit, input)
    }

    private fun calls(): ArrayDeque<Entered> = checkNotNull(entered.get())

    private companion object {
        const val NO_TOKEN = 0L
    }
}
