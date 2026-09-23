package com.chesslab.tracker.ui.tracking

import com.chesslab.tracker.analysis.AnalysisLine
import com.chesslab.tracker.analysis.AnalysisOptions
import com.chesslab.tracker.analysis.AnalysisResult
import com.chesslab.tracker.analysis.EngineService
import com.chesslab.tracker.analysis.GateBlock
import com.chesslab.tracker.analysis.ScriptedEngineProcess
import com.chesslab.tracker.analysis.StockfishAnalyzer
import com.chesslab.tracker.analysis.UciEngine
import com.chesslab.tracker.analysis.engineScript
import com.chesslab.tracker.hints.HINT_SETTLE_MS
import com.chesslab.tracker.hints.HintController
import com.chesslab.tracker.hints.HintMoment
import com.chesslab.tracker.hints.HintOutcome
import com.chesslab.tracker.hints.HintPlan
import com.chesslab.tracker.hints.HintRefusal
import com.chesslab.tracker.hints.HintSide
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withTimeout
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Test
import java.util.concurrent.atomic.AtomicBoolean

private const val BLACK_TO_MOVE = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1"

private const val SEARCH_START_MS = 5_000L
private const val STOP_MS = 3_000L
private const val LIVE_WARMUP_MS = 500L

/** Der Tipp geht ueber denselben Weg wie `rememberHintRequest`: Controller, `liveLineResolver`,
 *  EIN `EngineService` — nur der Prozess ist gespielt. */
class HintLineGateTest {
    @Test
    fun theMateLineSearchesOnTheLiveEngineNotOnASecondProcess() =
        runTest {
            val processes = mutableListOf<ScriptedEngineProcess>()
            var mostAlive = 0
            val mate = engineScript(listOf("info depth 12 score mate 3 pv e7e5"), "bestmove e7e5")
            val engines =
                EngineService {
                    UciEngine("fake") {
                        ScriptedEngineProcess { command ->
                            if (command.startsWith("go")) mostAlive = maxOf(mostAlive, processes.count { it.isAlive })
                            mate(command)
                        }.also { processes += it }
                    }
                }
            val analyzer =
                StockfishAnalyzer(
                    fenProvider = { BLACK_TO_MOVE },
                    engines = engines,
                    dispatcher = StandardTestDispatcher(testScheduler),
                    lowerPriority = {},
                )
            analyzer.start(backgroundScope)
            advanceTimeBy(LIVE_WARMUP_MS)
            runCurrent()

            liveLineResolver(engines) { AnalysisOptions() }(BLACK_TO_MOVE, "e7e5")

            assertEquals(1, mostAlive, "the hint's mate line must search on the live engine, never beside it")
            analyzer.stop()
        }

    @Test
    fun aGateThatShutsMidSearchStopsTheEngineAndRefuses() =
        runBlocking {
            val searching = AtomicBoolean(false)
            val process = ScriptedEngineProcess { command -> hangingEngine(command, searching) }
            val engines = EngineService { UciEngine("fake") { process } }
            var gate: GateBlock? = null
            val controller = HintController().apply { startGame(HintPlan(HintSide.BLACK, quota = 2)) }

            val outcome =
                async(Dispatchers.Default) {
                    controller.request({ mateMoment(gate) }, liveLineResolver(engines) { AnalysisOptions() })
                }
            withTimeout(SEARCH_START_MS) { while (!searching.get()) delay(5) }
            gate = GateBlock.THERMAL
            engines.updateGate(gate)

            assertEquals(HintOutcome.Refused(HintRefusal.GATE), withTimeout(STOP_MS) { outcome.await() })
            assertFalse(process.isAlive, "the mate-line engine must be shut down, not left searching")
            assertEquals(2, controller.state.value.remaining)
        }

    @Test
    fun aShutGateStartsNoEngineForTheMateLine() =
        runTest {
            var spawned = 0
            val engines = EngineService { UciEngine("fake") { ScriptedEngineProcess(engineScript(emptyList())).also { spawned++ } } }
            engines.updateGate(GateBlock.FRAME_BUDGET)

            val line = liveLineResolver(engines) { AnalysisOptions() }(BLACK_TO_MOVE, "e7e5")

            assertEquals(listOf("e5"), line, "the seed survives, nothing is searched")
            assertEquals(0, spawned, "a LIVE consumer must not start Stockfish past the gate")
        }
}

private fun hangingEngine(
    command: String,
    searching: AtomicBoolean,
): List<String> =
    when {
        command == "uci" -> listOf("id name Fake", "uciok")
        command == "isready" -> listOf("readyok")
        command.startsWith("go") -> emptyList<String>().also { searching.set(true) }
        else -> emptyList()
    }

private fun mateMoment(blocked: GateBlock?) =
    HintMoment(
        fen = BLACK_TO_MOVE,
        steadyMs = HINT_SETTLE_MS,
        blocked = blocked,
        result =
            AnalysisResult(
                fen = BLACK_TO_MOVE,
                gameOver = false,
                cp = null,
                mate = -3,
                winWhite = 5.0,
                lines = listOf(AnalysisLine(uci = "e7e5", san = "e5", cp = null, mate = -3)),
                depth = 12,
            ),
    )
