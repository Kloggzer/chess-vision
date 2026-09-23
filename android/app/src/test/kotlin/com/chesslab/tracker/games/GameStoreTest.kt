package com.chesslab.tracker.games

import com.chesslab.tracker.io.defaultSideFiles
import com.chesslab.tracker.io.sideFiles
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

class GameStoreTest {
    @TempDir
    lateinit var dir: File

    private fun store() = GameStore(File(dir, "games"))

    @AfterEach
    fun restoreSideFiles() {
        sideFiles = defaultSideFiles
    }

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
        // A directory where the temp file goes: the write fails BEFORE touching the destination.
        File(dir, "games/index.json.tmp").mkdirs()
        sideFiles = { File(dir, "games/index.json.tmp") }
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
    fun updatingDetailsRewritesPgnHeadersKeepsId() {
        val store = store()
        store.save(sampleGame())
        val renamed = store.updateDetails("g1", "Alice", "Bob", "Club night", GameResult.WHITE)
        assertEquals("g1", renamed?.id)
        val pgn = store.pgn("g1").orEmpty()
        assertTrue(pgn.contains("[White \"Alice\"]"), pgn)
        assertTrue(pgn.contains("[Black \"Bob\"]"), pgn)
        assertTrue(pgn.contains("[Event \"Club night\"]"), pgn)
        assertEquals("Alice", store.list().single().white)
    }

    @Test
    fun aCorrectedResultReachesTheRecordTheIndexAndThePgn() {
        val store = store()
        store.save(sampleGame().copy(result = GameResult.UNFINISHED.tag))
        assertEquals(GameResult.UNFINISHED.tag, store.list().single().result)

        store.updateDetails("g1", "Alice", "Bob", "Club night", GameResult.DRAW)

        assertEquals(GameResult.DRAW.tag, store.open("g1")?.result)
        assertEquals(GameResult.DRAW.tag, store.list().single().result)
        assertTrue(store.pgn("g1").orEmpty().contains("[Result \"1/2-1/2\"]"), store.pgn("g1").orEmpty())
    }

    /** `closeSeams` rebuilds the move list and must not quietly re-derive the result while it does. */
    @Test
    fun aStatedResultSurvivesTheSeamMigration() {
        val store = store()
        store.save(splitGame().copy(result = GameResult.BLACK.tag))
        assertEquals(GameResult.BLACK.tag, store.open("split")?.result)
    }

    /** `list()` never opens a game, so without the write-back a continuous game read "rebuilt 1×". */
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

    /** Die `<id>.json` ist der EINZIGE Nachweis: fehlend und unlesbar gaben dasselbe `null`. */
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
