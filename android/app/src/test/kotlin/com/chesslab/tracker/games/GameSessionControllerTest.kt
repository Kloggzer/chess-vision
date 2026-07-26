package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.record.CaptureFrame
import com.chesslab.tracker.record.CaptureSource
import com.chesslab.tracker.record.FrameWriter
import com.chesslab.tracker.record.RecordingGates
import com.chesslab.tracker.record.RecordingPrefs
import com.chesslab.tracker.record.SessionCaptureController
import com.chesslab.tracker.record.SessionMeta
import com.chesslab.tracker.record.SessionRecorder
import com.chesslab.tracker.ui.tracking.idleTrackerStatus
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Side
import com.github.bhlangonijr.chesslib.move.Move
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
private const val AFTER_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
private const val AFTER_PAIR = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"
private const val FOOLS_MATE = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"

private class Source : CaptureSource {
    override fun grab() =
        CaptureFrame(
            1920,
            1080,
            FloatArray(8),
            FrameWriter {
                it.writeBytes(ByteArray(8))
                8L
            },
        )

    override fun geometryNote(): String? = null
}

class GameSessionControllerTest {
    @TempDir
    lateinit var dir: File

    private var now = 1_700_000_000_000L

    private val store by lazy { GameStore(File(dir, "games")) }

    private fun capture(enabled: Boolean) =
        SessionCaptureController(
            source = Source(),
            open = { SessionRecorder(File(dir, "s").also(File::mkdirs), SessionMeta("s", "default", 1920, 1080)) },
            gates = RecordingGates(),
            prefs = { RecordingPrefs(enabled = enabled) },
            existingBytes = { 0L },
        )

    private fun controller(capture: SessionCaptureController = capture(enabled = false)) =
        GameSessionController(store, capture, { now }, { "game-$it" })

    private fun move(
        uci: String,
        san: String,
        fen: String,
    ) = TrackerEvent.MoveCommitted(uci, san, fen, "diff", false)

    /** `Commit.kt:165` — one event, two plies, only the FINAL position. */
    private fun pair() = TrackerEvent.SequenceCommitted(listOf("g1f3", "b8c6"), listOf("Nf3", "Nc6"), AFTER_PAIR, "diff_pair")

    /** The position BETWEEN the pair's plies, as chesslib renders it — what the engine publishes. */
    private fun afterNf3(): String =
        Board()
            .apply {
                loadFromFen(AFTER_E5)
                doMove(Move("g1f3", Side.WHITE))
            }.fen

    @Test
    fun committedMovesBecomeASavedGame() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        controller.onEvent(move("e7e5", "e5", AFTER_E5), null)
        assertEquals(2, controller.state.value.moveCount)
        val saved = controller.endAndSave()
        assertEquals(2, saved?.moveCount)
        val game = store.open(saved!!.id)
        assertEquals(listOf("e4", "e5"), game?.moves?.map { it.san })
        assertEquals("board-a", game?.profileName)
        assertEquals(STARTPOS, game?.startFen)
    }

    @Test
    fun anEmptyGameIsNeverSaved() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        assertNull(controller.endAndSave())
        assertTrue(store.list().isEmpty())
    }

    @Test
    fun aMateEndsAndSavesTheGameByItself() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("d8h4", "Qh4#", FOOLS_MATE), null)
        assertEquals(1, store.list().size)
        assertEquals("0-1", store.list().single().result)
        assertEquals(0, controller.state.value.moveCount)
    }

    @Test
    fun undoDropsTheMoveAndItsRecordedFrame() {
        val capture = capture(enabled = true)
        val controller = controller(capture)
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        assertEquals(1, capture.recorder?.count)
        assertEquals("s", controller.state.value.recordingSessionId)
        // The published position went BACK to the one before the move: that is an undo, and a
        // taken-back move must survive neither in the library nor as labeled data.
        controller.onStatus(idleTrackerStatus(STARTPOS))
        assertEquals(0, controller.state.value.moveCount)
        assertEquals(0, capture.recorder?.count)
    }

    /**
     * D1. The engine commits plies through TWO events: `MoveCommitted` and `SequenceCommitted`
     * (fast play `Commit.kt:165`, CNN recovery `CnnTick.kt:252`). Both queue a session photo in
     * the engine (`Commit.kt:158`, `CnnTick.kt:223`), and five other consumers of the bus handle
     * both. This controller handled only the first, so every pair commit and every CNN recovery
     * was missing from the saved game AND from the recorded session.
     *
     * One photo per COMMIT, not per ply — that is what `queueSessionCapture(sans.last())` does.
     */
    @Test
    fun aFastPlayPairIsRecordedAsTwoMovesAndOnePhoto() {
        val capture = capture(enabled = true)
        val controller = controller(capture)
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        controller.onEvent(move("e7e5", "e5", AFTER_E5), null)
        controller.onEvent(pair(), null)
        assertEquals(4, controller.state.value.moveCount, "a pair commit is two plies")
        assertEquals(3, capture.recorder?.count, "one photo per commit — the pair gets one, not two")
        val saved = controller.endAndSave()
        assertEquals(listOf("e4", "e5", "Nf3", "Nc6"), store.open(saved!!.id)?.moves?.map { it.san })
    }

    /** The plies of a pair carry their own positions, so an undo right after one is still seen. */
    @Test
    fun anUndoAfterAPairDropsOnlyItsLastPly() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        controller.onEvent(move("e7e5", "e5", AFTER_E5), null)
        controller.onEvent(pair(), null)
        controller.onStatus(idleTrackerStatus(afterNf3()))
        assertEquals(3, controller.state.value.moveCount)
    }

    /**
     * D2. Python takes the deferred photo only when the occlusion set is empty
     * (`tracker.py:3085-3086`); the Kotlin engine emits `ReAnchored` unconditionally
     * (`TrackerEngine.kt:414`). Flushing on every re-anchor photographs the board with a hand
     * still over it — 64 crops labeled as pieces that cannot be seen.
     */
    @Test
    fun aReAnchorWithSquaresStillOccludedDoesNotTakeThePhoto() {
        val capture = capture(enabled = true)
        val controller = controller(capture)
        controller.onIdle(STARTPOS, "board-a")
        val occluded = idleTrackerStatus(AFTER_E4).copy(occlusionVetoed = setOf("e2", "e4"))
        controller.onEvent(move("e2e4", "e4", AFTER_E4), occluded)
        assertNull(capture.recorder, "an occluded board defers the photo")
        controller.onEvent(TrackerEvent.ReAnchored, occluded)
        assertNull(capture.recorder, "and a re-anchor that still sees a hand must not take it")
        controller.onEvent(TrackerEvent.ReAnchored, idleTrackerStatus(AFTER_E4))
        assertEquals(1, capture.recorder?.count, "the clean re-anchor takes it")
    }
}
