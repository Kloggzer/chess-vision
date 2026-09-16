package com.chesslab.tracker.analysis

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.InputStream
import java.io.OutputStream

private const val START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

/**
 * Ein Handshake, der scheitert, laesst den schon gestarteten Prozess stehen: `ensureEngine` weist
 * `engine` erst NACH `start()` zu, also findet `closeEngine` nichts mehr.
 */
class OrphanedEngineProcessTest {
    /** Tot ab Sekunde null: `readUntil` bricht dann ohne Warteschleife ab. */
    private class DeadProcess : Process() {
        var destroyed = 0

        override fun getOutputStream(): OutputStream = OutputStream.nullOutputStream()

        override fun getInputStream(): InputStream = InputStream.nullInputStream()

        override fun getErrorStream(): InputStream = InputStream.nullInputStream()

        override fun waitFor(): Int = 0

        override fun exitValue(): Int = 0

        override fun isAlive(): Boolean = false

        override fun destroy() {
            destroyed += 1
        }
    }

    @Test
    fun aFailedHandshakeLeavesNoRunningProcessBehind() =
        runTest {
            val spawned = mutableListOf<DeadProcess>()
            val subject =
                StockfishAnalyzer(
                    fenProvider = { START_FEN },
                    engineFactory = { UciEngine("fake") { DeadProcess().also { spawned += it } } },
                    dispatcher = StandardTestDispatcher(testScheduler),
                    lowerPriority = {},
                    warn = {},
                )
            subject.start(backgroundScope)
            testScheduler.advanceTimeBy(2_000)
            runCurrent()
            subject.stop()

            assertTrue(spawned.isNotEmpty(), "der Lauf hat keinen Prozess gestartet — der Test misst nichts")
            assertEquals(
                spawned.size,
                spawned.count { it.destroyed > 0 },
                "jeder Fehlversuch laesst einen Stockfish-Prozess zurueck, den niemand mehr halten kann",
            )
        }
}
