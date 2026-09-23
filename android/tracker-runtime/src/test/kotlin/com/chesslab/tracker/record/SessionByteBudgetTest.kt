package com.chesslab.tracker.record

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val FRAME_BYTES = 4096

/** Taken once at service start, the cap never saw sessions finished in THIS process. */
class SessionByteBudgetTest {
    @TempDir
    lateinit var root: File

    private var opened = 0

    private fun controller(
        sessions: SessionStore,
        budget: SessionByteBudget,
        capBytes: Long,
    ) = SessionCaptureController(
        source = StubCaptureSource(FRAME_BYTES),
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
        first.queue(1, FEN_AFTER_E4, "e4", clean = true)
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
        first.queue(1, FEN_AFTER_E4, "e4", clean = true)
        first.stop()

        val second = controller(sessions, budget, capBytes = FRAME_BYTES.toLong())
        second.queue(1, FEN_AFTER_E4, "e4", clean = true)

        assertNull(second.recorder, "the cap was already spent by the game before it")
    }

    @Test
    fun `deleting a session gives its bytes back to the budget`() {
        oneSession()
        val store = SessionStore(root)
        val budget = SessionByteBudget(store)
        val before = budget.spent()

        store.delete(SESSION)

        assertEquals(store.totalBytes(), budget.spent(), "spent() still charges $before bytes that are no longer on disk")
    }

    /** Two view models each hold their OWN `SessionStore` on the same directory. */
    @Test
    fun `a deletion through the screens own store reaches the budget`() {
        oneSession()
        val budget = SessionByteBudget(SessionStore(root))
        val before = budget.spent()

        SessionStore(root).delete(SESSION)

        assertEquals(0L, budget.spent(), "spent() still charges $before bytes the games screen deleted")
    }

    /** Deleting is the user's only remedy; the latch held until a process restart. */
    @Test
    fun `the size-cap latch does not survive the next game`() {
        val capture =
            SessionCaptureController(
                source = NoFrameCaptureSource,
                open = { error("no recorder in this test") },
                gates = RecordingGates(),
                prefs = { RecordingPrefs(enabled = true, capBytes = 1L) },
                existingBytes = { 2L },
            )
        capture.queue(ply = 1, fen = FEN_AFTER_E4, san = "e4", clean = true)
        assertNotNull(capture.stoppedReason, "Aufbau: die Kappe muss zuerst greifen")

        capture.stop()

        assertNull(capture.stoppedReason, "der Riegel rastete dauerhaft ein")
    }

    private fun oneSession() {
        File(root, SESSION).apply { mkdirs() }.let { File(it, "video.mp4").writeText("x".repeat(4096)) }
    }

    private companion object {
        const val SESSION = "20260916-101010"
    }
}
