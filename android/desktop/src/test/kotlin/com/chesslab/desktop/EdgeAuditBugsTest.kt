package com.chesslab.desktop

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.ByteArrayOutputStream
import java.io.PrintStream

/** Red proof from the 2026-09-14 edge audit of the desktop module. */
class EdgeAuditBugsTest {
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
