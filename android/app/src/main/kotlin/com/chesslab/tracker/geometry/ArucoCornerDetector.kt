package com.chesslab.tracker.geometry

import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.ArucoDetector
import org.opencv.objdetect.DetectorParameters
import org.opencv.objdetect.Objdetect

/**
 * OpenCV wrapper for ArUco board-corner detection.
 *
 * Ports the Python `_aruco_dictionary` / `_detect_marker_quads` / `detect_board_markers`
 * / `detect_board_corners_aruco` chain from `calibration.py:387-466` with
 * `corner="center"` semantics (the centroid of each marker's four corner points).
 *
 * Marker dictionary: `DICT_4X4_50` (the project default, stored in
 * `CalibrationProfile.marker_dict` on the Python side). Marker ids 0–3 map to
 * (a8, h8, h1, a1) respectively — the project-invariant corner order.
 *
 * All OpenCV calls are in this class. The ordering/selection logic is in
 * [ArucoCornerOrdering] and is unit-testable without OpenCV.
 */
class ArucoCornerDetector {
    /** Each marker quad has exactly 4 corner points. */
    private companion object {
        private const val QUAD_CORNERS = 4
        private const val COLUMN_INDEX = 0
        private const val CHANNEL_BGR = 3
        private const val DEFAULT_MAX_DIMENSION = 960
    }

    private val dictionary = Objdetect.getPredefinedDictionary(Objdetect.DICT_4X4_50)
    private val parameters = DetectorParameters()
    private val detector = ArucoDetector(dictionary, parameters)

    /**
     * Detect the four board corner markers in [frame] and return their centers
     * as [BoardCorners], or `null` if fewer than 4 markers (ids 0–3) are found.
     */
    fun detect(frame: Mat): BoardCorners? {
        val gray = toGray(frame)
        try {
            val markers = detectMarkersImpl(gray, filterExpected = true)
            return ArucoCornerOrdering.orderCorners(markers)
        } finally {
            gray.release()
        }
    }

    /** Detect on a bounded-size image and map marker centers back to source coordinates. */
    fun detectScaled(
        frame: Mat,
        maxDimension: Int = DEFAULT_MAX_DIMENSION,
    ): BoardCorners? {
        val largest = maxOf(frame.cols(), frame.rows())
        if (largest <= maxDimension) return detect(frame)
        val scale = maxDimension.toDouble() / largest
        val small = Mat()
        return try {
            Imgproc.resize(frame, small, Size(), scale, scale, Imgproc.INTER_AREA)
            detect(small)?.mapPoints { point ->
                Point((point.x / scale).toFloat(), (point.y / scale).toFloat())
            }
        } finally {
            small.release()
        }
    }

    /**
     * Lightweight detection returning raw marker centers without ordering.
     *
     * Intended for the live-assist overlay (show dots on preview). Returns ALL
     * detected markers, or an empty map when nothing found.
     */
    fun detectRaw(frame: Mat): Map<Int, Point> {
        val gray = toGray(frame)
        try {
            return detectMarkersImpl(gray, filterExpected = false)
        } finally {
            gray.release()
        }
    }

    /**
     * Shared detection implementation.
     * @param filterExpected  when true, only return markers with ids in [ArucoCornerOrdering.EXPECTED_IDS].
     */
    private fun detectMarkersImpl(
        gray: Mat,
        filterExpected: Boolean,
    ): Map<Int, Point> {
        val corners = mutableListOf<Mat>()
        val ids = Mat()
        try {
            detector.detectMarkers(gray, corners, ids)
            if (ids.empty() || corners.isEmpty()) return emptyMap()

            val idsArray = IntArray(ids.total().toInt())
            ids.get(0, 0, idsArray)

            val result = mutableMapOf<Int, Point>()
            // Zip ids with their corner mats so we never index out of bounds.
            val validPairs =
                idsArray.indices
                    .filter { i -> i < corners.size }
                    .map { i -> Pair(idsArray[i], corners[i]) }

            for ((markerId, quad) in validPairs) {
                if (filterExpected && markerId !in ArucoCornerOrdering.EXPECTED_IDS) continue
                result[markerId] = computeCenter(quad)
            }
            return result
        } finally {
            corners.forEach(Mat::release)
            ids.release()
        }
    }

    /**
     * Compute the centroid of a CV_32FC2 marker quad. The quad is a 1×4 (or 4×1)
     * two-channel float Mat, so points must be read with a FloatArray — OpenCV's
     * Mat.get(..., double[]) rejects non-CV_64F mats ("data type not compatible").
     */
    private fun computeCenter(quad: Mat): Point {
        var sumX = 0.0
        var sumY = 0.0
        val pointBuffer = FloatArray(2)
        for (j in 0 until QUAD_CORNERS) {
            // Corners come back as a 1-row, 4-column Mat; index by column.
            if (quad.rows() == 1) {
                quad.get(0, j, pointBuffer)
            } else {
                quad.get(j, COLUMN_INDEX, pointBuffer)
            }
            sumX += pointBuffer[0]
            sumY += pointBuffer[1]
        }
        return Point(
            x = (sumX / QUAD_CORNERS.toDouble()).toFloat(),
            y = (sumY / QUAD_CORNERS.toDouble()).toFloat(),
        )
    }

    private fun toGray(frame: Mat): Mat =
        if (frame.channels() == CHANNEL_BGR) {
            val gray = Mat()
            Imgproc.cvtColor(frame, gray, Imgproc.COLOR_BGR2GRAY)
            gray
        } else {
            frame.clone()
        }

    private fun BoardCorners.mapPoints(transform: (Point) -> Point): BoardCorners =
        BoardCorners(transform(a8), transform(h8), transform(h1), transform(a1))
}
