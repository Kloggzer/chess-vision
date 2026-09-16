package com.chesslab.tracker.cnn

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test
import java.io.File
import kotlin.math.abs

/** Bug-Audit C3: die gefittete `temperature` wird nie gelesen, also gattert jede Konfidenz
 *  schaerfer als kalibriert (`docs/bug-audit-2026-09-13.md`). */
@Disabled("BUG: C3 — `ModelSpec` parst die gefittete `temperature` nicht, das Serving softmaxt rohe Logits")
class ModelSpecTemperatureBugTest {
    @Test
    fun everyBundledModelsFittedTemperatureReachesTheRuntime() {
        val exposed = ModelSpec::class.java.methods.any { it.name == "getTemperature" }
        val fitted =
            bundledAssetDirs().filter { dir ->
                val root = Json.parseToJsonElement(File(dir, MODEL_CONFIG_FILE).readText()).jsonObject
                val t = root["temperature"]?.jsonPrimitive?.doubleOrNull
                t != null && abs(t - 1.0) > TOLERANCE
            }
        assertTrue(
            fitted.isEmpty() || exposed,
            "models declaring a fitted temperature that ModelSpec never reads: " +
                fitted.joinToString(", ") { it.name },
        )
    }

    private companion object {
        const val TOLERANCE = 1e-6
    }
}
