package com.chesslab.tracker.service

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private class FakeLamp(
    private val engages: Boolean = true,
) : TorchLampPort {
    override val torchOn = MutableStateFlow(false)
    override val hasTorch = engages
    val calls = mutableListOf<Boolean>()

    override fun setTorch(on: Boolean): Boolean {
        calls += on
        if (engages) torchOn.value = on
        return engages
    }
}

/**
 * The lamp is not the content — the BASELINE is.
 *
 * The reference the frame-diff compares against was taken under the old light, so the moment the
 * lamp changes every square reads as changed and the next frame is `too_many_changed`. Torch, then
 * baseline. There used to be an optics re-measure between the two; with the automatic freeze gone
 * (`OpticsLock`) there is nothing to re-converge, and a pinned EV must not be undone behind the
 * user's back.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class TorchSwitchTest {
    private fun switch(
        lamp: TorchLampPort,
        log: MutableList<String>,
        scope: kotlinx.coroutines.CoroutineScope,
    ) = TorchSwitch(
        lamp = lamp,
        scope = scope,
        baseline = { log += "baseline" },
    )

    @Test
    fun switchingOnTakesAFreshBaseline() =
        runTest {
            val lamp = FakeLamp()
            val log = mutableListOf<String>()
            switch(lamp, log, this).setTorchOn(true)
            advanceUntilIdle()
            assertEquals(listOf(true), lamp.calls)
            assertEquals(listOf("baseline"), log, "the lamp changed, so the reference must too")
        }

    /** Switching OFF invalidates the reference just as completely. Both directions, or neither. */
    @Test
    fun switchingOffDoesTheSameSequence() =
        runTest {
            val lamp = FakeLamp()
            val log = mutableListOf<String>()
            val torch = switch(lamp, log, this)
            torch.setTorchOn(true)
            advanceUntilIdle()
            log.clear()
            torch.setTorchOn(false)
            advanceUntilIdle()
            assertEquals(listOf("baseline"), log)
        }

    /**
     * A device with no flash unit must not lose its baseline to a tap that did nothing. Re-anchoring
     * for a lamp that never came on is a free way to break a running game.
     */
    @Test
    fun aLampThatCannotEngageChangesNothingElse() =
        runTest {
            val lamp = FakeLamp(engages = false)
            val log = mutableListOf<String>()
            switch(lamp, log, this).setTorchOn(true)
            advanceUntilIdle()
            assertTrue(log.isEmpty(), "no torch, so above all no new baseline: $log")
        }

    @Test
    fun theStateIsTheLampsAnswerNotTheRequest() =
        runTest {
            val lamp = FakeLamp(engages = false)
            val torch = switch(lamp, mutableListOf(), this)
            torch.setTorchOn(true)
            advanceUntilIdle()
            assertEquals(false, torch.torchOn.value, "a lamp that never engaged must not read as on")
        }

    /**
     * The switch must not answer this from a copy — the UI hides the whole control on `false`.
     *
     * What is under test is [TorchSwitch.hasTorch]'s delegation, not the fake: this used to read
     * `FakeLamp(engages = false).torchOn` and assert `false`, which is that flow's initial value
     * and never touched `hasTorch` at all. Asserting on `FakeLamp.hasTorch` directly would be no
     * better — the fake assigns it from its own constructor flag — so the assertion has to go
     * through the production `get()`.
     */
    @Test
    fun hasTorchIsReportedFromTheDevice() =
        runTest {
            assertEquals(false, switch(FakeLamp(engages = false), mutableListOf(), this).hasTorch)
            assertTrue(switch(FakeLamp(), mutableListOf(), this).hasTorch)
        }
}
