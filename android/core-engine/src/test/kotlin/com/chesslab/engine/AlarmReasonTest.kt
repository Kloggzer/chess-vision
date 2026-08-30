package com.chesslab.engine

import com.chesslab.engine.api.AlarmFault
import com.chesslab.engine.api.AlarmReason
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/**
 * What the player reads while a game is running.
 *
 * The reason has to come FIRST and short: the line used to lead with the squares and hide the
 * reason in brackets behind them, and by the time the eye got there it had left (User, 2026-08-26).
 */
class AlarmReasonTest {
    /** Black to move and in check; White's suggested move is the one that cannot be. */
    @Test
    fun `check is named in three words`() {
        val game = Game("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")
        assertEquals(AlarmReason.IN_CHECK, game.alarmReason("e1f2"))
    }

    /** Who is to move outranks it — otherwise the wrong player starts looking for their king. */
    @Test
    fun `the side to move outranks the check`() {
        val game = Game("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")
        assertEquals(AlarmReason.WHITE_TO_MOVE, game.alarmReason("h4g3"))
    }

    @Test
    fun `castling without the right is named as such`() {
        val game = Game("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1")
        assertEquals(AlarmReason.NO_CASTLING, game.alarmReason("e1g1"))
    }

    /** Null, not a guess: "illegal move suspected" says nothing the player can act on. */
    @Test
    fun `an ordinary legal-looking move has no reason`() {
        assertNull(Game().alarmReason("e2e4"))
        assertNull(Game().alarmReason(null))
        assertNull(Game().alarmReason("zz"))
    }

    /** Die Kategorie haengt am Grund, nicht am Latch-Namen — die Ansage sagt sie als erstes Wort. */
    @Test
    fun `rule breaks are the player, mismatches are the app`() {
        assertEquals(AlarmFault.PLAY, AlarmReason.IN_CHECK.fault)
        assertEquals(AlarmFault.ENGINE, AlarmReason.BOARD_MISMATCH.fault)
        assertEquals(AlarmFault.ENGINE, AlarmReason.ENGINE_REFUSED.fault)
    }
}
