package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.camera.CameraHealth
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private val ALARM_EVENT = TrackerEvent.Alarm("illegal_move", listOf("e4"), "e2e4", "e4")

/**
 * The stall watchdog rewrites `note` without asking [resolveNote]'s precedence ladder, so it
 * overwrites the two notes that rank above every fault: the latched alarm (which is also the
 * background NOTIFICATION text) and the user's own camera release.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class StallNotePrecedenceTest {
    private var clockMs = 0L

    @Test
    fun aStalledFeedMustNotOverwriteTheAlarmNote() =
        runTest {
            val publisher = StatusPublisher(backgroundScope, nowMs = { clockMs })
            publisher.publish({ statusOf(alarm = ALARM_EVENT) }, "fen", emptyList(), null)
            advanceTimeBy(STATUS_SAMPLE_MS * 2)
            assertTrue(
                publisher.status.value
                    ?.note
                    ?.startsWith("Position lost") == true,
                "precondition: the alarm owns the note",
            )

            clockMs += 5_000
            advanceTimeBy(5_000)

            val note = publisher.status.value?.note
            assertTrue(note?.startsWith("Position lost") == true, "the alarm must survive a stalled feed, was: $note")
        }

    @Test
    fun aReleasedCameraIsNotReportedAsAStalledFeed() =
        runTest {
            val publisher = StatusPublisher(backgroundScope, nowMs = { clockMs })
            publisher.cameraHealth = CameraHealth.Off
            publisher.publish({ statusOf() }, "fen", emptyList(), null)
            advanceTimeBy(STATUS_SAMPLE_MS * 2)

            clockMs += 5_000
            advanceTimeBy(5_000)

            val note = publisher.status.value?.note
            assertTrue(note == "tracking stopped — the camera is released", "a release is not a fault, was: $note")
        }
}
