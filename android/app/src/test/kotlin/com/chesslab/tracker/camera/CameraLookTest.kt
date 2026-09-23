package com.chesslab.tracker.camera

import android.hardware.camera2.CameraMetadata
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Only what a JVM can decide: the predecessor's white-balance gains had green tests and sat in the wrong
 *  colour space, which only the sensor knows. */
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

    @Test
    fun exposureIsReportedInEvNotInIndices() {
        assertEquals(4.0f, phone.exposure!!.ev(24), 1e-4f)
        assertEquals(-4.0f, phone.exposure!!.ev(-24), 1e-4f)
        assertEquals(0.0f, phone.exposure!!.ev(0), 1e-4f)
    }

    @Test
    fun aStoredValueIsClampedToWhateverThisCameraOffers() {
        val wild = CameraLook(evIndex = 400, zoomRatio = 99f, focus = 5f, whiteBalance = WhiteBalance.SHADE)
        val fitted = wild.clampedTo(phone)
        assertEquals(24, fitted.evIndex)
        assertEquals(8f, fitted.zoomRatio)
        assertEquals(1f, fitted.focus)
        assertEquals(WhiteBalance.SHADE, fitted.whiteBalance)
    }

    /** DROPPED, not clamped: a fixed-focus lens has no distance to hold. */
    @Test
    fun anUnsupportedAxisFallsBackToAutomatic() {
        val bare = CameraAbilities()
        val fitted = CameraLook(evIndex = 6, zoomRatio = 3f, focus = 0.5f, whiteBalance = WhiteBalance.CLOUDY).clampedTo(bare)
        assertEquals(CameraLook(), fitted)
        assertTrue(fitted.isAuto)
    }

    @Test
    fun withNoAbilitiesTheValueIsLeftAlone() {
        assertEquals(400, CameraLook(evIndex = 400).clampedTo(null).evIndex)
    }

    @Test
    fun eachPresetMapsToItsOwnIlluminant() {
        assertEquals(CameraMetadata.CONTROL_AWB_MODE_DAYLIGHT, CameraLookControl.awbModeFor(WhiteBalance.DAYLIGHT))
        assertEquals(CameraMetadata.CONTROL_AWB_MODE_SHADE, CameraLookControl.awbModeFor(WhiteBalance.SHADE))
        assertEquals(CameraMetadata.CONTROL_AWB_MODE_INCANDESCENT, CameraLookControl.awbModeFor(WhiteBalance.INCANDESCENT))
        assertNull(CameraLookControl.awbModeFor(WhiteBalance.AUTO))
    }

    @Test
    fun aPresetReachesTheCaptureRequestAndAutoTakesItBack() {
        val control = CameraLookControl(reissue = {})
        control.setLook(CameraLook(whiteBalance = WhiteBalance.DAYLIGHT))
        assertEquals(CameraMetadata.CONTROL_AWB_MODE_DAYLIGHT, control.awbMode())
        control.setLook(CameraLook())
        assertNull(control.awbMode())
    }

    /** Exactly once per change: the shipped flood was one re-issue per drag pixel. */
    @Test
    fun oneChangeIsOneReissue() {
        var reissues = 0
        val control = CameraLookControl(reissue = { reissues++ })
        control.setLook(CameraLook(evIndex = 6))
        control.setLook(CameraLook(evIndex = 6, whiteBalance = WhiteBalance.CLOUDY))
        assertEquals(2, reissues)
        assertEquals(CameraLook(evIndex = 6, whiteBalance = WhiteBalance.CLOUDY), control.look.value)
    }

    @Test
    fun automaticFocusSuppliesNoDistanceAtAll() {
        val control = CameraLookControl(reissue = {})
        assertNull(control.focusDiopters())
        control.setLook(CameraLook(focus = 0.5f))
        assertEquals(0f, control.focusDiopters())
    }

    /** The saved look arrives before the first bind; clamping it against an EMPTY ability set reset every
     *  axis to automatic — "Save does nothing". */
    @Test
    fun aLookSetBeforeTheCameraBindsSurvivesIntact() {
        val control = CameraLookControl(reissue = {})
        val stored = CameraLook(evIndex = 6, whiteBalance = WhiteBalance.CLOUDY, zoomRatio = 2f, focus = 0.25f)
        control.setLook(stored)
        assertEquals(stored, control.look.value)
    }
}
