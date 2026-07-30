package com.chesslab.tracker.cnn

import com.chesslab.cnn.ALL_SQUARES
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.allSquares
import com.chesslab.geometry.warpBoardForCrops
import com.chesslab.tracker.geometry.withCropSizeOf
import com.chesslab.tracker.pipeline.CropFrameStore
import com.chesslab.tracker.service.cropFrameSource
import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.condition.EnabledIf
import org.junit.jupiter.api.io.TempDir
import org.opencv.core.CvType
import org.opencv.core.Mat
import java.io.File
import kotlin.math.abs

/**
 * specs/23 phase 02 — **the shipped asset's size reaches the pixels, end to end.**
 *
 * [ModelSpecGraphSeamTest] proves the bundled graph and its `config.json` agree about the input
 * size. That is not enough to ship: nothing there cuts a crop, and `preprocessInto` does not
 * resize — it REQUIRES `crop.width == outW`. So a model whose graph and config agree perfectly on
 * 96 px still dies on the first observation unless the CROP PIPELINE also produces 96 px, which is
 * what specs/23 phase 01 wired (`BoardGeometry.withCropSizeOf`).
 *
 * This test runs the whole chain on one set of pixels: the bundled `config.json` -> [ModelSpec] ->
 * [withCropSizeOf] -> the real bordered warp -> `cropFrameSource` (the adapter the CNN observer
 * pulls from) -> [OnnxSquareClassifier.open] on the real staged asset -> 64 rows of probabilities.
 * No fake sits anywhere in it.
 *
 * The pixel tests need the OpenCV natives and are gated on them, exactly as
 * `com.chesslab.tracker.geometry.ModelCropSizeTest` is.
 */
class ModelSpecCropSeamTest {
    @Test
    @EnabledIf(OPENCV_GATE)
    fun theShippedAssetsOwnCropsRunThroughItsOwnGraph(
        @TempDir tmp: File,
    ) {
        val spec = shippedSpec()
        // The deployment decision, asserted before anything is measured against it: this is the
        // size specs/23 phase 00 chose, and it is only safe because the run was TRAINED at it.
        assertEquals(SHIPPED_INPUT_SIZE, spec.outWidth, "the shipped asset's inference size")
        assertEquals(spec.outWidth, spec.outHeight, "this test only covers square inputs")

        val crops = cropsAsHandedToTheClassifier(liveGeometry().withCropSizeOf(spec))
        assertEquals(ALL_SQUARES.size, crops.size)
        for ((index, crop) in crops.withIndex()) {
            assertEquals(spec.outWidth, crop.width, "crop $index (${allSquares()[index]}) width")
            assertEquals(spec.outHeight, crop.height, "crop $index (${allSquares()[index]}) height")
        }
        // Not vacuous: the crops carry real, varying pixels, so what follows classifies content.
        assertTrue(crops[0].data.any { it != crops[0].data[0] }, "the crops must carry real pixels")

        stagedAsset(tmp).let { staged ->
            OnnxSquareClassifier.open(staged, RecordingLog()).use { cnn ->
                assertEquals(
                    "${ALL_SQUARES.size}x${spec.channels}x${spec.outHeight}x${spec.outWidth}",
                    cnn.inputShape,
                    "the tensor the graph is fed",
                )
                val probs = cnn.classify(crops)
                assertEquals(ALL_SQUARES.size, probs.size)
                probs.forEach { row ->
                    assertEquals(spec.classes.size, row.size, "one probability per class of ${spec.classes}")
                    assertTrue(abs(row.sum() - 1.0f) < TOLERANCE, "row sums to ${row.sum()}")
                }
            }
        }
    }

    /**
     * And phase 01's wiring is LOAD-BEARING, not decorative.
     *
     * Without it the geometry keeps [BoardGeometry]'s own 128 px default — which is what the app did
     * until specs/23 phase 01 — and the shipped 96 px classifier refuses those crops outright. That
     * refusal is the whole reason phase 02 could not go first, and it is asserted here so a
     * regression in the wiring cannot be mistaken for a harmless default.
     */
    @Test
    @EnabledIf(OPENCV_GATE)
    fun withoutTheModelsSizeTheShippedAssetRefusesTheCrops(
        @TempDir tmp: File,
    ) {
        val unwired = cropsAsHandedToTheClassifier(liveGeometry())
        assertEquals(BoardGeometry().outW, unwired[0].width, "the unwired path must still be the old default")
        OnnxSquareClassifier.open(stagedAsset(tmp), RecordingLog()).use { cnn ->
            val error = assertThrows<IllegalArgumentException> { cnn.classify(unwired) }
            assertTrue(
                error.message!!.contains("expected ${SHIPPED_INPUT_SIZE}x$SHIPPED_INPUT_SIZE"),
                "the refusal must name the size the model wants, got: ${error.message}",
            )
        }
    }

    companion object {
        /** JUnit's `@EnabledIf` resolves a METHOD reference; the natives live in another module. */
        @JvmStatic
        fun openCvAvailable(): Boolean = runCatching { Loader.load(opencv_java::class.java) }.isSuccess
    }
}

private const val OPENCV_GATE = "com.chesslab.tracker.cnn.ModelSpecCropSeamTest#openCvAvailable"

/** Interleaved BGR. */
private const val CHANNELS = 3

private const val TOLERANCE = 1e-4f

private const val FRAME_SIDE = 640

/** The board's inset in [syntheticFrame], so every edge square has real content around it. */
private const val BOARD_INSET = 40.0

/** `[a8, h8, h1, a1]` in source pixels — the only corner order this codebase has. */
private val CORNERS: List<DoubleArray> =
    listOf(
        doubleArrayOf(BOARD_INSET, BOARD_INSET),
        doubleArrayOf(FRAME_SIDE - BOARD_INSET, BOARD_INSET),
        doubleArrayOf(FRAME_SIDE - BOARD_INSET, FRAME_SIDE - BOARD_INSET),
        doubleArrayOf(BOARD_INSET, FRAME_SIDE - BOARD_INSET),
    )

/** The committed asset's `config.json`, through the one Kotlin reader. */
private fun shippedSpec(): ModelSpec = ModelSpec.parse(File(assetDir(), MODEL_CONFIG_FILE).readText())

/** The committed asset staged into a real directory, exactly as `CnnObserver.attach` gets it. */
private fun stagedAsset(dir: File): StagedModel =
    CnnModelAssets({ name -> File(assetDir(), name).takeIf { it.isFile }?.inputStream() }, dir).stage()

/**
 * A calibrated board geometry. `boardSize` is the board's OWN pixel size, measured from the corner
 * quad on the device (`CalibrationStore.measuredBoardSize`, clamped to 320..1280) — never the model's
 * business, and untouched by [withCropSizeOf]. 640 keeps it inside the synthetic frame.
 */
private fun liveGeometry(): BoardGeometry = BoardGeometry(boardSize = 640)

/**
 * The 64 crops exactly as the CNN observer receives them: the bordered crop warp goes into
 * [CropFrameStore] on the analyzer thread and `cropFrameSource` cuts it with the live geometry.
 */
private fun cropsAsHandedToTheClassifier(geom: BoardGeometry): List<BgrImage> {
    val store = CropFrameStore()
    val frame = syntheticFrame()
    val warp = warpBoardForCrops(frame, geom, CORNERS)
    frame.release()
    store.update(CropFrameStore.Pending(warp, 7L, 11L, BgrImage(2, 2, ByteArray(12)), GrayImage(2, 2, ByteArray(4))))
    return requireNotNull(cropFrameSource(store) { geom }.take()) { "the store held a pending warp" }.crops
}

/**
 * A frame whose every pixel is distinct in at least one channel: high-frequency in B and G so any
 * change of scale shows up, plus a per-cell R so a transposed crop cannot pass either.
 */
private fun syntheticFrame(): Mat {
    val data = ByteArray(FRAME_SIDE * FRAME_SIDE * CHANNELS)
    var i = 0
    for (y in 0 until FRAME_SIDE) {
        for (x in 0 until FRAME_SIDE) {
            data[i] = (x * 7 % 251).toByte()
            data[i + 1] = (y * 11 % 241).toByte()
            data[i + 2] = ((x / 70 * 8 + y / 70) * 3).toByte()
            i += CHANNELS
        }
    }
    val frame = Mat(FRAME_SIDE, FRAME_SIDE, CvType.CV_8UC3)
    frame.put(0, 0, data)
    return frame
}
