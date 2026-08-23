package com.chesslab.tracker.perf

import com.chesslab.engine.perf.CallEdge
import com.chesslab.engine.perf.WorkBudget
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.engine.perf.check
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.random.Random

class WorkProfilerTest {
    @Test
    fun `records exact calls repeated inputs bytes cache and call graph`() {
        val probe = RecordingWorkProbe()
        WorkProfiler.install(probe).use {
            repeat(3) {
                WorkProfiler.span(WorkOperation.FRAME, input = 17L) {
                    WorkProfiler.span(WorkOperation.FEN_SERIALIZE, input = 91L) { "fen" }
                    WorkProfiler.bytes(WorkOperation.RAW_FRAME_COPY, 1024L)
                }
            }
            WorkProfiler.cache(WorkOperation.CNN_CROP, hit = true, input = 17L)
            WorkProfiler.cache(WorkOperation.CNN_CROP, hit = false, input = 18L)
        }

        val snapshot = probe.snapshot()
        val fen = requireNotNull(snapshot.operation(WorkOperation.FEN_SERIALIZE))
        val copy = requireNotNull(snapshot.operation(WorkOperation.RAW_FRAME_COPY))
        val crops = requireNotNull(snapshot.operation(WorkOperation.CNN_CROP))
        assertEquals(3L, fen.calls)
        assertEquals(1L, fen.distinctInputs)
        assertEquals(2L, fen.repeatedInputCalls)
        assertEquals(3L * 1024L, copy.copiedBytes)
        assertEquals(1L, crops.cacheHits)
        assertEquals(1L, crops.cacheMisses)
        assertEquals(CallEdge(WorkOperation.FRAME, WorkOperation.FEN_SERIALIZE, 3L), snapshot.edges.single())
        assertEquals(0, snapshot.openSpans)
    }

    @Test
    fun `exception closes a span and installation restores the prior probe`() {
        val outer = RecordingWorkProbe()
        WorkProfiler.install(outer).use {
            val inner = RecordingWorkProbe()
            assertThrows<IllegalStateException> {
                WorkProfiler.install(inner).use {
                    WorkProfiler.span(WorkOperation.FRAME, 1L) { error("stop") }
                }
            }
            WorkProfiler.span(WorkOperation.FRAME, 2L) {}
            assertEquals(0, inner.snapshot().openSpans)
        }
        assertEquals(1L, requireNotNull(outer.snapshot().operation(WorkOperation.FRAME)).calls)
    }

    @Test
    fun `records inclusive self and maximum time for nested calls`() {
        val ticks = ArrayDeque(listOf(0L, 10L, 40L, 100L))
        val probe = RecordingWorkProbe { ticks.removeFirst() }
        WorkProfiler.install(probe).use {
            WorkProfiler.span(WorkOperation.FRAME, 1L) {
                WorkProfiler.span(WorkOperation.LEGAL_MOVES, 1L) {}
            }
        }

        val frame = requireNotNull(probe.snapshot().operation(WorkOperation.FRAME))
        val legal = requireNotNull(probe.snapshot().operation(WorkOperation.LEGAL_MOVES))
        assertEquals(100L, frame.inclusiveNanos)
        assertEquals(70L, frame.selfNanos)
        assertEquals(100L, frame.maxNanos)
        assertEquals(30L, legal.inclusiveNanos)
        assertEquals(30L, legal.selfNanos)
        assertEquals(30L, legal.maxNanos)
    }

    @Test
    fun `seeded execution produces a stable performance oracle`() {
        val random = Random(FUZZ_SEED)
        val inputs = LongArray(FUZZ_CALLS) { random.nextInt(FUZZ_INPUTS).toLong() }
        val probe = RecordingWorkProbe()
        WorkProfiler.install(probe).use {
            inputs.forEach { input -> WorkProfiler.span(WorkOperation.LEGAL_MOVES, input) {} }
        }

        val snapshot = probe.snapshot()
        val legal = requireNotNull(snapshot.operation(WorkOperation.LEGAL_MOVES))
        assertEquals(FUZZ_CALLS.toLong(), legal.calls)
        assertEquals(inputs.toSet().size.toLong(), legal.distinctInputs)
        val violations =
            snapshot.check(
                listOf(
                    WorkBudget(
                        WorkOperation.LEGAL_MOVES,
                        maxRepeatedInputCalls = FUZZ_CALLS - FUZZ_INPUTS - 1L,
                    ),
                ),
            )
        assertTrue(violations.single().message.contains("repeated-input calls"))
        assertTrue(snapshot.report().contains("engine.legal_moves"))
    }

    private companion object {
        const val FUZZ_SEED = 847_291
        const val FUZZ_CALLS = 200
        const val FUZZ_INPUTS = 7
    }
}
