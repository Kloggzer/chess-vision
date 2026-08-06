package com.chesslab.desktop

import com.chesslab.geometry.GridSample
import com.chesslab.geometry.LensFit
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.gridSamples
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.imgcodecs.Imgcodecs
import org.opencv.imgproc.Imgproc
import java.io.File

/**
 * A picture of what the fit did, because a number can agree with a broken model.
 *
 * Left is the raw frame, right the same frame undistorted, and on each the grooves the detector
 * found are drawn as dots with the straight chord through each line's ends. Where the dots bow away
 * from their chord, the lens is bending a line the board says is straight. That is the quantity
 * being minimised, made visible — and it is the one thing a reader can check without trusting any
 * of the arithmetic above it.
 */
fun writeLensProbe(
    source: FrameSource,
    fit: LensFit,
    out: File,
): File? {
    val frame = source.next() ?: return null
    val size = Size(source.delivered.width.toDouble(), source.delivered.height.toDouble())
    val calibration =
        LensCalibration(
            cameraMatrix = listOf(fit.focal, 0.0, fit.cx, 0.0, fit.focal, fit.cy, 0.0, 0.0, 1.0),
            distCoeffs = listOf(fit.k1, fit.k2, 0.0, 0.0, 0.0),
            width = source.delivered.width,
            height = source.delivered.height,
        )
    val corrected = Undistorter(calibration, size).use { it.apply(frame).clone() }
    val left = annotate(frame, "raw")
    val right = annotate(corrected, "corrected  k1=${"%.3f".format(fit.k1)} k2=${"%.3f".format(fit.k2)}")
    val canvas = Mat()
    Core.hconcat(listOf(left, right), canvas)
    val scaled = Mat()
    Imgproc.resize(canvas, scaled, Size(), PROBE_SCALE, PROBE_SCALE, Imgproc.INTER_AREA)
    out.parentFile?.mkdirs()
    Imgcodecs.imwrite(out.absolutePath, scaled)
    listOf(left, right, canvas, scaled, corrected).forEach { it.release() }
    return out
}

/** The grooves this frame shows, with each line's chord drawn through them. */
private fun annotate(
    frame: Mat,
    label: String,
): Mat {
    val canvas = frame.clone()
    val quad = quadOf(frame)
    if (quad != null) {
        val samples = gridSamples(frame, boardGeometryFor(quad), cornersFromFlat(quad))
        samples.groupBy { it.axis to it.line }.values.forEach { line -> draw(canvas, line) }
    }
    Imgproc.putText(canvas, label, Point(LABEL_X, LABEL_Y), Imgproc.FONT_HERSHEY_SIMPLEX, LABEL_SCALE, WHITE, LABEL_THICK)
    return canvas
}

private fun draw(
    canvas: Mat,
    line: List<GridSample>,
) {
    val sorted = line.sortedBy { if (line.first().axis == 0) it.y else it.x }
    val first = Point(sorted.first().x, sorted.first().y)
    val last = Point(sorted.last().x, sorted.last().y)
    // The chord first, so the dots sit on top of it: the gap between them IS the bow.
    Imgproc.line(canvas, first, last, CHORD, CHORD_THICK)
    sorted.forEach { Imgproc.circle(canvas, Point(it.x, it.y), DOT_RADIUS, DOT, -1) }
    return
}

private val WHITE = Scalar(255.0, 255.0, 255.0)
private val CHORD = Scalar(0.0, 200.0, 255.0)
private val DOT = Scalar(0.0, 0.0, 255.0)
private const val CHORD_THICK = 2
private const val DOT_RADIUS = 6
private const val LABEL_X = 40.0
private const val LABEL_Y = 80.0
private const val LABEL_SCALE = 2.0
private const val LABEL_THICK = 4
private const val PROBE_SCALE = 0.4
