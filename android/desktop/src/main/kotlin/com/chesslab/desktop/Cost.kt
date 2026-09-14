package com.chesslab.desktop

import java.util.Locale

/**
 * Wall-clock per operation, so a cost that gets quoted has been measured.
 *
 * This exists because of a specific gap: `Stage.LENS` was added so a full-frame `remap` would be
 * reportable rather than folded into another stage — and there was still no number for it anywhere,
 * because the only thing that prints stage timings is the phone's logcat. Meanwhile the two
 * expensive one-shot operations carry claims nobody has re-measured: ArUco "44-87 ms" (commit
 * 4a7609e) and `improveQuad` "70-85 ms at boardSize 800", whose own KDoc refuses to quote a device
 * figure precisely because none was taken.
 *
 * Medians, not means: a first call carries JIT and a first camera grab carries the sensor waking up,
 * and one outlier must not become the number people plan against. The count is printed so a median
 * over three samples cannot be mistaken for one over sixty.
 */
class Cost {
    private val samples = LinkedHashMap<String, MutableList<Double>>()

    fun <T> of(
        what: String,
        body: () -> T,
    ): T {
        val started = System.nanoTime()
        val out = body()
        samples.getOrPut(what) { mutableListOf() } += (System.nanoTime() - started) / NANOS_PER_MS
        return out
    }

    /** One line per operation. Silent when nothing was measured — an empty table says nothing. */
    fun report(title: String) {
        if (samples.isEmpty()) return
        println(title)
        samples.forEach { (what, ms) ->
            val sorted = ms.sorted()
            println(
                "  %-14s median %6.1f ms  p90 %6.1f  max %6.1f  (n=%d)".format(
                    Locale.US,
                    what,
                    sorted[sorted.size / 2],
                    sorted[p90Index(sorted.size)],
                    sorted.last(),
                    sorted.size,
                ),
            )
        }
    }
}

private const val NANOS_PER_MS = 1_000_000.0
private const val P90_NUM = 9
private const val P90_DEN = 10

/** Nearest-Rank, 0-basiert: `floor` zeigte bei n <= 10 auf das letzte Element, also aufs Maximum. */
private fun p90Index(n: Int): Int = maxOf(0, (n * P90_NUM + P90_DEN - 1) / P90_DEN - 1)
