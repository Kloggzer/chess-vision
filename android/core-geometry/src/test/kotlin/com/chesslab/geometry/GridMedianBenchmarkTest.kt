package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.opencv.core.CvType
import org.opencv.core.Mat
import kotlin.random.Random
import kotlin.system.measureNanoTime

/** Opt-in sequential kernel benchmark; no timing threshold is a correctness assertion. */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
@EnabledIfEnvironmentVariable(named = "CHESSLAB_GRID_BENCH", matches = "1")
class GridMedianBenchmarkTest {
    @Test
    fun `interleaved full versus windowed sequential sweeps`() {
        val side = 1072
        val mat = Mat(side, side, CvType.CV_8UC1)
        mat.put(0, 0, ByteArray(side * side).also(Random(42)::nextBytes))
        try {
            val gray = BoardGray(mat)
            val needed = profileSamples(side, 126.0, 32, 32.0, 19)
            assertEquals(533, needed.count { it })
            val expected = sweep(gray, needed, selected = false)
            repeat(5) {
                assertEquals(expected, sweep(gray, needed, selected = true))
                assertEquals(expected, sweep(gray, needed, selected = false))
            }
            val full = mutableListOf<Double>()
            val selected = mutableListOf<Double>()
            repeat(20) { round ->
                for (sparse in if (round % 2 == 0) listOf(false, true) else listOf(true, false)) {
                    val elapsed = measureNanoTime { assertEquals(expected, sweep(gray, needed, sparse)) } / 1e6
                    (if (sparse) selected else full).add(elapsed)
                }
            }
            println("GRID_MEDIAN_BENCH full_ms=$full selected_ms=$selected medians=17152->8528 pixel_visits=2161152->1074528")
        } finally {
            mat.release()
        }
    }

    private fun sweep(
        gray: BoardGray,
        needed: BooleanArray,
        selected: Boolean,
    ): Double {
        var sum = 0.0
        for (band in 0 until 8) {
            val lo = 32 + band * 126
            val mask = if (selected) needed else null
            val columns = gray.columnMedians(lo, lo + 126, mask)
            val rows = gray.rowMedians(lo, lo + 126, mask)
            for (i in needed.indices) {
                if (needed[i]) sum += columns[i] + rows[i]
            }
        }
        return sum
    }
}
