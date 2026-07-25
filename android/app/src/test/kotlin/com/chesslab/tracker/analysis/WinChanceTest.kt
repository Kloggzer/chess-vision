package com.chesslab.tracker.analysis

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Expected values produced by `analysis.py`'s own `win_chance_white` on this machine. */
class WinChanceTest {
    @Test
    fun winChanceMatchesPythonSamples() {
        val expected =
            mapOf(
                -1000 to 2.4552563658567763,
                -300 to 24.88744990616516,
                -100 to 40.89741028083871,
                0 to 50.0,
                100 to 59.10258971916128,
                300 to 75.11255009383484,
                1000 to 97.54474363414323,
            )
        expected.forEach { (cp, want) -> assertEquals(want, winChanceWhite(cp), 1e-6, "cp=$cp") }
    }

    @Test
    fun winChanceIsFiftyAtZero() {
        assertEquals(50.0, winChanceWhite(0))
    }
}
