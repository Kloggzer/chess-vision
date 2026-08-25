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
    fun aFreshInstallRunsTheOcclusionAwareIdentityModel() {
        // Named, not just "the default": a 14-class run declares no `coverage_output`, which leaves
        // the model-free grid arm on, and on the regression set that arm locks the tracker
        // (2026-08-07-13-52-38: four found with three phantoms, against 25/0/0 with this one).
        assertEquals("real13-ms-s3-hn4-bn80", DEFAULT_MODEL)
        assertEquals(DEFAULT_MODEL, AppSettings().modelDir)
        assertEquals(DEFAULT_MODEL, decodeAppSettings(null).modelDir)
    }

    @Test
    fun previousDefaultsMoveForwardOnce() {
        val old = """{"modelDir":"shipped","modelAsset":"model.onnx"}"""
        assertEquals(DEFAULT_MODEL, decodeAppSettings(old).modelDir)
        val briefBn100Default = """{"modelRelease":2,"modelDir":"bn100-80","modelAsset":"model.onnx"}"""
        assertEquals(DEFAULT_MODEL, decodeAppSettings(briefBn100Default).modelDir)

        val previousIdentityDefault = """{"modelRelease":3,"modelDir":"id35-80","modelAsset":"model.onnx"}"""
        assertEquals(DEFAULT_MODEL, decodeAppSettings(previousIdentityDefault).modelDir)

        val explicitCurrentChoice = AppSettings(modelDir = "id35-80")
        assertEquals(explicitCurrentChoice, decodeAppSettings(encodeAppSettings(explicitCurrentChoice)))
    }

    /**
     * The retirement is NOT release-gated and is matched on the RAW stored name: `bundledModelOrDefault`
     * collapses a dropped directory to the default, so a migration reading its result sees a name that
     * was never retired and does nothing. Everything but the model must survive the move.
     */
    @Test
    fun everyRetiredModelLandsOnTheDefaultWithoutLosingTheRest() {
        listOf("shipped", "bn100-80", "bn50-80", "bn35-80", "v6-80", "v4-128").forEach { model ->
            val stored =
                encodeAppSettings(
                    AppSettings(
                        modelDir = model,
                        resolutionMode = ResolutionMode.R1080,
                        orientation = BoardOrientation.BLACK_BOTTOM,
                        speechEnabled = true,
                    ),
                )
            val decoded = decodeAppSettings(stored)
            assertEquals(DEFAULT_MODEL, decoded.modelDir, model)
            assertEquals(ResolutionMode.R1080, decoded.resolutionMode, model)
            assertEquals(BoardOrientation.BLACK_BOTTOM, decoded.orientation, model)
            assertTrue(decoded.speechEnabled, model)
        }
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
