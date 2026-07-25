package com.chesslab.tracker.geometry

import com.chesslab.tracker.settings.BoardOrientation
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * 07a's `AppSettings.orientation`, which was persisted and read by nobody (STATUS D07a-11).
 *
 * It is written INTO the calibration profile rather than applied beside it, because only the
 * profile survives a recalibration (`ensure_profile`, calibration.py:222). A wrong a8 transposes
 * every label of the session, silently — this is the invariant that class of bug is caught by.
 */
class OrientationSettingTest {
    private val stored =
        CalibrationProfile(
            name = "default",
            whitePov = true,
            sourceWidth = 1920,
            sourceHeight = 1080,
            corners = floatArrayOf(1f, 2f, 3f, 4f, 5f, 6f, 7f, 8f),
        )

    private val measured =
        MeasuredGeometry(floatArrayOf(9f, 9f, 90f, 9f, 90f, 90f, 9f, 90f), sourceWidth = 1920, sourceHeight = 1080)

    @Test
    fun theSettingLandsInTheGeometryTheWarpUses() =
        runTest {
            val store = CalibrationStore(FakeProfileBacking(encodeProfile(stored)))
            assertFalse(store.applyOrientation(BoardOrientation.BLACK_BOTTOM.whitePov).whitePov)
            assertTrue(store.applyOrientation(BoardOrientation.WHITE_BOTTOM.whitePov).whitePov)
        }

    @Test
    fun aRecalibrationAfterTheSettingCarriesItOverInsteadOfResettingIt() =
        runTest {
            val backing = FakeProfileBacking(encodeProfile(stored))
            val store = CalibrationStore(backing)
            store.applyOrientation(whitePov = false)

            val next = store.saveRecalibrated(measured)

            assertFalse(next.whitePov, "a recalibration must not silently reset a chosen orientation")
            assertEquals(1920, next.sourceWidth)
        }

    @Test
    fun anUnchangedOrientationDoesNotRewriteTheProfile() =
        runTest {
            val backing = FakeProfileBacking(encodeProfile(stored))
            CalibrationStore(backing).applyOrientation(whitePov = true)
            assertEquals(0, backing.writes, "a no-op restart must not touch the safety-critical profile")
        }

    @Test
    fun withNoStoredProfileTheSettingStillReachesTheGeometry() =
        runTest {
            val backing = FakeProfileBacking()
            val store = CalibrationStore(backing)
            assertFalse(store.applyOrientation(whitePov = false).whitePov)
            // Nothing is invented on disk: the first real calibration is what writes a profile,
            // and D06a's "a bad profile is discarded, not repaired" rule stays intact.
            assertEquals(0, backing.writes)
            assertFalse(store.saveRecalibrated(measured, whitePovOverride = false).whitePov)
        }
}
