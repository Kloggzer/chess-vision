package com.chesslab.tracker.cnn

import com.chesslab.cnn.EXPECTED_CLASSES
import com.chesslab.cnn.InputRepr
import com.chesslab.cnn.PIECES13_CLASSES
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.io.File

/** The asset is the source of truth (`ee7c83c`); a reordered class list silently relabels every piece. */
class ModelSpecTest {
    @Test
    fun parsesClassesInputSizeAndNormalizeFromTheRealAssetConfig() {
        val json = File(assetDir(), MODEL_CONFIG_FILE).readText()
        val spec = ModelSpec.parse(json)
        assertEquals(rawClasses(json), spec.classes)
        val root = Json.parseToJsonElement(json).jsonObject
        val declared = rawInts(json, if ("infer_size" in root) "infer_size" else "out_size")
        assertEquals(declared, listOf(spec.outWidth, spec.outHeight))
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
        val error = assertThrows<IllegalArgumentException> { ModelSpec.parse(modelConfigJson(classes = swapped)) }
        // The accepted order the message omits is the one the failing model is closest to.
        for (accepted in listOf(EXPECTED_CLASSES, PIECES13_CLASSES)) {
            assertTrue(error.message!!.contains(accepted.toString()), "$accepted missing from: ${error.message}")
        }
    }

    /** Drops a MIDDLE class: dropping the last (`occluded`) gives the valid `pieces13` list. */
    @Test
    fun rejectsWrongClassCount() {
        val missingMiddle = EXPECTED_CLASSES.filterNot { it == "wB" }
        assertThrows<IllegalArgumentException> { ModelSpec.parse(modelConfigJson(classes = missingMiddle)) }
    }

    /** Accepted because the prefix is identical: every index read by name lands in the same place. */
    @Test
    fun acceptsThePieces13IdentityList() {
        val spec = ModelSpec.parse(modelConfigJson(classes = PIECES13_CLASSES))
        assertEquals(PIECES13_CLASSES, spec.classes)
        assertEquals(13, spec.classes.size, "pieces13 is the 14-class list minus `occluded`")
    }

    /** `infer_size` is NOT `out_size`: the input size is per-model, per-deployment (specs/22). */
    @Test
    fun parsesInferSizeWhenPresent() {
        val spec = ModelSpec.parse(modelConfigJson(inferSize = listOf(96, 96)))
        assertEquals(96, spec.outWidth)
        assertEquals(96, spec.outHeight)
    }

    /** A live case: only the exporter writes `infer_size`, freshly trained runs carry none. */
    @Test
    fun fallsBackToOutSizeWhenInferSizeIsAbsent() {
        val spec = ModelSpec.parse(modelConfigJson(outSize = listOf(128, 128)))
        assertEquals(128, spec.outWidth)
        assertEquals(128, spec.outHeight)
    }

    @Test
    fun rejectsAnImplausibleSize() {
        val error = assertThrows<IllegalArgumentException> { ModelSpec.parse(modelConfigJson(inferSize = listOf(8, 8))) }
        assertTrue(error.message!!.contains("plausible"), error.message)
        assertThrows<IllegalArgumentException> { ModelSpec.parse(modelConfigJson(outSize = listOf(1024, 1024))) }
    }

    @Test
    fun fallsBackToImagenetOnlyWhenNormalizeKeyIsAbsent() {
        val custom = ModelSpec.parse(modelConfigJson(mean = listOf(0.5f, 0.4f, 0.3f)))
        assertEquals(listOf(0.5f, 0.4f, 0.3f), custom.mean, "a present normalize block must win over the fallback")

        val fallback = ModelSpec.parse(modelConfigJson(mean = null))
        assertEquals(listOf(0.485f, 0.456f, 0.406f), fallback.mean)
        assertEquals(listOf(0.229f, 0.224f, 0.225f), fallback.std)
    }

    /** `input_repr` decides the ONNX input's WIDTH; a quiet default feeds 3 channels to a 2-channel stem. */
    @Test
    fun readsTheInputRepresentationAndItsChannelCount() {
        val gs = ModelSpec.parse(modelConfigJson(inputRepr = "gray+sobel"))
        assertEquals(InputRepr.GRAY_SOBEL, gs.repr)
        assertEquals(2, gs.channels)

        // Kein Schluessel heisst RGB — der Zustand jedes ausgelieferten Modells und jedes aelteren.
        val absent = ModelSpec.parse(modelConfigJson())
        assertEquals(InputRepr.RGB, absent.repr)
        assertEquals(3, absent.channels)

        assertThrows<IllegalArgumentException> { ModelSpec.parse(modelConfigJson(inputRepr = "edges")) }
    }

    /** specs/45 — a DECLARED 0.05 differs from a profile-served one. `pad_up` (retired 2026-09-14)
     *  is an ignored unknown key, never a reason to refuse an archived model. */
    @Test
    fun readsTheDeclaredCropAndTreatsAnAbsentOneAsLegacy() {
        val declared = ModelSpec.parse(modelConfigJson(padSide = 0.05))
        assertEquals(0.05, declared.padSide)
        assertTrue(declared.declaresCrop)

        val undeclared = ModelSpec.parse(modelConfigJson())
        assertNull(undeclared.padSide)
        assertFalse(undeclared.declaresCrop, "an absent crop must never read as a default")

        val archived = ModelSpec.parse(modelConfigJson(padSide = 0.05, padUp = 0.0))
        assertEquals(0.05, archived.padSide)
        assertTrue(archived.declaresCrop)

        assertNull(ModelSpec.parse(modelConfigJson(padUp = 0.0)).padSide)
        assertFalse(ModelSpec.parse(modelConfigJson(padUp = 0.0)).declaresCrop)
    }

    /** A bundled model with unknown pads is silently served the device's calibration profile. */
    @Test
    fun everyBundledModelDeclaresItsCrop() {
        for (dir in bundledAssetDirs()) {
            val spec = ModelSpec.parse(File(dir, MODEL_CONFIG_FILE).readText())
            assertTrue(spec.declaresCrop, "${dir.name} declares no crop — mark it legacy or back-fill it")
        }
    }

    /** A 13-class coverage model and the old 14-class one are BOTH 14 columns wide: only the key tells. */
    @Test
    fun readsTheCoverageOutputAndTreatsAnAbsentOneAsFalse() {
        val covering = ModelSpec.parse(modelConfigJson())
        assertTrue(covering.coverageOutput)
        assertEquals(PIECES13_CLASSES.size + 1, covering.outputWidth)

        val legacy = ModelSpec.parse(modelConfigJson(classes = EXPECTED_CLASSES, coverageOutput = false, coverageGate = null))
        assertFalse(legacy.coverageOutput, "an absent key must never read as a coverage model")
        assertEquals(EXPECTED_CLASSES.size, legacy.outputWidth)
    }

    /** Every bundled config must describe exactly the columns its graph returns. */
    @Test
    fun bundledModelsDeclareTheirOutputWidth() {
        for (dir in bundledAssetDirs()) {
            val spec = ModelSpec.parse(File(dir, MODEL_CONFIG_FILE).readText())
            assertEquals(
                spec.classes.size + if (spec.coverageOutput) 1 else 0,
                spec.outputWidth,
                "${dir.name} output width",
            )
        }
    }

    @Test
    fun everyBundledModelWithCoverageOutputDeclaresACoverageGate() {
        val offending = mutableListOf<String>()
        for (dir in bundledAssetDirs()) {
            val spec = ModelSpec.parse(File(dir, MODEL_CONFIG_FILE).readText())
            if (spec.coverageOutput && spec.coverageGate == null) {
                offending.add(dir.name)
            }
        }
        assertTrue(
            offending.isEmpty(),
            buildString {
                append("coverage_output models without coverage_gate: ${offending.joinToString(", ")}")
                append(" — the threshold silently falls back to the legacy default 0.5, which admits reads 84% wrong")
            },
        )
    }

    @Test
    fun `the run's own clahe declaration is what serving reproduces`() {
        val spec =
            ModelSpec.parse(
                modelConfigJson(claheClip = 2.0, extra = ", \"clahe_tile\": 8, \"clahe_min_mean\": 25.0, \"clahe_max_mean\": 40.0"),
            )
        assertEquals(2.0, spec.claheClip)
        assertEquals(8, spec.claheTile)
        assertEquals(25.0, spec.claheMinMean)
        assertEquals(40.0, spec.claheMaxMean)
    }

    @Test
    fun `a run without a clahe key asks for none`() {
        // `0.0` ist das Aus-Signal; die drei p4-Laeufe ohne CLAHE stehen genau so im APK.
        assertEquals(0.0, ModelSpec.parse(modelConfigJson()).claheClip)
    }

    @Test
    fun `preprocessing this runtime cannot reproduce is refused, not ignored`() {
        // Still ignoriert saehe das Modell Pixel, die es nie gesehen hat — ohne jede Warnung.
        val e =
            assertThrows<IllegalArgumentException> {
                ModelSpec.parse(modelConfigJson(claheClip = 2.0, extra = ", \"clahe_denoise\": \"pre\""))
            }
        assertTrue(e.message!!.contains("clahe_denoise")) { e.message!! }
    }
}

private fun rawClasses(json: String): List<String> =
    Json
        .parseToJsonElement(json)
        .jsonObject
        .getValue("classes")
        .jsonArray
        .map { it.jsonPrimitive.content }

/** An int array a `config.json` literally declares — no fallback, so a missing key fails. */
private fun rawInts(
    json: String,
    key: String,
): List<Int> =
    Json
        .parseToJsonElement(json)
        .jsonObject
        .getValue(key)
        .jsonArray
        .map { it.jsonPrimitive.content.toInt() }

/** Asserted to exist rather than discovered, so a listed but missing model fails here, not on the device. */
internal fun bundledAssetDirs(): List<File> =
    BUNDLED_MODELS.map { model ->
        assetDirOf(model).also { check(File(it, MODEL_CONFIG_FILE).isFile) { "bundled model $model has no ${it.path}" } }
    }
