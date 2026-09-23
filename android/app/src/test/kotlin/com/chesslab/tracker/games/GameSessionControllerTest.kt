package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.hints.HintController
import com.chesslab.tracker.hints.HintPlan
import com.chesslab.tracker.hints.HintSide
import com.chesslab.tracker.io.defaultSideFiles
import com.chesslab.tracker.io.sideFiles
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
import org.junit.jupiter.api.Assertions.assertNotNull
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

/** A jump nothing explains: [AFTER_JUMP] alone is no seam any more. */
private const val AFTER_LOST_BOARD = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/1NBQKB1R b Kkq - 1 2"
private const val AFTER_LOST_BOARD_NC6 = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/1NBQKB1R w Kkq - 2 3"

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

    /** One event, two plies, only the FINAL position. */
    private fun pair() = TrackerEvent.SequenceCommitted(listOf("g1f3", "b8c6"), listOf("Nf3", "Nc6"), AFTER_PAIR, "diff_pair")

    private fun replyPair() = TrackerEvent.SequenceCommitted(listOf("e7e5", "g1f3"), listOf("e5", "Nf3"), AFTER_JUMP, "diff_pair")

    private fun afterNf3(): String =
        Board()
            .apply {
                loadFromFen(AFTER_E5)
                doMove(Move("g1f3", Side.WHITE))
            }.fen

    /** `resultFromFen` returns `*` for every end the BOARD cannot see. */
    @Test
    fun theStatedResultIsWhatIsStored() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        val saved = controller.endAndSave(result = GameResult.BLACK)!!
        assertEquals(GameResult.BLACK.tag, store.open(saved.id)?.result, "White resigned; the board cannot know")
        assertEquals(GameResult.BLACK.tag, saved.result)
    }

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

    /** LIVE and ARCHIVE must project the same game (`docs/game-review.md`). */
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
        // Placement + side to move only: halfmove/en-passant legitimately differ. A pair publishes only its FINAL fen.
        assertEquals(live.plies.map { position(it.fenAfter) }, archived.plies.map { position(it.fenAfter) })
        assertEquals(live.startFen, archived.startFen)
    }

    /** Discard must drop the RECORD too: a left-standing one opened a seam inside a thrown-away game. */
    @Test
    fun discardDropsTheRunningGameWithoutStoringIt() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        controller.discard()

        assertEquals(0, controller.state.value.moveCount)
        assertEquals(emptyList<ReviewPly>(), controller.state.value.game.plies)
        assertTrue(store.list().isEmpty(), "a discarded game is never stored")

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
        // Ein sauberer Status, nicht `null`: ohne Status wird das Foto aufgeschoben.
        controller.onEvent(move("e2e4", "e4", AFTER_E4), idleTrackerStatus(AFTER_E4))
        assertEquals(1, capture.recorder?.count)
        assertEquals("s", controller.state.value.recordingSessionId)
        controller.onStatus(idleTrackerStatus(STARTPOS))
        now += 1_000
        controller.onStatus(idleTrackerStatus(STARTPOS))
        assertEquals(0, controller.state.value.moveCount)
        assertEquals(0, capture.recorder?.count)
    }

    /** A late status sample is bit-for-bit a take-back: 69 announced plies were stored as 39. */
    @Test
    fun aStatusThatArrivesOnePlyLateDoesNotDeleteTheMoveItMissed() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)

        now += 40
        controller.onStatus(idleTrackerStatus(STARTPOS))
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

    /** The engine commits through TWO events; one photo per COMMIT, not per ply. */
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
        // BOTH plies carry the decider: `null` on the earlier one left 89 of 113 stored plies "unknown".
        assertEquals(
            listOf("diff", "diff", "diff_pair", "diff_pair"),
            stored.moves.map { it.provenance?.decider },
        )
    }

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

    /** A seam opens a SEGMENT, and only for a gap nothing explains. */
    @Test
    fun aCommitThatLeftTheRecordsLineOpensASegmentNotANewRecord() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
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

    /** Exactly one legal sequence reaches the recovered board, so the plies are appended, not split off. */
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

    /** Segments are ADDITIVE: `moves` still holds every committed ply, in order, numbered once. */
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

    /** The decider belongs on the commit event, not in the debug payload: 77 plies stored `provenance: null`. */
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
        // Only the LAST ply carries evidence, the only one the engine recorded it against.
        assertEquals("diff_pair", moves[1].provenance?.decider, "the pair's first ply names it too")
        assertTrue(moves[1].provenance!!.changed.isEmpty(), "but claims no evidence of its own")
        assertEquals("diff_pair", moves[2].provenance?.decider, "and a pair states its decider too")
    }

    /** `ReAnchored` fires unconditionally, so flushing on it photographed a hand: 64 crops labeled as hidden pieces. */
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

    /** No frame while the latch is up: poisoned training data. Pinned at the CONSUMER. */
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
        // Cleared by the user: the deferred photo is still owed and taken on the next clean tick.
        controller.onEvent(TrackerEvent.ReAnchored, idleTrackerStatus(AFTER_E4))
        assertEquals(1, capture.recorder?.count, "once the alarm is gone the pending photo is taken")
    }

    /** A seam must not swallow the plies that caused it: they fit neither move list. */
    @Test
    fun aSeamRecordsThePliesThatCausedItOnTheNewSegment() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), idleTrackerStatus(AFTER_E4))
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

    /** No empty segment after an undo: the detail screen would render a seam note followed by nothing. */
    @Test
    fun anUndoRightAfterASeamRemovesTheSegmentItEmptied() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        controller.onEvent(TrackerEvent.MoveCommitted("g1f3", "Nf3", AFTER_LOST_BOARD, "cnn_recovery", false), null)
        controller.onEvent(move("b8c6", "Nc6", AFTER_LOST_BOARD_NC6), null)
        assertEquals(2, controller.state.value.moveCount)

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

    /** One game per segment, each replayable from its own `[FEN]`. */
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

    /** Pre-segment fragments: `ignoreUnknownKeys` would drop `openedBySeam` and the next write erase it. */
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

    /** Pre-`openedBySeam` files must still open, as one segment claiming no seam. */
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

    /** `GameStore.save` writes three separately atomic artefacts; dropping the game before they were through
     *  left the lost `live` state as its only copy. */
    @Test
    fun `a game whose pgn cannot be written is still live afterwards`() {
        val controller = controller()
        controller.onIdle(STARTPOS, "board-a")
        controller.onEvent(move("e2e4", "e4", AFTER_E4), null)
        // Throws AFTER the `<id>.json` is written and before the index knows it.
        sideFiles = { f -> if (f.name.endsWith(".pgn")) File(dir, "weg/x.tmp") else defaultSideFiles(f) }
        try {
            assertTrue(runCatching { controller.endAndSave() }.isFailure, "das Schreiben muss scheitern")
        } finally {
            sideFiles = defaultSideFiles
        }

        assertEquals(1, controller.state.value.moveCount, "der Zug steht noch im Zustand")
        val saved = controller.endAndSave()
        assertNotNull(saved, "und sie muss sich ein zweites Mal speichern lassen")
        assertEquals(listOf("e4"), store.open(saved!!.id)?.moves?.map { it.san })
    }

    /** Das automatische Partieende raeumte den Ledger, liess aber Plan und Restkontingent stehen. */
    @Test
    fun `a mate ends the hint quota with the record`() {
        val ledger = HintLedger()
        val hints = HintController(ledger)
        val games = GameSessionController(store, capture(enabled = false), { now }, { "game-$it" }, ledger, listOf(hints))
        hints.startGame(HintPlan(side = HintSide.WHITE, quota = 3))
        games.onIdle(STARTPOS, "board-a")

        games.onEvent(move("d8h4", "Qh4#", FOOLS_MATE), null)

        assertEquals(1, store.list().size, "die Partie ist von selbst gespeichert")
        assertFalse(hints.offered(FOOLS_MATE), "und danach wird kein Tipp mehr angeboten")
        assertEquals(0, hints.state.value.remaining)
    }
}
