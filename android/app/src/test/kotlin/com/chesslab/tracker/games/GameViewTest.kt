package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** As chesslib renders it — including the en-passant square, which the replay must not lose. */
private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
private const val AFTER_JUMP = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"

private fun stored(
    startFen: String = STARTPOS,
    moves: List<StoredMove> = emptyList(),
    segments: List<GameSegment> = emptyList(),
) = StoredGame(
    id = "g",
    startFen = startFen,
    startedAtEpochMs = 0,
    finishedAtEpochMs = 0,
    profileName = "p",
    result = "*",
    moves = moves,
    segments = segments,
)

private fun move(
    ply: Int,
    san: String,
    uci: String,
) = StoredMove(ply, san, uci, 0L, MoveProvenance("diff", "diff", false))

class GameViewTest {
    @Test
    fun pairsPliesIntoNumberedRows() {
        val plies =
            listOf(
                ReviewPly(1, "e4", "e2e4", "", null),
                ReviewPly(2, "e5", "e7e5", "", null),
                ReviewPly(3, "Nf3", "g1f3", "", null),
            )
        val rows = moveRows(plies)
        assertEquals(2, rows.size)
        assertEquals(1, rows[0].number)
        assertEquals("e4", rows[0].white?.san)
        assertEquals("e5", rows[0].black?.san)
        assertEquals("Nf3", rows[1].white?.san)
        assertNull(rows[1].black)

        // A position adopted mid-game can start on Black's ply; the numbering must not lie.
        val shifted = moveRows(plies, startsWithBlack = true)
        assertNull(shifted[0].white)
        assertEquals("e4", shifted[0].black?.san)
    }

    /**
     * `PgnBuilder` numbers from field 5 of the start FEN. The score sheet started at 1 regardless,
     * so an adopted position read `1...` on the screen and `12...` in the exported PGN.
     */
    @Test
    fun theScoreSheetNumbersFromTheStartFen() {
        val plies = listOf(ReviewPly(1, "e5", "e7e5", "", null), ReviewPly(2, "Nf3", "g1f3", "", null))
        val adopted = "rnbqkbnr/pppp1ppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 12"

        val rows = moveRows(plies, startsWithBlack(adopted), startNumber(adopted))

        assertEquals(12, rows[0].number)
        assertEquals("e5", rows[0].black?.san)
        assertEquals(13, rows[1].number)
    }

    @Test
    fun anUnreadableStartFenStillNumbersFromOne() {
        assertEquals(1, startNumber("not a fen"))
        assertEquals(1, startNumber(STARTPOS))
    }

    @Test
    fun sideToMoveIsReadFromTheFenAndAnUnreadableOneIsNotBlack() {
        assertFalse(startsWithBlack(STARTPOS))
        assertTrue(startsWithBlack(AFTER_E4))
        assertFalse(startsWithBlack("not a fen"))
    }

    /** The archive source replays, because a stored ply carries no position of its own. */
    @Test
    fun aStoredGameReplaysToThePositionEachPlyProduced() {
        val view = stored(moves = listOf(move(1, "e4", "e2e4"))).reviewView()
        assertFalse(view.live)
        assertEquals(AFTER_E4, view.plies.single().fenAfter)
        assertEquals("diff", view.plies.single().decider)
        assertEquals(STARTPOS, view.fenAt(0), "ply 0 is the start position")
        assertEquals(AFTER_E4, view.fenAt(1))
        assertEquals(AFTER_E4, view.fenAt(9), "past the end is the last position, never a crash")
    }

    /**
     * A stored game may hold a line chesslib rejects — the engine's board once accepted it. The
     * screen must open on the last position it could reach rather than refuse the whole game, and
     * it must never FABRICATE one: chesslib's default `doMove` applies an illegal move without
     * complaint, which teleported the e-pawn to e5 and made every position after it fiction.
     */
    @Test
    fun anIllegalStoredPlyIsANoOpAndNeverMovesAPiece() {
        val view = stored(moves = listOf(move(1, "??", "e2e5"), move(2, "e4", "e2e4"))).reviewView()
        assertEquals(2, view.plies.size)
        assertEquals(STARTPOS, view.plies.first().fenAfter, "the illegal ply changed nothing")
        assertEquals(AFTER_E4, view.plies.last().fenAfter)
    }

    /** Seams survive the projection: the moves after one do not follow the moves before it. */
    @Test
    fun segmentsAndTheirSeamsSurviveTheProjection() {
        val seam = SeamOrigin(fenBefore = AFTER_E4, sans = listOf("Nf3"), ucis = listOf("g1f3"), decider = "cnn_recovery")
        val view =
            stored(
                moves = listOf(move(1, "e4", "e2e4"), move(2, "Nc6", "b8c6")),
                segments =
                    listOf(
                        GameSegment(STARTPOS, listOf(move(1, "e4", "e2e4")), null),
                        GameSegment(AFTER_JUMP, listOf(move(2, "Nc6", "b8c6")), seam),
                    ),
            ).reviewView()
        assertEquals(2, view.segments.size)
        assertNull(view.segments[0].enteredBy)
        assertEquals("cnn_recovery", view.segments[1].enteredBy?.decider)
        // The second segment replays from ITS OWN start, not from the first segment's last position.
        assertEquals(AFTER_JUMP, view.segments[1].startFen)
        assertEquals(listOf("e4", "Nc6"), view.plies.map { it.san })
    }

    @Test
    fun theEmptyViewIsAStartPositionWithNoPlies() {
        assertTrue(GameView.NONE.live)
        assertTrue(GameView.NONE.plies.isEmpty())
        assertEquals(STARTPOS, GameView.NONE.fenAt(0))
    }
}
