package com.chesslab.geometry

import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.ArucoDetector
import org.opencv.objdetect.DetectorParameters
import org.opencv.objdetect.Objdetect
import kotlin.math.hypot

// Marker id 0 -> a8, 1 -> h8, 2 -> h1, 3 -> a1. `board_corners_for_frame` lives HERE: it needs OpenCV, and
// `MarkerTracker.kt` must stay native-free.

const val MARKER_CORNER_CENTER: String = "center"

const val MARKER_CORNER_INNER: String = "inner"

private val DEFAULT_MARKER_IDS: Set<Int> = setOf(0, 1, 2, 3)

private const val QUAD_CORNERS: Int = 4

private const val POINT_COORDS: Int = 2

private const val BGR_CHANNELS: Int = 3

/** An explicit map instead of Python's `getattr(cv2.aruco, name)`; unknown name -> `IllegalArgumentException`. */
fun arucoDictionaryId(name: String): Int =
    when (name) {
        "DICT_4X4_50" -> Objdetect.DICT_4X4_50
        "DICT_4X4_100" -> Objdetect.DICT_4X4_100
        "DICT_4X4_250" -> Objdetect.DICT_4X4_250
        "DICT_4X4_1000" -> Objdetect.DICT_4X4_1000
        "DICT_5X5_50" -> Objdetect.DICT_5X5_50
        "DICT_5X5_100" -> Objdetect.DICT_5X5_100
        "DICT_6X6_50" -> Objdetect.DICT_6X6_50
        "DICT_6X6_250" -> Objdetect.DICT_6X6_250
        "DICT_7X7_50" -> Objdetect.DICT_7X7_50
        "DICT_APRILTAG_36h11" -> Objdetect.DICT_APRILTAG_36h11
        else -> throw IllegalArgumentException("unknown ArUco dictionary: '$name'")
    }

fun detectMarkerQuads(
    frame: Mat,
    dictName: String = "DICT_4X4_50",
    ids: Set<Int> = DEFAULT_MARKER_IDS,
): Map<Int, List<DoubleArray>> = BoardMarkerDetector().use { it.detectMarkerQuads(frame, dictName, ids) }

/** Live alignment detects hundreds of times: a detector per call adds native allocation and finalizer
 *  pressure until a GC runs. One [LiveAlign] owns one instance and never calls it concurrently. */
class BoardMarkerDetector : AutoCloseable {
    private val gray = Mat()
    private val resized = Mat()
    private val foundIds = Mat()
    private var dictionary: String? = null
    private var detector: ArucoDetector? = null

    fun detectMarkerQuads(
        frame: Mat,
        dictName: String = "DICT_4X4_50",
        ids: Set<Int> = DEFAULT_MARKER_IDS,
        detectScale: Double = 1.0,
    ): Map<Int, List<DoubleArray>> {
        val scaled =
            if (detectScale < 1.0) {
                Imgproc.resize(frame, resized, Size(), detectScale, detectScale, Imgproc.INTER_AREA)
                resized
            } else {
                frame
            }
        val input =
            if (scaled.channels() == BGR_CHANNELS) {
                Imgproc.cvtColor(scaled, gray, Imgproc.COLOR_BGR2GRAY)
                gray
            } else {
                scaled
            }
        val found = ArrayList<Mat>()
        try {
            detectorFor(dictName).detectMarkers(input, found, foundIds)
            val out = LinkedHashMap<Int, List<DoubleArray>>()
            for (row in 0 until foundIds.rows()) {
                val id = foundIds.get(row, 0)[0].toInt()
                if (id !in ids) continue
                val values = FloatArray(QUAD_CORNERS * POINT_COORDS)
                found[row].get(0, 0, values)
                out[id] =
                    List(QUAD_CORNERS) { point ->
                        doubleArrayOf(values[point * 2].toDouble(), values[point * 2 + 1].toDouble())
                    }
            }
            return out
        } finally {
            found.forEach(Mat::release)
        }
    }

    fun detectBoardMarkers(
        frame: Mat,
        dictName: String = "DICT_4X4_50",
        ids: Set<Int> = DEFAULT_MARKER_IDS,
        corner: String = MARKER_CORNER_CENTER,
        detectScale: Double = 1.0,
    ): Map<Int, DoubleArray> {
        val quads = detectMarkerQuads(frame, dictName, ids, detectScale)
        val means = quads.mapValues { (_, q) -> quadMean(q) }
        val cx = means.values.sumOf { it[0] } / means.size.coerceAtLeast(1)
        val cy = means.values.sumOf { it[1] } / means.size.coerceAtLeast(1)
        return quads.mapValues { (_, quad) ->
            val point =
                if (corner == MARKER_CORNER_INNER) {
                    quad.minByOrNull { hypot(it[0] - cx, it[1] - cy) } ?: quadMean(quad)
                } else {
                    quadMean(quad)
                }
            if (detectScale < 1.0) doubleArrayOf(point[0] / detectScale, point[1] / detectScale) else point
        }
    }

    override fun close() {
        detector?.clear()
        detector = null
        gray.release()
        resized.release()
        foundIds.release()
    }

    // TODO: `calibration.py` sets three `adaptiveThreshWinSize` values and scales to `DETECT_LONG_SIDE = 1344`, not
    // `alignScale` — Python reads 21-25/30 edge markers against 2/30 here. Re-measure calibration, don't copy constants.
    private fun detectorFor(dictName: String): ArucoDetector {
        if (dictionary != dictName || detector == null) {
            detector?.clear()
            val params = DetectorParameters()
            params.set_cornerRefinementMethod(Objdetect.CORNER_REFINE_SUBPIX)
            detector = ArucoDetector(Objdetect.getPredefinedDictionary(arucoDictionaryId(dictName)), params)
            dictionary = dictName
        }
        return requireNotNull(detector)
    }
}

/** `"center"` (what the tracker uses) is the quad CENTROID; `"inner"` the corner nearest the centroid of all quads. */
fun detectBoardMarkers(
    frame: Mat,
    dictName: String = "DICT_4X4_50",
    ids: Set<Int> = DEFAULT_MARKER_IDS,
    corner: String = MARKER_CORNER_CENTER,
): Map<Int, DoubleArray> {
    val quads = detectMarkerQuads(frame, dictName, ids)
    val means = quads.mapValues { (_, q) -> quadMean(q) }
    val cx = means.values.sumOf { it[0] } / means.size.coerceAtLeast(1)
    val cy = means.values.sumOf { it[1] } / means.size.coerceAtLeast(1)
    return quads.mapValues { (id, quad) ->
        if (corner == MARKER_CORNER_INNER) {
            quad.minByOrNull { hypot(it[0] - cx, it[1] - cy) } ?: means.getValue(id)
        } else {
            means.getValue(id)
        }
    }
}

private fun quadMean(quad: List<DoubleArray>): DoubleArray =
    doubleArrayOf(
        quad.sumOf { it[0] } / QUAD_CORNERS,
        quad.sumOf { it[1] } / QUAD_CORNERS,
    )

/** Marker-derived corners, BEFORE `margin`; `null` below `minMarkers`. `detectScale < 1.0` detects downscaled —
 *  the ±1 px rescale error lies inside the tracker's 4 px dead zone. Do not add rounding. */
fun boardCornersForFrame(
    frame: Mat,
    geom: BoardGeometry,
    tracker: MarkerTracker,
    minMarkers: Int? = null,
    detectScale: Double = 1.0,
    detector: BoardMarkerDetector? = null,
    anchor: List<DoubleArray>? = null,
): List<DoubleArray>? {
    val needed = minMarkers ?: tracker.params.defaultMinMarkers
    val det =
        detector?.detectBoardMarkers(frame, geom.markerDict, corner = MARKER_CORNER_CENTER, detectScale = detectScale)
            ?: BoardMarkerDetector().use {
                it.detectBoardMarkers(frame, geom.markerDict, corner = MARKER_CORNER_CENTER, detectScale = detectScale)
            }
    return boardCornersFromMarkers(det, geom, tracker, needed, anchor)
}

/** `anchor` KEEPS a never-measured corner; without one, three markers reconstruct the fourth affinely — 57 px off. */
fun boardCornersFromMarkers(
    detected: Map<Int, DoubleArray>,
    geom: BoardGeometry,
    tracker: MarkerTracker,
    minMarkers: Int = tracker.params.defaultMinMarkers,
    anchor: List<DoubleArray>? = null,
): List<DoubleArray>? {
    tracker.update(detected)
    val pts = tracker.points()
    if (pts.size < minMarkers) return null
    // An anchor covers every corner, so `completeSingleSeed` has nothing left to reconstruct.
    val known =
        if (anchor != null && anchor.size == QUAD_CORNERS) {
            (0 until QUAD_CORNERS).associateWith { pts[it] ?: anchor[it] }
        } else {
            completeSingleSeed(pts, tracker.status())
        }
    return resolveBoardCorners(known, geom.boardSize)?.first
}

/** A seed-only corner (marker never seen live) is completed from the three REAL ones (`prev + next - opp`): a
 *  seed from another camera position would distort a quarter of the warp for good. */
private fun completeSingleSeed(
    pts: Map<Int, DoubleArray>,
    status: Map<Int, String>,
): Map<Int, DoubleArray> {
    val seeded = status.filterValues { it == MarkerStatus.SEED }.keys.toList()
    var out = pts
    if (seeded.size == 1 && pts.size >= QUAD_CORNERS) {
        val m = seeded[0]
        val prev = (m - 1).mod(QUAD_CORNERS)
        val next = (m + 1).mod(QUAD_CORNERS)
        val opp = (m + 2).mod(QUAD_CORNERS)
        if (pts.containsKey(prev) && pts.containsKey(next) && pts.containsKey(opp)) {
            out =
                pts +
                (
                    m to
                        doubleArrayOf(
                            pts.getValue(prev)[0] + pts.getValue(next)[0] - pts.getValue(opp)[0],
                            pts.getValue(prev)[1] + pts.getValue(next)[1] - pts.getValue(opp)[1],
                        )
                )
        }
    }
    return out
}
