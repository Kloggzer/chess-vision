package com.chesslab.tracker

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Planted counter-checks for [commentBlocks]; the samples sit in raw strings, so they do not count. */
class CommentBudgetCounterCheckTest {
    @Test
    fun einLangerKommentarblockWirdGezaehlt() {
        val text =
            """
            // eins
            // zwei
            // drei
            // vier
            // fuenf
            // sechs
            val x = 1
            """

        assertEquals(1, commentBlocks(text))
    }

    @Test
    fun eineLeerzeileBrichtDenLauf() {
        val text = "// eins\n// zwei\n// drei\n\n// vier\n// fuenf\n"

        assertEquals(0, commentBlocks(text))
    }

    @Test
    fun einKommentarZeichenImRohenStringIstKeinKommentar() {
        val text = "val muster =\n" + "\"\"\"\n" + "// eins\n// zwei\n// drei\n// vier\n// fuenf\n// sechs\n" + "\"\"\"\n"

        assertEquals(0, commentBlocks(text), "Zeilen in einem rohen String sind kein Kommentarblock")
    }

    /** Die bekannte Blindstelle, Punkt 33 in `docs/offene-entscheidungen.md`. */
    @Test
    fun einWachsenderBlockBleibtEineEins() {
        val kurz = "// x\n".repeat(5) + "val a = 1\n"
        val lang = "// x\n".repeat(50) + "val a = 1\n"

        assertEquals(commentBlocks(kurz), commentBlocks(lang), "die Ratsche sieht Laenge nicht")
    }

    @Test
    fun vierZeilenLiegenUnterDerGrenze() {
        val text = "// eins\n// zwei\n// drei\n// vier\nval x = 1\n"

        assertEquals(0, commentBlocks(text))
    }
}
