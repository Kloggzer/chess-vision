package com.chesslab.tracker.service

import com.chesslab.engine.api.BgrImage
import com.chesslab.tracker.cnn.CnnFrame
import com.chesslab.tracker.cnn.CnnFrameSource

/** The inference path's own pixels: a re-render from the detection warp would compare two things the model
 *  never saw. */
class DebugCrops(
    val crops: List<BgrImage>,
    val seq: Long,
    val tsMs: Long,
)

/** Wraps the crop source, on the OBSERVER thread. Closed screen: one volatile read per observation. */
class DebugCropTap(
    private val delegate: CnnFrameSource,
) : CnnFrameSource {
    @Volatile
    var enabled: Boolean = false
        set(value) {
            field = value
            if (!value) latest = null
        }

    @Volatile
    var latest: DebugCrops? = null
        private set

    override fun take(): CnnFrame? {
        val frame = delegate.take()
        if (frame != null && enabled) latest = DebugCrops(frame.crops, frame.seq, frame.tsMs)
        return frame
    }
}

/** A quiet NPU-to-CPU fall-through is same fps, ten times the latency, so both ends of the chain are rendered. */
data class CnnRuntimeInfo(
    val requestedEp: String?,
    val actualEp: String?,
    /** The directory really staged, not the request. */
    val modelDir: String?,
    val model: String?,
    val inputShape: String?,
    /** A model declaring no crop is served the profile's pads, a picture nobody chose. */
    val crop: String?,
    val lastRunMs: Double,
    val observations: Long,
)

/** Never on a hot path. */
class CnnRuntimeProbe {
    @Volatile
    var requestedEp: String? = null

    @Volatile
    var actualEp: String? = null

    /** A comparison of bundled models nobody can attribute is not one. */
    @Volatile
    var modelDir: String? = null

    @Volatile
    var model: String? = null

    @Volatile
    var inputShape: String? = null

    /** Pulled: the geometry moves with every calibration. */
    @Volatile
    var crop: () -> String? = { null }

    /** `CnnSnapshot.inferMs` also counts preprocessing. */
    @Volatile
    var lastRunMs: () -> Double = { 0.0 }

    /** Pulled: the counter belongs to the stack, and a restart restarts it. */
    @Volatile
    var observations: () -> Long = { 0L }

    fun info(): CnnRuntimeInfo = CnnRuntimeInfo(requestedEp, actualEp, modelDir, model, inputShape, crop(), lastRunMs(), observations())
}
