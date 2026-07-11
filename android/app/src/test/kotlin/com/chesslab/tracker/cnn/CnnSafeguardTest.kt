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
    private var inputSeq = 0
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

    private fun input(seq: Int = ++inputSeq): ObservationInput =
        ObservationInput(
            crops = ALL_SQUARES.map { SquareCrop(1, 1, FloatArray(3)) },
            gray = GrayImage(1, 1, ByteArray(1)),
            bgr = null,
            seq = seq,
        )

    /** Classifier that "sees" fixed per-square labels (0.99 on the given class). */
    private inner class LabelClassifier(
        var labels: Map<String, String>,
    ) : SquareClassifier {
        override val spec = ModelSpec(classes, 1, 1)
        var calls = 0

        override fun predict(crops: List<SquareCrop>): List<FloatArray> {
            calls++
            return ALL_SQUARES.map { sq ->
                val probs = FloatArray(classes.size) { 0.001f }
                probs[classes.indexOf(labels.getValue(sq))] = 0.99f
                probs
            }
        }
    }

    private fun labelsOf(
        game: Game,
        overrides: Map<String, String> = emptyMap(),
    ): Map<String, String> = ALL_SQUARES.associateWith { overrides[it] ?: expectedLabel(game, it) }

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

    // -- verify vote gate (83a1e88) --

    @Test
    fun `no verify decision on a single observation - two agreeing observations decide`() =
        runTest {
            val classifier = FakeClassifier(gameAfter("e2e4"))
            var observations = 0
            val guard =
                CnnSafeguard(
                    classifier,
                    { if (observations < 1) input().also { observations++ } else null },
                    this,
                    clock = { currentTime * 1_000_000 },
                )
            val verdicts = mutableListOf<VerifyVerdict>()
            val collector = launch { guard.verdicts.toList(verdicts) }
            runCurrent()
            guard.requestVerify(MoveCandidate(listOf("e2e4"), STARTPOS, false), listOf("e2", "e4"))
            advanceUntilIdle()
            // Only ONE observation was available: the confirming outcome must NOT act.
            assertEquals(listOf<VerifyVerdict>(VerifyVerdict.Timeout(listOf("e2e4"))), verdicts)
            collector.cancel()
        }

    @Test
    fun `alternating outcomes never act`() =
        runTest {
            // Observation flip-flops between "move happened" (commit) and "board
            // unchanged" (shadow): the vote counter resets every time -> Timeout.
            val classifier = FakeClassifier(gameAfter("e2e4"))
            var n = 0
            val guard =
                CnnSafeguard(
                    classifier,
                    {
                        classifier.seen = if (n++ % 2 == 0) gameAfter("e2e4") else Game()
                        input()
                    },
                    this,
                    clock = { currentTime * 1_000_000 },
                )
            val verdicts = mutableListOf<VerifyVerdict>()
            val collector = launch { guard.verdicts.toList(verdicts) }
            runCurrent()
            guard.requestVerify(MoveCandidate(listOf("e2e4"), STARTPOS, false), listOf("e2", "e4"))
            advanceUntilIdle()
            assertEquals(listOf<VerifyVerdict>(VerifyVerdict.Timeout(listOf("e2e4"))), verdicts)
            collector.cancel()
        }

    // -- seq contract (e065051) --

    @Test
    fun `stale observations are ignored entirely`() =
        runTest {
            val guard =
                CnnSafeguard(
                    FakeClassifier(gameAfter("e2e4")),
                    { input(seq = 1) },
                    this,
                    clock = { currentTime * 1_000_000 },
                )
            val verdicts = mutableListOf<VerifyVerdict>()
            val collector = launch { guard.verdicts.toList(verdicts) }
            runCurrent()
            // Candidate decided on frame 5; all observations carry seq 1 -> never consumed.
            guard.requestVerify(MoveCandidate(listOf("e2e4"), STARTPOS, false, seq = 5), listOf("e2", "e4"))
            advanceUntilIdle()
            assertEquals(listOf<VerifyVerdict>(VerifyVerdict.Timeout(listOf("e2e4"))), verdicts)
            collector.cancel()
        }

    @Test
    fun `the same observation sequence cannot supply two verify votes`() =
        runTest {
            val guard =
                CnnSafeguard(
                    FakeClassifier(gameAfter("e2e4")),
                    { input(seq = 5) },
                    this,
                    clock = { currentTime * 1_000_000 },
                )
            val verdicts = mutableListOf<VerifyVerdict>()
            val collector = launch { guard.verdicts.toList(verdicts) }
            runCurrent()
            guard.requestVerify(MoveCandidate(listOf("e2e4"), STARTPOS, false, seq = 5), listOf("e2", "e4"))
            advanceUntilIdle()
            assertEquals(listOf<VerifyVerdict>(VerifyVerdict.Timeout(listOf("e2e4"))), verdicts)
            collector.cancel()
        }

    // -- illegal-move referee alarm (b80a03c, f6960f8, e065051 dedup) --

    private suspend fun tickThrice(
        guard: CnnSafeguard,
        advance: () -> Unit,
    ): List<RecoveryAction?> =
        (1..3).map {
            advance()
            guard.recoveryTick(STARTPOS, stuck = true)
        }

    @Test
    fun `three distinct stable occupancy-conflict observations ring the alarm`() =
        runTest {
            var nowNs = 0L
            var seq = 0
            val classifier = LabelClassifier(labelsOf(Game(), mapOf("b1" to "empty", "c4" to "wN")))
            val guard = CnnSafeguard(classifier, { input(seq = ++seq) }, this, clock = { nowNs })
            val actions = tickThrice(guard) { nowNs += 3_000_000_000L }
            assertNull(actions[0])
            assertNull(actions[1])
            val alarm = actions[2] as RecoveryAction.Alarm
            assertTrue("b1" in alarm.conflicts && "c4" in alarm.conflicts)
            assertEquals("b1c4", alarm.guessUci)
        }

    @Test
    fun `desync counting dedups per observation seq`() =
        runTest {
            var nowNs = 0L
            val classifier = LabelClassifier(labelsOf(Game(), mapOf("b1" to "empty", "c4" to "wN")))
            val guard = CnnSafeguard(classifier, { input(seq = 7) }, this, clock = { nowNs })
            val actions = tickThrice(guard) { nowNs += 3_000_000_000L }
            assertTrue(actions.all { it == null }, "same-seq re-evaluations must not advance the streak")
        }

    @Test
    fun `identity-only conflicts never alarm - occupancy fallback says board unchanged`() =
        runTest {
            var nowNs = 0L
            var seq = 0
            // b1 misread as a bishop: occupancy agrees, only the identity axis conflicts.
            val classifier = LabelClassifier(labelsOf(Game(), mapOf("b1" to "wB")))
            val guard = CnnSafeguard(classifier, { input(seq = ++seq) }, this, clock = { nowNs })
            val actions = tickThrice(guard) { nowNs += 3_000_000_000L }
            assertTrue(actions.all { it is RecoveryAction.BoardUnchanged })
        }

    @Test
    fun `identity derive fails but occupancy derive commits (1fcaf5c)`() =
        runTest {
            // e2e4 happened, but the arriving pawn is misread as a KNIGHT and d8 as a
            // ROOK: identity agreement stays below minAgreement forever (the frozen-
            // corrections failure); the occupancy axis derives e2e4.
            val classifier = LabelClassifier(labelsOf(gameAfter("e2e4"), mapOf("e4" to "wN", "d8" to "bR")))
            val guard = CnnSafeguard(classifier, { input() }, this, clock = { 0L })
            val action = guard.recoveryTick(STARTPOS, stuck = true)
            assertEquals(listOf("e2e4"), (action as RecoveryAction.Moves).ucis)
        }

    @Test
    fun `while alarmed a recovery commits only when it resolves the conflict squares`() =
        runTest {
            val classifier = LabelClassifier(labelsOf(gameAfter("e2e4")))
            val guard = CnnSafeguard(classifier, { input() }, this, clock = { 0L })
            val action =
                guard.recoveryTick(STARTPOS, stuck = true, alarmConflicts = listOf("e2", "e4"))
            val moves = action as RecoveryAction.Moves
            assertEquals(listOf("e2e4"), moves.ucis)
            assertTrue(moves.resolvesAlarm)
        }

    @Test
    fun `unreadable alarm conflict cannot clear the alarm`() =
        runTest {
            val labels = labelsOf(Game()).toMutableMap().apply { this["e2"] = "occluded" }
            val classifier = LabelClassifier(labels)
            val guard = CnnSafeguard(classifier, { input(seq = 1) }, this, clock = { 0L })

            val action = guard.recoveryTick(STARTPOS, stuck = true, alarmConflicts = listOf("e2"))

            assertNull(action)
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

    @Test
    fun `shutdown prevents inference from racing a closed classifier`() =
        runTest {
            val classifier = LabelClassifier(labelsOf(Game()))
            val guard = CnnSafeguard(classifier, { input() }, this)

            guard.shutdown()

            assertNull(guard.recoveryTick(STARTPOS, stuck = true))
            assertEquals(0, classifier.calls)
        }
}
