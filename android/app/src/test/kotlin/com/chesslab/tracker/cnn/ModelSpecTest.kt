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

/**
 * The asset is the source of truth for classes / input size / normalization (`ee7c83c`), and the
 * 14-class ORDER is the one thing that must fail loudly — a reordered list silently relabels
 * every piece.
 */
class ModelSpecTest {
    @Test
    fun parsesClassesInputSizeAndNormalizeFromTheRealAssetConfig() {
        val json = File(assetDir(), MODEL_CONFIG_FILE).readText()
        val spec = ModelSpec.parse(json)
        // Against the FILE's own list, not against a constant that happens to match it: the
        // bundled run is a 14-class model or the 2-class occupancy one (specs/18) depending on
        // what was staged, and `requireExpectedClasses` is what pins the accepted orders.
        assertEquals(rawClasses(json), spec.classes)
        // Read the key the real default actually declares. `real14-80` uses `out_size`; dedicated
        // tests below exercise both that compatibility path and an explicit `infer_size`.
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
        // Every accepted order has to appear, not just the word "expected": the one the message
        // omits is the one the failing model is closest to.
        for (accepted in listOf(EXPECTED_CLASSES, PIECES13_CLASSES)) {
            assertTrue(error.message!!.contains(accepted.toString()), "$accepted missing from: ${error.message}")
        }
    }

    /**
     * A shortened list must still be refused — but NOT by dropping the last entry, which is
     * `occluded` and therefore the canonical `pieces13` list the identity models ship with. Drop a
     * middle class instead, so this tests "wrong count" rather than "any 13 classes".
     */
    @Test
    fun rejectsWrongClassCount() {
        val missingMiddle = EXPECTED_CLASSES.filterNot { it == "wB" }
        assertThrows<IllegalArgumentException> { ModelSpec.parse(modelConfigJson(classes = missingMiddle)) }
    }

    /**
     * `pieces13` — the 14-class list minus `occluded`, which never comes from a FEN and has zero
     * rows in the real corpus, so an identity run trained on camera data has no column for it.
     * Accepted because the prefix is identical: every index read by name lands in the same place.
     */
    @Test
    fun acceptsThePieces13IdentityList() {
        val spec = ModelSpec.parse(modelConfigJson(classes = PIECES13_CLASSES))
        assertEquals(PIECES13_CLASSES, spec.classes)
        assertEquals(13, spec.classes.size, "pieces13 is the 14-class list minus `occluded`")
    }

    /**
     * `infer_size` is the size the exported graph takes, and it is NOT `out_size`: what a crop
     * carries is `board_size / 8 * (1 + 2 * padSide)` px — 110 on the fixed rig, 240 on this app's
     * default geometry — so the input size is a per-model, per-deployment value (specs/22).
     */
    @Test
    fun parsesInferSizeWhenPresent() {
        val spec = ModelSpec.parse(modelConfigJson(inferSize = listOf(96, 96)))
        assertEquals(96, spec.outWidth)
        assertEquals(96, spec.outHeight)
    }

    /**
     * The compatibility case, and a LIVE one: every model shipped before specs/22 carries no key,
     * and so does every freshly trained run — the exporter is the only writer.
     */
    @Test
    fun fallsBackToOutSizeWhenInferSizeIsAbsent() {
        val spec = ModelSpec.parse(modelConfigJson(outSize = listOf(128, 128)))
        assertEquals(128, spec.outWidth)
        assertEquals(128, spec.outHeight)
    }

    /**
     * A parse error must not reach the network. The band is all the app can judge on its own —
     * whether a size was TRAINED is checked by the exporter, which knows the run's `scales`.
     */
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

    /**
     * `input_repr` decides the ONNX input's WIDTH, so a spec that quietly defaults it would feed
     * the graph a 3-channel tensor where the stem wants 2 — reading it from the asset is the whole
     * point of the field.
     */
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

    /**
     * specs/45 — `pad_side` is a model property, and the app must be able to tell a model that
     * DECLARES 0.05 from one that says nothing and is served 0.05 by its calibration profile.
     *
     * `pad_up` was retired 2026-09-14. Archived configs still carry it, so the parse has to read
     * it as any other unknown key: ignored, and never a reason to refuse a model.
     */
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

    /**
     * Every model that SHIPS declares its crop. Not the value — that is a property of the corpus
     * and may move — but that the shipped configs answer the question at all: a bundled model
     * whose pads are unknown is served the device's calibration profile, which is the failure the
     * pack is about and which nothing on the device would report as unusual.
     */
    @Test
    fun everyBundledModelDeclaresItsCrop() {
        for (dir in bundledAssetDirs()) {
            val spec = ModelSpec.parse(File(dir, MODEL_CONFIG_FILE).readText())
            assertTrue(spec.declaresCrop, "${dir.name} declares no crop — mark it legacy or back-fill it")
        }
    }

    /**
     * A 13-class coverage model and the old 14-class one are BOTH 14 columns wide, so the width
     * may only come from the declaration: an absent key has to keep meaning "every column is a
     * class", or the shipped models would have their last class softmaxed as a coverage value.
     */
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
        // Still zu ignorieren hiesse, dem Modell Pixel zu geben, die es nie gesehen hat: kein
        // Absturz, keine Warnung, nur ein paar Punkte weniger, die niemand einem Schalter zuordnet.
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

/**
 * Every bundled model directory, in [BUNDLED_MODELS] order — asserted to exist rather than
 * discovered, so a model that is listed in the code but missing from `assets/` fails here instead
 * of on the device.
 */
internal fun bundledAssetDirs(): List<File> =
    BUNDLED_MODELS.map { model ->
        assetDirOf(model).also { check(File(it, MODEL_CONFIG_FILE).isFile) { "bundled model $model has no ${it.path}" } }
    }
