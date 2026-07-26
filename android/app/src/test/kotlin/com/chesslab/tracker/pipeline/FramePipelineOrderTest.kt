package com.chesslab.tracker.pipeline

import android.graphics.Rect
import android.media.Image
import androidx.camera.core.ImageInfo
import androidx.camera.core.ImageProxy
import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertInstanceOf
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** The per-frame ORDER of `tracker.py::_loop`, with the OpenCV stages faked out. */
class FramePipelineOrderTest {
    private val stages = FakeStages()
    private val store = CropFrameStore()
    private val pipeline =
        FramePipeline(TrackerConfig(), stages, store, FrameSizeGuard(), StageTimings(nowNs = { 0L }, logLine = {})).apply {
            corners = floatArrayOf(0f, 0f, 100f, 0f, 100f, 100f, 0f, 100f)
        }

    @Test
    fun `a dark frame skips detection and sets the note`() {
        stages.luma = 12.0
        val result = pipeline.onFrame(FakeImage(), 1_000L)
        val note = assertInstanceOf(FrameResult.Skipped::class.java, result).note
        assertTrue(note.startsWith("frame too dark (12 < 18.0)"), note)
    }

    /**
     * The gate reads `lumaPreClahe`, and `grayDet` (where CLAHE lives) never runs on a dark
     * frame — so a CLAHE that brightens near-black noise cannot lift a frame through the gate.
     */
    @Test
    fun `the luma is measured before clahe`() {
        stages.luma = 12.0
        stages.grayBrightness = 200.0
        pipeline.onFrame(FakeImage(), 1_000L)
        assertEquals(0, stages.grayCalls)
    }

    @Test
    fun `a missing warp emits waiting for markers and no frame input`() {
        stages.warpOk = false
        assertEquals(NOTE_WAITING_MARKERS, skipNote(pipeline.onFrame(FakeImage(), 1_000L)))
        pipeline.corners = null
        assertEquals(NOTE_WAITING_MARKERS, skipNote(pipeline.onFrame(FakeImage(), 1_000L)))
    }

    @Test
    fun `seq increments only for emitted frames`() {
        stages.luma = 12.0
        pipeline.onFrame(FakeImage(), 1_000L)
        pipeline.onFrame(FakeImage(), 1_100L)
        stages.luma = 90.0
        val first = ready(pipeline.onFrame(FakeImage(), 1_200L))
        val second = ready(pipeline.onFrame(FakeImage(), 1_300L))
        assertEquals(1L, first.seq)
        assertEquals(2L, second.seq)
        assertEquals(90.0, first.lumaPreClahe)
        assertEquals(1_200L, first.timestampMs)
    }

    @Test
    fun `the crop warp runs only when the store asks`() {
        repeat(30) { frame ->
            if (frame % 10 == 0) store.request()
            pipeline.onFrame(FakeImage(), 1_000L + frame)
        }
        assertEquals(3, stages.cropWarps)
        // The crop frame carries the seq of the frame it was warped from (Spec 11 pairing).
        assertEquals(listOf(1L, 11L, 21L), stages.cropSeqs)
    }

    @Test
    fun `every emitted frame carries the roi motion and the grid coverage`() {
        stages.motion = 1.75
        stages.coverage = 0.5
        val input = ready(pipeline.onFrame(FakeImage(), 1_000L))
        assertEquals(1.75, input.motionRoiScore)
        assertEquals(0.5, input.gridLineCoverage)
        assertEquals(1, stages.convertCalls)
        assertEquals(1, stages.gridCalls)
    }

    /**
     * A disabled gate (`minGridLineCoverage <= 0`, which several parity clips run) makes the
     * engine return before it reads the value, so the Canny pass behind [FrameStages.gridCoverage]
     * must not run at all.
     */
    @Test
    fun `a disabled grid gate skips the canny pass`() {
        stages.coverage = 0.1
        pipeline.onConfigChanged(TrackerConfig(minGridLineCoverage = 0.0))
        val input = ready(pipeline.onFrame(FakeImage(), 1_000L))
        assertEquals(0, stages.gridCalls)
        assertEquals(GRID_GATE_OFF, input.gridLineCoverage)
    }

    private fun skipNote(result: FrameResult) = assertInstanceOf(FrameResult.Skipped::class.java, result).note

    private fun ready(result: FrameResult) = assertInstanceOf(FrameResult.Ready::class.java, result).input
}

private class FakeStages : FrameStages {
    var warpOk = true
    var luma = 90.0
    var grayBrightness = 0.0
    var motion = 0.0
    var coverage = 1.0
    var convertCalls = 0
    var publishCalls = 0
    var boardPublishCalls = 0
    var grayCalls = 0
    var gridCalls = 0
    var cropWarps = 0
    val cropSeqs = mutableListOf<Long>()

    override fun convert(image: ImageProxy) {
        convertCalls += 1
    }

    override fun publishFrame() {
        publishCalls += 1
    }

    override fun publishBoard() {
        boardPublishCalls += 1
    }

    override fun warpDetection(corners: FloatArray): Boolean = warpOk

    override fun lumaPreClahe(): Double = luma

    override fun grayDet(): GrayImage {
        grayCalls += 1
        return GrayImage(2, 2, ByteArray(4) { grayBrightness.toInt().toByte() })
    }

    override fun bgrDet(): BgrImage = BgrImage(2, 2, ByteArray(12))

    override fun gridCoverage(): Double {
        gridCalls += 1
        return coverage
    }

    override fun roiMotion(corners: FloatArray): Double = motion

    override fun updateCropFrame(
        corners: FloatArray,
        seq: Long,
        tsMs: Long,
        bgr: BgrImage,
        gray: GrayImage,
    ) {
        cropWarps += 1
        cropSeqs += seq
    }

    override fun onConfigChanged(config: TrackerConfig) = Unit

    override fun onGeometryChanged(geometry: BoardGeometry) = Unit

    override fun close() = Unit
}

/** Only `width`/`height` are read by the pipeline; the rest of the interface is unreachable. */
private class FakeImage : ImageProxy {
    override fun close() = Unit

    override fun getCropRect(): Rect = unsupported()

    override fun setCropRect(rect: Rect?) = unsupported()

    override fun getFormat(): Int = 35

    override fun getHeight(): Int = 720

    override fun getWidth(): Int = 1280

    override fun getPlanes(): Array<ImageProxy.PlaneProxy> = emptyArray()

    override fun getImageInfo(): ImageInfo = unsupported()

    override fun getImage(): Image? = null

    private fun unsupported(): Nothing = throw UnsupportedOperationException("not used by FramePipeline")
}
