package com.chesslab.tracker.ui.camera

import com.chesslab.tracker.camera.CameraAbilities
import com.chesslab.tracker.camera.CameraLook
import com.chesslab.tracker.camera.ExposureRange
import com.chesslab.tracker.camera.WhiteBalance
import com.chesslab.tracker.geometry.CalibrationProfile
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Only what a JVM can decide — the silently wrong: a tile for an axis the device lacks, a quad through
 *  the wrong aspect ratio. */
class CameraAxisTest {
    private val phone =
        CameraAbilities(
            exposure = ExposureRange(-24..24, 1f / 6f),
            zoom = 1f..8f,
            minFocusDiopters = 10f,
            whiteBalance = WhiteBalance.entries,
            hasTorch = true,
        )

    private val bare = CameraAbilities()

    @Test
    fun everyAxisIsOfferedOnAFullyFeaturedCamera() {
        assertEquals(CameraAxis.entries, CameraAxis.entries.filter { it.availableOn(phone) })
    }

    @Test
    fun noAxisIsOfferedOnACameraThatAdvertisesNothing() {
        assertTrue(CameraAxis.entries.none { it.availableOn(bare) })
    }

    @Test
    fun fixedFocusAndSingleWhiteBalanceDropTheirOwnTilesOnly() {
        val simple = phone.copy(minFocusDiopters = 0f, whiteBalance = listOf(WhiteBalance.AUTO))
        assertFalse(CameraAxis.FOCUS.availableOn(simple))
        assertFalse(CameraAxis.WHITE_BALANCE.availableOn(simple))
        assertTrue(CameraAxis.ZOOM.availableOn(simple))
        assertTrue(CameraAxis.EXPOSURE.availableOn(simple))
    }

    @Test
    fun untouchedAxesAreNotMarkedAsSet() {
        assertTrue(CameraAxis.entries.none { it.isSet(CameraLook()) })
        assertTrue(CameraAxis.FOCUS.isSet(CameraLook(focus = 0f)), "a manual focus AT infinity is still manual")
        assertTrue(CameraAxis.ZOOM.isSet(CameraLook(zoomRatio = 2f)))
        assertTrue(CameraAxis.EXPOSURE.isSet(CameraLook(evIndex = -3)))
        assertTrue(CameraAxis.WHITE_BALANCE.isSet(CameraLook(whiteBalance = WhiteBalance.SHADE)))
    }

    @Test
    fun anUntouchedAxisReadsAutoRatherThanAZero() {
        val look = CameraLook()
        assertEquals("Auto", CameraAxis.FOCUS.reading(look, phone))
        assertEquals("Auto", CameraAxis.EXPOSURE.reading(look, phone))
        assertEquals("Auto", CameraAxis.WHITE_BALANCE.reading(look, phone))
    }

    @Test
    fun exposureReadsInEvAndCarriesItsSign() {
        assertTrue(CameraAxis.EXPOSURE.reading(CameraLook(evIndex = 24), phone).startsWith("+4"))
        assertTrue(CameraAxis.EXPOSURE.reading(CameraLook(evIndex = -24), phone).startsWith("-4"))
    }

    @Test
    fun zoomReadsAsARatioAndWhiteBalanceAsItsOwnName() {
        assertTrue(CameraAxis.ZOOM.reading(CameraLook(zoomRatio = 2f), phone).endsWith("×"))
        assertEquals("Cloudy", CameraAxis.WHITE_BALANCE.reading(CameraLook(whiteBalance = WhiteBalance.CLOUDY), phone))
        assertEquals("Cloudy · 6500 K", WhiteBalance.CLOUDY.kelvinLabel())
        assertEquals("Auto", WhiteBalance.AUTO.kelvinLabel())
    }

    @Test
    fun dialSnappingUsesCameraMeaningfulIncrementsAndKeepsEndStopsReachable() {
        assertEquals(0.613f, snapDialValue(0.6126f, 0f..1f, 0.001f), 0.00001f)
        assertEquals(1f, snapDialValue(1.2f, 0f..1f, 0.001f))
        assertEquals(-24f, snapDialValue(-30f, -24f..24f, 1f))
        assertEquals(24f, snapDialValue(30f, -24f..24f, 1f))
    }

    @Test
    fun theSavedQuadIsDrawnWhenTheProfileMatchesThePictureShape() {
        assertTrue(canDrawQuad(profileAt(1920, 1080), 1280, 720))
        assertTrue(canDrawQuad(profileAt(1281, 720), 1280, 720), "a pixel of rounding is not a different shape")
    }

    /** `QuadOutline` scales per axis, so a 4:3 profile over 16:9 draws a misleading outline; `forResolution()`
     *  was deleted for producing exactly that. */
    @Test
    fun aProfileFromADifferentlyShapedFrameDrawsNothing() {
        assertFalse(canDrawQuad(profileAt(1440, 1080), 1280, 720))
        assertFalse(canDrawQuad(null, 1280, 720))
        assertFalse(canDrawQuad(profileAt(1920, 1080), 0, 0), "no picture yet is not a match")
    }

    private fun profileAt(
        width: Int,
        height: Int,
    ) = CalibrationProfile(
        name = "test",
        sourceWidth = width,
        sourceHeight = height,
        corners = floatArrayOf(0f, 0f, 100f, 0f, 100f, 100f, 0f, 100f),
    )
}
