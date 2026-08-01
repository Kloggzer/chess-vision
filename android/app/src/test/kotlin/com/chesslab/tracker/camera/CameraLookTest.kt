package com.chesslab.tracker.camera

import android.hardware.camera2.CameraMetadata
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * The pure half of the camera look, plus the part of [CameraLookControl] that needs no device.
 *
 * The arithmetic is small on purpose. Its predecessor computed per-channel white-balance gains from
 * a colour temperature and had five passing tests — none of which could see that the numbers were in
 * the wrong colour space entirely, because the only thing that knows is the sensor. What is left
 * here is the part a JVM can actually decide.
 */
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

    /**
     * A stored value can outlive the camera it was chosen on — a different lens, a settings file
     * restored from a backup, a phone whose zoom stops at 4x. Clamping is what keeps it from being
     * sent as-is.
     */
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

    /**
     * `AUTO` leaves the key UNSET rather than writing `CONTROL_AWB_MODE_AUTO` — "automatic" has to
     * mean the device's own default, not a second opinion about what automatic is.
     */
    @Test
    fun autoWritesNoWhiteBalanceKeyAtAll() {
        val control = CameraLookControl(reissue = {})
        assertNull(control.awbMode())
        assertTrue(!control.illuminantPinned)
    }

    @Test
    fun eachPresetMapsToItsOwnIlluminant() {
        assertEquals(CameraMetadata.CONTROL_AWB_MODE_DAYLIGHT, CameraLookControl.awbModeFor(WhiteBalance.DAYLIGHT))
        assertEquals(CameraMetadata.CONTROL_AWB_MODE_SHADE, CameraLookControl.awbModeFor(WhiteBalance.SHADE))
        assertEquals(CameraMetadata.CONTROL_AWB_MODE_INCANDESCENT, CameraLookControl.awbModeFor(WhiteBalance.INCANDESCENT))
        assertNull(CameraLookControl.awbModeFor(WhiteBalance.AUTO))
    }

    /** A pinned illuminant is what lets a re-measure converge — see `OpticsLock.converged`. */
    @Test
    fun aPresetPinsTheIlluminant() {
        val control = CameraLookControl(reissue = {})
        control.setLook(CameraLook(whiteBalance = WhiteBalance.DAYLIGHT))
        assertTrue(control.illuminantPinned)
        control.setLook(CameraLook())
        assertTrue(!control.illuminantPinned)
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
        // Nothing is bound, so the lens minimum is unknown and the fraction scales onto 0 diopters
        // — infinity, which is the safe end for a board across a table.
        assertEquals(0f, control.focusDiopters())
    }

    /**
     * Before a camera answers there is no range to clamp against, so the value is kept VERBATIM.
     *
     * This is the bug the nullable abilities exist for: `TrackerService` pushes the saved look
     * before the first bind, and clamping it against an EMPTY ability set reset every axis to
     * automatic — persistence that looked wired up and restored nothing. The unit test found it;
     * the device would have shown it as "Save does nothing".
     */
    @Test
    fun aLookSetBeforeTheCameraBindsSurvivesIntact() {
        val control = CameraLookControl(reissue = {})
        val stored = CameraLook(evIndex = 6, whiteBalance = WhiteBalance.CLOUDY, zoomRatio = 2f, focus = 0.25f)
        control.setLook(stored)
        assertEquals(stored, control.look.value)
    }
}
