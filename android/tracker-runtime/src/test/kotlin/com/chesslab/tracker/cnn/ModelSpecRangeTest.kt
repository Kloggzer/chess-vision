package com.chesslab.tracker.cnn

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.double
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import java.io.File

/** Die Temperatur fiel schon an drei Lesestellen einzeln — der Riegel sitzt an der Quelle. */
class ModelSpecRangeTest {
    @ParameterizedTest
    @ValueSource(
        strings = [
            """"temperature": 0""",
            """"temperature": -1.3""",
            """"temperature": 1e999""",
            """"coverage_gate": 1.5""",
            """"coverage_gate": -0.05""",
            """"prior_lambda": -4""",
            """"prior_lambda": 1e999""",
        ],
    )
    fun `ein Messparameter ausserhalb seines Bereichs wird abgelehnt`(field: String) {
        assertThrows(IllegalArgumentException::class.java) { ModelSpec.parse(modelConfigJson(coverageGate = null, extra = ", $field")) }
    }

    @Test
    fun `eine Standardabweichung von null oder darunter wird abgelehnt`() {
        for (std in listOf(listOf(0.229f, 0f, 0.225f), listOf(0.229f, -0.224f, 0.225f))) {
            assertThrows(IllegalArgumentException::class.java) { ModelSpec.parse(modelConfigJson(std = std)) }
        }
    }

    @Test
    fun `die ausgelieferten Modelle gehen unveraendert durch`() {
        val dirs = File("../app/src/main/assets/cnn_model").listFiles { f: File -> File(f, MODEL_CONFIG_FILE).isFile }.orEmpty()
        assertEquals(SHIPPED_MODELS, dirs.size)
        for (dir in dirs) {
            val text = File(dir, MODEL_CONFIG_FILE).readText()
            val root = Json.parseToJsonElement(text).jsonObject
            val spec = ModelSpec.parse(text)
            assertEquals(
                root
                    .getValue("temperature")
                    .jsonPrimitive.double
                    .toRawBits(),
                spec.temperature.toRawBits(),
                dir.name,
            )
            assertEquals(
                root
                    .getValue("coverage_gate")
                    .jsonPrimitive.double
                    .toRawBits(),
                spec.coverageGate!!.toRawBits(),
                dir.name,
            )
            assertEquals(
                root
                    .getValue("prior_lambda")
                    .jsonPrimitive.double
                    .toRawBits(),
                spec.priorLambda!!.toRawBits(),
                dir.name,
            )
        }
    }

    /** "Block fehlt" gegen "Schluessel fehlt": `mean` kam still von ImageNet. */
    @Test
    fun `a normalize block missing one of its stats is refused, not filled from ImageNet`() {
        val partial = """, "normalize": {"mode": "fixed", "std": [0.229, 0.224, 0.225]}"""
        assertThrows(IllegalArgumentException::class.java) { ModelSpec.parse(modelConfigJson(mean = null, extra = partial)) }
    }

    @Test
    fun `a config with no normalize block at all still reads as the legacy ImageNet run`() {
        assert(ModelSpec.parse(modelConfigJson(mean = null)).mean.isNotEmpty()) { "der Alt-Pfad muss bleiben" }
    }

    private companion object {
        const val SHIPPED_MODELS = 7
    }
}
