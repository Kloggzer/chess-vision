package com.chesslab.tracker.camera

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Backoff schedule + one-shot diagnosis of the camera rebind policy (ports dba6f29). */
class ReconnectPolicyTest {
    @Test
    fun `backoff doubles per failure and caps at 30s`() {
        val policy = ReconnectPolicy()
        val seen = mutableListOf<Double>()
        repeat(6) {
            seen.add(policy.backoffS())
            policy.onFailure()
        }
        assertEquals(listOf(3.0, 6.0, 12.0, 24.0, 30.0, 30.0), seen)
    }

    @Test
    fun `first delivered frame resets the schedule`() {
        val policy = ReconnectPolicy()
        repeat(4) { policy.onFailure() }
        assertEquals(30.0, policy.backoffS())
        policy.onFrameDelivered()
        assertEquals(0, policy.attempts)
        assertEquals(3.0, policy.backoffS())
    }

    @Test
    fun `diagnosis fires exactly once after three failed rebinds`() {
        val policy = ReconnectPolicy()
        repeat(2) {
            policy.onFailure()
            assertFalse(policy.shouldDiagnose(), "no diagnosis before 3 failures")
        }
        policy.onFailure()
        assertTrue(policy.shouldDiagnose(), "diagnosis after 3 failures")
        policy.onFailure()
        assertFalse(policy.shouldDiagnose(), "one-shot: never twice")
        // A recovered camera re-arms the diagnosis for the next outage.
        policy.onFrameDelivered()
        repeat(3) { policy.onFailure() }
        assertTrue(policy.shouldDiagnose())
    }
}
