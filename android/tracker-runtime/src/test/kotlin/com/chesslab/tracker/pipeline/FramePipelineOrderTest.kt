package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.FrameReads
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.geometry.BoardGeometry
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertInstanceOf
import org.junit.jupiter.api.Assertions.assertSame
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
        val result = pipeline.onFrame(FakeImage(), 1280, 720, 1_000L)
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
        pipeline.onFrame(FakeImage(), 1280, 720, 1_000L)
        assertEquals(0, stages.grayCalls)
    }

    @Test
    fun `a missing warp emits waiting for markers and no frame input`() {
        stages.warpOk = false
        assertEquals(NOTE_WAITING_MARKERS, skipNote(pipeline.onFrame(FakeImage(), 1280, 720, 1_000L)))
        pipeline.corners = null
        assertEquals(NOTE_WAITING_MARKERS, skipNote(pipeline.onFrame(FakeImage(), 1280, 720, 1_000L)))
    }

    @Test
    fun `seq increments only for emitted frames`() {
        stages.luma = 12.0
        pipeline.onFrame(FakeImage(), 1280, 720, 1_000L)
        pipeline.onFrame(FakeImage(), 1280, 720, 1_100L)
        stages.luma = 90.0
        val first = ready(pipeline.onFrame(FakeImage(), 1280, 720, 1_200L))
        val second = ready(pipeline.onFrame(FakeImage(), 1280, 720, 1_300L))
        assertEquals(1L, first.seq)
        assertEquals(2L, second.seq)
        assertEquals(90.0, first.lumaPreClahe)
        assertEquals(1_200L, first.timestampMs)
    }

    @Test
    fun `the crop warp runs only when the store asks`() {
        repeat(30) { frame ->
            if (frame % 10 == 0) store.request()
            pipeline.onFrame(FakeImage(), 1280, 720, 1_000L + frame)
        }
        assertEquals(3, stages.cropWarps)
        // The crop frame carries the seq of the frame it was warped from (Spec 11 pairing).
        assertEquals(listOf(1L, 11L, 21L), stages.cropSeqs)
    }

    @Test
    fun `every emitted frame carries the roi motion and the grid coverage`() {
        stages.motion = 1.75
        stages.coverage = 0.5
        val input = ready(pipeline.onFrame(FakeImage(), 1280, 720, 1_000L))
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
        val input = ready(pipeline.onFrame(FakeImage(), 1280, 720, 1_000L))
        assertEquals(0, stages.gridCalls)
        assertEquals(GRID_GATE_OFF, input.gridLineCoverage)
    }

    /**
     * The stillness and changeset engines read neither number — they measure the board on their
     * own 160 warp — so neither stage may run. The grid pass is the one that pays for this: a
     * Canny over the whole detection plane, 7-20 ms per frame on the phone.
     */
    @Test
    fun `an engine that reads neither takes neither measurement`() {
        stages.motion = 1.75
        stages.coverage = 0.5
        pipeline.reads = FrameReads(gridCoverage = false, roiMotion = false)
        val input = ready(pipeline.onFrame(FakeImage(), 1280, 720, 1_000L))
        assertEquals(0, stages.gridCalls)
        assertEquals(0, stages.motionCalls)
        assertEquals(GRID_GATE_OFF, input.gridLineCoverage)
        assertEquals(MOTION_UNREAD, input.motionRoiScore)
    }

    /** The default is the diff engine's appetite: nothing is skipped unless an engine says so. */
    @Test
    fun `the default reads everything`() {
        pipeline.onFrame(FakeImage(), 1280, 720, 1_000L)
        assertEquals(1, stages.gridCalls)
        assertEquals(1, stages.motionCalls)
    }

    /**
     * The lens sits between the convert and the publish, and that placement IS the design.
     *
     * `publishFrame` feeds `CameraFrameBus`, and through it `latestCalibrationFrame()` — which is
     * what ArUco re-detection and the once-per-pose grid fit read. A lens applied after it would
     * correct the pixels the warps sample and leave the pixels the board geometry is measured from
     * uncorrected, which is a split coordinate space wearing the costume of a working feature.
     */
    @Test
    fun `the lens runs after the convert and before anything reads the frame`() {
        pipeline.onFrame(FakeImage(), 1280, 720, 1_000L)
        assertEquals(listOf("convert", "undistort", "publishFrame", "warpDetection"), stages.calls.take(4))
    }

    /**
     * LiveAlign writes `corners` from its own thread, so a frame warped with A must not be
     * reported with B: the engine would tag a reference built from A with B and `cornersJumped`
     * would never see the swap.
     */
    @Test
    fun `the emitted corners are the ones the warp used`() {
        val swapped = floatArrayOf(9f, 9f, 90f, 9f, 90f, 90f, 9f, 90f)
        stages.onWarp = { pipeline.corners = swapped }
        val input = ready(pipeline.onFrame(FakeImage(), 1280, 720, 1_000L))
        assertSame(stages.warpCorners, input.corners)
    }

    /** Same on the dark-frame exit: the gate must judge corrected pixels, not raw ones. */
    @Test
    fun `a dark frame still went through the lens`() {
        stages.luma = 12.0
        pipeline.onFrame(FakeImage(), 1280, 720, 1_000L)
        assertTrue(stages.calls.indexOf("undistort") < stages.calls.indexOf("lumaPreClahe"), "${stages.calls}")
    }

    private fun skipNote(result: FrameResult) = assertInstanceOf(FrameResult.Skipped::class.java, result).note

    private fun ready(result: FrameResult) = assertInstanceOf(FrameResult.Ready::class.java, result).input
}

private class FakeStages : FrameStages<FakeImage> {
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
    var motionCalls = 0
    var cropWarps = 0
    val cropSeqs = mutableListOf<Long>()
    var warpCorners: FloatArray? = null
    var onWarp: (() -> Unit)? = null

    /** Every stage in the order it was called: what makes the ORDER itself assertable. */
    val calls = mutableListOf<String>()

    override fun convert(image: FakeImage) {
        calls += "convert"
        convertCalls += 1
    }

    override fun undistort(): Boolean {
        calls += "undistort"
        return true
    }

    override fun publishFrame() {
        calls += "publishFrame"
        publishCalls += 1
    }

    override fun publishBoard() {
        calls += "publishBoard"
        boardPublishCalls += 1
    }

    override fun warpDetection(corners: FloatArray): Boolean {
        calls += "warpDetection"
        warpCorners = corners
        onWarp?.invoke()
        return warpOk
    }

    override fun lumaPreClahe(): Double {
        calls += "lumaPreClahe"
        return luma
    }

    override fun grayDet(): GrayImage {
        grayCalls += 1
        return GrayImage(2, 2, ByteArray(4) { grayBrightness.toInt().toByte() })
    }

    override fun bgrDet(): BgrImage = BgrImage(2, 2, ByteArray(12))

    override fun gridCoverage(): Double {
        gridCalls += 1
        return coverage
    }

    override fun roiMotion(corners: FloatArray): Double {
        motionCalls += 1
        return motion
    }

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

/**
 * A frame is whatever the host says it is. This used to be a 20-method `ImageProxy` stub whose only
 * reachable members were `width` and `height` — the pipeline never touched the rest, and now cannot
 * even name it. The delivered size travels beside the frame instead.
 */
private class FakeImage
