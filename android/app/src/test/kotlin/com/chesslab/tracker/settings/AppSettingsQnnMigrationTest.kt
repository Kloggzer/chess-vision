package com.chesslab.tracker.settings

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * A device found on 2026-07-27 had `modelAsset = "model.qnn.onnx"` stored from when a QNN-capable
 * build existed. Because `CnnModelAssets.stage()` only copies the graph it is asked for, that phone
 * never received a new `model.onnx` and was still executing the asset from commit `b24f1f3` — three
 * model releases behind, while every quoted accuracy number described a graph it was not running.
 */
class AppSettingsQnnMigrationTest {
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
