package com.chesslab.geometry

import com.chesslab.geometry.testutil.GeometryFixtures
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Test

/** The REAL poisoned mesh of rg-2026-08-15-22-57-06 (pawn feet fake cy[2] = -0.070, a +11.6 px
 *  arch), healed identically here and in `calibration.smooth_mesh_curvature` (`tests/test_mesh_crop.py`). */
class CurvatureTrendParityTest {
    private val fixture = GeometryFixtures.jsonl("_geometry/curvature_trend_parity.json").single()

    private val axes = GeometryFixtures.meshAxes(fixture["mesh"])

    @Test
    fun `the poisoned lines take the trend exactly as the shared fixture says`() {
        val healed = smoothMeshCurvature(GridMesh(axes[0], axes[1], axes[2], axes[3], axes[4], axes[5]))
        assertArrayEquals(GeometryFixtures.doubles(fixture["healedCx"]), healed.cx!!, TOL)
        assertArrayEquals(GeometryFixtures.doubles(fixture["healedCy"]), healed.cy!!, TOL)
    }

    @Test
    fun `a genuinely linear profile survives untouched`() {
        val lin = GeometryFixtures.doubles(fixture["linearCurv"])
        val healed = smoothMeshCurvature(GridMesh(axes[0], axes[1], axes[2], axes[3], lin.copyOf(), lin.copyOf()))
        assertArrayEquals(lin, healed.cx!!, TOL)
    }

    @Test
    fun `a mesh without curvature passes through unchanged`() {
        val mesh = GridMesh(axes[0], axes[1], axes[2], axes[3])
        assertArrayEquals(mesh.xs, smoothMeshCurvature(mesh).xs, TOL)
    }

    private companion object {
        const val TOL = 1e-9
    }
}
