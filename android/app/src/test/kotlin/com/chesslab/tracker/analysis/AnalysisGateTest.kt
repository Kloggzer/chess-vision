package com.chesslab.tracker.analysis

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

private val SETTLED = GateInputs(trackingStableMs = 10_000)

private val ON = AnalysisSettings(enabled = true)

class AnalysisGateTest {
    @Test
    fun gateIsOffByDefault() {
        assertEquals(GateBlock.OFF, gateBlock(SETTLED))
    }

    @Test
    fun gateBlocksDuringWarmup() {
        assertEquals(GateBlock.WARMUP, gateBlock(GateInputs(trackingStableMs = 2_999), ON))
        assertNull(gateBlock(GateInputs(trackingStableMs = 3_000), ON))
    }

    @Test
    fun gateBlocksWhenThermalModerate() {
        assertEquals(GateBlock.THERMAL, gateBlock(SETTLED.copy(thermalStatus = 2), ON))
        assertNull(gateBlock(SETTLED.copy(thermalStatus = 1), ON))
    }

    @Test
    fun gateBlocksOnBatteryPressure() {
        assertEquals(GateBlock.BATTERY, gateBlock(SETTLED.copy(powerSaveMode = true), ON))
        assertEquals(GateBlock.BATTERY, gateBlock(SETTLED.copy(batteryPercent = 19, charging = false), ON))
        assertNull(gateBlock(SETTLED.copy(batteryPercent = 19, charging = true), ON))
        assertNull(gateBlock(SETTLED.copy(batteryPercent = 20, charging = false), ON))
    }

    @Test
    fun gateBlocksBelowFifteenFps() {
        assertEquals(GateBlock.FRAME_BUDGET, gateBlock(SETTLED.copy(medianFrameMs = 70.0), ON))
        assertNull(gateBlock(SETTLED.copy(medianFrameMs = 66.0), ON))
    }

    @Test
    fun theFrameBudgetOutranksTheUsersPressureSwitch() {
        val ignorePressure = ON.copy(respectPressure = false)
        assertNull(gateBlock(SETTLED.copy(thermalStatus = 3), ignorePressure))
        assertEquals(GateBlock.FRAME_BUDGET, gateBlock(SETTLED.copy(medianFrameMs = 200.0), ignorePressure))
    }

    @Test
    fun rollingMedianIgnoresASingleSpike() {
        val median = RollingMedian(window = 5)
        listOf(20.0, 22.0, 21.0, 300.0).forEach { median.add(it) }
        assertEquals(GateBlock.OFF, gateBlock(SETTLED.copy(medianFrameMs = median.median)))
        assertEquals(22.0, median.median)
        listOf(90.0, 95.0, 99.0).forEach { median.add(it) }
        assertEquals(GateBlock.FRAME_BUDGET, gateBlock(SETTLED.copy(medianFrameMs = median.median), ON))
    }

    /** `getIntProperty` answers `Integer.MIN_VALUE` for an unsupported property, a primitive no `?:` sees. */
    @Test
    fun `an unreadable battery does not gate analysis off`() {
        val inputs = GateInputs(batteryPercent = Int.MIN_VALUE, charging = false, trackingStableMs = 10_000L)
        assertNull(gateBlock(inputs, ON), "the KDoc on BATTERY_UNKNOWN promises exactly this")
    }
}
