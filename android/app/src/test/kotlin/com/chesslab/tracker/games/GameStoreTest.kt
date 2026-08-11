package com.chesslab.tracker.games

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

class GameStoreTest {
    @TempDir
    lateinit var dir: File

    private fun store() = GameStore(File(dir, "games"))

    @Test
    fun storeRoundTripsGameWithProvenance() {
        val store = store()
        val saved = store.save(sampleGame())
        assertEquals("g1", saved?.id)
        assertEquals(listOf("g1"), store.list().map { it.id })
        val opened = store.open("g1")
        assertEquals("e2e4", opened?.moves?.first()?.uci)
        assertEquals(
            "diff_after_verify",
            opened
                ?.moves
                ?.first()
                ?.provenance
                ?.decider,
        )
        assertEquals(
            listOf("e2", "e4"),
            opened
                ?.moves
                ?.first()
                ?.provenance
                ?.changed,
        )
    }

    @Test
    fun indexIsWrittenAtomically() {
        val store = store()
        store.save(sampleGame())
        val index = File(dir, "games/index.json")
        val before = index.readText()
        // A directory where the temp file has to go: the write fails, and the point is that it
        // fails BEFORE anything touches the destination.
        File(dir, "games/index.json.tmp").mkdirs()
        runCatching { store.save(sampleGame(id = "g2")) }
        assertEquals(before, index.readText())
        assertEquals(listOf("g1"), store.list().map { it.id })
    }

    @Test
    fun emptyGameIsNotSaved() {
        val store = store()
        assertNull(store.save(sampleGame().copy(moves = emptyList())))
        assertTrue(store.list().isEmpty())
        assertFalse(File(dir, "games/g1.pgn").exists())
    }

    @Test
    fun renameRewritesPgnHeadersKeepsId() {
        val store = store()
        store.save(sampleGame())
        val renamed = store.rename("g1", "Alice", "Bob", "Club night")
        assertEquals("g1", renamed?.id)
        val pgn = store.pgn("g1").orEmpty()
        assertTrue(pgn.contains("[White \"Alice\"]"), pgn)
        assertTrue(pgn.contains("[Black \"Bob\"]"), pgn)
        assertTrue(pgn.contains("[Event \"Club night\"]"), pgn)
        assertEquals("Alice", store.list().single().white)
    }

    /**
     * The games recorded before `closeSeams` existed are split on disk, and the split is in three
     * places: the move list, the stored PGN and the index row. `list()` never opens a game, so
     * without writing the closed record back the library would go on calling a continuous game
     * "rebuilt 1×" — with a review beside it that shows no seam at all.
     */
    @Test
    fun openingAnOldSplitGameClosesItAndWritesItBack() {
        val store = store()
        store.save(splitGame())

        val opened = store.open("split")!!

        assertEquals(listOf("e4", "e5", "Nf3", "Nc6"), opened.moves.map { it.san })
        assertEquals(1, opened.segments.size)
        assertEquals(0, store.list().single().seams, "the library row is not left claiming a rebuild")
        assertEquals(4, store.list().single().moveCount)
        assertFalse(store.pgn("split").orEmpty().contains("position rebuilt"), "and neither is the stored PGN")
    }

    @Test
    fun deleteRemovesPgnProvenanceAndIndexRow() {
        val store = store()
        store.save(sampleGame())
        assertNotNull(store.open("g1"))
        store.delete("g1")
        assertNull(store.open("g1"))
        assertNull(store.pgn("g1"))
        assertFalse(File(dir, "games/g1.json").exists())
        assertTrue(store.list().isEmpty())
    }
}

fun sampleProvenance() =
    MoveProvenance(
        decider = "diff_after_verify",
        reason = "diff candidate confirmed by the CNN",
        priorUsed = false,
        best = 18.42,
        second = 3.10,
        margin = 15.32,
        changed = listOf("e2", "e4"),
        shadowVetoed = emptyList(),
        occludedVetoed = emptyList(),
        cnnAgreement = 0.98,
        verifyOutcomes = listOf("ok"),
    )

/** 1.e4, then a recovery that committed 2.Nf3 from a position one ply ahead of the record. */
private fun splitGame(): StoredGame {
    val e4 = StoredMove(1, "e4", "e2e4", 1_700_000_010_000L, sampleProvenance())
    val nc6 = StoredMove(2, "Nc6", "b8c6", 1_700_000_020_000L, sampleProvenance())
    return sampleGame(id = "split").copy(
        moves = listOf(e4, nc6),
        segments =
            listOf(
                GameSegment("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", listOf(e4)),
                GameSegment(
                    "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
                    listOf(nc6),
                    SeamOrigin(
                        fenBefore = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
                        sans = listOf("Nf3"),
                        ucis = listOf("g1f3"),
                        decider = "cnn_recovery",
                    ),
                ),
            ),
    )
}

fun sampleGame(id: String = "g1") =
    StoredGame(
        id = id,
        startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        startedAtEpochMs = 1_700_000_000_000L,
        finishedAtEpochMs = 1_700_000_600_000L,
        profileName = "default",
        result = "*",
        moves = listOf(StoredMove(1, "e4", "e2e4", 1_700_000_010_000L, sampleProvenance())),
    )
