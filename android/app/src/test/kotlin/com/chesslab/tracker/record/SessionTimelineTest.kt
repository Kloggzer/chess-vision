package com.chesslab.tracker.record

import com.chesslab.engine.api.TrackerEvent
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val TIMELINE_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"

@OptIn(ExperimentalCoroutinesApi::class)
class SessionTimelineTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun frameMoveAndVideoClockShareOneOrderedFile() =
        runTest {
            val timeline = SessionTimeline(dir, this, UnconfinedTestDispatcher(testScheduler))
            timeline.frame(TimelineFrame(11L, 21L, 31L, 2560, 1440, 0, TIMELINE_FEN, null, CORNERS))
            timeline.event(TrackerEvent.MoveCommitted("e2e4", "e4", TIMELINE_FEN, "diff", false), 22L, 32L)
            timeline.video(23L, 1_000_000L, 2048L, final = false, error = null)
            timeline.close()
            advanceUntilIdle()

            val rows = File(dir, "timeline.jsonl").readLines().map { Json.parseToJsonElement(it).jsonObject }
            assertEquals(listOf("frame", "event", "video_sync"), rows.map { it.getValue("kind").jsonPrimitive.content })
            assertEquals("11", rows[0].getValue("sensorTsNs").jsonPrimitive.content)
            assertEquals("e2e4", rows[1].getValue("uci").jsonPrimitive.content)
            assertEquals("1000000", rows[2].getValue("durationNs").jsonPrimitive.content)
        }
}
