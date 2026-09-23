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
 * The lamp is not the content — the BASELINE is: under the old light every square reads as changed.
 * No optics re-measure in between since `OpticsLock` went; a pinned EV must not be undone behind the user's back.
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

    /** Re-anchoring for a lamp that never came on is a free way to break a running game. */
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

    /** The UI hides the control on `false`; asserted through the production `get()`, never the fake's own flag. */
    @Test
    fun hasTorchIsReportedFromTheDevice() =
        runTest {
            assertEquals(false, switch(FakeLamp(engages = false), mutableListOf(), this).hasTorch)
            assertTrue(switch(FakeLamp(), mutableListOf(), this).hasTorch)
        }
}
