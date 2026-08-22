package com.chesslab.tracker.perf

import com.chesslab.engine.perf.CallEdge
import com.chesslab.engine.perf.INHERIT_INPUT
import com.chesslab.engine.perf.OperationWork
import com.chesslab.engine.perf.UNKNOWN_INPUT
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProbe
import com.chesslab.engine.perf.WorkSnapshot

/** Thread-safe exact collector for deterministic replays and fuzz scenarios. */
class RecordingWorkProbe : WorkProbe {
    private class MutableWork {
        var calls = 0L
        var knownInputCalls = 0L
        val inputs = HashSet<Long>()
        var copiedBytes = 0L
        var cacheHits = 0L
        var cacheMisses = 0L
    }

    private data class ActiveCall(
        val token: Long,
        val operation: WorkOperation,
        val input: Long,
    )

    private val lock = Any()
    private val work = LinkedHashMap<WorkOperation, MutableWork>()
    private val edgeCalls = LinkedHashMap<Pair<WorkOperation, WorkOperation>, Long>()
    private val stack = ThreadLocal.withInitial { ArrayDeque<ActiveCall>() }
    private var nextToken = 1L
    private var openSpans = 0

    override fun enter(
        operation: WorkOperation,
        input: Long,
    ): Long {
        val calls = stack.get()
        val resolved = resolveInput(input, calls)
        val token =
            synchronized(lock) {
                val stats = work.getOrPut(operation, ::MutableWork)
                stats.calls += 1
                if (resolved != UNKNOWN_INPUT) {
                    stats.knownInputCalls += 1
                    stats.inputs += resolved
                }
                calls.lastOrNull()?.let { parent ->
                    val edge = parent.operation to operation
                    edgeCalls[edge] = edgeCalls.getOrDefault(edge, 0L) + 1L
                }
                openSpans += 1
                nextToken++
            }
        calls.addLast(ActiveCall(token, operation, resolved))
        return token
    }

    override fun exit(token: Long) {
        val call = stack.get().removeLastOrNull()
        check(call?.token == token) { "profiling spans closed out of order: expected ${call?.token}, got $token" }
        synchronized(lock) { openSpans -= 1 }
    }

    override fun bytes(
        operation: WorkOperation,
        count: Long,
        input: Long,
    ) {
        require(count >= 0) { "copied bytes must be non-negative" }
        val resolved = resolveInput(input, stack.get())
        synchronized(lock) {
            val stats = work.getOrPut(operation, ::MutableWork)
            stats.copiedBytes += count
            if (resolved != UNKNOWN_INPUT) stats.inputs += resolved
        }
    }

    override fun cache(
        operation: WorkOperation,
        hit: Boolean,
        input: Long,
    ) {
        val resolved = resolveInput(input, stack.get())
        synchronized(lock) {
            val stats = work.getOrPut(operation, ::MutableWork)
            if (hit) stats.cacheHits += 1 else stats.cacheMisses += 1
            if (resolved != UNKNOWN_INPUT) stats.inputs += resolved
        }
    }

    fun snapshot(): WorkSnapshot =
        synchronized(lock) {
            WorkSnapshot(
                operations =
                    work.map { (operation, stats) ->
                        OperationWork(
                            operation,
                            stats.calls,
                            stats.knownInputCalls,
                            stats.inputs.size.toLong(),
                            stats.copiedBytes,
                            stats.cacheHits,
                            stats.cacheMisses,
                        )
                    },
                edges = edgeCalls.map { (edge, calls) -> CallEdge(edge.first, edge.second, calls) },
                openSpans = openSpans,
            )
        }

    private fun resolveInput(
        requested: Long,
        calls: ArrayDeque<ActiveCall>,
    ): Long = if (requested == INHERIT_INPUT) calls.lastOrNull()?.input ?: UNKNOWN_INPUT else requested
}
