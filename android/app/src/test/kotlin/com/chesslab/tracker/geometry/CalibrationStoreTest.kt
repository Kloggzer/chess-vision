package com.chesslab.tracker.geometry

import com.chesslab.geometry.margins4
import com.chesslab.tracker.settings.BoardOrientation
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** In-memory stand-in for the DataStore backing (see D06a-3). */
internal class FakeProfileBacking(
    initial: String? = null,
) : ProfileBacking {
    private val flow = MutableStateFlow(initial)
    var writes: Int = 0
        private set

    override val text: Flow<String?> = flow

    override suspend fun write(text: String) {
        writes++
        flow.value = text
    }

    val current: String? get() = flow.value
}

class CalibrationStoreTest {
    private val hand =
        CalibrationProfile(
            name = "default",
            boardSize = 1200,
            margin = margins4(0.09),
            markerDict = "DICT_5X5_50",
            // hand-set by the user: resetting this transposes every label of the next game
            whitePov = false,
            sourceWidth = 640,
            sourceHeight = 480,
            corners = floatArrayOf(1f, 2f, 3f, 4f, 5f, 6f, 7f, 8f),
            crop = CropParams(outW = 96, outH = 96, padSide = 0.12),
        )

    private val measured =
        MeasuredGeometry(floatArrayOf(9f, 9f, 90f, 9f, 90f, 90f, 9f, 90f), sourceWidth = 1920, sourceHeight = 1080)

    /** `boardSize` is a measurement: carrying it over rectified a 630 px board to 1600 on the phone. */
    @Test
    fun recalibrationCarriesOverWhitePovMarginAndCrop_butMeasuresTheBoardSize() =
        runTest {
            val backing = FakeProfileBacking(encodeProfile(hand))
            val next = CalibrationStore(backing).saveRecalibrated(measured)
            assertEquals(false, next.whitePov)
            assertNotEquals(1200, next.boardSize, "the hand-set size must not survive a remeasurement")
            assertEquals(measuredBoardSize(measured.corners), next.boardSize)
            assertEquals(margins4(0.09), next.margin, "all four corner margins carry over")
            assertEquals("DICT_5X5_50", next.markerDict)
            assertEquals(hand.crop, next.crop)
        }

    @Test
    fun recalibrationReplacesCornersAndSourceSize() =
        runTest {
            val store = CalibrationStore(FakeProfileBacking(encodeProfile(hand)))
            val next = store.saveRecalibrated(measured)
            assertArrayEquals(measured.corners, next.corners, 0f)
            assertEquals(1920, next.sourceWidth)
            assertEquals(1080, next.sourceHeight)
            assertEquals(next, (store.load() as ProfileLoad.Ok).profile)
        }

    @Test
    fun explicitWhitePovChangeOnConfirmWinsOverCarryOver() =
        runTest {
            val next = CalibrationStore(FakeProfileBacking(encodeProfile(hand))).saveRecalibrated(measured, whitePovOverride = true)
            assertEquals(true, next.whitePov)
        }

    @Test
    fun aFirstCalibrationUsesDefaultsAndTheMeasuredSize() =
        runTest {
            val backing = FakeProfileBacking()
            val next = CalibrationStore(backing).saveRecalibrated(measured, savedAtMs = 7L)
            assertEquals(measuredBoardSize(measured.corners), next.boardSize)
            assertEquals(true, next.whitePov)
            assertEquals(7L, next.savedAtMs)
            assertEquals(1, backing.writes)
        }

    @Test
    fun aDiscardedProfileIsNotSilentlyCarriedOver() =
        runTest {
            val backing = FakeProfileBacking("{not json")
            assertNull((CalibrationStore(backing).load() as? ProfileLoad.Ok)?.profile)
            // Defaults for everything except the size, which is measured either way.
            assertEquals(measuredBoardSize(measured.corners), CalibrationStore(backing).saveRecalibrated(measured).boardSize)
        }

    /** A multiple of 16, so halving it for the detection warp and eighthing THAT both stay whole. */
    @Test
    fun theMeasuredSizeTracksTheBoardAndStaysDivisible() {
        val square = { side: Float -> floatArrayOf(0f, 0f, side, 0f, side, side, 0f, side) }
        assertEquals(848, measuredBoardSize(square(840f)))
        assertEquals(640, measuredBoardSize(square(636f)))
        // Clamped at both ends: a smudge and a board that fills the frame are equally suspect.
        assertEquals(320, measuredBoardSize(square(40f)))
        assertEquals(1280, measuredBoardSize(square(4000f)))
        assertEquals(0, measuredBoardSize(square(840f)) % 16)
    }

    /** "Adjust, then recalibrate" is the normal order: a dropped override would be write-only. */
    @Test
    fun aTunedPerCornerMarginIsPersistedAndCarriedOver() =
        runTest {
            val store = CalibrationStore(FakeProfileBacking())
            val tuned = listOf(0.030, 0.045, 0.050, 0.045)
            store.saveRecalibrated(measured, marginOverride = tuned)
            assertEquals(tuned, store.geometry.margin, "the adjusted corners reach the live geometry")

            // A later recalibration that does NOT touch the margins must keep them.
            val next = store.saveRecalibrated(measured)
            assertEquals(tuned, next.margin, "an untouched recalibration carries them over")
        }

    // 07a's `AppSettings.orientation` (STATUS D07a-11) lives IN the profile: only the profile
    // survives a recalibration, and a wrong a8 silently transposes every label of the session.
    private val stored =
        CalibrationProfile(
            name = "default",
            whitePov = true,
            sourceWidth = 1920,
            sourceHeight = 1080,
            corners = floatArrayOf(1f, 2f, 3f, 4f, 5f, 6f, 7f, 8f),
        )

    @Test
    fun theOrientationSettingLandsInTheGeometryTheWarpUses() =
        runTest {
            val store = CalibrationStore(FakeProfileBacking(encodeProfile(stored)))
            assertFalse(store.applyOrientation(BoardOrientation.BLACK_BOTTOM.whitePov).whitePov)
            assertTrue(store.applyOrientation(BoardOrientation.WHITE_BOTTOM.whitePov).whitePov)
        }

    @Test
    fun aRecalibrationAfterTheOrientationSettingCarriesItOver() =
        runTest {
            val store = CalibrationStore(FakeProfileBacking(encodeProfile(stored)))
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
    fun withNoStoredProfileTheOrientationStillReachesTheGeometry() =
        runTest {
            val backing = FakeProfileBacking()
            val store = CalibrationStore(backing)
            assertFalse(store.applyOrientation(whitePov = false).whitePov)
            // Nothing invented on disk: D06a's "a bad profile is discarded, not repaired" stays intact.
            assertEquals(0, backing.writes)
            assertFalse(store.saveRecalibrated(measured, whitePovOverride = false).whitePov)
        }
}
