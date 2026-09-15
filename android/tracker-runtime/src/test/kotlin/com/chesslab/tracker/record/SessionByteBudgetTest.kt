package com.chesslab.tracker.record

import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
private const val FRAME_BYTES = 4096

/**
 * The size cap took `totalBytes()` once at service start and never again, so every session finished
 * in THIS process was invisible to it — three 3 GB games in a row still measured the disk as it was
 * when the service came up. This is the wiring `GameSessionWiring.buildController` uses.
 */
class SessionByteBudgetTest {
    @TempDir
    lateinit var root: File

    private var opened = 0

    private fun controller(
        sessions: SessionStore,
        budget: SessionByteBudget,
        capBytes: Long,
    ) = SessionCaptureController(
        source = Source(),
        open = {
            opened++
            val id = "s$opened"
            SessionRecorder(sessions.create(id), SessionMeta(id, "default", it.width, it.height))
        },
        gates = RecordingGates(),
        prefs = { RecordingPrefs(enabled = true, capBytes = capBytes) },
        existingBytes = budget::spent,
        hooks = RecordingHooks(finished = budget::finished),
    )

    @Test
    fun `a session finished in this process counts against the cap`() {
        val sessions = SessionStore(root)
        val budget = SessionByteBudget(sessions)
        val before = budget.spent()

        val first = controller(sessions, budget, capBytes = Long.MAX_VALUE)
        first.queue(1, FEN, "e4", clean = true)
        assertNotNull(first.recorder)
        first.stop()

        assertTrue(budget.spent() >= before + FRAME_BYTES) {
            "the finished session is invisible: ${budget.spent()} against $before"
        }
    }

    @Test
    fun `the next game is refused once the finished one filled the cap`() {
        val sessions = SessionStore(root)
        val budget = SessionByteBudget(sessions)

        val first = controller(sessions, budget, capBytes = FRAME_BYTES.toLong())
        first.queue(1, FEN, "e4", clean = true)
        first.stop()

        val second = controller(sessions, budget, capBytes = FRAME_BYTES.toLong())
        second.queue(1, FEN, "e4", clean = true)

        assertNull(second.recorder, "the cap was already spent by the game before it")
    }

    private class Source : CaptureSource {
        override fun grab() =
            CaptureFrame(
                1920,
                1080,
                FloatArray(8),
                FrameWriter {
                    it.writeBytes(ByteArray(FRAME_BYTES))
                    FRAME_BYTES.toLong()
                },
            )

        override fun geometryNote(): String? = null
    }
}
