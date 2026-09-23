package com.chesslab.tracker.analysis

import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.IOException

private const val SANS = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7"

private val INFO = listOf("info depth 30 multipv 1 score cp 20 pv e2e4 e7e5")

private fun game() = reviewGameOf(SANS)

/** specs/44: how many SEARCHES the reader waits through — the multiplier on the device's ~2.2 s
 *  per position (measured 2026-08-03), the only part that is not a property of today's phone. */
class GameReviewerTest {
    private fun reviewer() = GameReviewer({ UciEngine("fake") { ScriptedEngineProcess(engineScript(INFO)) } })

    /** The pass it replaced showed nothing until all eleven searches (84 on the real game) were done. */
    @Test
    fun theFirstGradeArrivesAfterTwoSearchesAndNotAfterTheWholeGame() {
        val game = game()
        var searches = 0
        var searchesAtFirstGrade = 0
        runBlocking {
            reviewer().review(game, focus = { game.plies.size }) { scores ->
                searches++
                val graded = grade(game, scores, ReviewBudget())
                if (searchesAtFirstGrade == 0 && graded.byPly.isNotEmpty()) searchesAtFirstGrade = searches
            }
        }
        assertEquals(2, searchesAtFirstGrade)
        assertEquals(game.plies.size + 1, searches, "and it still finishes the whole game")
    }

    /** And the ply it grades first is the one being looked at, not ply 1. */
    @Test
    fun theFirstGradedPlyIsTheOneTheReaderIsOn() {
        val game = game()
        var first: Int? = null
        runBlocking {
            reviewer().review(game, focus = { 4 }) { scores ->
                val graded = grade(game, scores, ReviewBudget())
                if (first == null) first = graded.byPly.keys.firstOrNull()
            }
        }
        assertEquals(4, first)
    }

    /** Leaving the screen used to throw every second of engine time away. */
    @Test
    fun aFullSeedNeedsNoEngineAtAll() {
        val game = game()
        val complete = List<Score?>(game.plies.size + 1) { Score(20, 30, listOf("e2e4")) }
        var emissions = 0
        val started =
            runBlocking {
                // A null factory: if this touches the engine at all, it returns false.
                GameReviewer({ null }).review(game, seed = complete) { emissions++ }
            }
        assertTrue(started)
        assertEquals(1, emissions, "one paint, straight from the store")
    }

    /** A partial seed resumes rather than restarting — an interrupted review must not redo its work. */
    @Test
    fun aPartialSeedIsResumedAndItsScoresAreKept() {
        val game = game()
        val seed = List<Score?>(game.plies.size + 1) { if (it < 3) Score(999, 12, listOf("a2a3")) else null }
        var searches = 0
        var last: List<Score?> = emptyList()
        runBlocking {
            reviewer().review(game, seed = seed, focus = { game.plies.size }) {
                searches++
                last = it
            }
        }
        assertEquals(game.plies.size + 1 - 3, searches, "the three stored positions were not searched again")
        assertEquals(Score(999, 12, listOf("a2a3")), last[0], "and they came back untouched")
    }

    @Test
    fun theReviewKeepsStockfishsMateDistanceForTheScoreSheet() {
        val mateInfo = listOf("info depth 30 multipv 1 score mate 3 pv e2e4")
        var startScore: Score? = null
        runBlocking {
            GameReviewer({ UciEngine("fake") { ScriptedEngineProcess(engineScript(mateInfo)) } })
                .review(game(), focus = { 0 }) { scores -> startScore = scores.firstOrNull() ?: startScore }
        }
        assertEquals(3, startScore?.mate)
    }

    /** No engine binary for this ABI is a `false`, never an exception on the review screen. */
    @Test
    fun aMissingEngineIsReportedRatherThanThrown() {
        var emissions = 0
        val started = runBlocking { GameReviewer({ null }).review(game()) { emissions++ } }
        assertFalse(started)
        assertEquals(0, emissions)
    }

    @Test
    fun anEngineCrashIsNotTurnedIntoAndPersistedAsAnEqualPosition() {
        val process = ScriptedEngineProcess(engineScript(INFO)).apply { dieOn = "go movetime 3000 nodes 1500000" }
        var emissions = 0

        assertThrows(IOException::class.java) {
            runBlocking {
                GameReviewer({ UciEngine("fake") { process } }).review(game()) { emissions++ }
            }
        }
        assertEquals(0, emissions)
    }
}
