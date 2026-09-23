package com.chesslab.desktop

import com.chesslab.geometry.computeHomography
import com.chesslab.geometry.cornersFromFlat
import com.chesslab.geometry.margins4
import com.chesslab.tracker.geometry.DEFAULT_MARKER_MARGIN
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import kotlin.math.abs
import kotlin.math.roundToInt

private const val LINES_PER_AXIS = 7
private const val SQUARES = 8

/** The worse axis, in cells. The scan gates every SAMPLE and never its median: on 2026-08-30-16-20-19 all
 *  passed and the median sat 0.14 cells off. */
internal fun grooveOffset(
    frame: Mat,
    quad: FloatArray,
    boardSize: Int,
): Double {
    val homography = computeHomography(cornersFromFlat(quad), boardSize, margins4(DEFAULT_MARKER_MARGIN))
    val warped = Mat()
    val gray = Mat()
    Imgproc.warpPerspective(frame, warped, homography, Size(boardSize.toDouble(), boardSize.toDouble()))
    Imgproc.cvtColor(warped, gray, Imgproc.COLOR_BGR2GRAY)
    val cell = boardSize / SQUARES.toDouble()
    val offsets =
        listOf(profile(gray, columns = true), profile(gray, columns = false)).map { prof ->
            val perLine =
                (1..LINES_PER_AXIS)
                    .map { k ->
                        val lo = (k * cell - cell / 2).roundToInt().coerceAtLeast(0)
                        val hi = (k * cell + cell / 2).roundToInt().coerceAtMost(boardSize - 1)
                        val darkest = (lo..hi).minByOrNull { prof[it] } ?: lo
                        (darkest - k * cell) / cell
                    }.sorted()
            perLine[perLine.size / 2]
        }
    homography.release()
    warped.release()
    gray.release()
    return offsets.maxOf { abs(it) }
}

private fun profile(
    gray: Mat,
    columns: Boolean,
): DoubleArray {
    val reduced = Mat()
    Core.reduce(gray, reduced, if (columns) 0 else 1, Core.REDUCE_AVG, CvType.CV_64F)
    val out = DoubleArray(if (columns) reduced.cols() else reduced.rows())
    reduced.get(0, 0, out)
    reduced.release()
    return out
}

/** A hand over one sampled frame must not pick the quad. */
internal fun medianOffset(offsets: List<Double>): Double {
    val sorted = offsets.sorted()
    return sorted[sorted.size / 2]
}
