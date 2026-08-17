package com.chesslab.desktop

import com.chesslab.engine.api.TrackerStatus
import com.chesslab.geometry.computeHomography
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.margins4
import com.chesslab.tracker.geometry.DEFAULT_MARKER_MARGIN
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfInt
import org.opencv.core.Size
import org.opencv.imgcodecs.Imgcodecs
import org.opencv.imgproc.Imgproc
import java.awt.image.BufferedImage
import java.awt.image.DataBufferByte
import java.io.File

/**
 * The DECISIVE frames of a run: not the raw camera picture but the rectified board the engine
 * reasons about. [annotate] decides whether the engine's verdicts are painted on top
 * ([renderBoardShot]) — the debug writer wants them, the human confirming a move wants the board.
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
    private val annotate: Boolean = true,
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
        // The plain board is already a Mat; only the annotated one takes the Swing detour.
        val out = if (annotate) matToImage(warped)?.let { imageToMat(renderBoardShot(it, buffered.status)) } else warped
        // WebP, not PNG: 1.3 MB per board and 3.1 GB across the corpus, for a picture a human
        // looks at once. Same q95 the session's board store uses (`realgames.BOARD_ENCODE`).
        if (out != null && !out.empty()) {
            Imgcodecs.imwrite(File(dir, "%06d$REVIEW_SUFFIX".format(buffered.index)).path, out, REVIEW_ENCODE)
        }
        if (out !== warped) out?.release()
        warped.release()
    }

    private class Buffered(
        val index: Int,
        val raw: Mat,
        val status: TrackerStatus?,
    )
}

/**
 * The inverse of `matToImage`, through one draw that normalises the type: `renderBoardShot`
 * returns TYPE_INT_RGB while the plain board is TYPE_3BYTE_BGR, whose raster is already the BGR
 * layout OpenCV wants — so the draw costs a copy the annotated path pays anyway.
 */
private fun imageToMat(image: BufferedImage): Mat {
    val bgr = BufferedImage(image.width, image.height, BufferedImage.TYPE_3BYTE_BGR)
    bgr.createGraphics().apply {
        drawImage(image, 0, 0, null)
        dispose()
    }
    val mat = Mat(bgr.height, bgr.width, CvType.CV_8UC3)
    mat.put(0, 0, (bgr.raster.dataBuffer as DataBufferByte).data)
    return mat
}

/** Review neighbourhood on each side of a trigger frame, the Python writer's default. */
internal const val REVIEW_CONTEXT = 2

/** What a review board is written as — see `write`. Readers accept the old `.png` too. */
internal const val REVIEW_SUFFIX = ".webp"
private const val REVIEW_QUALITY = 95
private val REVIEW_ENCODE = MatOfInt(Imgcodecs.IMWRITE_WEBP_QUALITY, REVIEW_QUALITY)
