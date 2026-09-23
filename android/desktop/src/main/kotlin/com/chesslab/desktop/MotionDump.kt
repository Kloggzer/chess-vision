package com.chesslab.desktop

import com.chesslab.tracker.pipeline.FrameStages
import org.opencv.core.Mat
import java.io.File
import java.io.Writer

/** Every emitted frame's ROI motion score. A PERCENT of strongly-changed pixels against the PREVIOUS frame:
 *  the threshold belongs in the valley between still board and hand. Frame-rate scaling: `docs/android-performance.md`. */
internal class MotionDump(
    private val inner: FrameStages<Mat>,
    private val out: Writer,
) : FrameStages<Mat> by inner {
    private var frame = 0L

    override fun roiMotion(corners: FloatArray): Double = inner.roiMotion(corners).also { out.write("${++frame},$it\n") }

    override fun close() {
        out.close()
        inner.close()
    }
}

internal fun motionDumped(
    stages: FrameStages<Mat>,
    path: String?,
): FrameStages<Mat> {
    val file = path ?: return stages
    val writer = File(file).bufferedWriter()
    writer.write("frame,motion\n")
    return MotionDump(stages, writer)
}
