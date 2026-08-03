package com.chesslab.tracker.analysis

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
        val scores = listOf(Score(20, 30, "e2e4"), null, Score(-40, 28, null))
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
        store.save("g1", ReviewBudget(depth = 16), listOf(Score(20, 16, null)))
        assertNull(store.load("g1", ReviewBudget(depth = 30), positions = 1))
        assertNull(store.load("g1", ReviewBudget(movetimeMs = 400), positions = 1))
        assertEquals(1, store.load("g1", ReviewBudget(depth = 16), positions = 1)?.size)
    }

    /** A game that grew or shrank under the same id is a different game, not a longer analysis. */
    @Test
    fun aLengthThatNoLongerMatchesTheGameIsAMiss() {
        val store = store()
        store.save("g1", ReviewBudget(), listOf(Score(0, 30, null), Score(0, 30, null)))
        assertNull(store.load("g1", ReviewBudget(), positions = 5))
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
        store.save("g1", ReviewBudget(), listOf(Score(0, 30, null)))
        store.delete("g1")
        assertNull(store.load("g1", ReviewBudget(), positions = 1))
    }
}
