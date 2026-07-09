package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.random.Random

/**
 * `Motion.baselineOcclusionAndShadow` in structural mode: strong absdiff is classified by
 * WHAT changed (mirrors tests/test_move_tracker.py TestBaselineOcclusionClassifier).
 */
class BaselineOcclusionClassifierTest {
    private val geom = BoardGeometry(Phase00Images.BS)
    private val absThr = 20.0

    private fun classify(
        ref: GrayImage,
        cur: GrayImage,
        structural: Motion.StructuralInputs? = null,
    ): Motion.OcclusionShadow =
        Motion.baselineOcclusionAndShadow(
            cur,
            ref,
            geom,
            absThr,
            structural ?: Motion.StructuralInputs(Census.transform(ref), occlCensusThr = 24.0),
        )

    @Test
    fun `hard cast shadow is shadow not occlusion, legacy mode reproduces the old bug`() {
        val ref = Phase00Images.texturedBoard()
        val cur = Phase00Images.copyOf(ref)
        Phase00Images.darkenRegion(cur, "e4", 0.5)
        val result = classify(ref, cur)
        assertFalse("e4" in result.occluded, "hard shadow must not latch as occlusion")
        assertTrue("e4" in result.shadow)
        val legacy = classify(ref, cur, Motion.StructuralInputs(Census.transform(ref), occlCensusThr = 0.0))
        assertTrue("e4" in legacy.occluded, "legacy mode conflates shadow with occlusion")
    }

    @Test
    fun `textured occluder is occluded`() {
        val rng = Random(11)
        val ref = Phase00Images.texturedBoard()
        val cur = Phase00Images.copyOf(ref)
        Phase00Images.texturedPiece(cur, "c3", 0..254, rng, radius = 24)
        val result = classify(ref, cur)
        assertTrue("c3" in result.occluded)
        assertFalse("c3" in result.shadow)
    }

    @Test
    fun `flat hand needs the chroma gamut to be occlusion`() {
        val refBgr = Phase00Images.flatBgr(170, 170, 170)
        val gamut = OcclusionGamut.boardColorGamut(refBgr, geom)
        val curBgr = Phase00Images.flatBgr(170, 170, 170)
        Phase00Images.fillRegionBgr(curBgr, "f6", intArrayOf(80, 100, 190)) // flat skin tone, darker
        val ref = Phase00Images.toGray(refBgr)
        val cur = Phase00Images.toGray(curBgr)
        val blind = classify(ref, cur)
        assertTrue("f6" in blind.shadow && "f6" !in blind.occluded, "without gamut: the blind spot")
        val fixed =
            classify(
                ref,
                cur,
                Motion.StructuralInputs(
                    Census.transform(ref),
                    occlCensusThr = 24.0,
                    curBgr = curBgr,
                    gamut = gamut,
                    colorThr = 1.5,
                ),
            )
        assertTrue("f6" in fixed.occluded)
        assertFalse("f6" in fixed.shadow)
    }

    @Test
    fun `raw core stays piece-like while dilation protects the taint`() {
        val rng = Random(13)
        val ref = Phase00Images.texturedBoard()
        val cur = Phase00Images.copyOf(ref)
        Phase00Images.texturedPiece(cur, "e4", 0..254, rng, radius = 24)
        val result = classify(ref, cur)
        assertTrue("e4" in result.core && result.core.size <= 2, "piece-like core must reach detection")
        assertTrue(result.occluded.size >= 4, "dilation still protects the z-taint")
    }
}
