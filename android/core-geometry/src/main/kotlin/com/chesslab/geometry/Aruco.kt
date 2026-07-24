package com.chesslab.geometry

import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
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
): Map<Int, List<DoubleArray>> {
    val gray =
        if (frame.channels() == BGR_CHANNELS) {
            Mat().also { Imgproc.cvtColor(frame, it, Imgproc.COLOR_BGR2GRAY) }
        } else {
            frame
        }
    val params = DetectorParameters()
    // Sub-pixel refinement - the corner precision the whole warp rests on.
    params.set_cornerRefinementMethod(Objdetect.CORNER_REFINE_SUBPIX)
    val detector = ArucoDetector(Objdetect.getPredefinedDictionary(arucoDictionaryId(dictName)), params)
    val found = ArrayList<Mat>()
    val foundIds = Mat()
    detector.detectMarkers(gray, found, foundIds)
    val out = LinkedHashMap<Int, List<DoubleArray>>()
    for (row in 0 until foundIds.rows()) {
        val id = foundIds.get(row, 0)[0].toInt()
        if (id in ids) {
            out[id] = MatOfPoint2f(found[row]).toArray().map { doubleArrayOf(it.x, it.y) }
        }
    }
    return out
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
): List<DoubleArray>? {
    val needed = minMarkers ?: tracker.params.defaultMinMarkers
    val det =
        if (detectScale < 1.0) {
            val small = Mat()
            Imgproc.resize(frame, small, Size(), detectScale, detectScale, Imgproc.INTER_AREA)
            detectBoardMarkers(small, geom.markerDict, corner = MARKER_CORNER_CENTER)
                .mapValues { (_, p) -> doubleArrayOf(p[0] / detectScale, p[1] / detectScale) }
        } else {
            detectBoardMarkers(frame, geom.markerDict, corner = MARKER_CORNER_CENTER)
        }
    tracker.update(det)
    val pts = tracker.points()
    return if (pts.size < needed) {
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
