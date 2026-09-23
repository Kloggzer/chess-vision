package com.chesslab.tracker.cnn

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.engine.perf.WorkOperation
import com.chesslab.engine.perf.WorkProfiler
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.allSquares
import com.chesslab.tracker.OpenCvGate
import com.chesslab.tracker.geometry.SYNTHETIC_FRAME_SIDE
import com.chesslab.tracker.geometry.cropsAsHandedToTheClassifier
import com.chesslab.tracker.geometry.storeWithSyntheticWarp
import com.chesslab.tracker.geometry.withCropOf
import com.chesslab.tracker.log.RecordingLog
import com.chesslab.tracker.perf.RecordingWorkProbe
import com.chesslab.tracker.service.cropFrameSource
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.condition.EnabledIf
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.math.abs

/** `preprocessInto` does not resize, so the crops must be cut at the model's size. Whole chain, no fake. */
class ModelSpecCropSeamTest {
    @Test
    @EnabledIf(OpenCvGate.REF)
    fun theShippedAssetsOwnCropsRunThroughItsOwnGraph(
        @TempDir tmp: File,
    ) {
        assertEquals(SHIPPED_INPUT_SIZE, assertCropSeam(assetDir(), tmp), "the shipped asset's inference size")
    }

    @Test
    @EnabledIf(OpenCvGate.REF)
    fun everyBundledModelCropsAtItsOwnSize(
        @TempDir tmp: File,
    ) {
        val sizes =
            bundledAssetDirs().mapIndexed { index, dir ->
                dir.name to assertCropSeam(dir, File(tmp, "model$index").also { it.mkdirs() })
            }
        assertEquals(BUNDLED_MODELS, sizes.map { it.first }, "every bundled model must be covered")
        assertTrue(
            sizes.map { it.second }.distinct().size > 1,
            "all bundled models crop at one size, so this cannot show the size following the model: $sizes",
        )
    }

    private fun assertCropSeam(
        dir: File,
        tmp: File,
    ): Int {
        val spec = ModelSpec.parse(File(dir, MODEL_CONFIG_FILE).readText())
        assertEquals(spec.outWidth, spec.outHeight, "${dir.name}: this test only covers square inputs")

        val crops = cropsAsHandedToTheClassifier(liveGeometry().withCropOf(spec))
        assertEquals(ALL_SQUARES.size, crops.size)
        for ((index, crop) in crops.withIndex()) {
            assertEquals(spec.outWidth, crop.width, "${dir.name}: crop $index (${allSquares()[index]}) width")
            assertEquals(spec.outHeight, crop.height, "${dir.name}: crop $index (${allSquares()[index]}) height")
        }
        assertTrue(crops[0].data.any { it != crops[0].data[0] }, "${dir.name}: the crops must carry real pixels")

        OnnxSquareClassifier.open(stagedModelIn(dir, tmp), RecordingLog()).use { cnn ->
            assertEquals(
                "${ALL_SQUARES.size}x${spec.channels}x${spec.outHeight}x${spec.outWidth}",
                cnn.inputShape,
                "${dir.name}: the tensor the graph is fed",
            )
            val probs = cnn.classify(crops)
            assertEquals(ALL_SQUARES.size, probs.size)
            probs.forEach { row ->
                assertEquals(spec.outputWidth, row.size, "classes plus optional coverage output")
                val classSum = row.take(spec.classes.size).sum()
                assertTrue(abs(classSum - 1.0f) < TOLERANCE, "${dir.name}: class probabilities sum to $classSum")
            }
        }
        return spec.outWidth
    }

    /** The geometry default matches `p4full-128`, so a smaller arm refuses. */
    @Test
    @EnabledIf(OpenCvGate.REF)
    fun withoutTheModelsSizeTheShippedAssetRefusesTheCrops(
        @TempDir tmp: File,
    ) {
        val unwired = cropsAsHandedToTheClassifier(liveGeometry())
        val default = BoardGeometry().outW
        assertEquals(default, unwired[0].width, "the unwired path must still be the old default")
        val other =
            bundledAssetDirs().firstOrNull {
                ModelSpec.parse(File(it, MODEL_CONFIG_FILE).readText()).outWidth != default
            }
        assertTrue(other != null, "no bundled model differs from the geometry default, so nothing can refuse")
        val want = ModelSpec.parse(File(other!!, MODEL_CONFIG_FILE).readText()).outWidth
        OnnxSquareClassifier.open(stagedModelIn(other, tmp), RecordingLog()).use { cnn ->
            val error = assertThrows<IllegalArgumentException> { cnn.classify(unwired) }
            assertTrue(
                error.message!!.contains("expected ${want}x$want"),
                "the refusal must name the size the model wants, got: ${error.message}",
            )
        }
    }

    @Test
    @EnabledIf(OpenCvGate.REF)
    fun coverageModelsDoNotRunTheGridOcclusionFallback() {
        val store = storeWithSyntheticWarp(liveGeometry())
        val probe = RecordingWorkProbe()
        val profiling = WorkProfiler.install(probe)
        val result =
            try {
                requireNotNull(cropFrameSource(store, runGridOcclusion = false).take())
            } finally {
                profiling.close()
            }

        assertEquals(0L, result.gridOccluded)
        assertEquals(null, probe.snapshot().operation(WorkOperation.GRID_OCCLUSION))
        assertEquals(64, result.crops.size)
    }
}

/** A tripwire on the DECISION, not a read. */
internal const val SHIPPED_INPUT_SIZE = 80

private const val TOLERANCE = 1e-4f

private fun stagedModelIn(
    model: File,
    dir: File,
): StagedModel = CnnModelAssets({ name -> File(model, name).takeIf { it.isFile }?.inputStream() }, dir).stage()

private fun liveGeometry(): BoardGeometry = BoardGeometry(boardSize = SYNTHETIC_FRAME_SIDE)
