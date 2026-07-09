package com.chesslab.engine

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Shadow-vetoed squares cannot be move destinations (ports 242ea94 + the regression tests
 * of 35f83be): a phantom "move" onto a shadow-darkened empty square is rejected while
 * from-square shadow evidence stays usable.
 */
class ShadowDestinationTest {
    private val config = TrackerConfig(confirmFrames = 1)

    private fun detectorFor(
        fen: String?,
        refSetup: (Phase00Boards) -> Unit,
    ): Pair<Detector, EngineState> {
        val state = EngineState()
        if (fen != null) state.game = Game(fen)
        val boards = Phase00Boards()
        refSetup(boards)
        state.setRef(boards.gray(), boards.bgr)
        state.motionSinceRef = true
        state.lastMotionTs = NOW - 1.0
        return Detector(config, state) { null } to state
    }

    /** Mutable flat-gray board (BGR + derived gray). */
    internal class Phase00Boards {
        val bgr = Phase00Images.flatBgr(BOARD_V, BOARD_V, BOARD_V)

        fun fill(
            sq: String,
            v: Int,
        ) = Phase00Images.fillCellBgr(bgr, sq, v, v, v)

        fun gray() = Phase00Images.toGray(bgr)
    }

    @Test
    fun `move destination squares - castling rook square included, en passant capture not`() {
        val white = Game("r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5")
        val oo = white.legalMoves().first { uciOf(it) == "e1g1" }
        assertEquals(setOf("g1", "f1"), moveDestinationSquares(white, oo))

        val black = Game("r3k2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 b kq - 8 5")
        val ooo = black.legalMoves().first { uciOf(it) == "e8c8" }
        assertEquals(setOf("c8", "d8"), moveDestinationSquares(black, ooo))

        val ep = Game("rnbqkbnr/pp1pp1pp/8/2p1Pp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3")
        val cap = ep.legalMoves().first { uciOf(it) == "e5f6" }
        assertEquals(setOf("f6"), moveDestinationSquares(ep, cap))

        val start = Game()
        val push = start.legalMoves().first { uciOf(it) == "e2e4" }
        assertEquals(setOf("e4"), moveDestinationSquares(start, push))
    }

    @Test
    fun `phantom rook move onto shadow-darkened destination is blocked`() {
        // wR on h1, g1 empty; the piece "vanishes" into shadow darkness on h1 while g1
        // catches a flat, chroma-consistent darkening (cast shadow) — h1g1 must NOT commit.
        val fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQK2R w KQkq - 0 1"
        val (detector, state) =
            detectorFor(fen) { boards -> boards.fill("h1", PIECE_V) }
        val fenBefore = state.game.fen()
        val cur = Phase00Boards()
        cur.fill("h1", VACATED_DARK_V) // rook square: strong change, too dark for HSV shadow
        cur.fill("g1", SHADOW_V) // destination: flat darkening -> shadow veto
        val events = mutableListOf<TrackerEvent>()
        detector.tryDetect(cur.gray(), cur.bgr, NOW, events)
        assertEquals(fenBefore, state.game.fen(), "phantom move must not commit")
        assertTrue(events.filterIsInstance<TrackerEvent.MoveCommitted>().isEmpty())
        assertTrue("g1" in state.shadowVetoed, "g1 should be shadow-vetoed (${state.shadowVetoed})")
        assertTrue("h1g1" in state.shadowBlocked, "expected h1g1 blocked, got ${state.shadowBlocked}")
    }

    @Test
    fun `shadow on the from-square still allows the move`() {
        // White piece e2 -> e4; the vacated e2 returns to board color (reads as a darkening
        // = HSV shadow). Its z evidence must survive the veto and e2e4 must commit.
        val (detector, state) =
            detectorFor(null) { boards -> boards.fill("e2", PIECE_V) }
        val cur = Phase00Boards()
        cur.fill("e4", PIECE_V)
        val events = mutableListOf<TrackerEvent>()
        detector.tryDetect(cur.gray(), cur.bgr, NOW, events)
        val committed = events.filterIsInstance<TrackerEvent.MoveCommitted>()
        assertEquals(1, committed.size, "expected e2e4 commit, note=${state.note}")
        assertEquals("e4", committed.single().san)
    }

    private companion object {
        const val NOW = 100.0
        const val BOARD_V = 120
        const val PIECE_V = 255
        const val SHADOW_V = 60
        const val VACATED_DARK_V = 30
    }
}
