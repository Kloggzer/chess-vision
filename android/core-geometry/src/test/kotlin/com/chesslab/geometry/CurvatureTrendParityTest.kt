package com.chesslab.geometry

import com.chesslab.geometry.testutil.GeometryFixtures
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Test

/**
 * [smoothMeshCurvature] against `parity/_geometry/curvature_trend_parity.json` — the REAL poisoned
 * mesh of rg-2026-08-15-22-57-06 (pawn feet fake cy[2] = -0.070, a +11.6 px arch in the finished
 * board), healed identically here and in `calibration.smooth_mesh_curvature`, which reads the
 * same file in `tests/test_mesh_crop.py`.
 */
class CurvatureTrendParityTest {
    private val fixture = GeometryFixtures.jsonl("_geometry/curvature_trend_parity.json").single()

    private val axes =
        GeometryFixtures.map(fixture["mesh"]).let { lines ->
            listOf("x", "y", "tx", "ty", "cx", "cy").map { name ->
                GeometryFixtures.list(lines[name]).map(GeometryFixtures::num).toDoubleArray()
            }
        }

    @Test
    fun `the poisoned lines take the trend exactly as the shared fixture says`() {
        val healed = smoothMeshCurvature(GridMesh(axes[0], axes[1], axes[2], axes[3], axes[4], axes[5]))
        assertArrayEquals(doubles(fixture["healedCx"]), healed.cx!!, TOL)
        assertArrayEquals(doubles(fixture["healedCy"]), healed.cy!!, TOL)
    }

    @Test
    fun `a genuinely linear profile survives untouched`() {
        val lin = doubles(fixture["linearCurv"])
        val healed = smoothMeshCurvature(GridMesh(axes[0], axes[1], axes[2], axes[3], lin.copyOf(), lin.copyOf()))
        assertArrayEquals(lin, healed.cx!!, TOL)
    }

    @Test
    fun `a mesh without curvature passes through unchanged`() {
        val mesh = GridMesh(axes[0], axes[1], axes[2], axes[3])
        assertArrayEquals(mesh.xs, smoothMeshCurvature(mesh).xs, TOL)
    }

    private fun doubles(value: Any?): DoubleArray = GeometryFixtures.list(value).map(GeometryFixtures::num).toDoubleArray()

    private companion object {
        const val TOL = 1e-9
    }
}
