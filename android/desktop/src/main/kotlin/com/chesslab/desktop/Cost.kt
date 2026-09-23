package com.chesslab.desktop

import java.util.Locale

/** Wall-clock per operation, so a quoted cost has been measured. Medians: a first call carries JIT and a first
 *  grab the sensor waking up. The count is printed so a median over three is not read as one over sixty. */
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

/** Nearest-Rank, 0-basiert: `floor` zeigte bei n <= 10 aufs Maximum. */
private fun p90Index(n: Int): Int = maxOf(0, (n * P90_NUM + P90_DEN - 1) / P90_DEN - 1)
