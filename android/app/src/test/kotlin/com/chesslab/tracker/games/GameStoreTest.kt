package com.chesslab.tracker.games

import com.chesslab.engine.STARTPOS
import com.chesslab.engine.api.Decision
import com.chesslab.tracker.ui.MoveEntry
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

class GameStoreTest {
    private fun decision() =
        Decision(
            decider = "engine",
            reason = "legal_unique",
            best = 0.9,
            second = 0.1,
            margin = 0.8,
            changed = listOf("e2", "e4"),
            shadowVeto = emptyList(),
            occluded = emptyList(),
            priorUsed = false,
        )

    private fun sampleMoves() =
        listOf(
            MoveEntry(san = "e4", decision = decision()),
            MoveEntry(san = "e5", decision = null),
        )

    @Test
    fun `save then list round-trips a GameSummary`(
        @TempDir dir: File,
    ) {
        val store = GameStore(dir)
        val summary = store.save(sampleMoves(), STARTPOS)

        requireNotNull(summary)
        assertEquals(2, summary.moveCount)
        assertNull(summary.opening)

        val listed = store.list()
        assertEquals(1, listed.size)
        assertEquals(summary, listed.first())
    }

    @Test
    fun `list returns newest first`(
        @TempDir dir: File,
    ) {
        val store = GameStore(dir)
        val first = store.save(sampleMoves(), STARTPOS)
        val second = store.save(sampleMoves(), STARTPOS)

        requireNotNull(first)
        requireNotNull(second)
        assertEquals(listOf(second.id, first.id), store.list().map { it.id })
    }

    @Test
    fun `loadPgn and loadProvenance return the written content`(
        @TempDir dir: File,
    ) {
        val store = GameStore(dir)
        val summary = requireNotNull(store.save(sampleMoves(), STARTPOS))

        val pgn = store.loadPgn(summary.id)
        assertTrue(pgn.contains("1. e4 e5"))

        val provenance = store.loadProvenance(summary.id)
        assertEquals(1, provenance.size)
        assertEquals("e4", provenance.first().san)
        assertEquals("engine", provenance.first().decider)
    }

    @Test
    fun `delete removes both files and the index entry`(
        @TempDir dir: File,
    ) {
        val store = GameStore(dir)
        val summary = requireNotNull(store.save(sampleMoves(), STARTPOS))

        store.delete(summary.id)

        assertTrue(store.list().isEmpty())
        assertTrue(store.loadProvenance(summary.id).isEmpty())
        assertFalse(File(dir, "${summary.id}.pgn").exists())
        assertFalse(File(dir, "${summary.id}.provenance.json").exists())
    }

    @Test
    fun `empty-moves game is not saved`(
        @TempDir dir: File,
    ) {
        val store = GameStore(dir)
        val summary = store.save(emptyList(), STARTPOS)

        assertNull(summary)
        assertTrue(store.list().isEmpty())
    }
}
