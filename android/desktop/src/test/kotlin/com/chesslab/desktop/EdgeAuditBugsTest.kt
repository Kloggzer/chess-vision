package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.ByteArrayOutputStream
import java.io.PrintStream

/** Red proofs from the 2026-09-14 edge audit of the desktop module. */
class EdgeAuditBugsTest {
    @Test
    fun aPhantomStaysAPhantomWhenTheLabelCarriesNoFrames() {
        // `labelPlies` stamps `frame = -1` on every ply the reference.pgn and the candidate
        // disagree about — a candidate that stops early or is shifted by one gives ALL of them -1.
        // `referenceEnd` is then -1 and every late commit escapes into `beyond`, though the label
        // still has an unplayed ply: `Bc4` is a phantom inside the reference, not past its end.
        val label = listOf("e4", "e5", "Nf3").map { ScoredPly(it, frame = -1, decider = "reference") }
        val run = listOf("e4", "e5", "Bc4").mapIndexed { i, s -> ScoredPly(s, i * 30, "diff") }

        val score = scoreMoves(label, run)

        assertEquals(listOf("Nf3"), score.missed.map { it.san })
        assertEquals(listOf("Bc4"), score.invented.map { it.san })
        assertTrue(score.beyond.isEmpty(), "beyond: ${score.beyond.map { it.san }}")
    }

    @Test
    fun thePrintedP90IsNotSimplyTheMaximum() {
        // `sorted[(n * 9) / 10]` is floor(0.9 n); for n <= 10 that is n - 1, i.e. `max` itself.
        val cost = Cost()
        repeat(9) { cost.of("op") { } }
        cost.of("op") { Thread.sleep(SLOW_MS) }

        val out = ByteArrayOutputStream()
        val saved = System.out
        try {
            System.setOut(PrintStream(out, true))
            cost.report("costs")
        } finally {
            System.setOut(saved)
        }
        val p90 = Regex("p90 +([0-9.]+)").find(out.toString())!!.groupValues[1].toDouble()
        assertTrue(p90 < SLOW_MS / 2.0, "p90 $p90 ms is the single slow sample, not the ninth of ten")
    }
}

private const val SLOW_MS = 60L
