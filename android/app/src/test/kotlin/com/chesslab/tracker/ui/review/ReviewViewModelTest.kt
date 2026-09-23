package com.chesslab.tracker.ui.review

import com.chesslab.tracker.analysis.EngineService
import com.chesslab.tracker.analysis.OpeningBook
import com.chesslab.tracker.analysis.ReviewBudget
import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.analysis.ScriptedEngineProcess
import com.chesslab.tracker.analysis.UciEngine
import com.chesslab.tracker.analysis.engineScript
import com.chesslab.tracker.analysis.openingPositionKey
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.games.StoredGame
import com.chesslab.tracker.games.StoredMove
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Side
import com.github.bhlangonijr.chesslib.move.Move
import com.github.bhlangonijr.chesslib.move.MoveList
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.util.concurrent.CountDownLatch

private const val START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
private const val SCORE_LINE = "info depth 18 multipv 1 score cp 20 pv e2e4"

/** After 1. e4 the book names the opening and offers two replies, so the warm has positions to fill. */
private fun kingsPawnBook(): OpeningBook {
    val afterE4 = openingPositionKey(Board().apply { doMove(Move("e2e4", Side.WHITE)) }.fen)
    val openings = tsv(listOf("position", "eco", "name", "canonicalPlies"), listOf(afterE4, "B00", "King's Pawn", "1"))
    val continuations =
        tsv(listOf("position", "uci", "references"), listOf(afterE4, "e7e5", "10"), listOf(afterE4, "c7c5", "5"))
    return OpeningBook.load(openings.byteInputStream(), continuations.byteInputStream())
}

private fun tsv(vararg rows: List<String>): String = rows.joinToString("") { it.joinToString(TAB) + "\n" }

private const val TAB = "\t"

class ReviewViewModelTest {
    @TempDir
    lateinit var dir: File

    @Test
    fun aCancelledRunCannotPaintOrPersistAfterAnotherGameWasLoaded() =
        runBlocking {
            val gameStore = GameStore(dir)
            gameStore.save(game("a", "1. e4"))
            gameStore.save(game("b", "1. d4"))
            val reviews = ReviewStore(dir)
            val entered = CountDownLatch(1)
            val release = CountDownLatch(1)
            val closed = CountDownLatch(1)
            val script = engineScript(listOf("info depth 18 multipv 1 score cp 20 pv e2e4"))
            val process =
                ScriptedEngineProcess { command ->
                    if (command.startsWith("go")) {
                        entered.countDown()
                        release.await()
                    }
                    if (command == "quit") closed.countDown()
                    script(command)
                }
            val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
            val model = ReviewViewModel(gameStore, reviews, EngineService { UciEngine("fake") { process } }, scope)

            model.load("a")
            await {
                model.ui.value.game
                    ?.id == "a"
            }
            model.review()
            withTimeout(2_000) { while (entered.count > 0) delay(5) }

            model.load("b")
            await {
                model.ui.value.game
                    ?.id == "b"
            }
            release.countDown()
            withTimeout(2_000) { while (closed.count > 0) delay(5) }

            assertEquals(
                "b",
                model.ui.value.game
                    ?.id,
            )
            assertNull(reviews.load("a", ReviewBudget(), positions = 2))
            scope.cancel()
        }

    @Test
    fun aLibraryWarmWithoutAnEngineIsNamed() =
        runBlocking {
            val note = warmWith { null }
            assertEquals("Engine unavailable: no Stockfish binary for this device — nearby book positions were not cached.", note)
        }

    @Test
    fun aLibraryWarmWhoseEngineDiesIsNamed() =
        runBlocking {
            val note = warmWith { UciEngine("fake") { ScriptedEngineProcess(engineScript(emptyList())).apply { dieOn = "uci" } } }
            assertEquals("Engine unavailable: UCI engine terminated — nearby book positions were not cached.", note)
        }

    /** The game itself reviews on a working engine; [later] is what the library warm gets afterwards. */
    private suspend fun warmWith(later: () -> UciEngine?): String? {
        val gameStore = GameStore(dir)
        gameStore.save(game("a", "1. e4"))
        var spawned = 0
        val engines =
            EngineService {
                if (spawned++ == 0) UciEngine("fake") { ScriptedEngineProcess(engineScript(listOf(SCORE_LINE))) } else later()
            }
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        try {
            val model = ReviewViewModel(gameStore, ReviewStore(dir), engines, scope, openingBook = ::kingsPawnBook)
            model.load("a")
            await { model.ui.value.game != null }
            model.review()
            await {
                !model.ui.value.running &&
                    model.ui.value.grade
                        ?.complete == true
            }
            return model.ui.value.libraryNote
        } finally {
            scope.cancel()
        }
    }

    private suspend fun await(condition: () -> Boolean) {
        withTimeout(3_000) {
            while (!condition()) delay(5)
        }
    }

    private fun game(
        id: String,
        san: String,
    ): StoredGame {
        val list = MoveList().apply { loadFromSan(san) }
        val move = list.first()
        return StoredGame(
            id = id,
            startFen = START_FEN,
            startedAtEpochMs = 0,
            finishedAtEpochMs = 1,
            profileName = "test",
            result = "*",
            moves = listOf(StoredMove(1, list.toSanArray().first(), move.toString(), 0)),
        )
    }
}
