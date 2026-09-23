package com.chesslab.geometry

import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

/** Beide Achsen oder keine, Kruemmung nur auf Neigungen: sonst traegt der Verbraucher die fehlende Haelfte als Null weiter. */
class GridMeshShapeTest {
    @Test
    fun `tilts on one axis alone are refused`() {
        assertThrows(IllegalArgumentException::class.java) {
            GridMesh(lines(), lines(), tx = null, ty = lines())
        }
        assertThrows(IllegalArgumentException::class.java) {
            GridMesh(lines(), lines(), tx = lines(), ty = null)
        }
    }

    @Test
    fun `curvature without tilts is refused`() {
        assertThrows(IllegalArgumentException::class.java) {
            GridMesh(lines(), lines(), cx = lines(), cy = lines())
        }
    }

    private fun lines(): DoubleArray = DoubleArray(GRID_LINES_PER_AXIS) { it / BOARD_SIDE_D }
}
