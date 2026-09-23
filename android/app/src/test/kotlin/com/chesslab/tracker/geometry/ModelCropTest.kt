package com.chesslab.tracker.geometry

import com.chesslab.cnn.PIECES13_CLASSES
import com.chesslab.cnn.preprocessInto
import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.allSquares
import com.chesslab.geometry.margins4
import com.chesslab.tracker.OpenCvGate
import com.chesslab.tracker.cnn.ModelSpec
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf

/** The crop a model declares (size and box) reaches the pixels, through the REAL observer path. */
class ModelCropTest {
    @Test
    fun `no model loaded keeps the 128 defaults`() {
        val geom = BoardGeometry()
        // Untouched, so calibration-before-a-classifier cannot regress.
        assertEquals(geom, geom.withCropOf(null))
        assertEquals(128, geom.withCropOf(null).outW)
        assertEquals(128, geom.withCropOf(null).outH)
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
                padSide = 0.05,
            )
        assertEquals(geom.copy(outW = 96, outH = 96), geom.withCropOf(spec(96)))
    }

    @Test
    fun `a declared crop is honoured, and the board is still the board`() {
        val geom = BoardGeometry(boardSize = 800, margin = margins4(DEFAULT_MARKER_MARGIN), padSide = 0.10)
        val cropped = geom.withCropOf(spec(96, padSide = 0.05))
        assertEquals(geom.copy(outW = 96, outH = 96, padSide = 0.05), cropped)
    }

    @Test
    fun `a model that declares no crop keeps the profile pads and says so`() {
        val geom = BoardGeometry(boardSize = 800, padSide = 0.10)
        val legacy = geom.withCropOf(spec(96))
        assertEquals(0.10, legacy.padSide)
        assertTrue(cropLine(spec(96), legacy).contains("LEGACY"), cropLine(spec(96), legacy))
        assertTrue(cropLine(spec(96), legacy).contains("side=0.100"), cropLine(spec(96), legacy))
        assertTrue(cropLine(null, geom).contains("LEGACY"))

        val declaring = spec(96, padSide = 0.05)
        assertEquals("side=0.050", cropLine(declaring, geom.withCropOf(declaring)))
    }

    @Test
    @EnabledIf(OpenCvGate.REF)
    fun `a 96 px spec produces 96 px crops the classifier accepts`() {
        val crops = cropsAsHandedToTheClassifier(BoardGeometry(boardSize = BOARD_SIZE).withCropOf(spec(96)))
        assertEquals(allSquares().size, crops.size)
        for ((index, crop) in crops.withIndex()) {
            assertEquals(96, crop.width, "crop $index (${allSquares()[index]}) width")
            assertEquals(96, crop.height, "crop $index (${allSquares()[index]}) height")
        }
        // `preprocessInto` REQUIRES `crop.width == outW`; before this wiring the first observation threw.
        val tensor = FloatArray(crops.size * CHANNELS * 96 * 96)
        preprocessInto(crops, 96, 96, tensor)
        assertTrue(tensor.any { it != 0.0f }, "the tensor must carry the crops, not zeros")
    }

    /** THE no-behavioural-delta proof: a declared 128 cuts the very pixels the hard-coded 128 cut. */
    @Test
    @EnabledIf(OpenCvGate.REF)
    fun `a 128 px spec is byte for byte what the hard coded path produced`() {
        val hardCoded = cropsAsHandedToTheClassifier(BoardGeometry(boardSize = BOARD_SIZE))
        val wired = cropsAsHandedToTheClassifier(BoardGeometry(boardSize = BOARD_SIZE).withCropOf(spec(128)))
        assertEquals(hardCoded.size, wired.size)
        assertEquals(128 * 128 * CHANNELS, hardCoded[0].data.size)
        assertTrue(hardCoded[0].data.any { it != hardCoded[0].data[0] }, "the reference crops must carry real pixels")
        for ((index, square) in allSquares().withIndex()) {
            assertEquals(128, wired[index].width, "crop $index ($square) width")
            assertEquals(hardCoded[index].width, wired[index].width, "crop $index ($square) width")
            assertEquals(hardCoded[index].height, wired[index].height, "crop $index ($square) height")
            assertTrue(hardCoded[index].data.contentEquals(wired[index].data), "crop $index ($square) differs byte-wise")
        }
    }
}

private const val CHANNELS = 3
private const val BOARD_SIZE = SYNTHETIC_FRAME_SIDE

private val CLASSES_JSON = PIECES13_CLASSES.joinToString(",", "[", "]") { "\"$it\"" }

private fun spec(
    inferSize: Int,
    padSide: Double? = null,
): ModelSpec {
    val crop = padSide?.let { ""","pad_side":$it""" }.orEmpty()
    return ModelSpec.parse(
        """{"classes":$CLASSES_JSON,"out_size":[128,128],"infer_size":[$inferSize,$inferSize]$crop}""",
    )
}

private fun profile(): CalibrationProfile =
    CalibrationProfile(
        name = "test",
        sourceWidth = SYNTHETIC_FRAME_SIDE,
        sourceHeight = SYNTHETIC_FRAME_SIDE,
        corners = floatArrayOf(40f, 40f, 600f, 40f, 600f, 600f, 40f, 600f),
    )
