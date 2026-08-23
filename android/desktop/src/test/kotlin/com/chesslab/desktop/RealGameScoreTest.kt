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
    fun orderIsNotNegotiable() {
        // The run commits the label's moves in the wrong order: matching backwards would hide a
        // real failure, so one side of the swap must land in each bucket.
        val label = plies("e4", "e5")
        val run = plies("e5", "e4")
        val score = scoreMoves(label, run)
        assertEquals(1, score.found.size)
        assertEquals(1, score.missed.size)
        assertEquals(1, score.invented.size)
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
