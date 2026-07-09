package com.chesslab.tracker.cnn

import com.chesslab.engine.Game
import com.chesslab.engine.STARTPOS
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.MoveCandidate
import com.chesslab.engine.api.VerifyVerdict
import com.chesslab.engine.uciOf
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.currentTime
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class CnnSafeguardTest {
    private val classes =
        listOf(
            "empty",
            "wP",
            "wN",
            "wB",
            "wR",
            "wQ",
            "wK",
            "bP",
            "bN",
            "bB",
            "bR",
            "bQ",
            "bK",
            "occluded",
        )

    /** Fake classifier that "sees" [seen]: near-1.0 prob on each square's true class. */
    private inner class FakeClassifier(
        var seen: Game,
    ) : SquareClassifier {
        override val spec = ModelSpec(classes, 1, 1)

        override fun predict(crops: List<SquareCrop>): List<FloatArray> =
            ALL_SQUARES.map { sq ->
                val label = expectedLabel(seen, sq)
                val probs = FloatArray(classes.size) { 0.001f }
                probs[classes.indexOf(label)] = 0.99f
                probs
            }
    }

    private fun input(): ObservationInput =
        ObservationInput(
            crops = ALL_SQUARES.map { SquareCrop(1, 1, FloatArray(3)) },
            gray = GrayImage(1, 1, ByteArray(1)),
            bgr = null,
        )

    private fun gameAfter(vararg ucis: String): Game {
        val g = Game()
        for (u in ucis) g.push(g.legalMoves().first { uciOf(it) == u })
        return g
    }

    @Test
    fun `verify emits FOR without blocking the caller`() =
        runTest {
            val guard =
                CnnSafeguard(FakeClassifier(gameAfter("e2e4")), { input() }, this, clock = { currentTime * 1_000_000 })
            val verdicts = mutableListOf<VerifyVerdict>()
            val collector = launch { guard.verdicts.toList(verdicts) }
            runCurrent()
            guard.requestVerify(MoveCandidate(listOf("e2e4"), STARTPOS, false), listOf("e2", "e4"))
            // requestVerify returned immediately; the worker decides on virtual time.
            assertTrue(verdicts.isEmpty())
            advanceUntilIdle()
            assertEquals(listOf<VerifyVerdict>(VerifyVerdict.For(listOf("e2e4"))), verdicts)
            collector.cancel()
        }

    @Test
    fun `verify never suspends the frame path even when frames stall`() =
        runTest {
            val guard =
                CnnSafeguard(
                    FakeClassifier(Game()),
                    { awaitCancellation() },
                    this,
                    clock = { currentTime * 1_000_000 },
                )
            guard.requestVerify(MoveCandidate(listOf("e2e4"), STARTPOS, false), listOf("e2", "e4"))
            // Returned synchronously; nothing to await here. Clean up the worker.
            runCurrent()
            coroutineContext.cancelChildren()
        }

    @Test
    fun `ghost candidate is rejected as shadow when the board is unchanged`() =
        runTest {
            val guard =
                CnnSafeguard(FakeClassifier(Game()), { input() }, this, clock = { currentTime * 1_000_000 })
            val verdicts = mutableListOf<VerifyVerdict>()
            val collector = launch { guard.verdicts.toList(verdicts) }
            runCurrent()
            guard.requestVerify(MoveCandidate(listOf("e2e4"), STARTPOS, false), listOf("e2", "e4"))
            advanceUntilIdle()
            val verdict = verdicts.single() as VerifyVerdict.Against
            assertTrue(verdict.boardUnchanged)
            collector.cancel()
        }

    @Test
    fun `recovery tick derives the missed move then respects the cooldown`() =
        runTest {
            var nowNs = 0L
            val guard = CnnSafeguard(FakeClassifier(gameAfter("e2e4")), { input() }, this, clock = { nowNs })
            val action = guard.recoveryTick(STARTPOS, stuck = true)
            val moves = action as RecoveryAction.Moves
            assertEquals(listOf("e2e4"), moves.ucis)
            // Within the 2 s cooldown: no new observation.
            nowNs += 1_000_000_000L
            assertNull(guard.recoveryTick(STARTPOS, stuck = true))
            // After the cooldown it observes again.
            nowNs += 1_500_000_000L
            assertTrue(guard.recoveryTick(STARTPOS, stuck = true) is RecoveryAction.Moves)
        }

    @Test
    fun `quiet-board periodic check reports BoardUnchanged only after the interval`() =
        runTest {
            var nowNs = 20_000_000_000L
            val guard = CnnSafeguard(FakeClassifier(Game()), { input() }, this, clock = { nowNs })
            assertTrue(guard.recoveryTick(STARTPOS, stuck = false) is RecoveryAction.BoardUnchanged)
            nowNs += 5_000_000_000L // < 10 s interval
            assertNull(guard.recoveryTick(STARTPOS, stuck = false))
        }
}
