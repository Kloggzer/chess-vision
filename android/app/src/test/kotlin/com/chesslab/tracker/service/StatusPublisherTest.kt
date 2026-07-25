package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.pipeline.Stage
import com.chesslab.tracker.pipeline.StageTimings
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * `backgroundScope`, never a hand-rolled `TestScope`: the publisher's `sample` and `stateIn`
 * coroutines never complete by design, and `runTest` would wait for them forever.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class StatusPublisherTest {
    @Test
    fun statusIsSampledAtAboutTenHertz() =
        runTest {
            val publisher = StatusPublisher(backgroundScope)
            val seen = mutableListOf<TrackerStatus?>()
            backgroundScope.launch { publisher.status.toList(seen) }
            // 100 pushes spread over one second of virtual time — 15-30 fps in reality.
            repeat(100) { i ->
                publisher.publish(statusOf(fen = "fen$i"), emptyList(), null)
                advanceTimeBy(10)
            }
            advanceTimeBy(200)
            // The initial null plus roughly ten samples; never one per push.
            assertTrue(seen.size in 8..14, "expected ~10 emissions in 1 s, got ${seen.size}")
        }

    @Test
    fun eventsAreNotReplayedToALateCollector() =
        runTest {
            val publisher = StatusPublisher(backgroundScope)
            publisher.publish(statusOf(), listOf(TrackerEvent.ReAnchored), null)
            val late = mutableListOf<TrackerEvent>()
            backgroundScope.launch { publisher.events.toList(late) }
            advanceTimeBy(10)
            publisher.publish(statusOf(), listOf(TrackerEvent.Note("after")), null)
            advanceTimeBy(10)
            assertEquals(listOf(TrackerEvent.Note("after")), late)
        }

    @Test
    fun previewConversionDropsWhenOneIsInFlight() {
        // The gate the frame bus publishes previews through: an analyzer frame that arrives while
        // a conversion runs is DROPPED, never queued (commit 4a7609e).
        val gate = InFlightGate()
        assertTrue(gate.tryEnter())
        assertFalse(gate.tryEnter())
        assertFalse(gate.tryEnter())
        gate.leave()
        assertTrue(gate.tryEnter())
    }

    @Test
    fun appStageTimingsAreMergedIntoTheEngineSnapshot() =
        runTest {
            // A fake clock that ticks exactly 1 ms per reading, so the warp stage measures 1.0.
            var ns = 0L
            val timings =
                StageTimings(nowNs = {
                    ns += 1_000_000
                    ns
                }, logLine = {})
            timings.begin()
            timings.mark(Stage.WARP)
            val publisher = StatusPublisher(backgroundScope, timings)
            publisher.publish(statusOf(), emptyList(), null)
            advanceTimeBy(STATUS_SAMPLE_MS * 2)
            assertEquals(
                1.0,
                publisher.status.value
                    ?.stageTimingsMs
                    ?.get("warp"),
            )
        }

    @Test
    fun theUnsampledFenIsAvailableImmediately() =
        runTest {
            // The CNN observer's discard-on-change guard cannot wait 100 ms for a sample.
            val publisher = StatusPublisher(backgroundScope)
            publisher.publish(statusOf(fen = "some-fen"), emptyList(), null)
            assertEquals("some-fen", publisher.lastFen)
        }
}
