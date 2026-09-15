package com.chesslab.tracker.analysis

import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/**
 * `BatteryManager.getIntProperty` returns `Integer.MIN_VALUE` for an unsupported property, and
 * `AndroidPowerProbe`'s `?: BATTERY_UNKNOWN` cannot see it — the return type is a primitive.
 */
class UnreadableBatteryGateTest {
    @Test
    fun `an unreadable battery does not gate analysis off`() {
        val inputs = GateInputs(batteryPercent = Int.MIN_VALUE, charging = false, trackingStableMs = 10_000L)
        assertNull(gateBlock(inputs, AnalysisSettings(enabled = true)), "the KDoc on BATTERY_UNKNOWN promises exactly this")
    }
}
