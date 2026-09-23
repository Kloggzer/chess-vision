package com.chesslab.tracker.ui.review

import com.chesslab.tracker.analysis.EngineService
import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.analysis.ScriptedEngineProcess
import com.chesslab.tracker.analysis.UciEngine
import com.chesslab.tracker.analysis.engineScript
import com.chesslab.tracker.games.GameStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

private const val START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

class MateLineFailureTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun aHandshakeThatFailsIsShownWithItsReason() =
        runBlocking {
            val mute = ScriptedEngineProcess(engineScript(emptyList())).apply { dieOn = "uci" }
            val reviews = ReviewStore(dir)
            val resolved = resolve(EngineService { UciEngine("fake") { mute } }, reviews)

            assertEquals(listOf("e2e4"), resolved.uciLine, "the seed stays on the board")
            assertEquals("Engine unavailable: UCI engine terminated", mateResolutionNote(resolved))
            assertNull(reviews.loadMateLine(START, ReviewBudget()), "a failure is never cached")
        }

    @Test
    fun aMissingBinaryIsShownAsSuch() =
        runBlocking {
            val resolved = resolve(EngineService { null }, ReviewStore(dir))

            assertEquals("Engine unavailable: no Stockfish binary for this device", mateResolutionNote(resolved))
        }

    private suspend fun resolve(
        engines: EngineService,
        reviews: ReviewStore,
    ) = CoroutineScope(SupervisorJob() + Dispatchers.Default).let { scope ->
        try {
            ReviewViewModel(GameStore(dir), reviews, engines, scope).resolveMateLine(START, listOf("e2e4"))
        } finally {
            scope.cancel()
        }
    }
}
