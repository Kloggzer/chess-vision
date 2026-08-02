package com.chesslab.tracker.service

import com.chesslab.tracker.camera.OpticsSettling
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
 * The lamp is not the content — the ORDER is.
 *
 * The optics are frozen, so a torch coming on under a locked exposure blows the image out; and the
 * reference the frame-diff compares against was taken under the old light, so every square would
 * read as changed and the next frame is `too_many_changed`. Torch, then re-measure, then baseline.
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
        remeasure = {
            log += "remeasure"
            OpticsSettling.Converged(null)
        },
        baseline = { log += "baseline" },
    )

    @Test
    fun switchingOnRemeasuresTheOpticsThenTakesABaseline() =
        runTest {
            val lamp = FakeLamp()
            val log = mutableListOf<String>()
            switch(lamp, log, this).setTorchOn(true)
            advanceUntilIdle()
            assertEquals(listOf(true), lamp.calls)
            assertEquals(listOf("remeasure", "baseline"), log, "the order is the whole point")
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
            assertEquals(listOf("remeasure", "baseline"), log)
        }

    /**
     * A device with no flash unit must not lose its baseline to a tap that did nothing. Re-measuring
     * and re-anchoring for a lamp that never came on is a free way to break a running game.
     */
    @Test
    fun aLampThatCannotEngageChangesNothingElse() =
        runTest {
            val lamp = FakeLamp(engages = false)
            val log = mutableListOf<String>()
            switch(lamp, log, this).setTorchOn(true)
            advanceUntilIdle()
            assertTrue(log.isEmpty(), "no torch, no re-measure and above all no new baseline: $log")
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
