package com.chesslab.tracker.ui.tracking

import com.chesslab.tracker.analysis.AnalysisLine
import com.chesslab.tracker.analysis.AnalysisResult
import com.chesslab.tracker.analysis.GateBlock
import com.chesslab.tracker.analysis.MateLineResolver
import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.analysis.ScriptedEngineProcess
import com.chesslab.tracker.analysis.UciEngine
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
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Test
import java.util.concurrent.atomic.AtomicBoolean

private const val BLACK_TO_MOVE = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1"

/** Far past the test's patience: only a cancelled search can end this early. */
private const val HANGING_SEARCH_MS = 20_000L
private const val SEARCH_START_MS = 5_000L
private const val STOP_MS = 3_000L

/** Der Tipp geht ueber denselben Weg wie `rememberHintRequest`: Controller, gegateter Resolver,
 *  echte `UciEngine` — nur der Prozess ist gespielt, und seine Suche endet nie von selbst. */
class HintLineGateTest {
    @Test
    fun aGateThatShutsMidSearchStopsTheSecondEngineAndRefuses() =
        runBlocking {
            val searching = AtomicBoolean(false)
            val process = ScriptedEngineProcess { command -> hangingEngine(command, searching) }
            val resolver =
                MateLineResolver(
                    engineFactory = { UciEngine("fake") { process } },
                    budget = ReviewBudget(nodes = 1, capMs = HANGING_SEARCH_MS, threads = 1, hashMb = 1),
                )
            val gate = MutableStateFlow<GateBlock?>(null)
            val controller = HintController().apply { startGame(HintPlan(HintSide.BLACK, quota = 2)) }

            val outcome =
                async(Dispatchers.Default) {
                    controller.request({ mateMoment(gate.value) }, gatedLineResolver(resolver, gate))
                }
            withTimeout(SEARCH_START_MS) { while (!searching.get()) delay(5) }
            gate.value = GateBlock.THERMAL

            assertEquals(HintOutcome.Refused(HintRefusal.GATE), withTimeout(STOP_MS) { outcome.await() })
            assertFalse(process.isAlive, "the mate-line engine must be shut down, not left searching")
            assertEquals(2, controller.state.value.remaining)
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
