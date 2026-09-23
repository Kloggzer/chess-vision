package com.chesslab.geometry

import com.chesslab.geometry.testutil.SyntheticMarkers
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf

/** No fixture exists for ArUco DETECTION (the parity clips replay with `live_align=False`). */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class ArucoTest {
    @Test
    fun `all four markers are detected`() {
        val quads = detectMarkerQuads(SyntheticMarkers.frame())
        assertEquals(setOf(0, 1, 2, 3), quads.keys)
        for ((_, quad) in quads) {
            assertEquals(4, quad.size)
        }
    }

    @Test
    fun `the reported point is the quad centroid`() {
        val frame = SyntheticMarkers.frame()
        val quads = detectMarkerQuads(frame)
        val points = detectBoardMarkers(frame)
        for ((id, quad) in quads) {
            val cx = quad.sumOf { it[0] } / 4.0
            val cy = quad.sumOf { it[1] } / 4.0
            assertEquals(cx, points.getValue(id)[0], 1e-9, "marker $id centroid x")
            assertEquals(cy, points.getValue(id)[1], 1e-9, "marker $id centroid y")
            val expected = SyntheticMarkers.center(id)
            assertEquals(expected[0], points.getValue(id)[0], 1.0, "marker $id centre x")
            assertEquals(expected[1], points.getValue(id)[1], 1.0, "marker $id centre y")
        }
    }

    @Test
    fun `ids outside the requested set are dropped`() {
        val frame = SyntheticMarkers.frame()
        assertEquals(setOf(0, 1), detectMarkerQuads(frame, ids = setOf(0, 1)).keys)
        assertEquals(setOf(2), detectBoardMarkers(frame, ids = setOf(2)).keys)
        assertTrue(detectBoardMarkers(frame, ids = setOf(41)).isEmpty())
    }

    @Test
    fun `the inner corner branch picks a quad corner, not the centroid`() {
        val frame = SyntheticMarkers.frame()
        val center = detectBoardMarkers(frame, corner = MARKER_CORNER_CENTER)
        val inner = detectBoardMarkers(frame, corner = MARKER_CORNER_INNER)
        assertEquals(center.keys, inner.keys)
        for (id in center.keys) {
            assertTrue(
                inner.getValue(id)[0] != center.getValue(id)[0] || inner.getValue(id)[1] != center.getValue(id)[1],
                "marker $id: the inner corner must differ from the centroid",
            )
        }
    }

    @Test
    fun `a gray input frame is accepted`() {
        val frame = SyntheticMarkers.frame()
        val gray = org.opencv.core.Mat()
        org.opencv.imgproc.Imgproc
            .cvtColor(frame, gray, org.opencv.imgproc.Imgproc.COLOR_BGR2GRAY)
        assertEquals(setOf(0, 1, 2, 3), detectMarkerQuads(gray).keys)
    }

    @Test
    fun `an unknown dictionary name is rejected`() {
        assertThrows(IllegalArgumentException::class.java) {
            detectMarkerQuads(SyntheticMarkers.blank(), dictName = "DICT_NOPE")
        }
        assertEquals(org.opencv.objdetect.Objdetect.DICT_4X4_50, arucoDictionaryId("DICT_4X4_50"))
    }
}
