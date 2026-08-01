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
    @Test
    fun untouchedIsAutomaticOnBothAxes() {
        assertTrue(CameraLook().isAuto)
        assertTrue(!CameraLook(evIndex = 4).isAuto, "one axis set is not automatic")
        assertTrue(!CameraLook(whiteBalance = WhiteBalance.DAYLIGHT).isAuto)
    }

    /** The step is a device property; ±24 indices at 1/6 EV is the ±4 EV this phone advertises. */
    @Test
    fun exposureIsReportedInEvNotInIndices() {
        val range = ExposureRange(-24..24, 1f / 6f)
        assertEquals(4.0f, range.ev(24), 1e-4f)
        assertEquals(-4.0f, range.ev(-24), 1e-4f)
        assertEquals(0.0f, range.ev(0), 1e-4f)
    }

    /**
     * A stored index can outlive the camera it was chosen on — a different lens, a different device,
     * a settings file restored from a backup. Clamping is what keeps it from being sent as-is.
     */
    @Test
    fun aStoredIndexIsClampedToWhateverThisCameraOffers() {
        val range = ExposureRange(-12..12, 1f / 3f)
        assertEquals(12, CameraLook(evIndex = 400).clampedTo(range).evIndex)
        assertEquals(-12, CameraLook(evIndex = -400).clampedTo(range).evIndex)
        assertEquals(5, CameraLook(evIndex = 5).clampedTo(range).evIndex)
    }

    /** Before a camera is bound there is no range to clamp against, and a guess would be worse. */
    @Test
    fun withNoRangeTheValueIsLeftAlone() {
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
        val control = CameraLookControl(reissue = {})
        control.setLook(CameraLook(whiteBalance = WhiteBalance.DAYLIGHT))
        assertEquals(CameraMetadata.CONTROL_AWB_MODE_DAYLIGHT, control.awbMode())
        assertTrue(control.illuminantPinned, "a pinned illuminant is what lets a re-measure converge")
        control.setLook(CameraLook(whiteBalance = WhiteBalance.SHADE))
        assertEquals(CameraMetadata.CONTROL_AWB_MODE_SHADE, control.awbMode())
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
}
