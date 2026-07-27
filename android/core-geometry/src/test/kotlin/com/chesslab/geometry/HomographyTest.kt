package com.chesslab.geometry

import com.chesslab.geometry.testutil.GeometryFixtures
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point

/**
 * Tier C — needs the OpenCV natives. Golden rows from `parity/_geometry/meta.json ->
 * homographies[]` and `parity/_geometry/resolve_corners.jsonl` (phase 00b).
 */
@EnabledIf("com.chesslab.geometry.testutil.OpenCvNatives#available")
class HomographyTest {
    @Test
    fun `every fixture homography matches element-wise`() {
        val cases = GeometryFixtures.list(GeometryFixtures.geometryMeta()["homographies"])
        assertTrue(cases.isNotEmpty(), "no homographies in the fixture")
        for (raw in cases) {
            val case = GeometryFixtures.map(raw)
            val boardSize = GeometryFixtures.num(case["boardSize"]).toInt()
            val margin = GeometryFixtures.num(case["margin"])
            val corners = GeometryFixtures.list(case["corners"]).map { GeometryFixtures.point(it) }
            val h = computeHomography(corners, boardSize, margins4(margin))
            assertEquals(1.0, h.get(2, 2)[0], 1e-12, "getPerspectiveTransform normalizes H[2][2]")
            val expected = GeometryFixtures.list(case["h"]).map { GeometryFixtures.list(it) }
            for (r in 0 until 3) {
                for (c in 0 until 3) {
                    val e = GeometryFixtures.num(expected[r][c])
                    val a = h.get(r, c)[0]
                    assertTrue(
                        GeometryFixtures.close(e, a),
                        "H[$r][$c] bs=$boardSize margin=$margin: expected $e, got $a",
                    )
                }
            }
        }
    }

    @Test
    fun `margin zero maps the four corners onto the playing field corners`() {
        val bs = 800
        val corners = squareish()
        val mapped = applyH(computeHomography(corners, bs, margins4(0.0)), corners)
        val want = listOf(0.0 to 0.0, bs.toDouble() to 0.0, bs.toDouble() to bs.toDouble(), 0.0 to bs.toDouble())
        for (i in want.indices) {
            assertEquals(want[i].first, mapped[i][0], 1e-3, "corner $i x")
            assertEquals(want[i].second, mapped[i][1], 1e-3, "corner $i y")
        }
    }

    @Test
    fun `a positive margin pushes the marker points outside the playing field`() {
        val bs = 800
        val m = 0.06 * bs
        val corners = squareish()
        val mapped = applyH(computeHomography(corners, bs, margins4(0.06)), corners)
        assertEquals(-m, mapped[0][0], 1e-3)
        assertEquals(-m, mapped[0][1], 1e-3)
        assertEquals(bs + m, mapped[2][0], 1e-3)
        assertEquals(bs + m, mapped[2][1], 1e-3)
    }

    @Test
    fun `every resolve corners fixture row matches`() {
        val rows = GeometryFixtures.jsonl("_geometry/resolve_corners.jsonl")
        assertTrue(rows.size >= 17, "expected the 17 synthetic marker sets, got ${rows.size}")
        var nullRows = 0
        for (row in rows) {
            val name = row["name"] as String
            val boardSize = GeometryFixtures.num(row["boardSize"]).toInt()
            val points =
                GeometryFixtures.map(row["pointsById"]).entries.associate { (k, v) ->
                    k.toInt() to GeometryFixtures.point(v)
                }
            val result = resolveBoardCorners(points, boardSize)
            if (row["corners"] == null) {
                assertNull(result, "$name must not resolve")
                nullRows++
            } else {
                assertNotNull(result, "$name must resolve")
                val (corners, nUsed) = requireNotNull(result)
                assertEquals(GeometryFixtures.num(row["nUsed"]).toInt(), nUsed, "$name nUsed")
                assertCorners(name, GeometryFixtures.list(row["corners"]).map { GeometryFixtures.point(it) }, corners)
            }
        }
        assertTrue(nullRows >= 2, "fixture must cover the 1-marker and 0-marker null cases")
    }

    @Test
    fun `fewer than two markers never resolve`() {
        assertNull(resolveBoardCorners(emptyMap(), 800))
        assertNull(resolveBoardCorners(mapOf(0 to doubleArrayOf(1.0, 2.0)), 800))
    }

    private fun assertCorners(
        name: String,
        expected: List<DoubleArray>,
        actual: List<DoubleArray>,
    ) {
        assertEquals(expected.size, actual.size, "$name corner count")
        for (i in expected.indices) {
            for (axis in 0..1) {
                assertTrue(
                    GeometryFixtures.close(expected[i][axis], actual[i][axis]),
                    "$name corner $i axis $axis: expected ${expected[i][axis]}, got ${actual[i][axis]}",
                )
            }
        }
    }

    private fun squareish(): List<DoubleArray> =
        listOf(
            doubleArrayOf(120.0, 90.0),
            doubleArrayOf(520.0, 110.0),
            doubleArrayOf(560.0, 480.0),
            doubleArrayOf(80.0, 520.0),
        )

    private fun applyH(
        h: Mat,
        points: List<DoubleArray>,
    ): List<DoubleArray> {
        val src = MatOfPoint2f()
        src.fromList(points.map { Point(it[0], it[1]) })
        val dst = Mat()
        Core.perspectiveTransform(src, dst, h)
        return points.indices.map { i -> doubleArrayOf(dst.get(i, 0)[0], dst.get(i, 0)[1]) }
    }
}
