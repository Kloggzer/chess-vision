package com.chesslab.arena

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Every run here is LEGAL: the arena refuses anything else, so an impossible run tests nothing real. */
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
    fun `plies the run never reached are missed`() {
        val scored = score(truth("e4", "e5", "Nf3", "Nc6"), run("e4" to 1, "e5" to 101))
        assertEquals(2, scored.found.size)
        assertEquals(listOf("Nf3", "Nc6"), scored.missed.map { it.san })
        assertEquals(0, scored.invented.size)
    }

    @Test
    fun `a wrong move is a phantom`() {
        val scored = score(truth("e4", "e5", "Nf3", "Nc6"), run("e4" to 1, "e5" to 101, "Qh5" to 201))
        assertEquals(listOf("Qh5"), scored.invented.map { it.san })
        assertEquals(listOf("Nf3", "Nc6"), scored.missed.map { it.san })
        assertEquals(0, scored.reordered)
    }

    /** A still frame cannot prove an order: the same board in the same number of half-moves counts. */
    @Test
    fun `a reordering that reaches the same board counts as found`() {
        val scored = score(truth("Nf3", "e5", "e4"), run("e4" to 10, "e5" to 20, "Nf3" to 30))
        assertEquals(3, scored.found.size)
        assertEquals(0, scored.missed.size)
        assertEquals(0, scored.invented.size)
        // Two, not three: `e5` is `e5` in both readings — only the two that swapped are reordered.
        assertEquals(2, scored.reordered)
    }

    /** The exemption is order, not count — a shorter path to the same board is still a miss. */
    @Test
    fun `a different number of half-moves is not a reordering`() {
        val scored = score(truth("e4", "e5", "Nf3", "Nc6"), run("e4" to 10, "e5" to 20))
        assertEquals(0, scored.reordered)
        assertEquals(2, scored.missed.size)
    }

    @Test
    fun `commits after a fully matched reference count as beyond`() {
        val scored = score(truth("e4", "e5"), run("e4" to 1, "e5" to 101, "Nf3" to 201, "Nc6" to 301))
        assertEquals(2, scored.found.size)
        assertEquals(0, scored.invented.size)
        assertEquals(listOf("Nf3", "Nc6"), scored.beyond.map { it.san })
    }

    @Test
    fun `a tail after a missed ply stays a phantom`() {
        val scored = score(truth("e4", "e5", "Nf3", "Nc6"), run("e4" to 1, "e5" to 101, "Qh5" to 201, "Nc6" to 301))
        assertEquals(0, scored.beyond.size)
        assertEquals(listOf("Qh5", "Nc6"), scored.invented.map { it.san })
    }

    @Test
    fun `a run that commits nothing invents nothing`() {
        val scored = score(truth("e4", "e5"), emptyList())
        assertEquals(0, scored.found.size)
        assertEquals(2, scored.missed.size)
        assertEquals(0, scored.invented.size)
        assertEquals(null, scored.medianLag)
    }

    @Test
    fun `lag can be negative when the run commits before the truth frame`() {
        assertEquals(listOf(-50L), score(listOf(TruthPly("e4", 100)), listOf(RunPly("e4", 50, 0.0))).lag)
    }

    @Test
    fun `medianLag is the middle value`() {
        val scored = score(truth("e4", "e5", "Nf3"), run("e4" to 10, "e5" to 90, "Nf3" to 220))
        assertEquals(listOf(10L, -10L, 20L), scored.lag)
        assertEquals(10L, scored.medianLag)
    }
}
