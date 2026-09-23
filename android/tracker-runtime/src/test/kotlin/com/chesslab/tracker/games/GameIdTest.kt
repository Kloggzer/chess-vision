package com.chesslab.tracker.games

import com.chesslab.engine.api.STARTPOS
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** Two ways `GameStore` lost stored games without a word. */
class GameIdTest {
    /** At minute resolution two games shared an id, and `save` overwrote the first one's files. */
    @Test
    fun `two games started in the same minute do not share an id`() {
        val first = gameId(START_MS)
        val second = gameId(START_MS + 31_000L)

        assertNotEquals(first, second)
    }

    @Test
    fun `the id still sorts chronologically as a string`() {
        val ids = listOf(gameId(START_MS + 31_000L), gameId(START_MS), gameId(START_MS + 86_400_000L))

        assertEquals(ids.sorted(), listOf(ids[1], ids[0], ids[2]))
    }

    @Test
    fun `the id is still a legal file stem`() {
        assertEquals(gameId(START_MS), gameId(START_MS).filter { it.isLetterOrDigit() || it == '-' || it == '_' })
    }

    /** `list()` read a corrupt index as an empty library and `save()` rewrote it from that (Codex, 2026-09-15). */
    @Test
    fun `a corrupt index does not orphan the games already stored`(
        @TempDir root: File,
    ) {
        val store = GameStore(root)
        store.save(game("a"))
        File(root, "index.json").writeText("{ das ist kein Array")

        store.save(game("b"))

        assertEquals(setOf("a", "b"), store.list().map { it.id }.toSet())
    }

    private fun game(id: String) = StoredGame(id, STARTPOS, 1_000L, 2_000L, "board-a", "*", listOf(StoredMove(1, "e4", "e2e4", 1L)))

    private companion object {
        const val START_MS = 1_700_000_000_000L
    }
}
