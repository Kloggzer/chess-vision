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
import org.junit.jupiter.api.Assertions.assertArrayEquals
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
    /** Mirrors `advanceTimeBy` so the publisher's build gate and the flow's sampler see one clock. */
    private var clockMs = 0L

    private fun publisherOn(scope: kotlinx.coroutines.CoroutineScope) = StatusPublisher(scope, nowMs = { clockMs })

    @Test
    fun statusIsSampledAtAboutTenHertz() =
        runTest {
            val publisher = publisherOn(backgroundScope)
            val seen = mutableListOf<TrackerStatus?>()
            backgroundScope.launch { publisher.status.toList(seen) }
            // 100 pushes spread over one second of virtual time — 15-30 fps in reality.
            repeat(100) { i ->
                publisher.publish({ statusOf(fen = "fen$i") }, "fen$i", emptyList(), null)
                clockMs += 10
                advanceTimeBy(10)
            }
            advanceTimeBy(200)
            // The initial null plus roughly ten samples; never one per push.
            assertTrue(seen.size in 8..14, "expected ~10 emissions in 1 s, got ${seen.size}")
        }

    /**
     * The gate is on the BUILD, not just the emission: `TrackerStatus` costs a chesslib FEN and
     * four 64-entry maps, and it used to be assembled on every analyzer frame for a 10 Hz flow.
     */
    @Test
    fun theStatusIsBuiltAtTheSampleRate_notPerFrame() =
        runTest {
            val publisher = publisherOn(backgroundScope)
            var built = 0
            repeat(100) { i ->
                publisher.publish({
                    built++
                    statusOf(fen = "fen$i")
                }, "fen$i", emptyList(), null)
                clockMs += 10
            }
            assertTrue(built in 8..12, "expected ~10 builds over 1 s of frames, got $built")
        }

    @Test
    fun eventsAreNotReplayedToALateCollector() =
        runTest {
            val publisher = publisherOn(backgroundScope)
            publisher.publish({ statusOf() }, "", listOf(TrackerEvent.ReAnchored), null)
            val late = mutableListOf<TrackerEvent>()
            backgroundScope.launch { publisher.events.toList(late) }
            advanceTimeBy(10)
            publisher.publish({ statusOf() }, "", listOf(TrackerEvent.Note("after")), null)
            advanceTimeBy(10)
            assertEquals(listOf(TrackerEvent.Note("after")), late)
        }

    /** Events are the alarm and move channel — never gated by the status build's throttle. */
    @Test
    fun everyEventIsEmittedEvenBetweenStatusBuilds() =
        runTest {
            val publisher = publisherOn(backgroundScope)
            val seen = mutableListOf<TrackerEvent>()
            backgroundScope.launch { publisher.events.toList(seen) }
            advanceTimeBy(10)
            repeat(5) { i -> publisher.publish({ statusOf() }, "", listOf(TrackerEvent.Note("e$i")), null) }
            advanceTimeBy(10)
            assertEquals((0 until 5).map { TrackerEvent.Note("e$it") }, seen)
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
            val publisher = StatusPublisher(backgroundScope, timings, nowMs = { clockMs })
            publisher.publish({ statusOf() }, "", emptyList(), null)
            advanceTimeBy(STATUS_SAMPLE_MS * 2)
            assertEquals(
                1.0,
                publisher.status.value
                    ?.stageTimingsMs
                    ?.get("warp"),
            )
        }

    /** D06b-4: the engine owns no geometry, so the overlay's board quad comes from here. */
    @Test
    fun theBoardCornersArePublishedIntoTheStatus() =
        runTest {
            val publisher = publisherOn(backgroundScope)
            val corners = floatArrayOf(0f, 0f, 100f, 0f, 100f, 100f, 0f, 100f)
            publisher.corners = corners
            publisher.publish({ statusOf() }, "", emptyList(), null)
            advanceTimeBy(STATUS_SAMPLE_MS * 2)
            assertArrayEquals(corners, publisher.status.value?.corners)
        }

    /**
     * The CNN observer's discard-on-change guard cannot wait 100 ms for a sample — and it must not
     * wait for a status BUILD either, which is why the FEN is passed separately.
     */
    @Test
    fun theUnsampledFenIsAvailableImmediately() =
        runTest {
            val publisher = publisherOn(backgroundScope)
            publisher.publish({ statusOf(fen = "some-fen") }, "some-fen", emptyList(), null)
            assertEquals("some-fen", publisher.lastFen)
            // Second frame inside the same sample window: no build, but the FEN still moves.
            publisher.publish({ error("must not build") }, "next-fen", emptyList(), null)
            assertEquals("next-fen", publisher.lastFen)
        }
}
