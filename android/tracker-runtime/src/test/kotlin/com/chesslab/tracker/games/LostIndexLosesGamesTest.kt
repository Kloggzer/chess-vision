package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/**
 * Das KDoc von `GameStore` sagt: "a lost index costs the library listing, never a game". Es tut
 * das Gegenteil — `list()` macht aus einem unlesbaren Index eine leere Bibliothek, und `save()`
 * schreibt den Index danach aus genau dieser leeren Liste neu. Die `<id>.json` bleiben liegen,
 * aber nichts zeigt mehr auf sie. Gefunden von Codex, 2026-09-15.
 */
class LostIndexLosesGamesTest {
    @TempDir
    lateinit var root: File

    private fun game(id: String) =
        StoredGame(
            id = id,
            startFen = STARTPOS,
            startedAtEpochMs = 1_000L,
            finishedAtEpochMs = 2_000L,
            profileName = "board-a",
            result = "*",
            moves = listOf(StoredMove(1, "e4", "e2e4", 1L)),
        )

    @Test
    fun `a corrupt index does not orphan the games already stored`() {
        val store = GameStore(root)
        store.save(game("a"))
        File(root, "index.json").writeText("{ das ist kein Array")

        store.save(game("b"))

        assertEquals(setOf("a", "b"), store.list().map { it.id }.toSet())
    }
}
