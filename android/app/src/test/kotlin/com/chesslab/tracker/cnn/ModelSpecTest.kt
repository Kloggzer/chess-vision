package com.chesslab.tracker.cnn

import com.chesslab.cnn.EXPECTED_CLASSES
import com.chesslab.cnn.InputRepr
import com.chesslab.cnn.OCCUPANCY_CLASSES
import com.chesslab.cnn.PIECES13_CLASSES
import com.chesslab.cnn.classesHaveIdentity
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
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
        // The same rule for the input size, and on the default asset it is no longer the trivial
        // case: `id35-80` declares `infer_size` 80 while its crops on disk were built at 128, so
        // this asserts the reader picked the right KEY on the file that
        // actually ships — which the old `assertEquals(128, …)` could not have noticed.
        val declared = rawInts(json, "infer_size")
        assertEquals(declared, listOf(spec.outWidth, spec.outHeight))
        assertNotEquals(
            rawInts(json, "out_size"),
            declared,
            "the bundled asset no longer exercises the `infer_size` path — this test has gone vacuous",
        )
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
        // Every accepted order has to appear, not just the word "expected". The message named only
        // the 14- and 2-class lists until 2026-08-02, so whoever shipped a mis-ordered 13-class
        // model — the `id35-80` shape the device runs — was handed the two lists their model was
        // never meant to match and no sight of the one it was.
        for (accepted in listOf(EXPECTED_CLASSES, PIECES13_CLASSES, OCCUPANCY_CLASSES)) {
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
        assertThrows<IllegalArgumentException> { ModelSpec.parse(config(classes = missingMiddle)) }
    }

    /**
     * `pieces13` — the 14-class list minus `occluded`, which never comes from a FEN and has zero
     * rows in the real corpus, so an identity run trained on camera data has no column for it.
     * Accepted because the prefix is identical: every index read by name lands in the same place.
     */
    @Test
    fun acceptsThePieces13IdentityList() {
        val spec = ModelSpec.parse(config(classes = PIECES13_CLASSES))
        assertEquals(PIECES13_CLASSES, spec.classes)
        assertTrue(classesHaveIdentity(spec.classes), "13 classes must read as an IDENTITY model")
    }

    /**
     * `infer_size` is the size the exported graph takes, and it is NOT `out_size`: what a crop
     * carries is `board_size / 8 * (1 + 2 * padSide)` px — 110 on the fixed rig, 240 on this app's
     * default geometry — so the input size is a per-model, per-deployment value (specs/22).
     */
    @Test
    fun parsesInferSizeWhenPresent() {
        val spec = ModelSpec.parse(config(inferSize = listOf(96, 96)))
        assertEquals(96, spec.outWidth)
        assertEquals(96, spec.outHeight)
    }

    /**
     * The compatibility case, and a LIVE one: every model shipped before specs/22 carries no key,
     * and so does every freshly trained run — the exporter is the only writer.
     */
    @Test
    fun fallsBackToOutSizeWhenInferSizeIsAbsent() {
        val spec = ModelSpec.parse(config(outSize = listOf(128, 128)))
        assertEquals(128, spec.outWidth)
        assertEquals(128, spec.outHeight)
    }

    /**
     * A parse error must not reach the network. The band is all the app can judge on its own —
     * whether a size was TRAINED is checked by the exporter, which knows the run's `scales`.
     */
    @Test
    fun rejectsAnImplausibleSize() {
        val error = assertThrows<IllegalArgumentException> { ModelSpec.parse(config(inferSize = listOf(8, 8))) }
        assertTrue(error.message!!.contains("plausible"), error.message)
        assertThrows<IllegalArgumentException> { ModelSpec.parse(config(outSize = listOf(1024, 1024))) }
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

    /**
     * specs/45 — the pads are a model property, and the app must be able to tell a model that
     * DECLARES 0.05 from one that says nothing and is served 0.05 by its calibration profile.
     */
    @Test
    fun readsTheDeclaredCropAndTreatsAnAbsentOneAsLegacy() {
        val declared = ModelSpec.parse(config(padSide = 0.05, padUp = 0.0))
        assertEquals(0.05, declared.padSide)
        assertEquals(0.0, declared.padUp)
        assertTrue(declared.declaresCrop)

        val legacy = ModelSpec.parse(config())
        assertNull(legacy.padSide)
        assertNull(legacy.padUp)
        assertFalse(legacy.declaresCrop, "an absent crop must never read as a default")

        // Half a declaration is not one: the missing half would come from the profile, composing
        // a box nobody chose.
        assertThrows<IllegalArgumentException> { ModelSpec.parse(config(padSide = 0.05)) }
        assertThrows<IllegalArgumentException> { ModelSpec.parse(config(padUp = 0.0)) }
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

    private fun config(
        classes: List<String> = EXPECTED_CLASSES,
        outSize: List<Int> = listOf(128, 128),
        mean: List<Float>? = listOf(0.485f, 0.456f, 0.406f),
        inputRepr: String? = null,
        inferSize: List<Int>? = null,
        padSide: Double? = null,
        padUp: Double? = null,
    ): String {
        val normalize =
            mean?.let { ", \"normalize\": {\"mean\": ${it.joinToString(",", "[", "]")}, \"std\": [0.229, 0.224, 0.225]}" }.orEmpty()
        val repr = inputRepr?.let { ", \"input_repr\": \"$it\"" }.orEmpty()
        val infer = inferSize?.let { ", \"infer_size\": ${it.joinToString(",", "[", "]")}" }.orEmpty()
        val crop = (padSide?.let { ", \"pad_side\": $it" }.orEmpty()) + (padUp?.let { ", \"pad_up\": $it" }.orEmpty())
        return """{"backbone": "x", "classes": ${classes.joinToString(",", "[", "]") { "\"$it\"" }},""" +
            """ "out_size": ${outSize.joinToString(",", "[", "]")}$infer$crop$normalize$repr}"""
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

/** The `android/` gradle root, found from wherever the test JVM was started. */
internal fun androidRoot(): File {
    var dir = File(System.getProperty("user.dir")!!).absoluteFile
    while (!File(dir, "app/src/main/assets/cnn_model").isDirectory) {
        dir = dir.parentFile ?: error("cnn_model assets not found above ${System.getProperty("user.dir")}")
    }
    return dir
}

/** `app/src/main/assets/cnn_model/<model>` — a committed model directory, read from the source tree. */
internal fun assetDirOf(model: String): File = File(androidRoot(), "app/src/main/assets/cnn_model/$model")

/**
 * The model an install runs until the user picks another one, and what every test that only needs
 * *a* real model uses. The set is [bundledAssetDirs].
 */
internal fun assetDir(): File = assetDirOf(DEFAULT_MODEL)

/**
 * Every bundled model directory, in [BUNDLED_MODELS] order — asserted to exist rather than
 * discovered, so a model that is listed in the code but missing from `assets/` fails here instead
 * of on the device.
 */
internal fun bundledAssetDirs(): List<File> =
    BUNDLED_MODELS.map { model ->
        assetDirOf(model).also { check(File(it, MODEL_CONFIG_FILE).isFile) { "bundled model $model has no ${it.path}" } }
    }
