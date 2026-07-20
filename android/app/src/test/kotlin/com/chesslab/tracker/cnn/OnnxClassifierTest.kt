package com.chesslab.tracker.cnn

import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import kotlin.io.path.createTempDirectory
import kotlin.math.abs

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class OnnxClassifierTest {
    private val modelDir = createTempDirectory("onnx-fixture").toFile()
    private val classifier: OnnxClassifier by lazy {
        OnnxModelFixture.install(modelDir)
        OnnxClassifier(modelDir)
    }

    @AfterAll
    fun tearDown() {
        classifier.close()
        modelDir.deleteRecursively()
    }

    @Test
    fun `parses run config`() {
        val spec = classifier.spec
        assertEquals(OnnxModelFixture.CLASSES, spec.classes.size)
        assertEquals(OnnxModelFixture.WIDTH, spec.outWidth)
        assertEquals(OnnxModelFixture.HEIGHT, spec.outHeight)
    }

    @Test
    fun `parses normalize mean and std from config`() {
        val spec =
            ModelSpec.parse(
                """{"classes": ["empty", "wP"], "out_size": [128, 160], """ +
                    """"normalize": {"mean": [0.5, 0.4, 0.3], "std": [0.2, 0.1, 0.05]}}""",
            )
        assertEquals(listOf(0.5f, 0.4f, 0.3f), spec.mean)
        assertEquals(listOf(0.2f, 0.1f, 0.05f), spec.std)
    }

    @Test
    fun `missing normalize key falls back to ImageNet stats`() {
        val spec = ModelSpec.parse("""{"classes": ["empty"], "out_size": [128, 160]}""")
        assertEquals(ModelSpec.IMAGENET_MEAN, spec.mean)
        assertEquals(ModelSpec.IMAGENET_STD, spec.std)
        // The fixture config also carries no normalize key -> same fallback.
        assertEquals(ModelSpec.IMAGENET_MEAN, classifier.spec.mean)
    }

    @Test
    fun `argmax follows the hottest input pixel`() {
        // Flatten model: logits = normalized CHW pixels. Pixel (ch=1, p=2) hot ->
        // logit index 1*4 + 2 = 6 must win the softmax.
        val rgb = FloatArray(OnnxModelFixture.CLASSES) { 10f }
        rgb[2 * 3 + 1] = 255f // HWC index of (p=2, channel=1)
        val probs = classifier.predict(listOf(crop(rgb))).single()
        assertEquals(OnnxModelFixture.CLASSES, probs.size)
        assertEquals(6, probs.indices.maxBy { probs[it] })
        assertTrue(abs(probs.sum() - 1f) < 1e-4f) { "softmax must sum to 1" }
    }

    @Test
    fun `handles a dynamic batch of 64 crops in one run`() {
        // 64 crops, each with a different hot logit (cycled over the 12 classes).
        val crops =
            (0 until 64).map { i ->
                val rgb = FloatArray(OnnxModelFixture.CLASSES)
                val logit = i % OnnxModelFixture.CLASSES
                val ch = logit / 4
                val p = logit % 4
                rgb[p * 3 + ch] = 255f
                crop(rgb)
            }
        val probs = classifier.predict(crops)
        assertEquals(64, probs.size)
        for ((i, row) in probs.withIndex()) {
            assertEquals(i % OnnxModelFixture.CLASSES, row.indices.maxBy { row[it] }, "crop $i")
        }
    }

    @Test
    fun `empty batch short-circuits`() {
        assertTrue(classifier.predict(emptyList()).isEmpty())
    }

    private fun crop(rgb: FloatArray): SquareCrop = SquareCrop(OnnxModelFixture.WIDTH, OnnxModelFixture.HEIGHT, rgb)
}
