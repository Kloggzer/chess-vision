package com.chesslab.tracker.geometry

/**
 * Pure-Kotlin ordering logic for ArUco marker detections.
 *
 * Contains no OpenCV dependency — fully unit-testable on the desktop JVM. Mirrors
 * the Python selection/ordering in `calibration.py:_ARUCO_LABELS` and
 * `detect_board_corners_aruco` with `corner="center"` semantics.
 *
 * Marker ids map to board corners in the project-invariant order:
 *   id 0 → a8, id 1 → h8, id 2 → h1, id 3 → a1
 *
 * @see ArucoCornerDetector  OpenCV wrapper that feeds results into this logic.
 */
object ArucoCornerOrdering {
    private const val CORNER_COUNT = 4
    private const val MIN_MARKERS = 2
    private const val THREE_MARKERS = 3
    private const val ID_A8 = 0
    private const val ID_H8 = 1
    private const val ID_H1 = 2
    private const val ID_A1 = 3

    val EXPECTED_IDS: List<Int> = listOf(ID_A8, ID_H8, ID_H1, ID_A1)

    val LABEL_BY_ID: Map<Int, String> =
        mapOf(ID_A8 to "a8", ID_H8 to "h8", ID_H1 to "h1", ID_A1 to "a1")

    fun orderCorners(markers: Map<Int, Point>): BoardCorners? {
        if (!EXPECTED_IDS.all { it in markers }) return null
        return BoardCorners(
            a8 = markers[ID_A8]!!,
            h8 = markers[ID_H8]!!,
            h1 = markers[ID_H1]!!,
            a1 = markers[ID_A1]!!,
        )
    }

    fun orderCornersFlexible(
        markers: Map<Int, Point>,
        minMarkers: Int = CORNER_COUNT,
    ): BoardCorners? {
        val have = markers.keys.filter { it in EXPECTED_IDS }
        if (have.size < minMarkers || have.size < MIN_MARKERS) return null
        val completed = markers.toMutableMap()
        if (completed.size < CORNER_COUNT) {
            when (have.size) {
                THREE_MARKERS -> completeThreeMarkers(completed)
                MIN_MARKERS -> completeTwoMarkers(completed, have)
            }
        }
        return orderCorners(completed)
    }

    private fun completeThreeMarkers(completed: MutableMap<Int, Point>) {
        val missing = EXPECTED_IDS.first { it !in completed }
        val idx = EXPECTED_IDS.indexOf(missing)
        val prev = EXPECTED_IDS[(idx - 1 + CORNER_COUNT) % CORNER_COUNT]
        val next = EXPECTED_IDS[(idx + 1) % CORNER_COUNT]
        val opp = EXPECTED_IDS[(idx + 2) % CORNER_COUNT]
        if (completed[prev] == null || completed[next] == null || completed[opp] == null) return
        val p = completed[prev]!!
        val n = completed[next]!!
        val o = completed[opp]!!
        completed[missing] = Point(p.x + n.x - o.x, p.y + n.y - o.y)
    }

    private fun completeTwoMarkers(
        completed: MutableMap<Int, Point>,
        have: List<Int>,
    ) {
        val (i0, i1) = have.sorted()
        if (completed[i0] == null || completed[i1] == null) return
        val p0 = completed[i0]!!
        val p1 = completed[i1]!!
        if (!tryAdjacentEdge(completed, i0, i1, p0, p1)) {
            tryDiagonal(completed, i0, i1, p0, p1)
        }
    }

    private fun tryAdjacentEdge(
        completed: MutableMap<Int, Point>,
        i0: Int,
        i1: Int,
        p0: Point,
        p1: Point,
    ): Boolean {
        val dx = p1.x - p0.x
        val dy = p1.y - p0.y
        val pts: Map<Int, Point> =
            when {
                i0 == ID_A8 && i1 == ID_H8 ->
                    mapOf(
                        ID_H1 to Point(p1.x - dy, p1.y + dx),
                        ID_A1 to Point(p0.x - dy, p0.y + dx),
                    )
                i0 == ID_A8 && i1 == ID_A1 ->
                    mapOf(
                        ID_H8 to Point(p0.x + dy, p0.y - dx),
                        ID_H1 to Point(p1.x + dy, p1.y - dx),
                    )
                i0 == ID_H8 && i1 == ID_H1 ->
                    mapOf(
                        ID_A8 to Point(p0.x - dy, p0.y + dx),
                        ID_A1 to Point(p1.x - dy, p1.y + dx),
                    )
                i0 == ID_H1 && i1 == ID_A1 ->
                    mapOf(
                        ID_A8 to Point(p1.x - dy, p1.y + dx),
                        ID_H8 to Point(p0.x - dy, p0.y + dx),
                    )
                else -> return false
            }
        completed.putAll(pts)
        return true
    }

    private fun tryDiagonal(
        completed: MutableMap<Int, Point>,
        i0: Int,
        i1: Int,
        p0: Point,
        p1: Point,
    ) {
        val cx = (p0.x + p1.x) / 2f
        val cy = (p0.y + p1.y) / 2f
        val hdx = p0.x - cx
        val hdy = p0.y - cy
        val pts: Map<Int, Point> =
            when {
                i0 == ID_A8 && i1 == ID_H1 ->
                    mapOf(
                        ID_H8 to Point(cx - hdy, cy + hdx),
                        ID_A1 to Point(cx + hdy, cy - hdx),
                    )
                i0 == ID_H8 && i1 == ID_A1 ->
                    mapOf(
                        ID_A8 to Point(cx + hdy, cy - hdx),
                        ID_H1 to Point(cx - hdy, cy + hdx),
                    )
                else -> return
            }
        completed.putAll(pts)
    }
}
