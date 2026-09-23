package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Test

private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
private const val AFTER_JUMP = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"

/** The same position with White's queen's rook gone: no legal sequence produces it. */
private const val IMPOSSIBLE_JUMP = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/1NBQKB1R b Kkq - 1 2"

/** The two fields a bridge is judged on — see [seamBridge] for why the counters are left out. */
private fun placementAndSide(fen: String): String {
    val fields = fen.split(" ")
    return "${fields.first()} ${fields.getOrNull(1).orEmpty()}"
}

/** A seam: the engine committed from a position the record cannot reach — usually a ply missed behind a hand. */
class SeamClosingTest {
    @Test
    fun theOneLegalSequenceThatExplainsAGapIsTheBridge() {
        // The record stands after 1.e4; the recovery committed 2.Nf3, which is illegal there. The
        // only way both are true is that Black played 1...e5 while the tracker was not looking.
        assertEquals(listOf("e7e5"), seamBridge(AFTER_E4, listOf("g1f3"), AFTER_JUMP))
    }

    @Test
    fun aPositionNoLegalSequenceReachesIsNotBridged() {
        assertNull(seamBridge(AFTER_E4, listOf("g1f3"), IMPOSSIBLE_JUMP))
    }

    /**
     * Ra1-a3-c3 and Ra1-c1-c3 both explain the gap; the search takes the first (user: "ich brauch nicht
     * alle Pfade") but must never return one that does not replay to the engine's position.
     */
    @Test
    fun aGapWithTwoExplanationsTakesTheFirstAndStops() {
        val before = "1n2k3/8/8/8/8/8/8/R3K3 w - - 0 1"
        val after = "4k3/8/8/8/3n4/2R5/8/4K3 w - - 0 1"

        val bridge = seamBridge(before, listOf("c6d4"), after)

        val played = playedFrom(before, bridge!! + "c6d4")!!
        assertEquals(placementAndSide(after), placementAndSide(played.last().fenAfter))
    }

    /** The failed search walks the whole tree and never changes its answer; re-running it made loading slow. */
    @Test
    fun aGapThatCannotBeExplainedIsMarkedSoTheSearchNeverRunsAgain() {
        val marked = gameWithSeam(startFen = IMPOSSIBLE_JUMP).closeSeams()

        assertEquals(3, marked.segments[1].enteredBy?.searchedPlies, "how deep it was searched, in the record")
        assertSame(marked, marked.closeSeams(), "and a second pass is free — nothing left to search")
    }

    @Test
    fun aClosableSeamBecomesOneContinuousLine() {
        val game = gameWithSeam(startFen = AFTER_JUMP)

        val closed = game.closeSeams()

        val segment = closed.segments.single()
        assertNull(segment.enteredBy, "the gap is closed, so there is nothing left to warn about")
        assertEquals(listOf("e4", "e5", "Nf3", "Nc6"), segment.moves.map { it.san })
        assertEquals(listOf(1, 2, 3, 4), segment.moves.map { it.ply }, "and the plies are renumbered across the record")
        assertEquals(segment.moves, closed.moves, "the flattened list is the line")
        assertEquals(0, closed.summary().seams)
    }

    @Test
    fun aBridgedPlySaysItWasDerivedAndACommittedOneSaysWhoCommittedIt() {
        val closed = gameWithSeam(startFen = AFTER_JUMP).closeSeams()

        val byMove = closed.moves.associate { it.san to it.provenance?.decider }
        assertEquals(DECIDER_SEAM_BRIDGE, byMove["e5"], "nobody committed this ply — it was derived from two positions")
        assertEquals("cnn_recovery", byMove["Nf3"], "the recovery's own ply keeps saying who committed it")
    }

    @Test
    fun anUnexplainableGapKeepsItsSegmentAndItsSeam() {
        val game = gameWithSeam(startFen = IMPOSSIBLE_JUMP)

        val closed = game.closeSeams()

        assertEquals(2, closed.segments.size)
        assertNotNull(closed.segments[1].enteredBy)
        assertEquals(1, closed.summary().seams)
    }

    /** 1.e4, then a jump to [startFen] committed as `Nf3` by recovery, then Nc6 on the new line. */
    private fun gameWithSeam(startFen: String): StoredGame {
        val first = StoredMove(1, "e4", "e2e4", 1L)
        val second = StoredMove(2, "Nc6", "b8c6", 3L)
        return StoredGame(
            id = "2026-08-11_1200",
            startFen = STARTPOS,
            startedAtEpochMs = 0L,
            finishedAtEpochMs = 0L,
            profileName = "board-a",
            result = "*",
            moves = listOf(first, second),
            segments =
                listOf(
                    GameSegment(STARTPOS, listOf(first)),
                    GameSegment(
                        startFen,
                        listOf(second.copy(uci = "b8c6")),
                        SeamOrigin(
                            fenBefore = AFTER_E4,
                            sans = listOf("Nf3"),
                            ucis = listOf("g1f3"),
                            decider = "cnn_recovery",
                        ),
                    ),
                ),
        )
    }
}
