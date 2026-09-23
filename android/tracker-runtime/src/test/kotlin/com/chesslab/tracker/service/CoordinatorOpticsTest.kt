package com.chesslab.tracker.service

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.camera.BoardExposureGovernor
import com.chesslab.tracker.camera.CameraAbilities
import com.chesslab.tracker.camera.CameraHealth
import com.chesslab.tracker.camera.DeliveredSize
import com.chesslab.tracker.camera.ExposureGovernor
import com.chesslab.tracker.camera.ExposureRange
import com.chesslab.tracker.camera.FakeLookPort
import com.chesslab.tracker.camera.FocusGovernor
import com.chesslab.tracker.camera.FocusRegion
import com.chesslab.tracker.cnn.CnnObserver
import com.chesslab.tracker.pipeline.CropFrameStore
import com.chesslab.tracker.pipeline.FramePipeline
import com.chesslab.tracker.pipeline.FrameSizeGuard
import com.chesslab.tracker.pipeline.FrameStages
import com.chesslab.tracker.pipeline.StageTimings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test

private val FRAME = DeliveredSize(width = 1920, height = 1080, rotationDegrees = 0)

private val BOARD_QUAD = floatArrayOf(600f, 300f, 1500f, 300f, 1500f, 900f, 600f, 900f)

/** The detection warp's size, NOT the frame's. */
private const val DET_SIDE = 464

private val CONFIG = TrackerConfig(liveAlign = false)

class CoordinatorOpticsTest {
    /** The autofocus meters in normalised FRAME coordinates, not the warp's. */
    @Test
    fun theFocusRegionIsNormalisedAgainstTheDeliveredFrame() {
        Harness().use { harness ->
            harness.frame()

            val region = requireNotNull(harness.focus.seen) { "the focus governor must be offered a region" }
            assertEquals(1050f / FRAME.width, region.cx, TOLERANCE, why("cx", region))
            assertEquals(600f / FRAME.height, region.cy, TOLERANCE, why("cy", region))
            assertEquals(600f / FRAME.height, region.size, TOLERANCE, why("size", region))
        }
    }

    /** `!sweeping && exposure.onBoard(...)` short-circuited: a busy frame mid-sweep never armed the hold. */
    @Test
    fun aBusyFrameDuringAFocusSweepStillHoldsTheExposureOff() {
        val port = FakeLookPort(CameraAbilities(exposure = ExposureRange(-24..24, 1f / 6f)))
        Harness(exposure = BoardExposureGovernor(port, everyFrames = 1, holdFrames = HOLD_FRAMES)).use { harness ->
            harness.focus.sweepingNow = true
            harness.ops.events = listOf(TrackerEvent.Note("much change"))
            harness.frame()

            harness.focus.sweepingNow = false
            harness.ops.events = emptyList()
            harness.frame()

            assertEquals(
                0,
                port.sets,
                "the exposure regulated one frame after a busy one: the sweep skipped the governor, " +
                    "so its ${HOLD_FRAMES}-frame hold was never armed",
            )
        }
    }

    private fun why(
        axis: String,
        region: FocusRegion,
    ): String =
        "$axis was normalised against the ${DET_SIDE}px detection warp, not the ${FRAME.width}x${FRAME.height} " +
            "frame — the autofocus is pointed at $region instead of the board"

    private companion object {
        const val TOLERANCE = 0.01f
        const val HOLD_FRAMES = 10L

        @JvmStatic
        @BeforeAll
        fun loadOpenCv() {
            Loader.load(opencv_java::class.java)
        }
    }
}

private class Harness(
    val focus: FakeFocus = FakeFocus(),
    exposure: ExposureGovernor = ExposureGovernor.NONE,
) : AutoCloseable {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Unconfined)
    private val timings = StageTimings(nowNs = { 0L }, logLine = {})
    private val geometry = BoardGeometry(boardSize = 1000, outW = 80, padSide = 0.05)
    private val pipeline = FramePipeline(CONFIG, FakeStages(), CropFrameStore(), FrameSizeGuard(), timings)

    val ops = RecordingOps()

    private val coordinator =
        TrackerCoordinator(
            pipeline,
            EngineHost(ops),
            StatusPublisher(scope, timings),
            CameraFrameBus(MutableStateFlow<CameraHealth>(CameraHealth.Up), scope, toPreview = { Unit }, publishPreviews = false),
            CnnObserver(source = { null }, fen = { null }, onSnapshot = {}, dispatcher = Dispatchers.Unconfined),
            LiveAlign(scope, { geometry }, { CONFIG }, {}),
            timings,
            { 0L },
            exposure,
            focus,
        )

    fun frame() {
        pipeline.corners = BOARD_QUAD
        coordinator.onFrame(FakeImage, FRAME)
    }

    override fun close() = scope.cancel()
}

private object FakeImage

private class FakeFocus : FocusGovernor {
    var sweepingNow = false
    var seen: FocusRegion? = null

    override val sweeping: Boolean get() = sweepingNow

    override fun onBoard(
        seq: Long,
        quiet: Boolean,
        region: FocusRegion?,
        board: () -> BgrImage?,
    ): Boolean {
        seen = region
        return false
    }
}

private const val DARK_LEVEL: Byte = 10

private fun darkBoard(side: Int) = BgrImage(side, side, ByteArray(side * side * 3) { DARK_LEVEL })

private class FakeStages : FrameStages<FakeImage> {
    override fun convert(image: FakeImage) = Unit

    override fun publishFrame() = Unit

    override fun publishBoard() = Unit

    override fun warpDetection(corners: FloatArray): Boolean = true

    override fun lumaPreClahe(): Double = 90.0

    override fun grayDet(): GrayImage = GrayImage(DET_SIDE, DET_SIDE, ByteArray(DET_SIDE * DET_SIDE))

    override fun bgrDet(): BgrImage = darkBoard(DET_SIDE)

    override fun boardAt(size: Int): BgrImage = darkBoard(size)

    override fun gridCoverage(): Double = 1.0

    override fun roiMotion(corners: FloatArray): Double = 0.0

    override fun updateCropFrame(
        corners: FloatArray,
        seq: Long,
        tsMs: Long,
        bgr: BgrImage,
        gray: GrayImage,
    ) = Unit

    override fun onConfigChanged(config: TrackerConfig) = Unit

    override fun onGeometryChanged(geometry: BoardGeometry) = Unit

    override fun close() = Unit
}
