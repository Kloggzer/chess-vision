package com.chesslab.tracker.record

import com.chesslab.engine.api.Decision
import com.chesslab.engine.api.TrackerEvent
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/**
 * Tests for [SessionRecorderImpl] that do not require OpenCV native libs:
 * event dispatch, undo feedback flip, and JSONL schema correctness.
 *
 * Frame-capture tests (which need [org.opencv.core.Mat]) require a device or
 * Robolectric and live in a separate instrumented test class.
 */
class SessionRecorderImplTest {
    @TempDir
    lateinit var tempDir: File

    private lateinit var sessionDir: File
    private lateinit var recorder: SessionRecorderImpl

    @BeforeEach
    fun setUp() {
        sessionDir = File(tempDir, "20260709-120000")
        recorder = SessionRecorderImpl(sessionDir)
    }

    @AfterEach
    fun tearDown() {
        recorder.close()
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private fun fakeDecision(): Decision =
        Decision(
            decider = "diff",
            reason = "single z>3.0",
            best = 5.0,
            second = 1.0,
            margin = 4.0,
            changed = listOf("e2", "e4"),
            shadowVeto = emptyList(),
            occluded = emptyList(),
            priorUsed = false,
        )

    // ── Tests ──────────────────────────────────────────────────────────────

    @Test
    fun `no-ops when no pending capture and clean frame arrives`() {
        recorder.onCleanFrame()
        assertEquals(0, recorder.count())
    }

    @Test
    fun `no-ops when no frame fed and clean frame arrives`() {
        recorder.onEvent(
            TrackerEvent.MoveCommitted(
                san = "e4",
                fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
                decision = fakeDecision(),
            ),
        )
        recorder.onCleanFrame()
        assertEquals(0, recorder.count())
    }

    @Test
    fun `sessionId returns directory name`() {
        assertEquals("20260709-120000", recorder.sessionId())
    }

    @Test
    fun `count returns zero before first flush`() {
        assertEquals(0, recorder.count())
        recorder.onEvent(
            TrackerEvent.MoveCommitted("e4", "fen", fakeDecision()),
        )
        assertEquals(0, recorder.count())
    }

    @Test
    fun `undo of non-existent san is no-op`() {
        recorder.onEvent(
            TrackerEvent.FeedbackRecorded(
                san = "nonexistent",
                uci = "e2e4",
                label = "bad",
                decision = fakeDecision(),
            ),
        )
        assertEquals(0, recorder.count())
    }

    @Test
    fun `log file is created on session init`() {
        assertTrue(sessionDir.exists())
        assertTrue(File(sessionDir, "frames").exists())
    }

    @Test
    fun `JSONL schema has all expected top-level fields`() {
        val entry =
            LogEntry(
                frame = "frames/0000.jpg",
                ply = 1,
                fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
                moveSan = "e4",
                ts = "ts",
                corners =
                    listOf(
                        listOf(100.0, 50.0),
                        listOf(900.0, 60.0),
                        listOf(880.0, 900.0),
                        listOf(120.0, 880.0),
                    ),
                decision =
                    DecisionEntry(
                        decider = "diff",
                        reason = "single z>3.0",
                        best = 5.0,
                        second = 1.0,
                        margin = 4.0,
                        changed = listOf("e2", "e4"),
                        shadowVeto = emptyList(),
                        occluded = emptyList(),
                        priorUsed = false,
                    ),
                feedback = "good",
            )
        val parsed =
            Json { prettyPrint = false }
                .encodeToString(entry)
                .let { Json { prettyPrint = false }.parseToJsonElement(it) }
                .jsonObject
        assertEquals("frames/0000.jpg", parsed["frame"]!!.jsonPrimitive.content)
        assertNotNull(parsed["move_san"])
        assertNotNull(parsed["fen"])
        assertEquals("good", parsed["feedback"]!!.jsonPrimitive.content)
        val cornersArr = parsed["corners"]!!.jsonArray
        assertEquals(4, cornersArr.size)
        assertEquals(
            100.0,
            cornersArr[0]
                .jsonArray[0]
                .jsonPrimitive.content
                .toDouble(),
        )
        assertEquals(
            50.0,
            cornersArr[0]
                .jsonArray[1]
                .jsonPrimitive.content
                .toDouble(),
        )
        val dec = parsed["decision"]!!.jsonObject
        assertEquals("diff", dec["decider"]!!.jsonPrimitive.content)
        assertNotNull(dec["shadow_veto"])
        assertNotNull(dec["prior_used"])
    }
}
