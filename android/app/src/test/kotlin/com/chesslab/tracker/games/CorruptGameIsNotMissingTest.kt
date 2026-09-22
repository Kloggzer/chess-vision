package com.chesslab.tracker.games

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** Die `<id>.json` ist der EINZIGE Partienachweis. `open` gab bei fehlender wie bei unlesbarer
 *  Datei dasselbe `null`, und ein lesbarer, aber ALTER Index verbarg jede Partie, die er nicht
 *  nennt — beschaedigt sah damit aus wie nie dagewesen. */
class CorruptGameIsNotMissingTest {
    @TempDir
    lateinit var dir: File

    private fun store() = GameStore(File(dir, "games"))

    @Test
    fun `a missing game is null and a damaged one says so`() {
        val store = store()
        store.save(sampleGame())
        assertNull(store.open("nie-dagewesen"))

        File(dir, "games/g1.json").writeText("{ das ist kein Spiel")

        assertThrows(GameUnreadable::class.java) { store.open("g1") }
        assertEquals(listOf("g1"), store.list().map { it.id }, "und die Bibliothek fuehrt die Zeile weiter")
    }

    @Test
    fun `a stale index does not hide a game that is on disk`() {
        val store = store()
        store.save(sampleGame())
        store.save(sampleGame(id = "g2"))
        // Lesbar, aber alt: genau der Fall, in dem `rows` NICHT auf die Einzeldateien zurueckfiel.
        File(dir, "games/index.json").writeText("[]")

        assertEquals(setOf("g1", "g2"), store.list().map { it.id }.toSet())
    }
}
