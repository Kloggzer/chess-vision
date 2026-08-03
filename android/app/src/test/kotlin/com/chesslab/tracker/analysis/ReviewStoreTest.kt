package com.chesslab.tracker.analysis

import com.chesslab.tracker.games.GAMES_JSON
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

class ReviewStoreTest {
    @TempDir
    lateinit var dir: File

    private fun store() = ReviewStore(File(dir, "games"))

    /** A PARTIAL run is the normal case now, so a run with holes in it has to survive the round trip. */
    @Test
    fun aPartialRunIsStoredAndReloadedWithItsHoles() {
        val store = store()
        val scores = listOf(Score(10_000, 30, listOf("e2e4"), mate = 3), null, Score(-40, 28))
        store.save("g1", ReviewBudget(), scores)
        assertEquals(scores, store.load("g1", ReviewBudget(), positions = 3))
    }

    /**
     * The budget is the KEY. Measured on the device: 14 of 83 plies change class between
     * `movetime 400` and depth 16 — so a stored result that does not say what produced it would mix
     * two opinions of the same move under one number.
     */
    @Test
    fun aResultFromADifferentBudgetIsAMissAndNeverAMerge() {
        val store = store()
        store.save("g1", ReviewBudget(nodes = 200_000), listOf(Score(20, 16)))
        assertNull(store.load("g1", ReviewBudget(nodes = 1_500_000), positions = 1))
        assertNull(store.load("g1", ReviewBudget(capMs = 400), positions = 1))
        assertEquals(1, store.load("g1", ReviewBudget(nodes = 200_000), positions = 1)?.size)
    }

    /** A game that grew or shrank under the same id is a different game, not a longer analysis. */
    @Test
    fun aLengthThatNoLongerMatchesTheGameIsAMiss() {
        val store = store()
        store.save("g1", ReviewBudget(), listOf(Score(0, 30), Score(0, 30)))
        assertNull(store.load("g1", ReviewBudget(), positions = 5))
    }

    /**
     * A file written before a stored score gained a field must be a MISS, not a silent downgrade —
     * `ignoreUnknownKeys` plus a defaulted field would otherwise hand back a complete-looking
     * analysis with the engine's advice missing from every ply.
     */
    @Test
    fun aFileFromAnOlderStoreFormatIsAMiss() {
        val store = store()
        File(dir, "games").mkdirs()
        val old = StoredAnalysis("g1", ReviewBudget(), listOf(StoredScore(20, 30)), version = 0)
        File(dir, "games/g1.analysis.json").writeText(GAMES_JSON.encodeToString(StoredAnalysis.serializer(), old))
        assertNull(store.load("g1", ReviewBudget(), positions = 1))
    }

    /**
     * **The budget key cannot police a change to the budget's own shape**, and on the device it did
     * not: the budget went from `depth`/`movetimeMs` to `nodes`/`capMs`, `ignoreUnknownKeys` dropped
     * the two unrecognised keys, the two new ones took their defaults, and a depth-30 analysis
     * compared equal to a node-budget one and was served as if it were current.
     */
    @Test
    fun aBudgetWrittenWithDifferentFIELDNAMESIsAMiss() {
        val store = store()
        File(dir, "games").mkdirs()
        File(dir, "games/g1.analysis.json").writeText(
            """{"gameId":"g1","budget":{"depth":30,"movetimeMs":3000,"threads":2,"hashMb":64,"multiPv":1},""" +
                """"scores":[{"cp":20,"depth":30}],"version":1}""",
        )
        assertNull(store.load("g1", ReviewBudget(), positions = 1))
    }

    @Test
    fun nothingStoredAndUnreadableRubbishBothReadAsNoAnalysis() {
        val store = store()
        assertNull(store.load("missing", ReviewBudget(), positions = 3))
        File(dir, "games").mkdirs()
        File(dir, "games/broken.analysis.json").writeText("{ not json")
        assertNull(store.load("broken", ReviewBudget(), positions = 3))
    }

    @Test
    fun discardingRemovesTheFileSoTheNextRunSearchesAgain() {
        val store = store()
        store.save("g1", ReviewBudget(), listOf(Score(0, 30)))
        store.delete("g1")
        assertNull(store.load("g1", ReviewBudget(), positions = 1))
    }

    @Test
    fun aCompletedMateLineIsSharedByPositionAcrossGamesAndRestarts() {
        val fenAtMove12 = "7k/8/8/8/8/8/6Q1/6K1 w - - 0 12"
        val samePositionAtMove40 = "7k/8/8/8/8/8/6Q1/6K1 w - - 0 40"
        val resolved = ResolvedMateLine(listOf("g2g7"), listOf("Qg7#"), complete = true)

        store().saveMateLine(fenAtMove12, ReviewBudget(), resolved)

        assertEquals(resolved, store().loadMateLine(samePositionAtMove40, ReviewBudget()))
    }

    @Test
    fun anIncompleteOrDifferentBudgetMateLineIsNeverServedAsComplete() {
        val fen = "7k/8/8/8/8/8/6Q1/6K1 w - - 0 12"
        val incomplete = ResolvedMateLine(listOf("g2g7"), listOf("Qg7+"), complete = false)
        val store = store()

        store.saveMateLine(fen, ReviewBudget(), incomplete)
        assertNull(store.loadMateLine(fen, ReviewBudget()))

        val complete = ResolvedMateLine(listOf("g2g7"), listOf("Qg7#"), complete = true)
        store.saveMateLine(fen, ReviewBudget(nodes = 20), complete)
        assertNull(store.loadMateLine(fen, ReviewBudget(nodes = 30)))
    }
}
