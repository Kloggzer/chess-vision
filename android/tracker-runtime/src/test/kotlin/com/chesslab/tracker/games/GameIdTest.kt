package com.chesslab.tracker.games

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test

/**
 * At minute resolution two games started inside one minute shared an id, and `GameStore.save` then
 * overwrote the first one's `.json` and `.pgn` and dropped its index row without a word.
 */
class GameIdTest {
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

    private companion object {
        const val START_MS = 1_700_000_000_000L
    }
}
