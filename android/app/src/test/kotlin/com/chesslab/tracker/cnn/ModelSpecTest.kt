package com.chesslab.tracker.cnn

import com.chesslab.cnn.EXPECTED_CLASSES
import com.chesslab.cnn.InputRepr
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.io.File

/**
 * The asset is the source of truth for classes / out_size / normalization (`ee7c83c`), and the
 * 14-class ORDER is the one thing that must fail loudly — a reordered list silently relabels
 * every piece.
 */
class ModelSpecTest {
    @Test
    fun parsesClassesOutSizeAndNormalizeFromTheRealAssetConfig() {
        val json = File(assetDir(), MODEL_CONFIG_FILE).readText()
        val spec = ModelSpec.parse(json)
        // Against the FILE's own list, not against a constant that happens to match it: the
        // bundled run is a 14-class model or the 2-class occupancy one (specs/18) depending on
        // what was staged, and `requireExpectedClasses` is what pins the accepted orders.
        assertEquals(rawClasses(json), spec.classes)
        assertEquals(128, spec.outWidth)
        assertEquals(128, spec.outHeight)
        assertEquals(listOf(0.485f, 0.456f, 0.406f), spec.mean)
        assertEquals(listOf(0.229f, 0.224f, 0.225f), spec.std)
    }

    @Test
    fun rejectsReorderedClassList() {
        val swapped =
            EXPECTED_CLASSES.toMutableList().also {
                it[2] = "wB"
                it[3] = "wN"
            }
        val error = assertThrows<IllegalArgumentException> { ModelSpec.parse(config(classes = swapped)) }
        assertTrue(error.message!!.contains("expected"), error.message)
    }

    @Test
    fun rejectsWrongClassCount() {
        assertThrows<IllegalArgumentException> { ModelSpec.parse(config(classes = EXPECTED_CLASSES.dropLast(1))) }
    }

    @Test
    fun rejectsOutSizeOtherThan128() {
        val error = assertThrows<IllegalArgumentException> { ModelSpec.parse(config(outSize = listOf(96, 96))) }
        assertTrue(error.message!!.contains("out_size"), error.message)
    }

    @Test
    fun fallsBackToImagenetOnlyWhenNormalizeKeyIsAbsent() {
        val custom = ModelSpec.parse(config(mean = listOf(0.5f, 0.4f, 0.3f)))
        assertEquals(listOf(0.5f, 0.4f, 0.3f), custom.mean, "a present normalize block must win over the fallback")

        val fallback = ModelSpec.parse(config(mean = null))
        assertEquals(listOf(0.485f, 0.456f, 0.406f), fallback.mean)
        assertEquals(listOf(0.229f, 0.224f, 0.225f), fallback.std)
    }

    /**
     * `input_repr` decides the ONNX input's WIDTH, so a spec that quietly defaults it would feed
     * the graph a 3-channel tensor where the stem wants 2 — reading it from the asset is the whole
     * point of the field.
     */
    @Test
    fun readsTheInputRepresentationAndItsChannelCount() {
        val gs = ModelSpec.parse(config(inputRepr = "gray+sobel"))
        assertEquals(InputRepr.GRAY_SOBEL, gs.repr)
        assertEquals(2, gs.channels)

        // Runs predating the flag carry no key and were plain RGB.
        val old = ModelSpec.parse(config())
        assertEquals(InputRepr.RGB, old.repr)
        assertEquals(3, old.channels)

        assertThrows<IllegalArgumentException> { ModelSpec.parse(config(inputRepr = "edges")) }
    }

    private fun config(
        classes: List<String> = EXPECTED_CLASSES,
        outSize: List<Int> = listOf(128, 128),
        mean: List<Float>? = listOf(0.485f, 0.456f, 0.406f),
        inputRepr: String? = null,
    ): String {
        val normalize =
            mean?.let { ", \"normalize\": {\"mean\": ${it.joinToString(",", "[", "]")}, \"std\": [0.229, 0.224, 0.225]}" }.orEmpty()
        val repr = inputRepr?.let { ", \"input_repr\": \"$it\"" }.orEmpty()
        return """{"backbone": "x", "classes": ${classes.joinToString(",", "[", "]") { "\"$it\"" }},""" +
            """ "out_size": ${outSize.joinToString(",", "[", "]")}$normalize$repr}"""
    }
}

/** The class list the bundled `config.json` literally declares. */
internal fun assetClasses(): List<String> = rawClasses(File(assetDir(), MODEL_CONFIG_FILE).readText())

private fun rawClasses(json: String): List<String> =
    Json
        .parseToJsonElement(json)
        .jsonObject
        .getValue("classes")
        .jsonArray
        .map { it.jsonPrimitive.content }

/** `app/src/main/assets/cnn_model` — the committed model directory, read from the source tree. */
internal fun assetDir(): File {
    var dir = File(System.getProperty("user.dir")!!).absoluteFile
    while (!File(dir, "app/src/main/assets/cnn_model").isDirectory) {
        dir = dir.parentFile ?: error("cnn_model assets not found above ${System.getProperty("user.dir")}")
    }
    return File(dir, "app/src/main/assets/cnn_model")
}
