package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ReconnectPolicyTest {
    @Test
    fun backoffScheduleIs3612243030() {
        val policy = ReconnectPolicy()
        val seen = mutableListOf<Double>()
        repeat(6) {
            seen += policy.backoffS()
            policy.onFailure(it * 1000L)
        }
        assertEquals(listOf(3.0, 6.0, 12.0, 24.0, 30.0, 30.0), seen)
    }

    @Test
    fun oneLuckyFrameDoesNotResetEscalation() {
        val policy = ReconnectPolicy()
        policy.onFailure(0L)
        policy.onFailure(1_000L)
        assertEquals(2, policy.attempts)

        policy.onFrameDelivered(2_000L)
        assertEquals(2, policy.attempts, "a frame 1 s after the last failure is not a recovery")
        policy.onFrameDelivered(9_999L)
        assertEquals(2, policy.attempts, "still inside the 10 s health window")

        policy.onFrameDelivered(11_000L)
        assertEquals(0, policy.attempts)
        assertEquals(3.0, policy.backoffS())
    }

    @Test
    fun diagnosisFiresExactlyOnceAfterThreeFailures() {
        val policy = ReconnectPolicy()
        policy.onFailure(0L)
        assertFalse(policy.shouldDiagnose(), "a single failure is not a diagnosis")

        var fired = 0
        repeat(9) {
            policy.onFailure((it + 2) * 1_000L)
            if (policy.shouldDiagnose()) fired++
        }
        assertEquals(1, fired)

        // A sustained recovery re-arms it, so a later outage is diagnosed again.
        policy.onFrameDelivered(60_000L)
        policy.onFailure(61_000L)
        policy.onFailure(62_000L)
        assertTrue(policy.shouldDiagnose())
    }

    @Test
    fun downshiftOfferedOnceAbove1080pThenLatched() {
        val uhd = DeliveredSize(3840, 2160, 0)
        val policy = ReconnectPolicy()
        policy.onFailure(0L)
        assertFalse(policy.offerDownshift(uhd), "one failure is too early")

        policy.onFailure(1_000L)
        assertTrue(policy.offerDownshift(uhd))
        assertTrue(policy.downshifted)
        policy.onFailure(2_000L)
        assertFalse(policy.offerDownshift(uhd), "never twice")

        val low = ReconnectPolicy()
        repeat(4) { low.onFailure(it * 1_000L) }
        assertFalse(low.offerDownshift(DeliveredSize(1280, 720, 0)), "already below 1080p")
        assertFalse(low.offerDownshift(null), "no delivered size yet")
        assertFalse(low.downshifted)
    }
}
