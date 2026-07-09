package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** Golden values harvested from the Python `motion_score` / `_baseline_occlusion_and_shadow`. */
class MotionTest {
    @Test
    fun `motion score matches python golden value`() {
        assertEquals(2.929688, Motion.motionScore(TestImages.grayA(), TestImages.grayB(), 20.0), 1e-6)
        assertEquals(0.0, Motion.motionScore(TestImages.grayA(), TestImages.grayA(), 20.0), 1e-9)
    }

    @Test
    fun `baseline occlusion dilates by one orthogonal neighbour`() {
        val geom = BoardGeometry(TestImages.BS)
        val cur = TestImages.grayA()
        for (y in 24 until 32) for (x in 24 until 40) { // +90 over d5 and e5 cells
            cur.data[y * TestImages.BS + x] = minOf(255, cur.data[y * TestImages.BS + x].px() + 90).toByte()
        }
        val (occ, shadow) = Motion.baselineOcclusionAndShadow(cur, TestImages.grayA(), geom, 80.0)
        assertEquals(setOf("c5", "d4", "d5", "d6", "e4", "e5", "e6", "f5"), occ)
        assertEquals(emptySet<String>(), shadow)
    }

    @Test
    fun `global darkening is shadow everywhere but never occlusion`() {
        val darker = GrayImage(
            TestImages.BS,
            TestImages.BS,
            ByteArray(TestImages.BS * TestImages.BS) {
                maxOf(0, TestImages.grayA().data[it].px() - 45).toByte()
            },
        )
        val (occ, shadow) = Motion.baselineOcclusionAndShadow(darker, TestImages.grayA(), BoardGeometry(TestImages.BS), 80.0)
        assertEquals(emptySet<String>(), occ)
        assertEquals(Squares.all.toSet(), shadow)
    }
}
