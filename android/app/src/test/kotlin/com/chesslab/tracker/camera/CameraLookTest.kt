package com.chesslab.tracker.camera

import android.hardware.camera2.CameraMetadata
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Only what a JVM can decide: the predecessor's white-balance gains had five green tests and sat in
 *  the wrong colour space entirely, which only the sensor knows. */
class CameraLookTest {
    private val phone =
        CameraAbilities(
            exposure = ExposureRange(-24..24, 1f / 6f),
            zoom = 1f..8f,
            minFocusDiopters = 10f,
            whiteBalance = WhiteBalance.entries,
            hasTorch = true,
        )

    @Test
    fun untouchedIsAutomaticOnEveryAxis() {
        assertTrue(CameraLook().isAuto)
        assertTrue(!CameraLook(evIndex = 4).isAuto, "one axis set is not automatic")
        assertTrue(!CameraLook(whiteBalance = WhiteBalance.DAYLIGHT).isAuto)
        assertTrue(!CameraLook(zoomRatio = 2f).isAuto)
        assertTrue(!CameraLook(focus = 0f).isAuto, "a manual focus AT infinity is still manual")
    }

    /** The step is a device property; ±24 indices at 1/6 EV is the ±4 EV this phone advertises. */
    @Test
    fun exposureIsReportedInEvNotInIndices() {
        assertEquals(4.0f, phone.exposure!!.ev(24), 1e-4f)
        assertEquals(-4.0f, phone.exposure!!.ev(-24), 1e-4f)
        assertEquals(0.0f, phone.exposure!!.ev(0), 1e-4f)
    }

    /** A stored value can outlive the camera it was chosen on (other lens, restored backup). */
    @Test
    fun aStoredValueIsClampedToWhateverThisCameraOffers() {
        val wild = CameraLook(evIndex = 400, zoomRatio = 99f, focus = 5f, whiteBalance = WhiteBalance.SHADE)
        val fitted = wild.clampedTo(phone)
        assertEquals(24, fitted.evIndex)
        assertEquals(8f, fitted.zoomRatio)
        assertEquals(1f, fitted.focus)
        assertEquals(WhiteBalance.SHADE, fitted.whiteBalance)
    }

    /**
     * An axis the device does not have is not clamped, it is DROPPED — a fixed-focus lens has no
     * distance to hold, and a camera with no exposure compensation would silently ignore an index.
     */
    @Test
    fun anUnsupportedAxisFallsBackToAutomatic() {
        val bare = CameraAbilities()
        val fitted = CameraLook(evIndex = 6, zoomRatio = 3f, focus = 0.5f, whiteBalance = WhiteBalance.CLOUDY).clampedTo(bare)
        assertEquals(CameraLook(), fitted)
        assertTrue(fitted.isAuto)
    }

    /** Before a camera is bound there is nothing to clamp against, and a guess would be worse. */
    @Test
    fun withNoAbilitiesTheValueIsLeftAlone() {
        assertEquals(400, CameraLook(evIndex = 400).clampedTo(null).evIndex)
    }

    /** `AUTO` leaves the key UNSET rather than writing `CONTROL_AWB_MODE_AUTO`: the device's own default. */
    @Test
    fun eachPresetMapsToItsOwnIlluminant() {
        assertEquals(CameraMetadata.CONTROL_AWB_MODE_DAYLIGHT, CameraLookControl.awbModeFor(WhiteBalance.DAYLIGHT))
        assertEquals(CameraMetadata.CONTROL_AWB_MODE_SHADE, CameraLookControl.awbModeFor(WhiteBalance.SHADE))
        assertEquals(CameraMetadata.CONTROL_AWB_MODE_INCANDESCENT, CameraLookControl.awbModeFor(WhiteBalance.INCANDESCENT))
        assertNull(CameraLookControl.awbModeFor(WhiteBalance.AUTO))
    }

    /** The illuminant is the one axis that holds by being STATED — nothing locks it any more. */
    @Test
    fun aPresetReachesTheCaptureRequestAndAutoTakesItBack() {
        val control = CameraLookControl(reissue = {})
        control.setLook(CameraLook(whiteBalance = WhiteBalance.DAYLIGHT))
        assertEquals(CameraMetadata.CONTROL_AWB_MODE_DAYLIGHT, control.awbMode())
        control.setLook(CameraLook())
        assertNull(control.awbMode())
    }

    /**
     * The capture request belongs to `OpticsLock`; a look change has to ask for it to be re-issued.
     * Exactly once per change — the flood this feature shipped with was one re-issue per drag pixel.
     */
    @Test
    fun oneChangeIsOneReissue() {
        var reissues = 0
        val control = CameraLookControl(reissue = { reissues++ })
        control.setLook(CameraLook(evIndex = 6))
        control.setLook(CameraLook(evIndex = 6, whiteBalance = WhiteBalance.CLOUDY))
        assertEquals(2, reissues)
        assertEquals(CameraLook(evIndex = 6, whiteBalance = WhiteBalance.CLOUDY), control.look.value)
    }

    /** 0..1 is infinity..nearest, scaled by the lens's own minimum — a diopter figure is not a UI. */
    @Test
    fun automaticFocusSuppliesNoDistanceAtAll() {
        val control = CameraLookControl(reissue = {})
        assertNull(control.focusDiopters())
        control.setLook(CameraLook(focus = 0.5f))
        // Nothing bound: the fraction scales onto 0 diopters, infinity, the safe end for a board.
        assertEquals(0f, control.focusDiopters())
    }

    /** `TrackerService` pushes the saved look before the first bind; clamping it against an EMPTY
     *  ability set reset every axis to automatic — "Save does nothing" on the device. */
    @Test
    fun aLookSetBeforeTheCameraBindsSurvivesIntact() {
        val control = CameraLookControl(reissue = {})
        val stored = CameraLook(evIndex = 6, whiteBalance = WhiteBalance.CLOUDY, zoomRatio = 2f, focus = 0.25f)
        control.setLook(stored)
        assertEquals(stored, control.look.value)
    }
}
