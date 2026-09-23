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

/** The BASELINE is the content: under the old light every square reads changed. A pinned EV must not be undone. */
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

    /** Re-anchoring for a lamp that never came on breaks a running game for free. */
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

    /** Through the production `get()`, never the fake's own flag. */
    @Test
    fun hasTorchIsReportedFromTheDevice() =
        runTest {
            assertEquals(false, switch(FakeLamp(engages = false), mutableListOf(), this).hasTorch)
            assertTrue(switch(FakeLamp(), mutableListOf(), this).hasTorch)
        }
}
