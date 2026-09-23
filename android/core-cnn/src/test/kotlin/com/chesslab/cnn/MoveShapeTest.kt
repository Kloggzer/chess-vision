package com.chesslab.cnn

import com.chesslab.engine.api.CnnObservation
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** Was ein Zug BERUEHRT und wie er heisst, wenn er das Modul verlaesst. Beides entscheidet
 *  darueber, ob die Leiter danach noch denselben Zug meint. */
class MoveShapeTest {
    /** En passant raeumt DREI Felder: von, nach und den geschlagenen Bauern daneben. Fehlt das
     *  dritte, bestaetigt `verifyMove` den Zug mit 1,0, obwohl der geschlagene Bauer noch steht. */
    @Test
    fun `en passant is verified over the captured pawn as well`() {
        val obs = FakeSquareClassifier(EP_AFTER_WITH_PAWN).observe()
        val (agreement, checked) = CnnRecovery().verifyMove(EP_BEFORE, "e5d6", obs)

        assertEquals(3, checked, "von, nach und das Schlagfeld")
        assertEquals(2.0 / 3.0, agreement, TOLERANCE)
    }

    /** Die Umwandlungsfigur gehoert in die uci — ohne sie ist `e7e8` kein legaler Zug mehr. */
    @Test
    fun `a derived promotion keeps its piece letter`() {
        val obs: CnnObservation = FakeSquareClassifier(PROMO_AFTER).observe()
        val derived = CnnRecovery().deriveMovesDeep(PROMO_BEFORE, obs, maxPlies = 1)

        assertEquals(listOf("e7e8q"), derived.moves)
    }

    /** `marginSquares` 1 heisst "streng besser reicht": ein SCHLAG aendert die Belegung auf genau
     *  einem Feld, erklaert also eines mehr als der Stillstand. Bei 2 kaeme hier nichts zurueck. */
    @Test
    fun `one explained square more is enough, and exactly what is demanded`() {
        val obs = FakeSquareClassifier(AFTER_CAPTURE).observe()
        val board = boardOf(BEFORE_CAPTURE)

        val scored = CnnRecovery().scoreMoves(board, obs)
        assertNotNull(scored.move, "ein Feld Vorsprung reicht")
        assertEquals("c3d5", uciOf(scored.move!!))
        assertNull(CnnRecovery(CnnConfig(marginSquares = 2)).scoreMoves(board, obs).move, "zwei fordert mehr")
    }

    private companion object {
        const val TOLERANCE = 1e-9
        const val BEFORE_CAPTURE = "4k3/8/8/3p4/8/2N5/8/4K3 w - - 0 1"
        const val AFTER_CAPTURE = "4k3/8/8/3N4/8/8/8/4K3 b - - 0 1"
        const val EP_BEFORE = "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2"
        const val EP_AFTER_WITH_PAWN = "4k3/8/3P4/3p4/8/8/8/4K3 b - - 0 2"
        const val PROMO_BEFORE = "6k1/4P3/8/8/8/8/8/4K3 w - - 0 1"
        const val PROMO_AFTER = "4Q1k1/8/8/8/8/8/8/4K3 b - - 0 1"
    }
}
