package com.chesslab.tracker.geometry

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import kotlin.math.abs

/**
 * JVM unit tests for [ArucoCornerOrdering].
 *
 * Tests the marker-id→corner ordering logic with synthetic inputs, mirroring
 * the Python `test_aruco_detect_corners_roundtrip` (tests/test_calibration.py:108)
 * and `test_resolve_board_corners_*` tests.
 *
 * No OpenCV dependency — these exercises use plain [Point] values.
 */
class ArucoCornerDetectionTest {
    // --- orderCorners (strict, requires all 4) ---

    @Test
    fun `orderCorners returns BoardCorners when all 4 markers present`() {
        val markers =
            mapOf(
                0 to Point(150f, 120f), // a8
                1 to Point(650f, 120f), // h8
                2 to Point(650f, 480f), // h1
                3 to Point(150f, 480f), // a1
            )
        val result = ArucoCornerOrdering.orderCorners(markers)
        assertNotNull(result)
        assertEquals(Point(150f, 120f), result!!.a8)
        assertEquals(Point(650f, 120f), result.h8)
        assertEquals(Point(650f, 480f), result.h1)
        assertEquals(Point(150f, 480f), result.a1)
    }

    @Test
    fun `orderCorners returns null when any marker missing`() {
        val markers =
            mapOf(
                0 to Point(150f, 120f),
                1 to Point(650f, 120f),
                2 to Point(650f, 480f),
                // id 3 missing
            )
        assertNull(ArucoCornerOrdering.orderCorners(markers))
    }

    @Test
    fun `orderCorners returns null with empty map`() {
        assertNull(ArucoCornerOrdering.orderCorners(emptyMap()))
    }

    @Test
    fun `orderCorners returns null with only 1 marker`() {
        assertNull(ArucoCornerOrdering.orderCorners(mapOf(0 to Point(100f, 100f))))
    }

    @Test
    fun `orderCorners returns null with 3 markers`() {
        val markers =
            mapOf(
                0 to Point(150f, 120f),
                1 to Point(650f, 120f),
                2 to Point(650f, 480f),
                // id 3 missing
            )
        assertNull(ArucoCornerOrdering.orderCorners(markers))
    }

    @Test
    fun `orderCorners returns null for unexpected marker id`() {
        // id 5 instead of 3
        val markers =
            mapOf(
                0 to Point(100f, 100f),
                1 to Point(200f, 100f),
                2 to Point(200f, 200f),
                5 to Point(100f, 200f),
            )
        assertNull(ArucoCornerOrdering.orderCorners(markers))
    }

    // --- orderCornersFlexible (tolerant, parallelogram completion) ---

    @Test
    fun `flexible 3 markers completes parallelogram`() {
        // a8(id0), h8(id1), a1(id3) known; h1(id2) missing -> parallelogram completion
        val markers =
            mapOf(
                0 to Point(0f, 0f),
                1 to Point(100f, 0f),
                3 to Point(0f, 100f),
            )
        val result = ArucoCornerOrdering.orderCornersFlexible(markers, minMarkers = 3)
        assertNotNull(result)
        // h1 should be at (100, 100)
        assertEquals(Point(100f, 100f), result!!.h1)
        // a8, h8, a1 should match input
        assertEquals(Point(0f, 0f), result.a8)
        assertEquals(Point(100f, 0f), result.h8)
        assertEquals(Point(0f, 100f), result.a1)
    }

    @Test
    fun `flexible 2 adjacent markers (top edge) completes square`() {
        // a8 and h8 known
        val markers =
            mapOf(
                0 to Point(0f, 0f),
                1 to Point(100f, 0f),
            )
        val result = ArucoCornerOrdering.orderCornersFlexible(markers, minMarkers = 2)
        assertNotNull(result)
        // h1 should be at (100, 100), a1 at (0, 100)
        assertClose(Point(100f, 100f), result!!.h1)
        assertClose(Point(0f, 100f), result.a1)
    }

    @Test
    fun `flexible 2 adjacent markers (right edge) completes square`() {
        val markers =
            mapOf(
                1 to Point(100f, 0f),
                2 to Point(100f, 100f),
            )
        val result = ArucoCornerOrdering.orderCornersFlexible(markers, minMarkers = 2)
        assertNotNull(result)
        // a8 at (0, 0)
        assertClose(Point(0f, 0f), result!!.a8)
        assertClose(Point(0f, 100f), result.a1)
    }

    @Test
    fun `flexible 2 diagonal markers (a8-h1) completes square`() {
        val markers =
            mapOf(
                0 to Point(0f, 0f),
                2 to Point(100f, 100f),
            )
        val result = ArucoCornerOrdering.orderCornersFlexible(markers, minMarkers = 2)
        assertNotNull(result)
        // The other diag h8-h1 should be at (100,0) and (0,100)
        assertClose(Point(100f, 0f), result!!.h8)
        assertClose(Point(0f, 100f), result.a1)
    }

    @Test
    fun `flexible less than minMarkers returns null`() {
        val markers =
            mapOf(
                0 to Point(0f, 0f),
            )
        assertNull(ArucoCornerOrdering.orderCornersFlexible(markers, minMarkers = 2))
    }

    @Test
    fun `flexible with empty map returns null when minMarkers=2`() {
        assertNull(ArucoCornerOrdering.orderCornersFlexible(emptyMap(), minMarkers = 2))
    }

    @Test
    fun `flexible with default minMarkers=4 requires all 4`() {
        val markers =
            mapOf(
                0 to Point(0f, 0f),
                1 to Point(100f, 0f),
                2 to Point(100f, 100f),
                // id 3 missing
            )
        assertNull(ArucoCornerOrdering.orderCornersFlexible(markers)) // default minMarkers=4
    }

    // --- Edge cases ---

    @Test
    fun `orderCorners roundtrip order invariant a8-h8-h1-a1`() {
        val markers =
            ArucoCornerOrdering.EXPECTED_IDS
                .zip(
                    listOf(
                        Point(10f, 10f),
                        Point(200f, 15f),
                        Point(190f, 400f),
                        Point(20f, 390f),
                    ),
                ).toMap()

        val result = ArucoCornerOrdering.orderCorners(markers)
        assertNotNull(result)
        val ordered = result!!.toList()
        assertEquals(ordered[0], markers[0])
        assertEquals(ordered[1], markers[1])
        assertEquals(ordered[2], markers[2])
        assertEquals(ordered[3], markers[3])
    }

    @Test
    fun `LABEL_BY_ID maps correctly`() {
        assertEquals("a8", ArucoCornerOrdering.LABEL_BY_ID[0])
        assertEquals("h8", ArucoCornerOrdering.LABEL_BY_ID[1])
        assertEquals("h1", ArucoCornerOrdering.LABEL_BY_ID[2])
        assertEquals("a1", ArucoCornerOrdering.LABEL_BY_ID[3])
        assertEquals(4, ArucoCornerOrdering.LABEL_BY_ID.size)
    }

    @Test
    fun `EXPECTED_IDS is ordered a8-h8-h1-a1`() {
        assertEquals(listOf(0, 1, 2, 3), ArucoCornerOrdering.EXPECTED_IDS)
    }

    // --- 3-marker parallelogram: all 4 missing-corner permutations ---

    @Test
    fun `flexible 3 markers missing a8 (id 0)`() {
        val markers =
            mapOf(
                1 to Point(200f, 50f),
                2 to Point(220f, 400f),
                3 to Point(30f, 380f),
            )
        val result = ArucoCornerOrdering.orderCornersFlexible(markers, minMarkers = 3)
        assertNotNull(result)
        // a8 = h8 + a1 - h1
        val expectedAx = markers[1]!!.x + markers[3]!!.x - markers[2]!!.x
        val expectedAy = markers[1]!!.y + markers[3]!!.y - markers[2]!!.y
        assertClose(Point(expectedAx, expectedAy), result!!.a8)
    }

    @Test
    fun `flexible 3 markers missing h8 (id 1)`() {
        val markers =
            mapOf(
                0 to Point(30f, 40f),
                2 to Point(220f, 400f),
                3 to Point(30f, 380f),
            )
        val result = ArucoCornerOrdering.orderCornersFlexible(markers, minMarkers = 3)
        assertNotNull(result)
        // h8 = a8 + h1 - a1
        val expectedHx = markers[0]!!.x + markers[2]!!.x - markers[3]!!.x
        val expectedHy = markers[0]!!.y + markers[2]!!.y - markers[3]!!.y
        assertClose(Point(expectedHx, expectedHy), result!!.h8)
    }

    @Test
    fun `flexible 3 markers missing h1 (id 2)`() {
        val markers =
            mapOf(
                0 to Point(30f, 40f),
                1 to Point(200f, 50f),
                3 to Point(30f, 380f),
            )
        val result = ArucoCornerOrdering.orderCornersFlexible(markers, minMarkers = 3)
        assertNotNull(result)
        // h1 = h8 + a1 - a8
        val expectedHx = markers[1]!!.x + markers[3]!!.x - markers[0]!!.x
        val expectedHy = markers[1]!!.y + markers[3]!!.y - markers[0]!!.y
        assertClose(Point(expectedHx, expectedHy), result!!.h1)
    }

    @Test
    fun `flexible 3 markers missing a1 (id 3)`() {
        val markers =
            mapOf(
                0 to Point(30f, 40f),
                1 to Point(200f, 50f),
                2 to Point(220f, 400f),
            )
        val result = ArucoCornerOrdering.orderCornersFlexible(markers, minMarkers = 3)
        assertNotNull(result)
        // a1 = a8 + h1 - h8
        val expectedAx = markers[0]!!.x + markers[2]!!.x - markers[1]!!.x
        val expectedAy = markers[0]!!.y + markers[2]!!.y - markers[1]!!.y
        assertClose(Point(expectedAx, expectedAy), result!!.a1)
    }

    // --- Helper ---

    private fun assertClose(
        expected: Point,
        actual: Point,
        tolerance: Float = 1e-3f,
    ) {
        org.junit.jupiter.api.Assertions.assertTrue(
            abs(expected.x - actual.x) <= tolerance && abs(expected.y - actual.y) <= tolerance,
            "Expected $expected but got $actual (tolerance=$tolerance)",
        )
    }
}
