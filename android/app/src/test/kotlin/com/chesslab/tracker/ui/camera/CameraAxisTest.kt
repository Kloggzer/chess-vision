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

/**
 * The pure half of the camera deck: which tiles a device gets, what each one reads, and whether the
 * saved board quad may be drawn over the picture at all.
 *
 * Only the parts a JVM can decide. The layout itself is judged on the phone — this file guards the
 * two things that are silently wrong rather than visibly wrong: a tile offered for an axis the
 * device does not have, and a quad drawn through the wrong aspect ratio.
 */
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

    /** A control shown dead invites the user to conclude the app is broken. It is not shown. */
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

    /** The highlight means "this axis is no longer the device's automatic", nothing else. */
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

    /** The tile carries EV, not the device's index — ±24 sixths is the ±4 EV the phone advertises. */
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
    fun theSavedQuadIsDrawnWhenTheProfileMatchesThePictureShape() {
        assertTrue(canDrawQuad(profileAt(1920, 1080), 1280, 720))
        assertTrue(canDrawQuad(profileAt(1281, 720), 1280, 720), "a pixel of rounding is not a different shape")
    }

    /**
     * The failure this guard exists for: `QuadOutline` scales per axis, so a 4:3 profile over a
     * 16:9 picture draws a green outline near the board that the user would then aim by. There is
     * no rescale to reach for — `forResolution()` was deleted for producing exactly that.
     */
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
