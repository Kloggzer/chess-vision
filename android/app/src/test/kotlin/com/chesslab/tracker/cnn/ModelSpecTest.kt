package com.chesslab.tracker.cnn

import com.chesslab.cnn.EXPECTED_CLASSES
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
        val spec = ModelSpec.parse(File(assetDir(), MODEL_CONFIG_FILE).readText())
        assertEquals(EXPECTED_CLASSES, spec.classes)
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

    private fun config(
        classes: List<String> = EXPECTED_CLASSES,
        outSize: List<Int> = listOf(128, 128),
        mean: List<Float>? = listOf(0.485f, 0.456f, 0.406f),
    ): String {
        val normalize =
            mean?.let { ", \"normalize\": {\"mean\": ${it.joinToString(",", "[", "]")}, \"std\": [0.229, 0.224, 0.225]}" }.orEmpty()
        return """{"backbone": "x", "classes": ${classes.joinToString(",", "[", "]") { "\"$it\"" }},""" +
            """ "out_size": ${outSize.joinToString(",", "[", "]")}$normalize}"""
    }
}

/** `app/src/main/assets/cnn_model` — the committed model directory, read from the source tree. */
internal fun assetDir(): File {
    var dir = File(System.getProperty("user.dir")!!).absoluteFile
    while (!File(dir, "app/src/main/assets/cnn_model").isDirectory) {
        dir = dir.parentFile ?: error("cnn_model assets not found above ${System.getProperty("user.dir")}")
    }
    return File(dir, "app/src/main/assets/cnn_model")
}
