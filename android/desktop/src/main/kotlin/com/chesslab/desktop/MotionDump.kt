package com.chesslab.desktop

import com.chesslab.tracker.pipeline.FrameStages
import org.opencv.core.Mat
import java.io.File
import java.io.Writer

/**
 * Every emitted frame's ROI motion score, one row per frame — the instrument `motionThr` never had.
 *
 * The score is a PERCENT of strongly-changed pixels against the PREVIOUS frame, so what the gate
 * separates is two populations (still board, hand in the ROI) and the threshold belongs in the
 * valley between them. The frame-rate scaling: `docs/android-performance.md` (Strom).
 */
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

/** `motiondump=<file>`: the wrapper, or the stages untouched when no file was asked for. */
internal fun motionDumped(
    stages: FrameStages<Mat>,
    path: String?,
): FrameStages<Mat> {
    val file = path ?: return stages
    val writer = File(file).bufferedWriter()
    writer.write("frame,motion\n")
    return MotionDump(stages, writer)
}
