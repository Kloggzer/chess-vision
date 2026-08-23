package com.chesslab.tracker.geometry

import com.chesslab.cnn.PIECES13_CLASSES
import com.chesslab.cnn.preprocessInto
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.allSquares
import com.chesslab.geometry.margins4
import com.chesslab.geometry.warpBoardForCrops
import com.chesslab.tracker.cnn.ModelSpec
import com.chesslab.tracker.pipeline.CropFrameStore
import com.chesslab.tracker.service.cropFrameSource
import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.CvType
import org.opencv.core.Mat

/**
 * specs/23 phase 01 and specs/45 — the crop a model declares reaches the pixels the classifier is
 * handed: its SIZE, and since specs/45 its BOX.
 *
 * The crops are taken through the REAL observer path (`cropFrameSource`, the adapter the CNN
 * observer pulls from), because the claim being tested is about the crops `classify` consumes and
 * not about an arithmetic identity. The tests that need pixels therefore need the OpenCV natives
 * and are gated on them; the ones that do not, run everywhere.
 */
class ModelCropTest {
    @Test
    fun `no model loaded keeps the 128 defaults`() {
        val geom = BoardGeometry()
        // Not "happens to be 128": the geometry is returned untouched, which is what makes
        // calibration-before-a-classifier impossible to regress.
        assertEquals(geom, geom.withCropOf(null))
        assertEquals(128, geom.withCropOf(null).outW)
        assertEquals(128, geom.withCropOf(null).outH)
        // The same for a geometry that came off a stored profile, which is the real startup path.
        val stored = profile().geometry()
        assertEquals(stored, stored.withCropOf(null))
        assertEquals(128, stored.withCropOf(null).outW)
    }

    @Test
    fun `the board stays the board when a model declares only its size`() {
        val geom =
            BoardGeometry(
                boardSize = 800,
                margin = margins4(DEFAULT_MARKER_MARGIN),
                whitePov = false,
                padUp = 0.25,
                padSide = 0.05,
            )
        // A model that declares no crop moves nothing but the size its box is scaled to — and
        // `boardSize`/`margin`/`whitePov` are never the model's, whatever it declares.
        assertEquals(geom.copy(outW = 96, outH = 96), geom.withCropOf(spec(96)))
    }

    @Test
    fun `a declared crop is honoured, and the board is still the board`() {
        val geom = BoardGeometry(boardSize = 800, margin = margins4(DEFAULT_MARKER_MARGIN), padSide = 0.10)
        val cropped = geom.withCropOf(spec(96, padSide = 0.05, padUp = 0.25))
        assertEquals(geom.copy(outW = 96, outH = 96, padSide = 0.05, padUp = 0.25), cropped)
    }

    @Test
    fun `a model that declares no crop keeps the profile pads and says so`() {
        val geom = BoardGeometry(boardSize = 800, padSide = 0.10, padUp = 0.0)
        val legacy = geom.withCropOf(spec(96))
        // Kept, not defaulted: the profile's box is the only one anybody here knows about.
        assertEquals(0.10, legacy.padSide)
        assertEquals(0.0, legacy.padUp)
        // …and never silently. This string is what the run header and the debug panel show.
        assertTrue(cropLine(spec(96), legacy).contains("LEGACY"), cropLine(spec(96), legacy))
        assertTrue(cropLine(spec(96), legacy).contains("side=0.100"), cropLine(spec(96), legacy))
        // No model at all is legacy too — nothing chose these pads either.
        assertTrue(cropLine(null, geom).contains("LEGACY"))

        val declaring = spec(96, padSide = 0.05, padUp = 0.0)
        assertEquals("side=0.050 up=0.000", cropLine(declaring, geom.withCropOf(declaring)))
    }

    @Test
    fun `half a crop declaration is refused`() {
        // Filling the missing half from the profile would compose a box nobody chose.
        assertThrows<IllegalArgumentException> {
            ModelSpec.parse("""{"classes":$CLASSES_JSON,"out_size":[128,128],"pad_side":0.05}""")
        }
    }

    @Test
    fun `infer_size wins over out_size on the way to the geometry`() {
        // specs/22's contract, seen from the geometry: `out_size` is what the crops on disk were
        // built at, `infer_size` is what the graph takes — and the crops must follow the graph.
        assertEquals(96, BoardGeometry().withCropOf(spec(96)).outW)
    }

    @Test
    @EnabledIf(OPENCV_GATE)
    fun `a 96 px spec produces 96 px crops the classifier accepts`() {
        val crops = cropsAsHandedToTheClassifier(BoardGeometry(boardSize = BOARD_SIZE).withCropOf(spec(96)))
        assertEquals(allSquares().size, crops.size)
        for ((index, crop) in crops.withIndex()) {
            assertEquals(96, crop.width, "crop $index (${allSquares()[index]}) width")
            assertEquals(96, crop.height, "crop $index (${allSquares()[index]}) height")
        }
        // `preprocessInto` does not resize — it REQUIRES `crop.width == outW`. Running it is what
        // proves the requirement is satisfied rather than merely not triggered: before this wiring
        // the same call threw "crop 0 is 128x128, expected 96x96" on the first observation.
        val tensor = FloatArray(crops.size * CHANNELS * 96 * 96)
        preprocessInto(crops, 96, 96, tensor)
        assertTrue(tensor.any { it != 0.0f }, "the tensor must carry the crops, not zeros")
    }

    @Test
    @EnabledIf(OPENCV_GATE)
    fun `a 128 px spec is byte for byte what the hard coded path produced`() {
        // THE no-behavioural-delta proof. The bundled asset declares `infer_size: [128, 128]`, so
        // the wired path has to produce the very pixels the hard-coded 128 produced — same frame,
        // same corners, same geometry, only the size now arriving from the model.
        val hardCoded = cropsAsHandedToTheClassifier(BoardGeometry(boardSize = BOARD_SIZE))
        val wired = cropsAsHandedToTheClassifier(BoardGeometry(boardSize = BOARD_SIZE).withCropOf(spec(128)))
        assertEquals(hardCoded.size, wired.size)
        // Not vacuous: the reference crops carry real, varying pixels, so an equal comparison is a
        // statement about content and not about two empty buffers.
        assertEquals(128 * 128 * CHANNELS, hardCoded[0].data.size)
        assertTrue(hardCoded[0].data.any { it != hardCoded[0].data[0] }, "the reference crops must carry real pixels")
        for ((index, square) in allSquares().withIndex()) {
            assertEquals(128, wired[index].width, "crop $index ($square) width")
            assertEquals(hardCoded[index].width, wired[index].width, "crop $index ($square) width")
            assertEquals(hardCoded[index].height, wired[index].height, "crop $index ($square) height")
            assertTrue(hardCoded[index].data.contentEquals(wired[index].data), "crop $index ($square) differs byte-wise")
        }
    }

    @Test
    @EnabledIf(OPENCV_GATE)
    fun `with no model attached the crops are still 128`() {
        val crops = cropsAsHandedToTheClassifier(BoardGeometry(boardSize = BOARD_SIZE).withCropOf(null))
        assertEquals(allSquares().size, crops.size)
        for ((index, crop) in crops.withIndex()) assertEquals(128, crop.width, "crop $index width")
    }

    /**
     * The 64 crops exactly as the CNN observer receives them: the bordered crop warp goes into
     * `CropFrameStore` on the analyzer thread and `cropFrameSource` cuts it with the live geometry.
     */
    private fun cropsAsHandedToTheClassifier(geom: BoardGeometry): List<BgrImage> {
        val store = CropFrameStore()
        val frame = syntheticFrame()
        val warp = warpBoardForCrops(frame, geom, CORNERS)
        frame.release()
        store.update(CropFrameStore.Pending(warp, 7L, 11L, BgrImage(2, 2, ByteArray(12)), GrayImage(2, 2, ByteArray(4))))
        return requireNotNull(cropFrameSource(store) { geom }.take()) { "the store held a pending warp" }.crops
    }

    companion object {
        /**
         * JUnit's `@EnabledIf` resolves a METHOD reference, exactly as `:core-geometry`'s tier-C
         * gate does (`OpenCvNatives`, which lives in another module's test source set and cannot be
         * seen from here).
         */
        @JvmStatic
        fun openCvAvailable(): Boolean = runCatching { Loader.load(opencv_java::class.java) }.isSuccess
    }
}

private const val OPENCV_GATE = "com.chesslab.tracker.geometry.ModelCropTest#openCvAvailable"

/** Interleaved BGR. */
private const val CHANNELS = 3

private const val FRAME_SIDE = 640
private const val BOARD_SIZE = 640

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

/** The shipped 13-class identity order — `ModelSpec.parse` refuses any other list. */
private val CLASSES_JSON = PIECES13_CLASSES.joinToString(",", "[", "]") { "\"$it\"" }

/** A run's `config.json`, reduced to what `ModelSpec.parse` reads — the one Kotlin reader. */
private fun spec(
    inferSize: Int,
    padSide: Double? = null,
    padUp: Double? = null,
): ModelSpec {
    val crop = if (padSide == null || padUp == null) "" else ""","pad_side":$padSide,"pad_up":$padUp"""
    return ModelSpec.parse(
        """{"classes":$CLASSES_JSON,"out_size":[128,128],"infer_size":[$inferSize,$inferSize]$crop}""",
    )
}

private fun profile(): CalibrationProfile =
    CalibrationProfile(
        name = "test",
        sourceWidth = FRAME_SIDE,
        sourceHeight = FRAME_SIDE,
        corners = floatArrayOf(40f, 40f, 600f, 40f, 600f, 600f, 40f, 600f),
    )

/**
 * A frame whose every pixel is distinct in at least one channel: high-frequency in B and G so any
 * change of scale or offset in the resample shows up byte-wise, plus a per-cell R so a transposed
 * crop cannot pass either.
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
