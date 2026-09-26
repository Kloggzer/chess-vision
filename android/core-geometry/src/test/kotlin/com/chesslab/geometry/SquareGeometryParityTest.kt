package com.chesslab.geometry

import com.chesslab.geometry.testutil.GeometryFixtures
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** The file `tests/test_square_geometry_parity.py` reads too. */
class SquareGeometryParityTest {
    private val cases =
        GeometryFixtures
            .list(
                GeometryFixtures.map(GeometryFixtures.jsonObject("_geometry/square_geometry_parity.json"))["cases"],
            ).map { GeometryFixtures.map(it) }

    private fun geom(case: Map<String, Any?>) =
        BoardGeometry(
            boardSize = GeometryFixtures.num(case["boardSize"]).toInt(),
            whitePov = case["whitePov"] as Boolean,
            padSide = GeometryFixtures.num(case["padSide"]),
        )

    private fun where(case: Map<String, Any?>) = "${case["square"]}@${case["boardSize"]}/${case["padSide"]}/pov=${case["whitePov"]}"

    @Test
    fun `crop box, border and centre match the shared fixture`() {
        assertTrue(cases.size >= 100, "fixture shrank: ${cases.size}")
        for (case in cases) {
            val g = geom(case)
            val square = case["square"] as String
            assertEquals(GeometryFixtures.num(case["cropBorderPx"]).toInt(), cropBorderPx(g), "border ${where(case)}")
            assertEquals(GeometryFixtures.ints(case["box"]), squareToCropBox(square, g, clamp = true).toList(), where(case))
            assertEquals(
                GeometryFixtures.ints(case["boxUnclamped"]),
                squareToCropBox(square, g, clamp = false).toList(),
                "unclamped ${where(case)}",
            )
            assertEquals(GeometryFixtures.ints(case["center"]), squareCenter(square, g).toList(), "centre ${where(case)}")
            val colRow = squareToColRow(square, g.whitePov)
            assertEquals(GeometryFixtures.num(case["col"]).toInt() to GeometryFixtures.num(case["row"]).toInt(), colRow)
        }
    }

    @Test
    fun `square regions match the shared fixture`() {
        val inset =
            GeometryFixtures.num(
                GeometryFixtures.map(GeometryFixtures.jsonObject("_geometry/square_geometry_parity.json"))["inset"],
            )
        for (case in cases) {
            val square = case["square"] as String
            val bs = GeometryFixtures.num(case["boardSize"]).toInt()
            val pov = case["whitePov"] as Boolean
            assertEquals(GeometryFixtures.ints(case["region"]), squareRegion(square, bs, pov, inset).toList(), where(case))
            assertEquals(
                GeometryFixtures.ints(case["regionExtendUp25"]),
                squareRegion(square, bs, pov, inset, extendUp = 0.25).toList(),
                "extendUp ${where(case)}",
            )
        }
    }

    /** Python's `round` is half-to-EVEN; `Math.round` would make this box 11 px wide, not 10. */
    @Test
    fun `a tied endpoint rounds down, not up`() {
        val tied = cases.filter { GeometryFixtures.list(it["boxExact"])[2].let { v -> GeometryFixtures.num(v) % 1.0 == 0.5 } }
        assertTrue(tied.isNotEmpty(), "no tied endpoint in the fixture")
        for (case in tied) {
            val x1 = squareToCropBox(case["square"] as String, geom(case), clamp = false)[2]
            assertEquals(GeometryFixtures.num(GeometryFixtures.list(case["boxExact"])[2]).toInt(), x1, where(case))
        }
    }
}
