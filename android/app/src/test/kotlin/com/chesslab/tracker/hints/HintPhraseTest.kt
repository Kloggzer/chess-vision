package com.chesslab.tracker.hints

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Der Wortlaut ist Teil der Zusicherung: eine Absage muss sagen, dass sie nichts gekostet hat. */
class HintPhraseTest {
    @Test
    fun aPlainTipNamesTheMoveAndNothingElse() {
        val tip = HintOutcome.Tip(FEN, "Nf3", "g1f3", mateIn = null, line = emptyList(), remaining = 2)
        assertEquals("Play Nf3", HintPhrase.of(tip, "en-US"))
        assertEquals("Spiel Nf3", HintPhrase.of(tip, "de-DE"))
    }

    @Test
    fun aMateSaysTheDistanceAndThenTheWay() {
        val tip = HintOutcome.Tip(FEN, "Qh4", "d8h4", mateIn = 2, line = listOf("Qh4", "g3", "Qxg3"), remaining = 1)
        assertEquals("You have mate in 2. Play Qh4. Qh4 g3 Qxg3", HintPhrase.of(tip, "en-US"))
        assertTrue(HintPhrase.of(tip, "de-DE").startsWith("Du hast Matt in 2"))
    }

    @Test
    fun aMateWithoutItsWaySaysWhyInBothLanguages() {
        val tip =
            HintOutcome.Tip(
                FEN,
                "Qh4",
                "d8h4",
                mateIn = 2,
                line = listOf("Qh4"),
                remaining = 1,
                lineFailure = "UCI engine terminated",
            )
        assertEquals("You have mate in 2. Play Qh4. Qh4. Engine unavailable: UCI engine terminated", HintPhrase.of(tip, "en-US"))
        assertTrue(HintPhrase.of(tip, "de-DE").endsWith("Engine nicht verfuegbar: UCI engine terminated"))
    }

    /** Jede Absage ausser "kein Kontingent mehr" sagt ausdruecklich, dass nichts verbraucht wurde. */
    @Test
    fun everyFreeRefusalSaysThatNothingWasUsedUp() {
        FREE.forEach { reason ->
            val refused = HintOutcome.Refused(reason)
            assertTrue(HintPhrase.of(refused, "en-US").contains("Nothing was used up"), reason.name)
            assertTrue(HintPhrase.of(refused, "de-DE").contains("Verbraucht ist nichts"), reason.name)
        }
    }

    @Test
    fun aBlockedGateIsPhrasedRatherThanSilent() {
        val refused = HintOutcome.Refused(HintRefusal.GATE)
        assertTrue(HintPhrase.of(refused, "en-US").isNotBlank())
        assertTrue(HintPhrase.of(refused, "de-DE").isNotBlank())
    }
}

private val FREE = listOf(HintRefusal.GATE, HintRefusal.UNSETTLED, HintRefusal.EXPIRED, HintRefusal.OVER)
