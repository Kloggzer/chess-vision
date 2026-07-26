package com.chesslab.tracker.camera

import android.hardware.camera2.CameraMetadata
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * When [OpticsLock] is allowed to freeze the optics.
 *
 * The whole value of the lock is in the timing: engaging it while auto-exposure is still ramping
 * pins the WRONG exposure permanently, which is strictly worse than never locking. So the predicate
 * that decides "the picture has settled" is the part worth testing, and it is kept free of any
 * framework object for exactly that reason.
 */
class OpticsLockTest {
    @Test
    fun allThreeConvergedIsTheOnlyWayIn() {
        assertTrue(
            OpticsLock.settled(
                CameraMetadata.CONTROL_AE_STATE_CONVERGED,
                CameraMetadata.CONTROL_AWB_STATE_CONVERGED,
                CameraMetadata.CONTROL_AF_STATE_FOCUSED_LOCKED,
            ),
        )
    }

    @Test
    fun aSearchingAlgorithmHoldsTheLockOff() {
        assertFalse(
            OpticsLock.settled(
                CameraMetadata.CONTROL_AE_STATE_SEARCHING,
                CameraMetadata.CONTROL_AWB_STATE_CONVERGED,
                CameraMetadata.CONTROL_AF_STATE_FOCUSED_LOCKED,
            ),
            "auto-exposure still ramping — locking here freezes the wrong exposure",
        )
        assertFalse(
            OpticsLock.settled(
                CameraMetadata.CONTROL_AE_STATE_CONVERGED,
                CameraMetadata.CONTROL_AWB_STATE_SEARCHING,
                CameraMetadata.CONTROL_AF_STATE_FOCUSED_LOCKED,
            ),
        )
        assertFalse(
            OpticsLock.settled(
                CameraMetadata.CONTROL_AE_STATE_CONVERGED,
                CameraMetadata.CONTROL_AWB_STATE_CONVERGED,
                CameraMetadata.CONTROL_AF_STATE_ACTIVE_SCAN,
            ),
            "the lens is still hunting — its distance is not the one to pin",
        )
    }

    /** A device that reports nothing must still get locked; waiting on it would wait forever. */
    @Test
    fun anUnreportedStateIsNotSomethingToWaitFor() {
        assertTrue(OpticsLock.settled(null, null, null))
        assertTrue(
            OpticsLock.settled(
                CameraMetadata.CONTROL_AE_STATE_CONVERGED,
                CameraMetadata.CONTROL_AWB_STATE_CONVERGED,
                null,
            ),
            "fixed-focus lenses commonly leave CONTROL_AF_STATE unset",
        )
    }

    /** `INACTIVE` is the fixed-focus lens that never runs AF, not an algorithm mid-flight. */
    @Test
    fun inactiveFocusCountsAsSettled() {
        assertTrue(
            OpticsLock.settled(
                CameraMetadata.CONTROL_AE_STATE_CONVERGED,
                CameraMetadata.CONTROL_AWB_STATE_CONVERGED,
                CameraMetadata.CONTROL_AF_STATE_INACTIVE,
            ),
        )
    }

    /** AE reporting `FLASH_REQUIRED` has finished measuring — it is a verdict, not a search. */
    @Test
    fun flashRequiredIsAFinishedMeasurement() {
        assertTrue(
            OpticsLock.settled(
                CameraMetadata.CONTROL_AE_STATE_FLASH_REQUIRED,
                CameraMetadata.CONTROL_AWB_STATE_CONVERGED,
                CameraMetadata.CONTROL_AF_STATE_PASSIVE_FOCUSED,
            ),
        )
    }
}
