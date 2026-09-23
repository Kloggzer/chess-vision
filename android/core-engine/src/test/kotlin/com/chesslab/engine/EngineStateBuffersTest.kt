package com.chesslab.engine

import com.chesslab.engine.api.TrackerEngine
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Built with `avgFrames(cnnOn = false)` and resized only by `updateConfig`, the buffers made the loop wait
 *  for a third frame the mean never used once the CNN attached. */
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

    /** `updateConfig` compared with the NEW `cnnOn` on both sides, which cancelled out exactly when the change
     *  was the one moving the window. */
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

    /** A window that did not move must not drop what is buffered. */
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

    /** The confirmers had the identical defect on the COMMIT path: the note printed `count/confirmFrames` from
     *  two disagreeing sources. */
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
        // Inverted (specs/39 phase 02): one feed used to commit a four-ply rewrite on one glance. The recovery
        // confirmer has its own floor now.
        assertFalse(state.recoveryConfirmer.feed("e2e4"), "the recovery confirmer does NOT move with it")
        assertTrue(state.recoveryConfirmer.feed("e2e4"), "two agreeing glances are its floor")
        assertEquals(2, state.recoveryVotes)
    }

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
