package com.chesslab.engine

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.random.Random

/**
 * Census as an EVIDENCE channel (mirrors tests/test_move_tracker.py TestStructuralEvidence
 * + the global-jitter median-normalization regression of TestBaselineOcclusionClassifier).
 */
class StructuralEvidenceTest {
    private val geom = BoardGeometry(Phase00Images.BS)

    @Test
    fun `dark on dark piece seen by census not gray, fused max lifts exactly one square`() {
        val rng = Random(42)
        val ref = Phase00Images.flatGray(40)
        val cur = Phase00Images.copyOf(ref)
        Phase00Images.texturedPiece(cur, "e4", 20..33, rng)
        val diffs = SquareDiff.normalizeDiffs(SquareDiff.perSquareDiff(ref, cur, geom))
        val zGray = SquareNoise().z(diffs)
        val cens = Census.perSquareChange(ref, cur, geom, refCodes = Census.transform(ref))
        val zCens = SquareNoise(initStd = 4.0, stdFloor = 2.0).z(cens)
        assertTrue(zGray.getValue("e4") < 3.0, "gray channel should miss dark-on-dark")
        assertTrue(zCens.getValue("e4") >= 3.0, "census channel should see the structure")
        val hot = Squares.all.filter { maxOf(zGray.getValue(it), zCens.getValue(it)) >= 3.0 }
        assertEquals(listOf("e4"), hot)
    }

    @Test
    fun `multiplicative shadow is census quiet`() {
        val ref = Phase00Images.texturedBoard()
        val cur = Phase00Images.copyOf(ref)
        Phase00Images.darkenRegion(cur, "d5", 0.6)
        val cens = Census.perSquareChange(ref, cur, geom, refCodes = Census.transform(ref))
        val zCens = SquareNoise(initStd = 4.0, stdFloor = 2.0).z(cens)
        assertTrue(zCens.getValue("d5") < 3.0, "shadow must not produce structural evidence")
    }

    @Test
    fun `global jitter is median normalized before z scoring`() {
        val rng = Random(5)
        val ref = Phase00Images.flatGray(120)
        for (sq in Squares.all.take(16) + Squares.all.drop(48)) {
            Phase00Images.texturedPiece(ref, sq, 30..219, rng)
        }
        val cur = Phase00Images.rolled(ref) // 1 px horizontal wobble
        val cens = Census.perSquareChange(ref, cur, geom, refCodes = Census.transform(ref))
        val noise = SquareNoise(initStd = 4.0, stdFloor = 2.5)
        val rawHot = noise.z(cens).values.count { it >= 3.0 }
        val normHot = noise.z(SquareDiff.normalizeDiffs(cens)).values.count { it >= 3.0 }
        assertTrue(rawHot > 8, "raw census channel should flood on global wobble (got $rawHot)")
        assertTrue(normHot < rawHot / 2, "median norm should strip the global part ($normHot vs $rawHot)")
    }
}
