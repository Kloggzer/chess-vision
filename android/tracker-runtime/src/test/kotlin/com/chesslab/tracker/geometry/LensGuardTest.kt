package com.chesslab.tracker.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertInstanceOf
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Which stored optics may be applied to which camera.
 *
 * The case this exists for is not hypothetical and not a size mismatch: the rig webcam delivers
 * 2560x1440, the phone requests 2560x1440, and the only guard this ever had was a size check. A
 * calibration measured on a varifocal USB lens would have been applied to a phone with nothing
 * complaining — and the three measurements on record all say a stored lens makes alignment WORSE.
 */
class LensGuardTest {
    @Test
    fun aMatchingCalibrationIsAllowed() {
        val ok = assertInstanceOf(LensLoad.Ok::class.java, lensFor(RIG, LensMode.AUTO, RIG_CAMERA, WIDTH, HEIGHT))
        assertEquals(RIG_CAMERA, ok.calibration.camera)
    }

    /**
     * The assertion that matters is the SECOND one.
     *
     * Refusing here would also happen if someone later "fixed" the guard by tightening the size
     * check — and then a phone and a rig that agree on resolution would start passing again. The
     * reason has to name the camera, because that is the only thing that actually distinguishes
     * them, and a test that only checks "refused" cannot tell the two implementations apart.
     */
    @Test
    fun sameResolutionIsNotSameCamera() {
        val refused = assertInstanceOf(LensLoad.Refused::class.java, lensFor(RIG, LensMode.AUTO, PHONE_CAMERA, WIDTH, HEIGHT))
        assertTrue(RIG_CAMERA in refused.reason && PHONE_CAMERA in refused.reason, refused.reason)
        assertTrue(WIDTH.toString() !in refused.reason, "the size is not what is wrong here: ${refused.reason}")
    }

    /** specs/24 states this twice as a prohibition, and `cameraZoomRatio` is a LIVE knob. */
    @Test
    fun aZoomedCameraIsADifferentLens() {
        val refused =
            assertInstanceOf(
                LensLoad.Refused::class.java,
                lensFor(RIG, LensMode.AUTO, RIG_CAMERA, WIDTH, HEIGHT, zoom = 2f),
            )
        assertTrue("zoom" in refused.reason, refused.reason)
    }

    @Test
    fun aDifferentResolutionIsStillRefused() {
        val refused =
            assertInstanceOf(LensLoad.Refused::class.java, lensFor(RIG, LensMode.AUTO, RIG_CAMERA, 1920, 1080))
        assertTrue("recalibrate" in refused.reason, refused.reason)
    }

    /** Turning it off means off — not "off unless a very good calibration turns up". */
    @Test
    fun offRefusesAPerfectMatch() {
        assertInstanceOf(LensLoad.Refused::class.java, lensFor(RIG, LensMode.OFF, RIG_CAMERA, WIDTH, HEIGHT))
    }

    /**
     * ON relaxes exactly one thing, and it is not this one.
     *
     * A mode that could override a KNOWN mismatch would make every guard in `lensFor` advisory,
     * which is the same as not having them.
     */
    @Test
    fun onDoesNotOverrideAKnownMismatch() {
        assertInstanceOf(LensLoad.Refused::class.java, lensFor(RIG, LensMode.ON, PHONE_CAMERA, WIDTH, HEIGHT))
    }

    /**
     * What ON does relax: a file that does not say what it was measured on.
     *
     * `data/lens/calib.json` is exactly that — written before calibrations recorded a camera. It is
     * not a mismatch, it is an unknown, and a human typing the command is a better identity check
     * than nothing. It still may not be picked up automatically.
     */
    @Test
    fun anUnidentifiedCalibrationNeedsSomeoneToAskForIt() {
        val unnamed = RIG.copy(camera = "")
        assertInstanceOf(LensLoad.Refused::class.java, lensFor(unnamed, LensMode.AUTO, RIG_CAMERA, WIDTH, HEIGHT))
        assertInstanceOf(LensLoad.Ok::class.java, lensFor(unnamed, LensMode.ON, RIG_CAMERA, WIDTH, HEIGHT))
    }

    @Test
    fun aFutureSchemaIsRefusedRatherThanGuessed() {
        val refused =
            assertInstanceOf(
                LensLoad.Refused::class.java,
                lensFor(RIG.copy(version = LENS_SCHEMA_VERSION + 1), LensMode.ON, RIG_CAMERA, WIDTH, HEIGHT),
            )
        assertTrue("schema" in refused.reason, refused.reason)
    }

    @Test
    fun nothingStoredIsAbsentAndNotARefusal() {
        assertEquals(LensLoad.Absent, lensFor(null, LensMode.AUTO, RIG_CAMERA, WIDTH, HEIGHT))
    }

    @Test
    fun anUnreadableFileSaysSoRatherThanReadingAsEmpty() {
        assertEquals(LensLoad.Absent, decodeLens(null))
        assertEquals(LensLoad.Absent, decodeLens("   "))
        assertInstanceOf(LensLoad.Refused::class.java, decodeLens("{ not json"))
        // A literal rather than a round-trip through the encoder: this file is written by Python's
        // `chesslab lens` export, so what has to hold is that THIS shape decodes — including the
        // `createdAt` the exporter adds and this build does not model. A round-trip would only have
        // tested the serializer against itself, and would have passed while the real file failed.
        val stored =
            """
            {"cameraMatrix":[2000.0,0.0,1280.0,0.0,2000.0,720.0,0.0,0.0,1.0],
             "distCoeffs":[-0.675,2.078,0.025,0.0132,-7.131],
             "width":2560,"height":1440,"rms":5.4636,
             "createdAt":"2026-07-21T17:37:00"}
            """
        val lens = assertInstanceOf(LensLoad.Ok::class.java, decodeLens(stored)).calibration
        assertEquals(WIDTH, lens.width)
        assertEquals("", lens.camera, "a file that names no camera must decode as unidentified, not fail")
        assertEquals(LENS_SCHEMA_VERSION, lens.version)
    }

    private companion object {
        const val WIDTH = 2560
        const val HEIGHT = 1440
        const val RIG_CAMERA = "webcam:0"
        const val PHONE_CAMERA = "SM-S928B:0"

        /** The real one, from `data/lens/calib.json` — including the resolution it collides on. */
        val RIG =
            LensCalibration(
                cameraMatrix = listOf(2000.0, 0.0, 1280.0, 0.0, 2000.0, 720.0, 0.0, 0.0, 1.0),
                distCoeffs = listOf(-0.675, 2.078, 0.025, 0.0132, -7.131),
                width = WIDTH,
                height = HEIGHT,
                camera = RIG_CAMERA,
                rms = 5.4636,
            )
    }
}
