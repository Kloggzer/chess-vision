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
 * A jump nothing explains: [AFTER_JUMP] with White's queen's rook gone. [AFTER_JUMP] itself is no
 * longer a seam, so a seam test needs a gap with no legal explanation (`docs/game-record-seams.md`).
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
     * The ways a game ends that the BOARD cannot see. `resultFromFen` returns `*` for all of them,
     * so every normally ended game read "Game in progress" (`docs/game-record-seams.md`).
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
     * The LIVE source and the ARCHIVE source must project the same game — the whole claim of "one
     * view, two sources" (`docs/game-record-seams.md`).
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
     * Discard must drop the RECORD, not only reset the engine — a left-standing record opened a seam
     * inside a game the user had already thrown away (`docs/game-record-seams.md`).
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
     * The bug behind every seam in the games on the device: a late status sample is bit-for-bit a
     * take-back, and 69 announced plies were stored as 39 (2026-08-10, `docs/game-record-seams.md`).
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
     * D1. The engine commits through TWO events, and this controller handled only `MoveCommitted`.
     * One photo per COMMIT, not per ply (`docs/game-record-seams.md`).
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
     * D3. Four of five device games were not legal sequences from their own `startFen`. A seam opens
     * a SEGMENT, and only for a gap nothing explains (`docs/game-record-seams.md`).
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
     * A CNN recovery commits from where the BOARD is, and exactly one legal sequence gets from the
     * record to there — so the plies are appended, not split off (`docs/game-record-seams.md`).
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
     * Segments are ADDITIVE: every existing reader reads `moves`, and the flattened list still holds
     * every committed ply, in order and numbered once across the whole game.
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
     * All 77 plies across five device sessions stored `provenance: null`, debug ON included — the
     * decider belongs on the commit event, not in the debug payload (`docs/game-record-seams.md`).
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
     * D2. The Kotlin engine emits `ReAnchored` unconditionally, so flushing on every one of them
     * photographs a hand — 64 crops labeled as pieces nobody can see (`docs/game-record-seams.md`).
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
     * While the illegal-move latch is up, no frame may be written: a photo now is poisoned training
     * data. Pinned at the CONSUMER so it survives whatever the engine does (`docs/game-record-seams.md`).
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
     * A seam must not swallow the plies that caused it — they fit neither move list, and Qxd4, Qe5+
     * and Be7 appear in none of one game's three stored files (`docs/game-record-seams.md`).
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
     * An undo one ply after a seam must not leave an empty segment behind — the detail screen would
     * render a seam note followed by nothing.
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
     * One game per segment, each replayable from its own `[FEN]` — one main line fabricated out of
     * two positions is a file every reader replays wrongly.
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
     * The 2026-07-28 fragments are pre-segment: `ignoreUnknownKeys` would drop `openedBySeam` on the
     * first read and the next write would erase it, so it is migrated (`docs/game-record-seams.md`).
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
     * The device's own fragments predate `openedBySeam` too. They must still open — as one segment
     * claiming no seam, because none was ever recorded (`docs/game-record-seams.md`).
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
