package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

/**
 * The scorer against known inputs — a test of the SCORER, not of the tracker. The plan's
 * acceptance: a label scored against itself must reproduce itself exactly (found = all,
 * missed = invented = 0), because the label exists and the comparison owes it nothing less.
 */
class RealGameScoreTest {
    @Test
    fun aLabelScoredAgainstItselfIsAllFound() {
        val label = plies("e4", "e5", "Nf3", "Nc6", "Bb5")
        val score = scoreMoves(label, label)
        assertEquals(label.size, score.found.size)
        assertTrue(score.missed.isEmpty())
        assertTrue(score.invented.isEmpty())
    }

    @Test
    fun aMissAndAPhantomStaySeparateDirections() {
        val label = plies("e4", "e5", "Nf3", "Nc6")
        val run = plies("e4", "e5", "Bd6", "Nc6")
        val score = scoreMoves(label, run)
        assertEquals(listOf("e4", "e5", "Nc6"), score.found.map { it.first.san })
        assertEquals(listOf("Nf3"), score.missed.map { it.san })
        assertEquals(listOf("Bd6"), score.invented.map { it.san })
    }

    @Test
    fun aSwapThatNeverReachesTheSamePositionStaysMissedAndInvented() {
        // Order is negotiable only where the board comes back together: `e5` is not legal for
        // White, so this run never stands where the label stands and the swap is a real failure.
        val label = plies("e4", "e5")
        val run = plies("e5", "e4")
        val score = scoreMoves(label, run)
        assertEquals(1, score.found.size)
        assertEquals(1, score.missed.size)
        assertEquals(1, score.invented.size)
        assertTrue(score.reordered.isEmpty())
    }

    @Test
    fun aTranspositionIsFoundAndReordered() {
        // Both sides stand on the same board after four plies — the frames cannot prove which
        // order produced it (11-59-12 commits whole bundles on one frame).
        val label = plies("Nf3", "Nf6", "g3", "g6")
        val run = plies("g3", "g6", "Nf3", "Nf6")
        val score = scoreMoves(label, run)
        assertEquals(4, score.found.size)
        assertEquals(4, score.reorderedPlies)
        assertTrue(score.missed.isEmpty())
        assertTrue(score.invented.isEmpty())
        assertEquals(
            listOf("Nf3", "Nf6", "g3", "g6"),
            score.reordered
                .single()
                .label
                .map { it.san },
        )
        assertEquals(
            listOf("g3", "g6", "Nf3", "Nf6"),
            score.reordered
                .single()
                .run
                .map { it.san },
        )
    }

    @Test
    fun aRunThatLeavesTheLineKeepsItsPhantom() {
        // Legal, but the run never comes back onto the label's board: no order excuse.
        val label = plies("e4", "e5", "Nf3", "Nc6", "Bb5")
        val run = plies("e4", "e5", "Nf3", "a6", "Bb5")
        val score = scoreMoves(label, run)
        assertEquals(listOf("a6"), score.invented.map { it.san })
        assertEquals(listOf("Nc6"), score.missed.map { it.san })
        assertTrue(score.reordered.isEmpty())
    }

    @Test
    fun aRunThatCommitsNothingMissesEverythingAndInventsNothing() {
        val label = plies("e4", "e5", "Nf3")
        val score = scoreMoves(label, emptyList())
        assertTrue(score.found.isEmpty())
        assertEquals(3, score.missed.size)
        assertTrue(score.invented.isEmpty())
    }

    @Test
    fun aRunThatKeepsPlayingPastTheReferenceIsBeyondAndNotInvented() {
        // The video runs on after the labeled game: those plies are unjudged, not phantoms.
        val label = plies("e4", "e5", "Nf3")
        val run = plies("e4", "e5", "Nf3", "Nc6", "Bb5")
        val score = scoreMoves(label, run)
        assertEquals(3, score.found.size)
        assertTrue(score.invented.isEmpty())
        assertEquals(listOf("Nc6", "Bb5"), score.beyond.map { it.san })
    }

    @Test
    fun aPhantomInsideTheReferenceStaysInvented() {
        val label = plies("e4", "e5", "Nf3")
        val run = plies("e4", "Bd6", "e5", "Nf3")
        val score = scoreMoves(label, run)
        assertEquals(listOf("Bd6"), score.invented.map { it.san })
        assertTrue(score.beyond.isEmpty())
    }

    @Test
    fun theRealPythonLabelRoundTripsThroughTheReader() {
        // The committed 2026-08-02 candidate is the schema contract; when it is present on this
        // machine the reader must reproduce its 22 plies. Data is gitignored, so absent = skipped,
        // exactly like the video-gated harness runs.
        val candidate = File("../../data/recordings/game-2026-08-02/candidate.json")
        if (!candidate.isFile) return
        val label = labelPlies(candidate)
        assertEquals(22, label.size, "the Python reference records 22 plies")
        val score = scoreMoves(label, label)
        assertEquals(22, score.found.size)
        assertTrue(score.missed.isEmpty())
        assertTrue(score.invented.isEmpty())
    }

    private fun plies(vararg sans: String): List<ScoredPly> = sans.mapIndexed { i, san -> ScoredPly(san, frame = i * 30, decider = "diff") }
}
