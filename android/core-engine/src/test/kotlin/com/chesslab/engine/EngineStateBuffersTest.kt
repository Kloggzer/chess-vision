package com.chesslab.engine

import com.chesslab.engine.api.TrackerEngine
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * `EngineState`'s two averaging buffers against the CNN-conditional `avgFrames` that gates them.
 *
 * They used to be constructed with `config.avgFrames(cnnOn = false)` and resized only by
 * `updateConfig`, while the frame loop's gate reads `state.avgFrames` — which drops from 3 to 2 the
 * moment the CNN attaches. Nothing resized them on that flip, so the loop sat waiting for a third
 * frame the mean would never have used.
 */
class EngineStateBuffersTest {
    @Test
    fun avgFramesFollowsTheCnnAttach() {
        val engine = TrackerEngine(testConfig())
        val state = engine.state
        assertEquals(AVG_FRAMES_NO_CNN, state.avgFrames, "no CNN yet")
        fill(state, AVG_FRAMES_NO_CNN)
        assertEquals(AVG_FRAMES_NO_CNN, state.grayBuf.size, "the window is the without-CNN one")

        engine.attachCnn(VerifyEvaluator())

        assertEquals(AVG_FRAMES_CNN, state.avgFrames, "attaching flips the gate")
        assertEquals(0, state.grayBuf.size, "and the buffers were rebuilt, exactly as a config change rebuilds them")
        assertEquals(0, state.bgrBuf.size)
        fill(state, AVG_FRAMES_CNN + 1)
        assertEquals(AVG_FRAMES_CNN, state.grayBuf.size, "the window really is the with-CNN one now")
        assertEquals(AVG_FRAMES_CNN, state.bgrBuf.size)

        engine.attachCnn(null)

        assertEquals(AVG_FRAMES_NO_CNN, state.avgFrames, "detaching flips it back")
        assertEquals(0, state.grayBuf.size)
    }

    /**
     * The same flip through `cnnVerify`, which `updateConfig` could not see: it compared
     * `config.avgFrames(cnnOn)` against `previous.avgFrames(cnnOn)` with the NEW `cnnOn` on both
     * sides, so the two cancelled out precisely when the config change was the one that moved the
     * window.
     */
    @Test
    fun avgFramesFollowsCnnVerifyBeingSwitchedOff() {
        val engine = TrackerEngine(testConfig())
        engine.attachCnn(VerifyEvaluator())
        val state = engine.state
        fill(state, AVG_FRAMES_CNN)
        assertEquals(AVG_FRAMES_CNN, state.grayBuf.size)

        engine.updateConfig(testConfig().copy(cnnVerify = false))

        assertTrue(!state.cnnOn, "cnnVerify off means the CNN gate is off")
        assertEquals(AVG_FRAMES_NO_CNN, state.avgFrames)
        assertEquals(0, state.grayBuf.size, "the with-CNN window was dropped")
        fill(state, AVG_FRAMES_NO_CNN + 1)
        assertEquals(AVG_FRAMES_NO_CNN, state.grayBuf.size)
    }

    /** A window that did not move must not drop what is buffered — a resize is Python's fresh mean. */
    @Test
    fun anUnchangedWindowKeepsTheBufferedFrames() {
        val engine = TrackerEngine(testConfig())
        fill(engine.state, AVG_FRAMES_NO_CNN)

        engine.updateConfig(testConfig().copy(zThr = OTHER_Z_THR))

        assertEquals(AVG_FRAMES_NO_CNN, engine.state.grayBuf.size)
    }

    private fun fill(
        state: EngineState,
        frames: Int,
    ) = repeat(frames) {
        state.grayBuf.append(grayFrame())
        state.bgrBuf.append(bgrFrame())
    }

    private companion object {
        // `TrackerConfig`'s companion is private; these are the same verbatim tracker.py counts.
        const val AVG_FRAMES_CNN = 2
        const val AVG_FRAMES_NO_CNN = 3
        const val CONFIRM_FRAMES_CNN = 1
        const val CONFIRM_FRAMES_NO_CNN = 2
        const val OTHER_Z_THR = 4.5
    }

    /**
     * The confirmers had the identical defect and the identical cancelling comparison. Unlike the
     * buffers they are the COMMIT path: `commitGates` reads `state.confirmFrames` while the live
     * `Confirmer` kept demanding the without-CNN count, so the status note printed
     * `count/confirmFrames` from two disagreeing sources.
     */
    @Test
    fun confirmFramesFollowsTheCnnAttach() {
        val engine = TrackerEngine(testConfig())
        val state = engine.state
        assertEquals(CONFIRM_FRAMES_NO_CNN, state.confirmFrames, "no CNN yet")
        assertFalse(state.confirmer.feed("e2e4"), "one vote of the two the window demands")
        assertEquals(1, state.confirmer.count)

        engine.attachCnn(VerifyEvaluator())

        assertEquals(CONFIRM_FRAMES_CNN, state.confirmFrames, "attaching flips the gate")
        assertEquals(0, state.confirmer.count, "and the confirmer was rebuilt — the old streak counted to a different threshold")
        assertTrue(state.confirmer.feed("e2e4"), "one vote is now enough")
        // Inverted on 2026-08-07 (specs/39 phase 02): this line used to assert the single-shot
        // behaviour — one feed, true — which meant a four-ply rewrite committed on one glance.
        // The recovery confirmer now has its own floor, whatever `confirmFrames` says.
        assertFalse(state.recoveryConfirmer.feed("e2e4"), "the recovery confirmer does NOT move with it")
        assertTrue(state.recoveryConfirmer.feed("e2e4"), "two agreeing glances are its floor")
        assertEquals(2, state.recoveryVotes)
    }

    /** The same flip through `cnnVerify`, which the old comparison could not see. */
    @Test
    fun confirmFramesFollowsCnnVerifyBeingSwitchedOff() {
        val engine = TrackerEngine(testConfig())
        engine.attachCnn(VerifyEvaluator())
        val state = engine.state
        assertEquals(CONFIRM_FRAMES_CNN, state.confirmFrames)

        engine.updateConfig(testConfig().copy(cnnVerify = false))

        assertEquals(CONFIRM_FRAMES_NO_CNN, state.confirmFrames, "cnnVerify off puts it back")
        assertFalse(state.confirmer.feed("e2e4"), "and one vote is no longer enough")
    }

    /** No move, no rebuild — the streak must survive an unrelated config change. */
    @Test
    fun anUnchangedConfirmWindowKeepsTheStreak() {
        val engine = TrackerEngine(testConfig())
        engine.state.confirmer.feed("e2e4")
        engine.updateConfig(testConfig().copy(zThr = 4.0))
        assertEquals(1, engine.state.confirmer.count, "zThr does not move the confirm window")
    }
}
