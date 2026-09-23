package com.chesslab.tracker.settings

import com.chesslab.tracker.cnn.BUNDLED_MODELS
import com.chesslab.tracker.cnn.DEFAULT_MODEL
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** A persisted model directory the new APK does not carry would fail its attach on every launch. */
class AppSettingsModelDirTest {
    @Test
    fun aFreshInstallRunsTheOcclusionAwareIdentityModel() {
        // Ein 14-Klassen-Lauf ohne `coverage_output` laesst den Gitterarm an, der den Tracker sperrt.
        assertEquals("p4a-80-clahe", DEFAULT_MODEL)
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

        val explicitCurrentChoice = AppSettings(modelDir = "p4a-128")
        assertEquals(explicitCurrentChoice, decodeAppSettings(encodeAppSettings(explicitCurrentChoice)))
    }

    /** Retired names are matched RAW; an unknown value must not reset every other field. */
    @Test
    fun everyRetiredOrUnbundledModelLandsOnTheDefaultWithoutLosingTheRest() {
        listOf("shipped", "bn100-80", "bn50-80", "bn35-80", "v6-80", "v4-128", "v9-retired").forEach { model ->
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

    @Test
    fun aPayloadFromBeforeTheKnobDecodesToTheDefaultModel() {
        val stored = """{"resolutionMode":"R1440","modelAsset":"model.onnx","epRequest":"AUTO"}"""
        assertEquals(DEFAULT_MODEL, decodeAppSettings(stored).modelDir)
    }

    /** A stored `model.qnn.onnx` kept `stage()` from copying a new graph: the phone ran three releases behind. */
    @Test
    fun aStoredQnnGraphIsMigratedBackToTheFp32One() {
        val stored = """{"resolutionMode":"R1440","modelAsset":"model.qnn.onnx","epRequest":"AUTO"}"""
        assertEquals("model.onnx", decodeAppSettings(stored).modelAsset)
    }

    @Test
    fun migratingTheGraphLeavesEveryOtherStoredChoiceAlone() {
        val stored =
            encodeAppSettings(
                AppSettings(
                    modelAsset = "model.qnn.onnx",
                    resolutionMode = ResolutionMode.R1080,
                    orientation = BoardOrientation.BLACK_BOTTOM,
                    debugEnabled = true,
                    speechEnabled = true,
                ),
            )
        val decoded = decodeAppSettings(stored)
        assertEquals("model.onnx", decoded.modelAsset)
        assertEquals(ResolutionMode.R1080, decoded.resolutionMode)
        assertEquals(BoardOrientation.BLACK_BOTTOM, decoded.orientation)
        assertTrue(decoded.debugEnabled)
        assertTrue(decoded.speechEnabled)
    }

    @Test
    fun anFp32SelectionRoundTripsUnchanged() {
        val settings = AppSettings(modelAsset = "model.onnx", resolutionMode = ResolutionMode.R1440)
        assertEquals(settings, decodeAppSettings(encodeAppSettings(settings)))
    }
}
