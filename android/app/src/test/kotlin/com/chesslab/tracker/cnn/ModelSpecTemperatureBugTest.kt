package com.chesslab.tracker.cnn

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File
import kotlin.math.abs

/** Die gefittete `temperature` muss bis in die Wahrscheinlichkeiten durchkommen: ungelesen
 *  gatterte jede Konfidenz schaerfer als kalibriert (Bug-Audit C3). */
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

    /** Ein Getter allein waere die halbe Zusage — hier zaehlt, dass die Zahl ANKOMMT. */
    @Test
    fun theFittedTemperatureReachesTheProbabilities() {
        for (dir in bundledAssetDirs()) {
            val spec = ModelSpec.parse(File(dir, MODEL_CONFIG_FILE).readText())
            val root = Json.parseToJsonElement(File(dir, MODEL_CONFIG_FILE).readText()).jsonObject
            val declared = root["temperature"]?.jsonPrimitive?.doubleOrNull ?: 1.0
            assertEquals(declared, spec.temperature, TOLERANCE, dir.name)
        }
    }

    private companion object {
        const val TOLERANCE = 1e-6
    }
}
