package com.chesslab.geometry

import com.chesslab.geometry.testutil.GeometryFixtures
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Tier A — pure math, no OpenCV. Golden rows come from
 * `parity/_geometry/meta.json -> cropBoxes[] / squareRegions[]` (phase 00b); integers are
 * compared EXACTLY.
 */
class CropBoxTest {
    @Test
    fun `every fixture crop box matches exactly`() {
        val cases = GeometryFixtures.list(GeometryFixtures.geometryMeta()["cropBoxes"])
        assertTrue(cases.isNotEmpty(), "no cropBoxes in the fixture")
        var checked = 0
        for (raw in cases) {
            val case = GeometryFixtures.map(raw)
            val geom =
                BoardGeometry(
                    boardSize = GeometryFixtures.num(case["boardSize"]).toInt(),
                    whitePov = case["whitePov"] as Boolean,
                    padUp = GeometryFixtures.num(case["padUp"]),
                    padSide = GeometryFixtures.num(case["padSide"]),
                )
            val clamp = case["clamp"] as Boolean
            assertEquals(
                GeometryFixtures.num(case["cropBorderPx"]).toInt(),
                cropBorderPx(geom),
                "cropBorderPx for $geom",
            )
            val boxes = GeometryFixtures.map(case["boxes"])
            assertEquals(64, boxes.size)
            for ((square, expected) in boxes) {
                assertEquals(
                    GeometryFixtures.ints(expected),
                    squareToCropBox(square, geom, clamp).toList(),
                    "cropBox $square clamp=$clamp $geom",
                )
                checked++
            }
        }
        assertEquals(cases.size * 64, checked)
    }

    @Test
    fun `every fixture square region matches exactly`() {
        val cases = GeometryFixtures.list(GeometryFixtures.geometryMeta()["squareRegions"])
        assertTrue(cases.isNotEmpty(), "no squareRegions in the fixture")
        for (raw in cases) {
            val case = GeometryFixtures.map(raw)
            val boardSize = GeometryFixtures.num(case["boardSize"]).toInt()
            val whitePov = case["whitePov"] as Boolean
            val inset = GeometryFixtures.num(case["inset"])
            val extendUp = GeometryFixtures.num(case["extendUp"])
            for ((square, expected) in GeometryFixtures.map(case["regions"])) {
                assertEquals(
                    GeometryFixtures.ints(expected),
                    squareRegion(square, boardSize, whitePov, inset, extendUp).toList(),
                    "squareRegion $square bs=$boardSize pov=$whitePov up=$extendUp",
                )
            }
            for ((square, expected) in GeometryFixtures.map(case["centers"])) {
                val geom = BoardGeometry(boardSize = boardSize, whitePov = whitePov)
                assertEquals(
                    GeometryFixtures.ints(expected),
                    squareCenter(square, geom).toList(),
                    "squareCenter $square bs=$boardSize pov=$whitePov",
                )
            }
        }
    }

    @Test
    fun `default geometry crop boxes`() {
        val geom = BoardGeometry()
        assertEquals(200.0, geom.cell)
        assertArrayEquals(intArrayOf(-20, -20, 220, 220), squareToCropBox("a8", geom, clamp = false))
        assertArrayEquals(intArrayOf(0, 0, 220, 220), squareToCropBox("a8", geom, clamp = true))
        assertEquals(1620, squareToCropBox("h1", geom, clamp = false)[2])
        assertEquals(1600, squareToCropBox("h1", geom, clamp = true)[2])
        // max(0.1, padSide, padUp) * cell = 0.10 * 200 = 20 (the phase file's "200" is an
        // arithmetic slip; `_geometry/meta.json -> cropBoxes` agrees with 20).
        assertEquals(20, cropBorderPx(geom))
    }

    @Test
    fun `pad up extends the box upward only and raises the crop border`() {
        val geom = BoardGeometry(padUp = 0.25)
        val flat = squareToCropBox("e4", BoardGeometry(), clamp = false)
        val tall = squareToCropBox("e4", geom, clamp = false)
        assertEquals(flat[0], tall[0])
        assertEquals(flat[2], tall[2])
        assertEquals(flat[3], tall[3])
        assertEquals(flat[1] - 50, tall[1])
        assertEquals(50, cropBorderPx(geom), "0.25 * 200 = 50")
    }

    @Test
    fun `black pov maps a8 onto the h1 box`() {
        val white = BoardGeometry()
        val black = BoardGeometry(whitePov = false)
        assertArrayEquals(
            squareToCropBox("h1", white, clamp = false),
            squareToCropBox("a8", black, clamp = false),
        )
    }

    @Test
    fun `square region tiles the board without gaps at a size not divisible by eight`() {
        // detSize = 800 * 0.5 = 400 is divisible; 321 is the pathological case.
        val region = squareRegion("a1", 321, whitePov = true, inset = 0.0)
        val next = squareRegion("b1", 321, whitePov = true, inset = 0.0)
        assertEquals(region[2], next[0], "cells must abut with inset 0")
        assertEquals(0, region[0])
        assertEquals(321, squareRegion("h1", 321, whitePov = true, inset = 0.0)[2])
    }
}
