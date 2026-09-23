package com.chesslab.tracker.ui.games

import com.chesslab.tracker.analysis.ReviewStore
import com.chesslab.tracker.games.GameResult
import com.chesslab.tracker.games.GameStore
import com.chesslab.tracker.record.SessionStore
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

/** A game file that does not parse is a storage failure the list has to name, not a crash. */
@OptIn(ExperimentalCoroutinesApi::class)
class GamesViewModelFailureTest {
    @TempDir
    lateinit var root: File

    @Test
    fun anEditOfAnUnreadableGameSaysWhyInsteadOfCrashing() =
        runTest {
            val broken = File(root, "g1.json").apply { writeText("{ not a game") }
            val sessions = SessionStore(File(root, "s"))
            val model = GamesViewModel(GameStore(root), ReviewStore(root), sessions, this, context = StandardTestDispatcher(testScheduler))

            model.updateDetails("g1", "W", "B", "E", GameResult.UNFINISHED)
            advanceUntilIdle()

            assertEquals("Storage error: $broken ist nicht als Partie zu lesen", model.ui.value.error)
        }
}
