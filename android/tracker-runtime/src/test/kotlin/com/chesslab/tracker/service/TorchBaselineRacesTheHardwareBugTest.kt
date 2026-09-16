package com.chesslab.tracker.service

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test

/** A lamp the device has not switched yet: `enableTorch()` returned its future and nothing waited. */
private class PendingLamp : TorchLampPort {
    override val torchOn = MutableStateFlow(false)
    override val hasTorch = true
    var applied = false
        private set

    override fun setTorch(on: Boolean): Boolean {
        torchOn.value = on
        return true
    }

    fun deviceApplied() {
        applied = true
    }
}

/** Bug-Audit A5: `enableTorch()` gibt ein Future zurueck, niemand wartet darauf, und die Basis
 *  entsteht womoeglich unter der ALTEN Beleuchtung — genau der Referenz, die sie ersetzen soll.
 *  Lasttragend: jede Dunkel-Aufnahme lief hierdurch (`docs/bug-audit-2026-09-13.md`). */
@Disabled("BUG: A5 — the baseline is taken before the device confirms the torch actually switched")
@OptIn(ExperimentalCoroutinesApi::class)
class TorchBaselineRacesTheHardwareBugTest {
    @Test
    fun theBaselineWaitsForTheDeviceToConfirmTheLamp() =
        runTest {
            val lamp = PendingLamp()
            val seenApplied = mutableListOf<Boolean>()
            TorchSwitch(lamp = lamp, scope = this, baseline = { seenApplied += lamp.applied }).setTorchOn(true)
            advanceUntilIdle()

            assertEquals(
                listOf(true),
                seenApplied,
                "the baseline ran before the device had switched the lamp — it captures the old light",
            )
        }
}
