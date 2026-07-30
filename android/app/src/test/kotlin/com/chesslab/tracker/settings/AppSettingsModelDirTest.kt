package com.chesslab.tracker.settings

import com.chesslab.tracker.cnn.BUNDLED_MODELS
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Which bundled model is selected has to survive a restart, and has to survive a BUILD — the
 * persisted value outlives the APK that wrote it, and a device naming a directory the new APK does
 * not carry would fail its attach on every launch (that is the `modelAsset` bug of 2026-07-27, one
 * knob over).
 */
class AppSettingsModelDirTest {
    @Test
    fun aFreshInstallRunsTheModelThatWasAlreadyShipping() {
        assertEquals(DEFAULT_MODEL, AppSettings().modelDir)
        assertEquals(DEFAULT_MODEL, decodeAppSettings(null).modelDir)
    }

    @Test
    fun everyBundledModelRoundTripsUnchanged() {
        BUNDLED_MODELS.forEach { model ->
            val settings = AppSettings(modelDir = model)
            assertEquals(settings, decodeAppSettings(encodeAppSettings(settings)), model)
        }
        assertTrue(BUNDLED_MODELS.size > 1, "a selector over one model is not a selector")
    }

    /**
     * Normalised, not thrown on, and not a full reset: an unknown *enum* value would send
     * `decodeAppSettings` down its catch-all and reset the camera resolution, the orientation and
     * every speech switch along with it. Only the one field that cannot be honoured moves.
     */
    @Test
    fun aModelThisBuildNoLongerBundlesFallsBackWithoutLosingTheRest() {
        val stored =
            encodeAppSettings(
                AppSettings(
                    modelDir = "v9-retired",
                    resolutionMode = ResolutionMode.R1080,
                    orientation = BoardOrientation.BLACK_BOTTOM,
                    speechEnabled = true,
                ),
            )
        val decoded = decodeAppSettings(stored)
        assertEquals(DEFAULT_MODEL, decoded.modelDir)
        assertEquals(ResolutionMode.R1080, decoded.resolutionMode)
        assertEquals(BoardOrientation.BLACK_BOTTOM, decoded.orientation)
        assertTrue(decoded.speechEnabled)
    }

    /** Settings written before this knob existed carry no key at all. */
    @Test
    fun aPayloadFromBeforeTheKnobDecodesToTheDefaultModel() {
        val stored = """{"resolutionMode":"R1440","modelAsset":"model.onnx","epRequest":"AUTO"}"""
        assertEquals(DEFAULT_MODEL, decodeAppSettings(stored).modelDir)
    }
}
