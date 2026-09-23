package com.chesslab.tracker.io

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.util.Collections
import java.util.concurrent.CyclicBarrier

/** Unter einem geteilten `<name>.tmp` landet der Mischmasch zweier Rumpfe als fertige Datei. */
class WriteAtomicSideFileTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun `two writers on one file never tear it and never fail`() {
        val file = File(dir, "index.json")
        val payloads = (0 until WRITERS).map { "$it".repeat(BODY) }
        // Windows verweigert das Umhaengen gegen einen parallelen Ersetzer — erwartbar, nicht der Befund.
        val torn = Collections.synchronizedList(mutableListOf<Int>())
        val gate = CyclicBarrier(WRITERS)
        val threads =
            payloads.map { text ->
                Thread {
                    gate.await()
                    repeat(ROUNDS) {
                        runCatching { writeAtomic(file, text) }
                        runCatching { file.readText() }.onSuccess { if (it !in payloads) torn += it.length }
                    }
                }
            }
        threads.forEach(Thread::start)
        threads.forEach(Thread::join)

        assertEquals(emptyList<Int>(), torn.distinct().sorted()) { "halbe Rumpfe im Ziel" }
        assertTrue(file.readText() in payloads) { "torn destination: ${file.length()} bytes" }
    }

    @Test
    fun `each call gets its own side file`() {
        val file = File(dir, "index.json")
        val names = (0 until WRITERS).map { sideFile(file).name }
        assertEquals(names.size, names.distinct().size) { "side files repeat: $names" }
    }

    private companion object {
        const val WRITERS = 4
        const val ROUNDS = 40
        const val BODY = 200_000
    }
}
