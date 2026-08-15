package com.chesslab.geometry

import com.chesslab.geometry.testutil.GeometryFixtures
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * The mesh cut against `parity/_geometry/mesh_crop_parity.json` — the SAME fixture
 * `lib/warp.test.ts` pins `squareMeshBox` on, so Kotlin and TS cut identical rectangles.
 */
class MeshCropParityTest {
    private val fixture = GeometryFixtures.jsonl("_geometry/mesh_crop_parity.json").single()

    private val axes =
        GeometryFixtures.map(fixture["mesh"]).let { lines ->
            listOf("x", "y", "tx", "ty", "cx", "cy").map { name ->
                GeometryFixtures.list(lines[name]).map(GeometryFixtures::num).toDoubleArray()
            }
        }

    private val mesh = GridMesh(axes[0], axes[1], axes[2], axes[3])

    private val curved = GridMesh(axes[0], axes[1], axes[2], axes[3], axes[4], axes[5])

    private val geom =
        BoardGeometry(
            boardSize = GeometryFixtures.num(fixture["boardSize"]).toInt(),
            padSide = GeometryFixtures.num(fixture["padSide"]),
            padUp = GeometryFixtures.num(fixture["padUp"]),
            whitePov = fixture["whitePov"] as Boolean,
        )

    @Test
    fun `all 64 mesh boxes match the shared fixture`() {
        val boxes = GeometryFixtures.map(fixture["boxes"])
        assertEquals(64, boxes.size)
        for ((square, expected) in boxes) {
            val want = GeometryFixtures.list(expected).map(GeometryFixtures::num).toDoubleArray()
            assertArrayEquals(want, meshCropBoxExact(square, geom, mesh), TOL, "box of $square")
        }
    }

    @Test
    fun `all 64 tilted cell quads match the shared fixture`() {
        val quads = GeometryFixtures.map(fixture["quads"])
        assertEquals(64, quads.size)
        for ((square, expected) in quads) {
            val want = GeometryFixtures.list(expected).flatMap { GeometryFixtures.list(it).map(GeometryFixtures::num) }
            assertArrayEquals(want.toDoubleArray(), meshCellQuadExact(square, geom, mesh), TOL, "quad of $square")
        }
    }

    @Test
    fun `all 64 curved cell quads match the shared fixture`() {
        val quads = GeometryFixtures.map(fixture["curvedQuads"])
        assertEquals(64, quads.size)
        for ((square, expected) in quads) {
            val want = GeometryFixtures.list(expected).flatMap { GeometryFixtures.list(it).map(GeometryFixtures::num) }
            assertArrayEquals(want.toDoubleArray(), meshCellQuadExact(square, geom, curved), TOL, "quad of $square")
        }
    }

    @Test
    fun `zero curvature reproduces the corner evaluation, zero tilts the scalar box`() {
        val zeroCurv = GridMesh(mesh.xs, mesh.ys, DoubleArray(9), DoubleArray(9), DoubleArray(9), DoubleArray(9))
        val flatQuad = meshCellQuadExact("e4", geom, GridMesh(mesh.xs, mesh.ys, DoubleArray(9), DoubleArray(9)))
        assertArrayEquals(flatQuad, meshCellQuadExact("e4", geom, zeroCurv), TOL)
    }

    @Test
    fun `zero tilts put the quad's corners on the scalar box`() {
        val flat = GridMesh(mesh.xs, mesh.ys, DoubleArray(9), DoubleArray(9))
        for (square in allSquares()) {
            val box = meshCropBoxExact(square, geom, flat)
            val quad = meshCellQuadExact(square, geom, flat)
            assertArrayEquals(
                doubleArrayOf(box[0], box[1], box[2], box[1], box[2], box[3], box[0], box[3]),
                quad,
                0.0,
                "corners of $square",
            )
        }
    }

    // At the fixture's 928 only: other sizes can flip banker's rounding by one ulp (e.g. 400,
    // 720, 880). Not a fallback claim — quad-path consumers pass mesh == null, never a nominal mesh.
    @Test
    fun `the nominal mesh reproduces squareToCropBox at the fixture's board size`() {
        val nominal = GridMesh(DoubleArray(9) { it / 8.0 }, DoubleArray(9) { it / 8.0 })
        for (square in allSquares()) {
            assertArrayEquals(
                squareToCropBox(square, geom, clamp = false),
                meshCropBox(square, geom, nominal),
                "rounded box of $square",
            )
        }
    }

    private companion object {
        const val TOL = 1e-9
    }
}
