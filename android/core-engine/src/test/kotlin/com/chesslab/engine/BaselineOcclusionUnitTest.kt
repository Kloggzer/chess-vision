package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

// Hand-written behaviour of phase 01d: the properties the fixtures cannot pin down (empty inputs,
// the four classification branches in isolation, the neighbour topology, the exclusion algebra).

private const val BOARD = 160
private const val REF_LEVEL = 100
private const val ABS_THR = 80.0
private const val OCCL_CENSUS_THR = 24.0
private const val WHITE_POV = true

class BaselineOcclusionUnitTest {
    // -- baseline occlusion / shadow ------------------------------------------------------

    @Test
    fun identicalFramesYieldEmptySets() {
        val ref = flat(REF_LEVEL)
        val result = run(ref, flat(REF_LEVEL))
        assertEquals(emptySet<String>(), Squares.maskToSet(result.occluded))
        assertEquals(emptySet<String>(), Squares.maskToSet(result.shadow))
        assertEquals(emptySet<String>(), Squares.maskToSet(result.core))
    }

    @Test
    fun structuredSquareIsOccludedAndOnlyTheCoreStaysUndilated() {
        val ref = flat(REF_LEVEL)
        val cur = flat(REF_LEVEL)
        checkerboard(cur, "d4")
        val result = run(ref, cur)

        assertEquals(setOf("d4"), Squares.maskToSet(result.core), "raw core must be the single square")
        assertEquals(1, Squares.maskToSet(result.core).size)
        assertEquals(
            setOf("d4", "d3", "d5", "c4", "e4"),
            Squares.maskToSet(result.occluded),
            "dilation adds exactly the four orthogonal neighbours",
        )
        for (sq in listOf("d3", "d5", "c4", "e4")) {
            assertTrue(sq !in Squares.maskToSet(result.core), "$sq must not be in the raw core")
        }
    }

    @Test
    fun flatDarkerSquareIsShadowAndLeavesTheCoreEmpty() {
        val ref = flat(REF_LEVEL)
        val cur = flat(REF_LEVEL)
        fill(cur, "d4", 10)
        val result = run(ref, cur)

        assertEquals(emptySet<String>(), Squares.maskToSet(result.core), "a cast shadow is not an occluder")
        assertEquals(emptySet<String>(), Squares.maskToSet(result.occluded))
        assertTrue("d4" in Squares.maskToSet(result.shadow))
    }

    @Test
    fun flatBrighterSquareIsOccludedNotShadow() {
        val ref = flat(REF_LEVEL)
        val cur = flat(REF_LEVEL)
        fill(cur, "d4", 200)
        val result = run(ref, cur)

        assertEquals(setOf("d4"), Squares.maskToSet(result.core), "an unknown flat brightener is occlusion")
        assertTrue("d4" !in Squares.maskToSet(result.shadow))
    }

    @Test
    fun weakDarkeningIsShadow() {
        val ref = flat(REF_LEVEL)
        val cur = flat(REF_LEVEL)
        // absdiff 50 stays below absThr = 80, but the 50-level drop exceeds absThr / 2 = 40.
        fill(cur, "d4", REF_LEVEL - 50)
        val result = run(ref, cur)

        assertEquals(emptySet<String>(), Squares.maskToSet(result.core))
        assertTrue("d4" in Squares.maskToSet(result.shadow))
    }

    @Test
    fun shadowAndOccludedAreDisjointAfterDilation() {
        val ref = flat(REF_LEVEL)
        val cur = flat(REF_LEVEL)
        checkerboard(cur, "d4")
        fill(cur, "d5", REF_LEVEL - 50) // weak darkening right next to the occluder
        val result = run(ref, cur)

        assertTrue("d5" in Squares.maskToSet(result.occluded), "d5 is dilated into the occluded set")
        for (i in 0 until Squares.COUNT) {
            assertTrue(!(result.shadow[i] && result.occluded[i]), "${Squares.ALL[i]} is in both sets")
        }
    }

    @Test
    fun neighboursAreOrthogonalOnly() {
        assertEquals(setOf("a2", "b1"), names(SQ_NEIGHBOURS[Squares.index("a1")]))
        assertEquals(setOf("a5", "a3", "b4"), names(SQ_NEIGHBOURS[Squares.index("a4")]))
        assertEquals(setOf("d5", "d3", "c4", "e4"), names(SQ_NEIGHBOURS[Squares.index("d4")]))
        assertEquals(2, SQ_NEIGHBOURS[Squares.index("a1")].size)
        assertEquals(3, SQ_NEIGHBOURS[Squares.index("a4")].size)
        assertEquals(4, SQ_NEIGHBOURS[Squares.index("d4")].size)
        assertTrue("c5" !in names(SQ_NEIGHBOURS[Squares.index("d4")]), "diagonals must never appear")
        for (i in 0 until Squares.COUNT) {
            assertTrue(i !in SQ_NEIGHBOURS[i].toList(), "${Squares.ALL[i]} is its own neighbour")
        }
    }

    // -- SquareNoise -----------------------------------------------------------------------

    @Test
    fun nullExcludeLearnsEverySquare() {
        val noise = SquareNoise()
        noise.update(DoubleArray(Squares.COUNT) { 10.0 })
        for (i in 0 until Squares.COUNT) {
            assertEquals(10.0 * NOISE_ALPHA_DEFAULT, noise.mean[i], 1e-12, Squares.ALL[i])
        }
    }

    @Test
    fun excludedSquareLearnsNothingAtScaleZero() {
        val noise = SquareNoise()
        val exclude = Squares.setToMask(listOf("d4"))
        val i = Squares.index("d4")
        val meanBefore = noise.mean[i]
        val stdBefore = noise.std[i]

        noise.update(DoubleArray(Squares.COUNT) { 42.0 }, exclude)

        assertEquals(meanBefore, noise.mean[i], 0.0, "excluded mean must be bit-identical")
        assertEquals(stdBefore, noise.std[i], 0.0, "excluded std must be bit-identical")
        assertTrue(noise.mean[Squares.index("e4")] > 0.0, "unexcluded squares still learn")
    }

    @Test
    fun slowLaneMovesByExactlyOneEighth() {
        val open = SquareNoise(initStd = CENSUS_NOISE_INIT_STD, stdFloor = CENSUS_NOISE_STD_FLOOR)
        val slow = SquareNoise(initStd = CENSUS_NOISE_INIT_STD, stdFloor = CENSUS_NOISE_STD_FLOOR)
        val diffs = DoubleArray(Squares.COUNT) { 16.0 }
        val i = Squares.index("d4")

        open.update(diffs)
        slow.update(diffs, Squares.setToMask(listOf("d4")), CENSUS_NOISE_EXCLUDE_ALPHA_SCALE)

        assertEquals(open.mean[i] * CENSUS_NOISE_EXCLUDE_ALPHA_SCALE, slow.mean[i], 1e-12)
        assertTrue(slow.mean[i] > 0.0, "the census lane must not deadlock on excluded squares")
    }

    @Test
    fun stdNeverDropsBelowTheFloor() {
        val noise = SquareNoise()
        repeat(500) { noise.update(DoubleArray(Squares.COUNT)) }
        for (i in 0 until Squares.COUNT) {
            assertTrue(noise.std[i] >= NOISE_STD_FLOOR_DEFAULT, "${Squares.ALL[i]} std ${noise.std[i]}")
        }
        val census = SquareNoise(initStd = CENSUS_NOISE_INIT_STD, stdFloor = CENSUS_NOISE_STD_FLOOR)
        repeat(500) { census.update(DoubleArray(Squares.COUNT)) }
        assertTrue(census.std.all { it >= CENSUS_NOISE_STD_FLOOR })
        assertTrue(census.std.all { it < NOISE_STD_FLOOR_DEFAULT }, "the census floor is lower than the gray one")
    }

    @Test
    fun freshModelScoresZeroDiffAsZero() {
        val out = SquareNoise().z(DoubleArray(Squares.COUNT), DoubleArray(Squares.COUNT))
        for (i in 0 until Squares.COUNT) {
            assertEquals(0.0, out[i], 0.0, Squares.ALL[i])
        }
    }

    // -- motionScore -----------------------------------------------------------------------

    @Test
    fun motionScoreIsAPercentage() {
        val a = ByteArray(1000) { 0 }
        assertEquals(0.0, motionScore(a, a.copyOf()), 0.0)
        assertEquals(100.0, motionScore(a, ByteArray(1000) { 255.toByte() }), 0.0)
        // Desk wobble: a uniform +19 shift stays below px_thr = 20 (strict >) -> nothing moved.
        assertEquals(0.0, motionScore(a, ByteArray(1000) { 19 }), 0.0)
        assertEquals(100.0, motionScore(a, ByteArray(1000) { 21 }), 0.0)
        assertEquals(0.0, motionScore(a, ByteArray(1000) { 20 }), 0.0, "the comparison is strict >")
        val half = ByteArray(1000) { if (it % 2 == 0) 0 else 255.toByte() }
        assertEquals(50.0, motionScore(a, half), 1e-12)
        assertEquals(0.0, motionScore(ByteArray(0), ByteArray(0)), 0.0)
    }

    @Test
    fun motionScoreRejectsMismatchedSizes() {
        assertThrows<IllegalArgumentException> { motionScore(ByteArray(4), ByteArray(5)) }
    }

    // -- helpers ---------------------------------------------------------------------------

    private fun run(
        ref: ByteArray,
        cur: ByteArray,
    ): BaselineResult {
        val refImage = GrayImage(BOARD, BOARD, ref)
        val boxes = squareBoxes(BOARD, WHITE_POV)
        return baselineOcclusionAndShadow(
            GrayImage(BOARD, BOARD, cur),
            refImage,
            boxes,
            BaselineParams(BOARD, ABS_THR, WHITE_POV),
            BaselineEvidence(
                refCodes = censusTransform(refImage, out = censusBuffer(BOARD, BOARD)),
                occlCensusThr = OCCL_CENSUS_THR,
            ),
        )
    }

    private fun flat(level: Int) = ByteArray(BOARD * BOARD) { level.toByte() }

    private fun fill(
        plane: ByteArray,
        square: String,
        level: Int,
    ) {
        forEachPixel(plane, square) { _, _, index -> plane[index] = level.toByte() }
    }

    /** Dark/mid checkerboard: strong absdiff, strong census change, and DARKER than the reference. */
    private fun checkerboard(
        plane: ByteArray,
        square: String,
    ) {
        forEachPixel(plane, square) { x, y, index ->
            plane[index] = (if ((x + y) % 2 == 0) 0 else 180).toByte()
        }
    }

    private fun forEachPixel(
        plane: ByteArray,
        square: String,
        block: (Int, Int, Int) -> Unit,
    ) {
        val box = squareRegion(square, BOARD, WHITE_POV)
        require(plane.size == BOARD * BOARD) { "plane size ${plane.size}" }
        require(box[2] > box[0] && box[3] > box[1]) { "degenerate box for $square" }
        for (y in box[1] until box[3]) {
            for (x in box[0] until box[2]) {
                block(x, y, y * BOARD + x)
            }
        }
    }

    private fun names(indices: IntArray): Set<String> = indices.map { Squares.ALL[it] }.toSet()
}
