package com.chesslab.tracker.analysis

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.InputStream
import java.io.OutputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

private const val STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

private const val AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"

/** Fool's mate: White is mated, so the analyzer must not even launch an engine. */
private const val MATED = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"

private val OPENING_INFO = listOf("info depth 14 multipv 1 score cp 30 pv e2e4 e7e5")

class StockfishAnalyzerTest {
    private val warnings = mutableListOf<String>()

    private fun analyzer(
        scheduler: kotlinx.coroutines.test.TestCoroutineScheduler,
        fens: () -> String?,
        engines: () -> UciEngine?,
    ) = StockfishAnalyzer(
        fenProvider = fens,
        engines = EngineService(engines),
        dispatcher = StandardTestDispatcher(scheduler),
        lowerPriority = {},
        warn = { warnings += it },
    )

    @Test
    fun analyzerSkipsUnchangedFen() =
        runTest {
            val proc = ScriptedEngineProcess(engineScript(OPENING_INFO))
            val subject = analyzer(testScheduler, { STARTPOS }) { UciEngine("fake") { proc } }
            subject.start(backgroundScope)
            testScheduler.advanceTimeBy(2_000)
            runCurrent()
            assertEquals(1, proc.commands.count { it.startsWith("go ") }, proc.commands.toString())
            subject.stop()
        }

    @Test
    fun analyzerBuildsFreshBoardPerFen() =
        runTest {
            val proc = ScriptedEngineProcess(engineScript(listOf("info depth 9 multipv 1 score cp 20 pv e7e5")))
            var fen = STARTPOS
            val subject = analyzer(testScheduler, { fen }) { UciEngine("fake") { proc } }
            subject.start(backgroundScope)
            testScheduler.advanceTimeBy(500)
            runCurrent()
            fen = AFTER_E4
            testScheduler.advanceTimeBy(500)
            runCurrent()
            assertTrue("position fen $STARTPOS" in proc.commands, proc.commands.toString())
            assertTrue("position fen $AFTER_E4" in proc.commands, proc.commands.toString())
            // The SAN is legal in the SECOND position only — proof that no board state leaked.
            assertEquals(
                "e5",
                subject.result.value
                    ?.lines
                    ?.first()
                    ?.san,
            )
            subject.stop()
        }

    @Test
    fun scoresAreWhitePovEndToEnd() =
        runTest {
            val proc = ScriptedEngineProcess(engineScript(listOf("info depth 9 multipv 1 score cp 120 pv e7e5")))
            val subject = analyzer(testScheduler, { AFTER_E4 }) { UciEngine("fake") { proc } }
            subject.start(backgroundScope)
            testScheduler.advanceTimeBy(500)
            runCurrent()
            // Black to move and "+120" for Black is -120 for White; the bar must read below 50.
            assertEquals(-120, subject.result.value?.cp)
            assertTrue((subject.result.value?.winWhite ?: 50.0) < 50.0)
            subject.stop()
        }

    @Test
    fun mateScoresPinTheBar() =
        runTest {
            val proc = ScriptedEngineProcess(engineScript(listOf("info depth 9 multipv 1 score mate 3 pv e2e4")))
            val subject = analyzer(testScheduler, { STARTPOS }) { UciEngine("fake") { proc } }
            subject.start(backgroundScope)
            testScheduler.advanceTimeBy(500)
            runCurrent()
            assertEquals(100.0, subject.result.value?.winWhite)
            subject.stop()

            val losing = ScriptedEngineProcess(engineScript(listOf("info depth 9 multipv 1 score mate -3 pv e2e4")))
            val second = analyzer(testScheduler, { STARTPOS }) { UciEngine("fake") { losing } }
            second.start(backgroundScope)
            testScheduler.advanceTimeBy(500)
            runCurrent()
            assertEquals(0.0, second.result.value?.winWhite)
            second.stop()
        }

    @Test
    fun gameOverYieldsEmptyResult() =
        runTest {
            var launched = 0
            val subject =
                analyzer(testScheduler, { MATED }) {
                    launched++
                    UciEngine("fake") { ScriptedEngineProcess(engineScript(OPENING_INFO)) }
                }
            subject.start(backgroundScope)
            testScheduler.advanceTimeBy(500)
            runCurrent()
            val result = subject.result.value
            assertTrue(result?.gameOver == true)
            assertNull(result?.cp)
            assertNull(result?.mate)
            assertNull(result?.winWhite)
            assertEquals(emptyList<AnalysisLine>(), result?.lines)
            assertEquals(0, result?.depth)
            assertEquals(0, launched, "a finished game must not launch an engine")
            subject.stop()
        }

    @Test
    fun analyzerSelfDisablesWithoutBinary() =
        runTest {
            var asked = 0
            val subject =
                analyzer(testScheduler, { STARTPOS }) {
                    asked++
                    null
                }
            subject.start(backgroundScope)
            testScheduler.advanceTimeBy(5_000)
            runCurrent()
            assertEquals(AnalysisState.Unavailable, subject.state.value)
            assertEquals(1, asked)
            subject.start(backgroundScope)
            testScheduler.advanceTimeBy(5_000)
            runCurrent()
            assertEquals(1, asked, "a missing binary is never retried in this process")
            assertEquals(AnalysisState.Unavailable, subject.state.value)
        }

    @Test
    fun analyzerSurvivesEngineCrash() =
        runTest {
            val dying = ScriptedEngineProcess(engineScript(OPENING_INFO)).apply { dieOn = "go movetime 400" }
            val healthy = ScriptedEngineProcess(engineScript(OPENING_INFO))
            val processes = ArrayDeque(listOf(dying, healthy))
            val subject = analyzer(testScheduler, { STARTPOS }) { UciEngine("fake") { processes.removeFirst() } }
            subject.start(backgroundScope)
            testScheduler.advanceTimeBy(3_000)
            runCurrent()
            assertTrue(warnings.isNotEmpty(), "a failed analysis must warn")
            assertTrue(healthy.commands.any { it.startsWith("go ") }, "the next tick must relaunch")
            assertEquals(30, subject.result.value?.cp)
            subject.stop()
        }

    /** Eine Suche ohne `info`-Zeile hat nichts gemessen; sie erfand stattdessen 50,0. */
    @Test
    fun aSearchWithoutAnyScoreIsNotPublishedAsAnEvenPosition() =
        runTest {
            val proc = ScriptedEngineProcess(engineScript(emptyList()))
            val subject = analyzer(testScheduler, { STARTPOS }) { UciEngine("fake") { proc } }
            subject.start(backgroundScope)
            testScheduler.advanceTimeBy(1_000)
            runCurrent()
            subject.stop()

            assertNull(subject.result.value?.winWhite, "ohne Bewertung darf keine Zahl auf dem Balken stehen")
        }

    /** `ensureEngine` wies `engine` erst NACH `start()` zu: ein gescheiterter Handshake liess den Prozess stehen. */
    @Test
    fun aFailedHandshakeLeavesNoRunningProcessBehind() =
        runTest {
            val spawned = mutableListOf<DeadProcess>()
            val subject = analyzer(testScheduler, { STARTPOS }) { UciEngine("fake") { DeadProcess().also { spawned += it } } }
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
    fun analysisRunsOnItsOwnDispatcher() {
        val seen = arrayOfNulls<String>(1)
        val latch = CountDownLatch(1)
        val subject =
            StockfishAnalyzer(
                fenProvider = { null },
                engines = EngineService { null },
                lowerPriority = {
                    seen[0] = Thread.currentThread().name
                    latch.countDown()
                },
            )
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        subject.start(scope)
        assertTrue(latch.await(5, TimeUnit.SECONDS))
        subject.stop()
        scope.cancel()
        // kotlinx' debug mode appends " @coroutine#N" to the thread name under test.
        val name = seen[0].orEmpty().substringBefore(" @")
        assertEquals(ANALYSIS_THREAD_NAME, name)
        assertNotEquals("chesslab-analyzer", name)
        assertNotEquals("chesslab-cnn", name)
    }
}
