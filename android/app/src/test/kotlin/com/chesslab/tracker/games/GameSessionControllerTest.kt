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
private const val AFTER_JUMP = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"
private const val AFTER_JUMP_NC6 = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"
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

    /** A pair whose head is legal after 1.e4 — used where the record must STAY on its line. */
    private fun replyPair() = TrackerEvent.SequenceCommitted(listOf("e7e5", "g1f3"), listOf("e5", "Nf3"), AFTER_JUMP, "diff_pair")

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
     * D3. Four of the five games recorded on the device were NOT legal sequences from their own
     * `startFen` — they broke at plies 1, 2, 18 and 28. The engine cannot commit an illegal move,
     * so the break is the engine's board JUMPING between two commits (an alarm being resolved, a
     * FEN resync, an accepted recovery). This controller sees none of those: it handles
     * `MoveCommitted`, `SequenceCommitted` and `ReAnchored`, and drops `Alarm` / `AlarmCleared`.
     *
     * A record that spans two position lines is unusable as a game AND as labeled data, because
     * every FEN after the seam is wrong. So the seam ends the record, and the next one starts at
     * the position the engine actually reached.
     */
    @Test
    fun aCommitThatLeftTheRecordsLineStartsANewRecord() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        // White again, with black to move: only reachable if the engine's board moved on without us.
        controller.onEvent(move("g1f3", "Nf3", AFTER_JUMP), null)

        val stored = store.list()
        assertEquals(1, stored.size, "the broken record was closed")
        assertEquals(listOf("e4"), store.open(stored.single().id)?.moves?.map { it.san })
        assertEquals(0, controller.state.value.moveCount, "and the new one starts empty, at the seam")

        controller.onEvent(move("b8c6", "Nc6", AFTER_JUMP_NC6), null)
        val saved = controller.endAndSave()
        val fresh = store.open(saved!!.id)
        assertEquals(AFTER_JUMP, fresh?.startFen, "the new record is anchored where the engine is")
        assertEquals(listOf("Nc6"), fresh?.moves?.map { it.san })
    }

    /**
     * Every one of the 77 plies recorded across five device sessions stored `provenance: null` —
     * including the sessions recorded with debug ON. The decider was being read from the debug
     * payload and matched by `accepted && uci`, a second source that can fail to line up, while the
     * engine states it directly on the commit event. Without it a stored game cannot answer the one
     * question worth asking of it: which path committed this move.
     */
    @Test
    fun theDeciderIsRecordedWithoutADebugPayload() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(TrackerEvent.MoveCommitted("e2e4", "e4", AFTER_E4, "cnn_overrule", true), null)
        controller.onEvent(replyPair(), null)

        val saved = controller.endAndSave()
        val moves = store.open(saved!!.id)!!.moves
        assertEquals("cnn_overrule", moves[0].provenance?.decider)
        assertTrue(moves[0].provenance!!.priorUsed)
        assertNull(moves[1].provenance, "provenance rides on the LAST ply of a commit")
        assertEquals("diff_pair", moves[2].provenance?.decider, "and a pair states its decider too")
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

    /**
     * While the illegal-move latch is up, no frame may be written.
     *
     * The app's board and the physical board disagree — that is what the alarm MEANS — so a photo
     * taken now is stored against a FEN that does not describe it. That is poisoned training data
     * and it is indistinguishable from good data afterwards.
     *
     * Python has no gate of its own: alarmed, it blocks every commit and every re-anchor
     * (`tracker.py:3105`), and those two are the only things that drive the recorder.
     * `TrackerEngine.kt:406` blocks re-anchor the same way. This test pins the property at the
     * CONSUMER, so it survives whatever the engine does — it fails against an `isClean` that
     * checks only occlusion and taint.
     */

    @Test
    fun nothingIsRecordedWhileTheAlarmIsLatched() {
        val capture = capture(enabled = true)
        val controller = controller(capture)
        controller.onIdle(STARTPOS, "board-a")
        val alarmed =
            idleTrackerStatus(AFTER_E4).copy(
                alarm = TrackerEvent.Alarm("illegal_move", listOf("e4"), "e2e4", "e4"),
            )
        controller.onEvent(move("e2e4", "e4", AFTER_E4), alarmed)
        assertNull(capture.recorder, "a commit seen while alarmed must not photograph the board")
        controller.onEvent(TrackerEvent.ReAnchored, alarmed)
        assertNull(capture.recorder, "and neither may a re-anchor while the latch is still up")
        // Cleared by the user: the deferred photo is still owed and is taken on the next clean tick.
        controller.onEvent(TrackerEvent.ReAnchored, idleTrackerStatus(AFTER_E4))
        assertEquals(1, capture.recorder?.count, "once the alarm is gone the pending photo is taken")
    }

    /**
     * A seam must not swallow the plies that caused it.
     *
     * They are illegal from the closed record's last position — that is what a seam IS — and they
     * precede the new record's `startFen`, so they land in neither move list. That was silent: one
     * played game on 2026-07-28 was stored as three files, and Qxd4, Qe5+ and Be7 appear in none of
     * them. Chaining the fragments back together is impossible without this.
     */
    @Test
    fun aSeamRecordsThePliesThatCausedItOnTheNewRecord() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), idleTrackerStatus(AFTER_E4))
        // Nf3 is illegal after 1.e4 alone: the engine jumped, so the record is cut here.
        val jump = TrackerEvent.MoveCommitted("g1f3", "Nf3", AFTER_JUMP, "cnn_recovery", false)
        controller.onEvent(jump, idleTrackerStatus(AFTER_JUMP))
        controller.onEvent(move("b8c6", "Nc6", AFTER_JUMP_NC6), idleTrackerStatus(AFTER_JUMP_NC6))

        val saved = controller.endAndSave()!!
        val opened = store.open(saved.id)!!.openedBySeam
        assertEquals(listOf("Nf3"), opened?.sans, "the jumping ply is recorded on the new file")
        assertEquals(listOf("g1f3"), opened?.ucis)
        assertEquals("cnn_recovery", opened?.decider)
        assertEquals(AFTER_E4, opened?.fenBefore, "and the position the closed record ended on")
        assertTrue(opened?.previousId != null, "so the two fragments can be chained")
    }
}
