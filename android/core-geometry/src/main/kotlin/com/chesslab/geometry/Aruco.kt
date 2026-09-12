package com.chesslab.geometry

import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.ArucoDetector
import org.opencv.objdetect.DetectorParameters
import org.opencv.objdetect.Objdetect
import kotlin.math.hypot

// ArUco marker detection + the per-frame board corners.
// Ports of `calibration.py:489 _detect_marker_quads`, `:501 detect_board_markers` and
// `:883 board_corners_for_frame`.
//
// Marker id 0 -> a8, 1 -> h8, 2 -> h1, 3 -> a1 (`calibration.py:482 _ARUCO_LABELS`).
//
// `board_corners_for_frame` lives HERE, not in `MarkerTracker.kt`: it needs OpenCV (resize +
// detection) and `MarkerTracker.kt` must stay native-free for phase 03.

/** The corner point the tracker always uses: the quad's centroid. */
const val MARKER_CORNER_CENTER: String = "center"

/** The unused-but-ported alternative: the quad corner nearest the centroid of all quads. */
const val MARKER_CORNER_INNER: String = "inner"

private val DEFAULT_MARKER_IDS: Set<Int> = setOf(0, 1, 2, 3)

private const val QUAD_CORNERS: Int = 4

private const val POINT_COORDS: Int = 2

private const val BGR_CHANNELS: Int = 3

/**
 * Dictionary name -> OpenCV constant. Python uses `getattr(cv2.aruco, name)`; an explicit
 * map is the greppable equivalent. Unknown name -> `IllegalArgumentException`.
 */
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

/**
 * Raw detection: `{id: 4 quad corners}` per found marker, in ArUco's own order.
 * Port of `calibration.py:489 _detect_marker_quads`.
 */
fun detectMarkerQuads(
    frame: Mat,
    dictName: String = "DICT_4X4_50",
    ids: Set<Int> = DEFAULT_MARKER_IDS,
): Map<Int, List<DoubleArray>> = BoardMarkerDetector().use { it.detectMarkerQuads(frame, dictName, ids) }

/**
 * Thread-confined ArUco session with reusable native state and image scratch.
 *
 * Live alignment invokes the same dictionary hundreds of times. Constructing a detector and its
 * parameter graph on every invocation adds native allocation/finalizer pressure, while omitting
 * explicit releases for the grayscale, resized frame, ids and returned corner Mats lets that
 * pressure accumulate until a GC happens to run. One [LiveAlign] owns one instance and never calls
 * it concurrently.
 */
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

/**
 * `{id: [x, y]}` of the FOUND markers. Port of `calibration.py:501 detect_board_markers`.
 *
 * `corner = "center"` (what the tracker always uses) returns the quad CENTROID.
 * `corner = "inner"` returns the quad corner nearest the centroid of all quad means.
 */
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

/**
 * The 4 board corners `[a8, h8, h1, a1]` in FRAME pixels for this frame.
 * Port of `calibration.py:883 board_corners_for_frame`.
 *
 * Updates the tracker once with the current detection and resolves the corners from it
 * (marker-derived, BEFORE `margin`). Returns `null` when fewer than `minMarkers` corners are
 * known.
 *
 * `detectScale < 1.0`: detect on a downscaled frame and scale the points back — ArUco is the
 * most expensive per-frame op and the +-1 px rescale error lies inside the tracker's 4 px
 * dead zone. Do not add rounding.
 */
fun boardCornersForFrame(
    frame: Mat,
    geom: BoardGeometry,
    tracker: MarkerTracker,
    minMarkers: Int? = null,
    detectScale: Double = 1.0,
    detector: BoardMarkerDetector? = null,
    // The frame ALREADY sits at this scale (the bus resized it once, INTER_AREA like the detector
    // would): detect at 1.0 and scale the points back by the same division, identical numbers.
    prescaled: Double = 1.0,
): List<DoubleArray>? {
    val needed = minMarkers ?: tracker.params.defaultMinMarkers
    val scale = if (prescaled < 1.0) 1.0 else detectScale
    val raw =
        detector?.detectBoardMarkers(frame, geom.markerDict, corner = MARKER_CORNER_CENTER, detectScale = scale)
            ?: BoardMarkerDetector().use {
                it.detectBoardMarkers(frame, geom.markerDict, corner = MARKER_CORNER_CENTER, detectScale = scale)
            }
    val det = if (prescaled < 1.0) raw.mapValues { (_, p) -> doubleArrayOf(p[0] / prescaled, p[1] / prescaled) } else raw
    return boardCornersFromMarkers(det, geom, tracker, needed)
}

/** Resolve an already-detected marker map through the same stateful smoother as live detection. */
fun boardCornersFromMarkers(
    detected: Map<Int, DoubleArray>,
    geom: BoardGeometry,
    tracker: MarkerTracker,
    minMarkers: Int = tracker.params.defaultMinMarkers,
): List<DoubleArray>? {
    tracker.update(detected)
    val pts = tracker.points()
    return if (pts.size < minMarkers) {
        null
    } else {
        resolveBoardCorners(completeSingleSeed(pts, tracker.status()), geom.boardSize)?.first
    }
}

/**
 * Exactly ONE corner is seed-only (its marker was never seen live — e.g. clipped at the image
 * edge)? Then complete it from the three REAL corners as a parallelogram
 * (`prev + next - opp`) instead of trusting a seed from a possibly different camera position,
 * which would permanently distort a quarter of the warp.
 */
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
