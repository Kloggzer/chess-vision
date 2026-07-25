package com.chesslab.tracker.geometry

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
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
            margin = 0.09,
            markerDict = "DICT_5X5_50",
            // hand-set by the user: resetting this transposes every label of the next game
            whitePov = false,
            sourceWidth = 640,
            sourceHeight = 480,
            corners = floatArrayOf(1f, 2f, 3f, 4f, 5f, 6f, 7f, 8f),
            crop = CropParams(outW = 96, outH = 96, padUp = 0.25, padSide = 0.12),
        )

    private val measured =
        MeasuredGeometry(floatArrayOf(9f, 9f, 90f, 9f, 90f, 90f, 9f, 90f), sourceWidth = 1920, sourceHeight = 1080)

    @Test
    fun recalibrationCarriesOverWhitePovBoardSizeMarginAndCrop() =
        runTest {
            val backing = FakeProfileBacking(encodeProfile(hand))
            val next = CalibrationStore(backing).saveRecalibrated(measured)
            assertEquals(false, next.whitePov)
            assertEquals(1200, next.boardSize)
            assertEquals(0.09, next.margin)
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
            assertEquals(1600, next.boardSize)
            assertEquals(true, next.whitePov)
            assertEquals(7L, next.savedAtMs)
            assertEquals(1, backing.writes)
        }

    @Test
    fun aDiscardedProfileIsNotSilentlyCarriedOver() =
        runTest {
            val backing = FakeProfileBacking("{not json")
            assertNull((CalibrationStore(backing).load() as? ProfileLoad.Ok)?.profile)
            // No existing profile survives the discard, so the recalibration falls back to defaults.
            assertEquals(1600, CalibrationStore(backing).saveRecalibrated(measured).boardSize)
        }
}
