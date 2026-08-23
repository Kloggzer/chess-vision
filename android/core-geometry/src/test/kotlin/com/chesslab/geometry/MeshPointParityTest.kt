package com.chesslab.geometry

import com.chesslab.geometry.testutil.GeometryFixtures
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * [meshPoint] against `parity/_geometry/mesh_crop_parity.json` — the SAME fixture
 * `calibration.mesh_point` and `lib/warp.test.ts` are pinned on, so all three straighten a board
 * identically. It replaced the per-cell boxes and quads this file used to pin: those were a second
 * answer to the question the map already answers, and the store is now pulled straight once.
 */
class MeshPointParityTest {
    private val fixture = GeometryFixtures.jsonl("_geometry/mesh_crop_parity.json").single()

    private val axes =
        GeometryFixtures.map(fixture["mesh"]).let { lines ->
            listOf("x", "y", "tx", "ty", "cx", "cy").map { name ->
                GeometryFixtures.list(lines[name]).map(GeometryFixtures::num).toDoubleArray()
            }
        }

    private val mesh = GridMesh(axes[0], axes[1], axes[2], axes[3])

    private val curved = GridMesh(axes[0], axes[1], axes[2], axes[3], axes[4], axes[5])

    private fun check(
        key: String,
        with: GridMesh,
    ) {
        val rows = GeometryFixtures.list(fixture[key])
        assertEquals(100, rows.size)
        for (row in rows) {
            val v = GeometryFixtures.list(row).map(GeometryFixtures::num)
            val got = meshPoint(v[0], v[1], with)
            assertEquals(v[2], got[0], TOL, "x at (${v[0]}, ${v[1]})")
            assertEquals(v[3], got[1], TOL, "y at (${v[0]}, ${v[1]})")
        }
    }

    @Test
    fun `tilted lines map exactly as the shared fixture says`() = check("meshPoints", mesh)

    /** Curvature rides on the tilts, and a board pixel outside the field must map too. */
    @Test
    fun `curved lines map exactly as the shared fixture says`() = check("curvedMeshPoints", curved)

    private companion object {
        const val TOL = 1e-9
    }
}
