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
import org.junit.jupiter.api.Assertions.assertFalse
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

/**
 * A jump nothing explains: [AFTER_JUMP] with White's queen's rook gone.
 *
 * [AFTER_JUMP] itself is no longer a seam — the record misses exactly 1...e5 there and `closeSeams`
 * finds it — so a test about seams needs a gap that has no legal explanation at all.
 */
private const val AFTER_LOST_BOARD = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/1NBQKB1R b Kkq - 1 2"
private const val AFTER_LOST_BOARD_NC6 = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/1NBQKB1R w Kkq - 2 3"

/** Placement and side to move — the two fields the board actually renders. */
private fun position(fen: String) = fen.split(' ').take(2).joinToString(" ")

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

    /**
     * The four ways a game ends that the BOARD cannot see: a resignation, an agreed draw, a game
     * simply stopped. `resultFromFen` returns `*` for all of them, so before this every normally
     * ended game read "Game in progress" in the library.
     */
    @Test
    fun theStatedResultIsWhatIsStored() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        val saved = controller.endAndSave(result = GameResult.BLACK)!!
        assertEquals(GameResult.BLACK.tag, store.open(saved.id)?.result, "White resigned; the board cannot know")
        assertEquals(GameResult.BLACK.tag, saved.result)
    }

    /** No result stated = read it off the board, which is what the service's auto-save does. */
    @Test
    fun withoutAStatedResultTheBoardStillDecides() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        val saved = controller.endAndSave()!!
        assertEquals(GameResult.UNFINISHED.tag, store.open(saved.id)?.result)
    }

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

    /**
     * The LIVE source and the ARCHIVE source must project the same game.
     *
     * This is the whole claim of "one view, two sources": if `LiveGame.view()` and the same game
     * replayed off disk ever disagreed about a ply, the spectator and the after-game review would be
     * looking at different games again — which is the state this replaced.
     */
    @Test
    fun theLiveViewAndTheStoredGamesViewAreTheSameProjection() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        controller.onEvent(move("e7e5", "e5", AFTER_E5), null)
        controller.onEvent(pair(), null)
        val live = controller.state.value.game
        assertTrue(live.live)

        val saved = controller.endAndSave()!!
        val archived = store.open(saved.id)!!.reviewView()
        assertFalse(archived.live, "and that is the ONLY field that may differ")
        assertEquals(live.plies.map { it.san }, archived.plies.map { it.san })
        assertEquals(live.plies.map { it.uci }, archived.plies.map { it.uci })
        assertEquals(live.plies.map { it.ply }, archived.plies.map { it.ply })
        assertEquals(live.plies.map { it.decider }, archived.plies.map { it.decider })
        // The positions too. Compared on placement + side to move, which is exactly what the board
        // renders: the live source carries the ENGINE's FEN string and the archive replays it
        // through chesslib, and the two legitimately differ in the halfmove/en-passant fields. A
        // pair commit publishes only its FINAL fen, so this is where a lazy replay would show up.
        assertEquals(live.plies.map { position(it.fenAfter) }, archived.plies.map { position(it.fenAfter) })
        assertEquals(live.startFen, archived.startFen)
    }

    /**
     * Discard must drop the RECORD, not only reset the engine.
     *
     * It used to do neither: "Reset game -> Discard" reset the tracker and left this record standing,
     * so the next committed ply was illegal from it and opened a seam inside a game the user had
     * already thrown away. Invisible while nothing read the record; the moment the live game became
     * the score sheet on screen it was a discarded game still being shown.
     */
    @Test
    fun discardDropsTheRunningGameWithoutStoringIt() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        controller.discard()

        assertEquals(0, controller.state.value.moveCount)
        assertEquals(emptyList<ReviewPly>(), controller.state.value.game.plies)
        assertTrue(store.list().isEmpty(), "a discarded game is never stored")

        // And the next move starts a fresh record on its own line — no seam.
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        val saved = controller.endAndSave()!!
        assertEquals(1, store.open(saved.id)!!.segments.size)
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
        // Ein sauberer Status, nicht `null`: ohne Status ist die Sauberkeit unbewiesen und das Foto
        // wird aufgeschoben — hier soll es geschrieben werden.
        controller.onEvent(move("e2e4", "e4", AFTER_E4), idleTrackerStatus(AFTER_E4))
        assertEquals(1, capture.recorder?.count)
        assertEquals("s", controller.state.value.recordingSessionId)
        // The published position went BACK to the one before the move, and STAYED there: that is an
        // undo, and a taken-back move must survive neither in the library nor as labeled data.
        controller.onStatus(idleTrackerStatus(STARTPOS))
        now += 1_000
        controller.onStatus(idleTrackerStatus(STARTPOS))
        assertEquals(0, controller.state.value.moveCount)
        assertEquals(0, capture.recorder?.count)
    }

    /**
     * The bug behind every seam in the games on the device.
     *
     * Commits and status updates are two collectors on two flows, and the status is sampled — so a
     * status captured a moment BEFORE a commit and delivered a moment after it carries the position
     * the record has just left. That is bit-for-bit what a take-back looks like, and the record used
     * to delete the ply it had just written; the next commit then no longer fitted the line and
     * opened a seam. Measured on 2026-08-10: the engine committed and announced 69 plies, all of
     * them cleanly, and the stored game kept 39.
     *
     * What separates the two is TIME, not shape: a take-back stays on the board, a late sample is
     * overtaken by the current position within one interval.
     */
    @Test
    fun aStatusThatArrivesOnePlyLateDoesNotDeleteTheMoveItMissed() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)

        // Sampled before the commit, delivered after it.
        now += 40
        controller.onStatus(idleTrackerStatus(STARTPOS))
        // And the very next status is the real position again.
        now += 100
        controller.onStatus(idleTrackerStatus(AFTER_E4))
        now += 1_000
        controller.onStatus(idleTrackerStatus(AFTER_E4))

        assertEquals(1, controller.state.value.moveCount, "the ply was really played and really announced")
        controller.onEvent(move("e7e5", "e5", AFTER_E5), null)
        val stored = store.open(controller.endAndSave()!!.id)!!
        assertEquals(listOf("e4", "e5"), stored.moves.map { it.san })
        assertEquals(1, stored.segments.size, "and no seam: the line was never broken")
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
        controller.onEvent(move("e2e4", "e4", AFTER_E4), idleTrackerStatus(AFTER_E4))
        controller.onEvent(move("e7e5", "e5", AFTER_E5), idleTrackerStatus(AFTER_E5))
        controller.onEvent(pair(), idleTrackerStatus(AFTER_PAIR))
        assertEquals(4, controller.state.value.moveCount, "a pair commit is two plies")
        assertEquals(3, capture.recorder?.count, "one photo per commit — the pair gets one, not two")
        val saved = controller.endAndSave()
        val stored = store.open(saved!!.id)!!
        assertEquals(listOf("e4", "e5", "Nf3", "Nc6"), stored.moves.map { it.san })
        // BOTH plies of the pair carry the decider — one decision produced them. Writing `null` for
        // the earlier one lost it: 89 of 113 plies across 16 stored games read as "unknown", which
        // is exactly the figure needed to see how much of a game recovery is responsible for.
        assertEquals(
            listOf("diff", "diff", "diff_pair", "diff_pair"),
            stored.moves.map { it.provenance?.decider },
        )
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
        now += 1_000
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
     * A line that spans two positions is unusable as a game AND as labeled data, because every FEN
     * after the seam is wrong. The first fix CLOSED the record at the seam, which cost the user the
     * game: one played game came off the device as three files ("für mich als Nutzer ist so ne Naht
     * in der Game-Historie unverständlich"). So the seam opens a SEGMENT — a new legal line inside
     * the same record — and one played game stays one stored record.
     *
     * Only for a gap nothing explains, though: see
     * [aGapTheMissedPlyExplainsIsClosedInsteadOfSplit].
     */
    @Test
    fun aCommitThatLeftTheRecordsLineOpensASegmentNotANewRecord() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        // A rook nobody can have taken: the engine's board is somewhere this record cannot reach.
        controller.onEvent(move("g1f3", "Nf3", AFTER_LOST_BOARD), null)

        assertTrue(store.list().isEmpty(), "a seam stores nothing — the game is still being played")
        assertEquals(1, controller.state.value.moveCount, "and the plies before it are still the game's")

        controller.onEvent(move("b8c6", "Nc6", AFTER_LOST_BOARD_NC6), null)
        val saved = controller.endAndSave()!!
        assertEquals(1, store.list().size, "one played game is ONE stored record")
        val stored = store.open(saved.id)!!
        assertEquals(2, stored.segments.size, "the jump is a segment boundary, not a file boundary")
        assertEquals(STARTPOS, stored.startFen)
        assertEquals(STARTPOS, stored.segments[0].startFen)
        assertEquals(listOf("e4"), stored.segments[0].moves.map { it.san })
        assertEquals(AFTER_LOST_BOARD, stored.segments[1].startFen, "the second segment is anchored where the engine is")
        assertEquals(listOf("Nc6"), stored.segments[1].moves.map { it.san })
        assertEquals(1, store.list().single().seams, "and the library row can say the app rebuilt the board once")
    }

    /**
     * A CNN recovery commits from where the BOARD is, and the record is behind it by the plies the
     * tracker missed behind a hand. That is not a lost board: there is exactly one legal sequence
     * that gets from here to there, so the plies are appended and the line simply carries on.
     *
     * The user's report, on a game full of these: *"die Segmente sind mit einer Warnung voneinander
     * getrennt obwohl sie sich einfach schließen lassen, da dort ein CNN recovery stattfand"*.
     */
    @Test
    fun aGapTheMissedPlyExplainsIsClosedInsteadOfSplit() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        // 2.Nf3 is illegal after 1.e4 alone — 1...e5 happened while the tracker was not looking.
        controller.onEvent(TrackerEvent.MoveCommitted("g1f3", "Nf3", AFTER_JUMP, "cnn_recovery", false), null)
        controller.onEvent(move("b8c6", "Nc6", AFTER_JUMP_NC6), null)

        assertEquals(4, controller.state.value.moveCount, "the missed ply is in the running game too")
        val stored = store.open(controller.endAndSave()!!.id)!!
        assertEquals(1, stored.segments.size, "one line, no seam, nothing to warn about")
        assertEquals(listOf("e4", "e5", "Nf3", "Nc6"), stored.moves.map { it.san })
        assertEquals(listOf(1, 2, 3, 4), stored.moves.map { it.ply })
        assertEquals(0, store.list().single().seams)
        val deciders = stored.moves.associate { it.san to it.provenance?.decider }
        assertEquals(DECIDER_SEAM_BRIDGE, deciders["e5"], "the derived ply says it was derived")
        assertEquals("cnn_recovery", deciders["Nf3"], "the committed one says who committed it")
    }

    /**
     * Every existing reader — `GameSummary.moveCount`, the games list, the detail screen — reads
     * `moves`. Segments are additive: the flattened list still holds every ply that was committed,
     * in order and numbered once across the whole game.
     */
    @Test
    fun theFlattenedMoveListStillHoldsEveryPlyInOrder() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        controller.onEvent(move("g1f3", "Nf3", AFTER_LOST_BOARD), null)
        controller.onEvent(move("b8c6", "Nc6", AFTER_LOST_BOARD_NC6), null)

        val saved = controller.endAndSave()!!
        assertEquals(2, saved.moveCount)
        val stored = store.open(saved.id)!!
        assertEquals(listOf("e4", "Nc6"), stored.moves.map { it.san }, "the seam's own ply is in enteredBy, not here")
        assertEquals(listOf(1, 2), stored.moves.map { it.ply }, "ply numbers run across segments, not per segment")
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
        // Both plies of the pair name the decider; only the LAST carries the evidence, because that
        // is the only ply the engine recorded evidence against (`Commit.kt:157`). This used to
        // assert `null` on the earlier ply, which pinned the defect: with the decider dropped too,
        // 89 of 113 plies across 16 stored games read as "unknown".
        assertEquals("diff_pair", moves[1].provenance?.decider, "the pair's first ply names it too")
        assertTrue(moves[1].provenance!!.changed.isEmpty(), "but claims no evidence of its own")
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
        assertEquals(0, capture.recorder?.count, "an occluded board writes no reference photo")
        controller.onEvent(TrackerEvent.ReAnchored, occluded)
        assertEquals(0, capture.recorder?.count, "and a re-anchor that still sees a hand must not take it")
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
        assertEquals(0, capture.recorder?.count, "a commit seen while alarmed must not photograph the board")
        controller.onEvent(TrackerEvent.ReAnchored, alarmed)
        assertEquals(0, capture.recorder?.count, "and neither may a re-anchor while the latch is still up")
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
    fun aSeamRecordsThePliesThatCausedItOnTheNewSegment() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), idleTrackerStatus(AFTER_E4))
        // Nf3 onto a board that also lost a rook: no missed ply explains it, so a segment opens.
        val jump = TrackerEvent.MoveCommitted("g1f3", "Nf3", AFTER_LOST_BOARD, "cnn_recovery", false)
        controller.onEvent(jump, idleTrackerStatus(AFTER_LOST_BOARD))
        controller.onEvent(move("b8c6", "Nc6", AFTER_LOST_BOARD_NC6), idleTrackerStatus(AFTER_LOST_BOARD_NC6))

        val saved = controller.endAndSave()!!
        val stored = store.open(saved.id)!!
        assertNull(stored.segments.first().enteredBy, "the game's own start is not a seam")
        val entered = stored.segments[1].enteredBy
        assertEquals(listOf("Nf3"), entered?.sans, "the jumping ply is recorded on the segment it opened")
        assertEquals(listOf("g1f3"), entered?.ucis)
        assertEquals("cnn_recovery", entered?.decider)
        assertEquals(AFTER_E4, entered?.fenBefore, "and the position the previous line ended on")
    }

    /**
     * An undo one ply after a seam must not leave a segment behind that holds no moves: the record
     * would claim the app rebuilt the board for nothing, and the detail screen would render a seam
     * note followed by nothing.
     */
    @Test
    fun anUndoRightAfterASeamRemovesTheSegmentItEmptied() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        controller.onEvent(TrackerEvent.MoveCommitted("g1f3", "Nf3", AFTER_LOST_BOARD, "cnn_recovery", false), null)
        controller.onEvent(move("b8c6", "Nc6", AFTER_LOST_BOARD_NC6), null)
        assertEquals(2, controller.state.value.moveCount)

        // Back to the position the segment started on, and staying there: Nc6 was taken back.
        controller.onStatus(idleTrackerStatus(AFTER_LOST_BOARD))
        now += 1_000
        controller.onStatus(idleTrackerStatus(AFTER_LOST_BOARD))
        assertEquals(1, controller.state.value.moveCount, "the segment's only move is gone")

        val saved = controller.endAndSave()!!
        val stored = store.open(saved.id)!!
        assertEquals(1, stored.segments.size, "and so is the segment — no dangling empty one")
        assertEquals(listOf("e4"), stored.moves.map { it.san }, "the line before the seam is untouched")
        assertEquals(0, store.list().single().seams)
    }

    /**
     * A PGN file may hold several games, and that is the honest shape for a record with a seam: one
     * game per segment, each replayable from its own `[FEN]`. Fabricating one main line out of two
     * positions produces a file every reader replays wrongly.
     */
    @Test
    fun thePgnWritesOneGamePerSegmentAndNamesTheSeam() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        controller.onEvent(TrackerEvent.MoveCommitted("g1f3", "Nf3", AFTER_LOST_BOARD, "cnn_recovery", false), null)
        controller.onEvent(move("b8c6", "Nc6", AFTER_LOST_BOARD_NC6), null)
        val saved = controller.endAndSave()!!

        val blocks = store.pgn(saved.id).orEmpty().split("[Event ")
        assertEquals(3, blocks.size, "two [Event] blocks, one per segment: $blocks")
        assertFalse(blocks[1].contains("[FEN"), "the first game starts at the start position")
        assertTrue(blocks[2].contains("[FEN \"$AFTER_LOST_BOARD\"]"), blocks[2])
        assertTrue(blocks[2].contains("{position rebuilt by cnn_recovery: Nf3"), blocks[2])
    }

    /**
     * The four fragments pulled off the device on 2026-07-28 are in the pre-segment format: one
     * legal line from `startFen`, with `openedBySeam` beside it. `ignoreUnknownKeys` would drop
     * that field on the first read and the next write would erase it, so it is migrated.
     */
    @Test
    fun aRecordWrittenBeforeSegmentsLoadsAsOneSegment() {
        File(dir, "games").mkdirs()
        File(dir, "games/legacy.json").writeText(
            """
            {"id":"legacy","startFen":"$AFTER_JUMP","startedAtEpochMs":1,"finishedAtEpochMs":2,
             "profileName":"default","result":"*",
             "moves":[{"ply":1,"san":"Nc6","uci":"b8c6","tsEpochMs":3}],
             "openedBySeam":{"previousId":"2026-07-28_0041","fenBefore":"$AFTER_E4",
                             "sans":["Nf3"],"ucis":["g1f3"],"decider":"cnn_recovery"}}
            """.trimIndent(),
        )

        val game = store.open("legacy")!!
        val segment = game.segments.single()
        assertEquals(AFTER_JUMP, segment.startFen)
        assertEquals(listOf("Nc6"), segment.moves.map { it.san })
        assertEquals(listOf("Nf3"), segment.enteredBy?.sans, "the plies that are in no move list survive")
        assertEquals("cnn_recovery", segment.enteredBy?.decider)
        assertEquals("2026-07-28_0041", segment.enteredBy?.previousId, "and so does the chain to the previous file")
        assertEquals(1, game.summary().seams, "a migrated fragment still says the app rebuilt the board")
    }

    /**
     * The fragments actually on the device predate `openedBySeam` too: a mid-game `startFen`, one
     * move list, and nothing saying where it came from. They must still open — as one segment that
     * claims no seam, because none was ever recorded.
     */
    @Test
    fun aRecordWrittenBeforeSeamsWereRecordedLoadsAsOneSegmentWithNoSeam() {
        File(dir, "games").mkdirs()
        File(dir, "games/fragment.json").writeText(
            """
            {"id":"fragment","startFen":"$AFTER_JUMP","startedAtEpochMs":1,"finishedAtEpochMs":2,
             "profileName":"default","result":"*","white":"?","black":"?","event":"chesslab",
             "moves":[{"ply":1,"san":"Nc6","uci":"b8c6","tsEpochMs":3}],"sessionId":"20260728-004202"}
            """.trimIndent(),
        )

        val game = store.open("fragment")!!
        assertEquals(AFTER_JUMP, game.segments.single().startFen)
        assertNull(game.segments.single().enteredBy)
        assertEquals(0, game.summary().seams)
    }
}
