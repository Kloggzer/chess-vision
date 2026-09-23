package com.chesslab.tracker.cnn

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import java.io.File

/** Ungelesen gatterte jede Konfidenz schaerfer als kalibriert (Bug-Audit C3). */
class ModelSpecTemperatureBugTest {
    @Test
    fun theFittedTemperatureReachesTheProbabilities() {
        for (dir in bundledAssetDirs()) {
            val spec = ModelSpec.parse(File(dir, MODEL_CONFIG_FILE).readText())
            val root = Json.parseToJsonElement(File(dir, MODEL_CONFIG_FILE).readText()).jsonObject
            val declared = root["temperature"]?.jsonPrimitive?.doubleOrNull ?: 1.0
            assertEquals(declared, spec.temperature, TOLERANCE, dir.name)
        }
    }

    /** Die Zahl auf den ROHEN Logits, nicht auf den getemperten (`priorOnTempered`). */
    @Test
    fun everyBundledModelDeclaresItsPriorStrength() {
        for (dir in bundledAssetDirs()) {
            val spec = ModelSpec.parse(File(dir, MODEL_CONFIG_FILE).readText())
            val declared = spec.priorLambda
            assertNotNull(declared, dir.name)
            // Migrationswert: was das Modell vor der Entkopplung effektiv fuhr (4,0 x T).
            assertEquals(ENGINE_LAMBDA * spec.temperature, declared!!, 1e-3, dir.name)
        }
    }

    private companion object {
        const val TOLERANCE = 1e-6
        const val ENGINE_LAMBDA = 4.0
    }
}
