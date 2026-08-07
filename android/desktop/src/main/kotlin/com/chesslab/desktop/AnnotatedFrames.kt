package com.chesslab.desktop

import com.chesslab.engine.api.TrackerStatus
import com.chesslab.geometry.computeHomography
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.margins4
import com.chesslab.tracker.geometry.DEFAULT_MARKER_MARGIN
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import java.io.File
import javax.imageio.ImageIO

/**
 * The DECISIVE frames of a run, normalised and labeled: not the raw camera picture but the
 * rectified board the engine reasons about, with its per-square verdicts and the position it
 * believes — rendered through the same canvas the live window paints ([renderBoardShot]).
 *
 * Written at every trigger frame and a symmetric neighbourhood of [context] on each side, during
 * the decode. The ring stores DEFENSIVE COPIES of the raw frame plus the status that was current
 * with it — the source reuses its Mat, and the 2026-08-06 Python defect (indices paired with
 * stale pictures) is exactly what storing references reproduces. The warp and the annotation are
 * paid only at write time, so a run that never commits writes nothing and costs nothing.
 *
 * The warp is this run's own quad at the run's board size, the same homography convention the
 * detection warp uses. Frames are warped from the DECODED picture: when the run fits a lens
 * (`lens`), the tracker saw an undistorted variant — for review at ~2 px alignment that
 * difference is invisible, and the raw decode is the picture that provably existed.
 */
internal class AnnotatedFrames(
    private val dir: File,
    quad: FloatArray,
    private val boardSize: Int,
    private val context: Int = REVIEW_CONTEXT,
) {
    private val homography = computeHomography(cornersFromFlat(quad), boardSize, margins4(DEFAULT_MARKER_MARGIN))
    private val ring = ArrayDeque<Buffered>()
    private val wanted = mutableSetOf<Int>()
    private val written = mutableSetOf<Int>()

    val count: Int get() = written.size

    fun onFrame(
        index: Int,
        frame: Mat,
        status: TrackerStatus?,
        decisive: Boolean,
    ) {
        ring.addLast(Buffered(index, frame.clone(), status))
        while (ring.size > context + 1) ring.removeFirst().raw.release()
        if (index in wanted) {
            wanted.remove(index)
            write(ring.last())
        }
        if (!decisive) return
        for (buffered in ring) write(buffered)
        for (k in 1..context) wanted += index + k
    }

    fun close() {
        while (ring.isNotEmpty()) ring.removeFirst().raw.release()
        homography.release()
    }

    private fun write(buffered: Buffered) {
        if (!written.add(buffered.index)) return
        dir.mkdirs()
        val warped = Mat()
        Imgproc.warpPerspective(buffered.raw, warped, homography, Size(boardSize.toDouble(), boardSize.toDouble()))
        val image = matToImage(warped)
        warped.release()
        if (image == null) return
        ImageIO.write(renderBoardShot(image, buffered.status), "png", File(dir, "%06d.png".format(buffered.index)))
    }

    private class Buffered(
        val index: Int,
        val raw: Mat,
        val status: TrackerStatus?,
    )
}

/** Review neighbourhood on each side of a trigger frame, the Python writer's default. */
internal const val REVIEW_CONTEXT = 2
