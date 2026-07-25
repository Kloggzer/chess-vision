package com.chesslab.tracker.service

import com.chesslab.engine.api.BgrImage
import com.chesslab.tracker.cnn.CnnFrame
import com.chesslab.tracker.cnn.CnnFrameSource

/**
 * The 64 crops of one glance, exactly as they were handed to the model.
 *
 * Phase 09 compares this grid against Python's `GET /crops.jpg` on the same physical position, so
 * it MUST stay the inference path's own pixels — a re-render from the detection warp would compare
 * two things neither of which the model ever saw.
 */
class DebugCrops(
    val crops: List<BgrImage>,
    val seq: Long,
    val tsMs: Long,
)

/**
 * Keeps the last observation's crops for the debug screen, and nothing else.
 *
 * It wraps the crop source rather than the classifier, so it sees exactly the list `classify` is
 * about to consume, and it runs on the OBSERVER thread — the analyzer's 15 fps budget never pays
 * for it. While the debug screen is closed the whole cost is one volatile read per observation
 * (about one per second), and no reference is retained.
 */
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

/**
 * What the ONNX runtime actually chose, as opposed to what the EP chain asked for.
 *
 * MEMORY `android-live-bringup-2607`: the attach failed silently and the tracker ran diff-only for
 * a whole session. A quiet fall-through from the NPU to the CPU is the same failure one rung
 * softer — same fps, ten times the latency — so both ends of the chain are rendered.
 */
data class CnnRuntimeInfo(
    val requestedEp: String?,
    val actualEp: String?,
    val model: String?,
    val inputShape: String?,
    val lastRunMs: Double,
    val observations: Long,
)

/** Filled by the service at attach time; polled by the debug screen. Never on a hot path. */
class CnnRuntimeProbe {
    @Volatile
    var requestedEp: String? = null

    @Volatile
    var actualEp: String? = null

    @Volatile
    var model: String? = null

    @Volatile
    var inputShape: String? = null

    /** Pure session time of the last batch — `CnnSnapshot.inferMs` also counts preprocessing. */
    @Volatile
    var lastRunMs: () -> Double = { 0.0 }

    @Volatile
    var observations: Long = 0

    fun info(): CnnRuntimeInfo = CnnRuntimeInfo(requestedEp, actualEp, model, inputShape, lastRunMs(), observations)
}
