package com.chesslab.arena

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ScoreTest {
    private fun truth(vararg sans: String) = sans.mapIndexed { i, san -> TruthPly(san, i * 100) }

    private fun run(vararg pairs: Pair<String, Long>) = pairs.map { RunPly(it.first, it.second, 0.0) }

    @Test
    fun `a perfect run is all found`() {
        val scored = score(truth("e4", "e5", "Nf3"), run("e4" to 1, "e5" to 101, "Nf3" to 201))
        assertEquals(3, scored.found.size)
        assertEquals(0, scored.invented.size)
        assertEquals(listOf(1L, 1L, 1L), scored.lag)
    }

    @Test
    fun `a skipped ply is missed, not invented`() {
        val scored = score(truth("e4", "e5", "Nf3"), run("e4" to 1, "Nf3" to 201))
        assertEquals(listOf("e5"), scored.missed.map { it.san })
        assertEquals(0, scored.invented.size)
    }

    @Test
    fun `an extra commit is a phantom`() {
        val scored = score(truth("e4", "e5"), run("e4" to 1, "d4" to 50, "e5" to 101))
        assertEquals(listOf("d4"), scored.invented.map { it.san })
        assertEquals(2, scored.found.size)
    }

    /** Order-preserving: a move committed too early may not match its later reference occurrence. */
    @Test
    fun `the same san out of order counts as invented`() {
        val scored = score(truth("e4", "e5", "Nf3", "Nc6"), run("Nf3" to 1, "e4" to 2, "e5" to 3))
        assertEquals(1, scored.invented.size)
        assertEquals("Nf3", scored.invented.first().san)
    }

    /** The reference ends where a tracker run gave up; a run that goes further is not inventing. */
    @Test
    fun `commits after a fully matched reference count as beyond, not as phantoms`() {
        val scored = score(truth("e4", "e5"), run("e4" to 1, "e5" to 101, "Nf3" to 201, "Nc6" to 301))
        assertEquals(2, scored.found.size)
        assertEquals(0, scored.invented.size)
        assertEquals(listOf("Nf3", "Nc6"), scored.beyond.map { it.san })
    }

    /** But only then: skipping a ply and carrying on is the phantom case the veto exists for. */
    @Test
    fun `a tail after a missed ply stays a phantom`() {
        val scored = score(truth("e4", "e5", "Nf3"), run("e4" to 1, "Qh5" to 101))
        assertEquals(0, scored.beyond.size)
        assertEquals(listOf("Qh5"), scored.invented.map { it.san })
    }

    @Test
    fun `a run that commits nothing invents nothing`() {
        val scored = score(truth("e4", "e5"), emptyList())
        assertEquals(0, scored.found.size)
        assertEquals(2, scored.missed.size)
        assertEquals(0, scored.invented.size)
        assertEquals(null, scored.medianLag)
    }
}
