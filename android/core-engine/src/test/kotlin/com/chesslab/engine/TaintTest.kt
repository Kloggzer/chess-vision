package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.assertExact
import com.chesslab.engine.parity.assertExactList
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// The occlusion taint latch (`_try_detect` step 2, `tracker.py:2853-2900`) and
// `_cnn_occlusion_filter` (`:1328-1351`).
//
// entry.md invariant 2, this half: an occluded square's z is **ZEROED** — on the taint frame and on
// every frame until the latch releases. The shadow veto (`Vetoes.kt`) does the opposite.
// entry.md invariant 4: latched squares still COUNT toward `maxChanged`.
//
// Scenarios mirrored from `tests/test_move_tracker.py`:
//   test_resting_hand_taints_and_blocks_reanchor (:865)      -> restingHandTaintsAndBlocksReanchor
//   test_taint_persists_without_motion_while_evidence_hot (:878) -> taintPersistsWithoutMotion
//   test_taint_releases_on_motion_or_baseline (:891)         -> taintReleasesOnMotionOrBaseline
//   test_stale_snapshot_does_not_taint (:909)                -> staleSnapshotFallsBackToHeuristic
//   test_occlusion_filter_ignores_old_snapshot (:2813)       -> oldSnapshotIgnored
//   test_hand_over_pieces_keeps_base_truth (:814)            -> handOverPiecesKeepsBaseTruth
//   test_textured_occluder_is_occluded (:2251)               -> texturedOccluderIsOccluded
//   test_flat_hand_needs_chroma_to_be_occlusion (:2262)      -> flatHandNeedsChroma

private const val U8 = 0xFF

private const val BOARD = 400

private const val BGR = 3

private const val MS_PER_S = 1000.0

class TaintTest {
    /**
     * **Named invariant test (entry.md 2).** A tainted square's z is 0.0 after `applyTaints` — on
     * the taint frame AND on every subsequent frame, because the latch re-zeroes it every time.
     * A still hand outlived the 0.4 s hold and surfaced as "change" when the zeroing happened only
     * at taint time (`:2881-2883`).
     */
    @Test
    fun occlusionVetoZeroesZ() {
        val state = handState()
        state.motionOccludedSquares = mutableSetOf("e3", "e4", "e5")
        val z = hotZ("e3", "e4", "e5")

        state.applyTaints(z)

        assertExact(setOf("e3", "e4", "e5"), state.tainted.keys, "the hand must latch")
        for (square in listOf("e3", "e4", "e5")) {
            assertEquals(0.0, z.getValue(square), 0.0, "$square z must be zeroed on the taint frame")
        }
        // Next frame: nothing new is occluded, no motion, evidence still hot -> still latched.
        state.nowS += 1.0
        val next = hotZ("e3", "e4", "e5")
        state.applyTaints(next)
        for (square in listOf("e3", "e4", "e5")) {
            assertEquals(0.0, next.getValue(square), 0.0, "$square z must stay zeroed while latched")
        }
    }

    /**
     * **Named invariant test (entry.md 4).** Latched squares carry no evidence but still count:
     * 03c reads `blockedN = tainted.size`. 3 changed + 4 latched against `maxChanged = 6` must
     * reach the too-much-change gate, and the latched squares must NOT be in `changed`.
     */
    @Test
    fun taintedSquaresCountTowardMaxChanged() {
        val state = handState(maxChanged = 6)
        state.motionOccludedSquares = mutableSetOf("a6", "b6", "c6", "d6")
        val z = hotZ("a6", "b6", "c6", "d6", "e2", "e4", "g1")

        state.applyTaints(z)

        val changed = z.filterValues { it >= state.config.zThr }.keys
        val blockedN = state.tainted.size
        assertEquals(4, blockedN, "every occluded square must be latched")
        assertExact(setOf("e2", "e4", "g1"), changed, "latched squares must not be candidates")
        assertTrue(changed.size + blockedN > state.config.maxChanged, "the gate must trip: 3 + 4 > 6")
    }

    /**
     * **Named invariant test.** A square where the CNN is confident and DISAGREES with the FEN is a
     * real move and must pass through untainted (`:1346-1350`). Tainting it would zero the evidence
     * of the very move being detected.
     */
    @Test
    fun cnnDisagreementIsNotTainted() {
        val state = handState()
        state.cnnRun = true
        // e2 is occupied in the start position; the CNN confidently reports it empty -> a move.
        // a3 is empty and the CNN confidently agrees -> noise. b3 is unconfident -> occlusion.
        state.cnnSnap =
            snapshot(
                state,
                FakeObservation(
                    occupied = mapOf("e2" to false, "a3" to false, "b3" to false),
                    confident = setOf("e2", "a3"),
                ),
            )

        val taint = state.cnnOcclusionFilter(setOf("e2", "a3", "b3"), state.board)

        assertExact(setOf("a3", "b3"), taint, "only agreement and unconfidence are tainted")
        assertFalse("e2" in taint, "a confident CNN/FEN disagreement is a real move")
    }

    /**
     * **Named invariant test.** The latch never releases on the timer alone: expired hold + no
     * motion + still-hot evidence keeps it latched with z zeroed; motion releases it.
     */
    @Test
    fun latchReleaseNeedsMotionOrBaselineReturn() {
        val state = handState()
        state.nowS = 100.0
        state.tainted["e3"] = state.nowS - 5.0
        state.lastMotionTs = 0.0

        val held = hotZ("e3")
        state.applyTaints(held)
        assertTrue("e3" in state.tainted, "an expired taint without motion must survive")
        assertEquals(0.0, held.getValue("e3"), 0.0, "a held square carries no evidence")

        // Motion after the taint was last refreshed -> released at expiry.
        state.lastMotionTs = state.nowS - 1.0
        state.applyTaints(hotZ("e3"))
        assertFalse("e3" in state.tainted, "motion since the taint releases the latch")
    }

    /** `test_resting_hand_taints_and_blocks_reanchor` — the observer's `occluded` class latches. */
    @Test
    fun restingHandTaintsAndBlocksReanchor() {
        val state = handState()
        state.cnnSnap = snapshot(state, FakeObservation(pOccluded = mapOf("e3" to 0.9, "e4" to 0.9)))
        val z = hotZ("e3", "e4")

        state.applyTaints(z)

        assertExact(setOf("e3", "e4"), state.tainted.keys, "the resting hand must latch")
        assertEquals(0.0, z.getValue("e3"), 0.0)
        assertEquals(0.0, z.getValue("e4"), 0.0)
        assertExactList(listOf("e3", "e4"), state.occludedVetoed, "latched squares are occluded for the UI")
    }

    /** `test_taint_persists_without_motion_while_evidence_hot` — a still hand cannot vanish. */
    @Test
    fun taintPersistsWithoutMotion() {
        val state = handState()
        state.nowS = 100.0
        // Last motion long BEFORE the taint was set, hold long expired.
        state.lastMotionTs = state.nowS - 60.0
        state.tainted["e3"] = state.nowS - 5.0

        state.applyTaints(hotZ("e3"))

        assertTrue("e3" in state.tainted, "the latch must survive — no motion since the taint")
    }

    /** `test_taint_releases_on_motion_or_baseline` — both release paths. */
    @Test
    fun taintReleasesOnMotionOrBaseline() {
        val state = handState()
        state.nowS = 100.0

        // A: motion AFTER the taint was last refreshed.
        state.tainted["e3"] = state.nowS - 5.0
        state.lastMotionTs = state.nowS - 1.0
        state.applyTaints(hotZ("e3"))
        assertFalse("e3" in state.tainted, "release path A (motion)")

        // B: no motion since, but the evidence is back to baseline.
        state.tainted["f5"] = state.nowS - 5.0
        state.lastMotionTs = state.nowS - 60.0
        state.applyTaints(hotZ())
        assertFalse("f5" in state.tainted, "release path B (evidence back to baseline)")
    }

    /** `test_stale_snapshot_does_not_taint` — an old observation says nothing about this frame. */
    @Test
    fun staleSnapshotFallsBackToHeuristic() {
        val state = handState()
        state.nowS = 100.0
        state.cnnSnap =
            snapshot(state, FakeObservation(pOccluded = mapOf("e3" to 0.9, "e4" to 0.9)), ageS = 10.0)

        state.applyTaints(hotZ("e3", "e4"))

        assertTrue(state.tainted.isEmpty(), "a stale snapshot must not taint anything")
    }

    /**
     * `test_occlusion_filter_ignores_old_snapshot` — fresh: the CNN agrees with the FEN, so even a
     * single square is tainted as noise. Stale: the `>2 = hand` heuristic, where one square passes
     * and three do not.
     */
    @Test
    fun oldSnapshotIgnored() {
        val state = handState()
        state.cnnRun = true
        state.nowS = 100.0
        val obs = FakeObservation(occupied = mapOf("a3" to false), confident = setOf("a3"))
        state.cnnSnap = snapshot(state, obs)

        assertExact(setOf("a3"), state.cnnOcclusionFilter(setOf("a3"), state.board), "fresh: FEN agreement = noise")

        state.cnnSnap = snapshot(state, obs, ageS = 10.0)
        assertTrue(state.cnnOcclusionFilter(setOf("a3"), state.board).isEmpty(), "stale: one square is not a hand")
        assertExact(
            setOf("a3", "b3", "c3"),
            state.cnnOcclusionFilter(setOf("a3", "b3", "c3"), state.board),
            "stale: >2 squares are a hand",
        )
    }

    /**
     * `test_hand_over_pieces_keeps_base_truth` — 10 changed squares with NO occlusion evidence stay
     * plain candidates: the taint machinery must not invent a latch out of "much change". The
     * too-much-change gate is 03c's, and it is what keeps the base truth intact.
     */
    @Test
    fun handOverPiecesKeepsBaseTruth() {
        val state = handState(maxChanged = 6)
        val squares = listOf("a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1", "a2", "b2")
        val z = hotZ(*squares.toTypedArray())

        state.applyTaints(z)

        assertTrue(state.tainted.isEmpty(), "nothing may latch without occlusion evidence")
        for (square in squares) {
            assertTrue(z.getValue(square) >= state.config.zThr, "$square must keep its evidence")
        }
    }

    /**
     * `test_textured_occluder_is_occluded` — a structured occluder fires the census channel, so the
     * baseline classifier calls it occluded and the taint zeroes its z.
     */
    @Test
    fun texturedOccluderIsOccluded() {
        val ref = smoothTexture(seed = 3L)
        val cur = scrambleSquare(ref, "c3", seed = 11L)
        val result = classify(ref, cur)

        assertTrue("c3" in Squares.maskToSet(result.occluded), "a textured occluder is occluded")
        assertFalse("c3" in Squares.maskToSet(result.shadow), "and it is not a shadow")

        val state = handState()
        state.motionOccludedSquares = Squares.maskToSet(result.occluded).toMutableSet()
        val z = hotZ("c3")
        state.applyTaints(z)
        assertEquals(0.0, z.getValue("c3"), 0.0, "the occluder's evidence must be zeroed")
        assertTrue("c3" in state.tainted, "and latched")
    }

    /**
     * `test_flat_hand_needs_chroma_to_be_occlusion` — a flat skin-toned occluder carries no
     * structure and is darker, so without the colour gamut it is misread as a cast shadow. The
     * chroma-outlier test against the reference gamut is what closes that blind spot.
     */
    @Test
    fun flatHandNeedsChroma() {
        val refBgr = BgrImage(BOARD, BOARD, ByteArray(BOARD * BOARD * BGR) { NEUTRAL_BOARD.toByte() })
        val curBgr = BgrImage(BOARD, BOARD, refBgr.data.copyOf())
        paintSquare(curBgr, "f6", b = 80, g = 100, r = 190)
        val ref = grayOf(refBgr)
        val cur = grayOf(curBgr)
        val geom = PlaneGeometry(BOARD, BOARD, BOARD, true)
        val gamut = requireNotNull(boardColorGamut(planesOf(refBgr), geom)) { "the gamut must build" }

        val blind = classify(ref, cur)
        assertTrue("f6" in Squares.maskToSet(blind.shadow), "without chroma it reads as a shadow")
        assertFalse("f6" in Squares.maskToSet(blind.occluded), "that is the blind spot")

        val planes = planesOf(curBgr)
        val seen =
            baselineOcclusionAndShadow(
                cur,
                ref,
                squareBoxes(BOARD, true),
                BaselineParams(BOARD, BASELINE_ABS_THR, true),
                BaselineEvidence(
                    refCodes = censusTransform(ref, out = ByteArray(BOARD * BOARD)),
                    occlCensusThr = OCCL_CENSUS_THR,
                    curLab = planes.lab,
                    curHsv = planes.hsv,
                    gamut = gamut,
                    colorThr = OCCLUSION_COLOR_THR,
                ),
            )
        assertTrue("f6" in Squares.maskToSet(seen.occluded), "the chroma outlier makes it an occluder")
        assertFalse("f6" in Squares.maskToSet(seen.shadow), "and no longer a shadow")
    }

    /**
     * Parity: the clips replay with `cnn_run=None` and quiet detection frames, so Python's
     * `_tainted` is empty on **every** emitted frame (969 of them) and `applyTaints` must leave z
     * untouched there. A port that taints spuriously fails here immediately.
     */
    @Test
    fun taintStaysEmptyOnEveryFixtureFrame() {
        var checked = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val state = EngineState(clip.meta.effectiveConfig.toTrackerConfig(), STARTPOS, clip.meta.whitePov)
            for (frame in clip.frames) {
                val tierB = requireNotNull(frame.tierB)
                assertTrue(tierB.tainted.isEmpty(), "$name/${frame.frame} fixture taint changed — re-read this test")
                val tierA = frame.tierA ?: continue
                state.nowS = frame.frame.toDouble()
                val z = tierA.zFused.toMutableMap()
                val before = LinkedHashMap(z)

                state.applyTaints(z)

                assertTrue(state.tainted.isEmpty(), "$name/${frame.frame} nothing may latch")
                for (square in Squares.ALL) {
                    assertEquals(before.getValue(square), z.getValue(square), 0.0, "$name/${frame.frame} $square z")
                }
                checked++
            }
        }
        assertTrue(checked >= MIN_TIER_A_FRAMES, "only $checked tier-A frames replayed")
    }

    /** The dilated/core keep-alive maps are pruned by `nowS`, never by frame count (`:2897-2900`). */
    @Test
    fun expiryMapsArePrunedByTheEngineClock() {
        val state = handState()
        state.nowS = 10.0
        state.occlusionExpiry["a1"] = 9.9
        state.occlusionExpiry["a2"] = 10.5
        state.occlCoreExpiry["a1"] = 9.9
        state.occlCoreExpiry["a3"] = 10.5

        state.applyTaints(hotZ())

        assertExact(setOf("a2"), state.occlusionExpiry.keys, "expired dilated entries must go")
        assertExact(setOf("a3"), state.occlCoreExpiry.keys, "expired core entries must go")
    }

    // -- helpers -----------------------------------------------------------------------------------

    private fun handState(maxChanged: Int = 6): EngineState {
        val state = EngineState(testConfig(boardSize = BOARD, maxChanged = maxChanged), STARTPOS, whitePov = true)
        state.nowS = 10.0
        return state
    }

    /** A z map with every square cold except the named ones. */
    private fun hotZ(vararg hot: String): MutableMap<String, Double> {
        val z = LinkedHashMap<String, Double>(Squares.COUNT)
        for (square in Squares.ALL) z[square] = 0.0
        for (square in hot) z[square] = Z_HOT
        return z
    }

    private fun snapshot(
        state: EngineState,
        obs: CnnObservation,
        ageS: Double = 0.0,
    ) = CnnSnapshot(
        obs = obs,
        seq = 0,
        tsMs = ((state.nowS - ageS) * MS_PER_S).toLong(),
        inferMs = 0.0,
        warped = null,
        gray = null,
        fen = state.board.fen(),
    )

    private fun classify(
        ref: GrayImage,
        cur: GrayImage,
    ) = baselineOcclusionAndShadow(
        cur,
        ref,
        squareBoxes(BOARD, true),
        BaselineParams(BOARD, BASELINE_ABS_THR, true),
        BaselineEvidence(
            refCodes = censusTransform(ref, out = ByteArray(BOARD * BOARD)),
            occlCensusThr = OCCL_CENSUS_THR,
        ),
    )

    private fun planesOf(image: BgrImage): ColorPlanes {
        val lab = ByteArray(image.data.size)
        val hsv = ByteArray(image.data.size)
        bgrToLab(image.data, image.width, image.height, lab)
        bgrToHsv(image.data, image.width, image.height, hsv)
        return ColorPlanes(lab, hsv)
    }

    /** `cv2.cvtColor(bgr, COLOR_BGR2GRAY)` for the flat patches this test builds. */
    private fun grayOf(image: BgrImage): GrayImage {
        val out = ByteArray(image.width * image.height)
        for (i in out.indices) {
            val b = image.data[i * BGR].toInt() and U8
            val g = image.data[i * BGR + 1].toInt() and U8
            val r = image.data[i * BGR + 2].toInt() and U8
            out[i] = Math.rint(GRAY_B * b + GRAY_G * g + GRAY_R * r).toInt().toByte()
        }
        return GrayImage(image.width, image.height, out)
    }

    private fun paintSquare(
        image: BgrImage,
        square: String,
        b: Int,
        g: Int,
        r: Int,
    ) {
        val box = squareRegion(square, BOARD, true)
        for (y in (box[1] - HALO).coerceAtLeast(0) until (box[3] + HALO).coerceAtMost(BOARD)) {
            for (x in (box[0] - HALO).coerceAtLeast(0) until (box[2] + HALO).coerceAtMost(BOARD)) {
                val i = (y * BOARD + x) * BGR
                image.data[i] = b.toByte()
                image.data[i + 1] = g.toByte()
                image.data[i + 2] = r.toByte()
            }
        }
    }

    /** Python's `cv2.GaussianBlur(noise, (5, 5), 0)` — a realistically smooth board texture. */
    private fun smoothTexture(seed: Long): GrayImage {
        val rng = java.util.Random(seed)
        val plane = ByteArray(BOARD * BOARD) { (LO_TEXTURE + rng.nextInt(HI_TEXTURE - LO_TEXTURE)).toByte() }
        return GrayImage(BOARD, BOARD, gauss5(gauss5(plane, horizontal = true), horizontal = false))
    }

    /** One separable pass of the `[1,4,6,4,1]/16` kernel with BORDER_REFLECT_101. */
    private fun gauss5(
        plane: ByteArray,
        horizontal: Boolean,
    ): ByteArray {
        val out = ByteArray(plane.size)
        for (y in 0 until BOARD) {
            for (x in 0 until BOARD) {
                out[y * BOARD + x] = gaussPixel(plane, x, y, horizontal)
            }
        }
        return out
    }

    private fun gaussPixel(
        plane: ByteArray,
        x: Int,
        y: Int,
        horizontal: Boolean,
    ): Byte {
        var sum = 0
        for (k in -2..2) {
            val p = (if (horizontal) x else y) + k
            val q =
                if (p < 0) {
                    -p
                } else if (p >= BOARD) {
                    2 * BOARD - 2 - p
                } else {
                    p
                }
            val idx = if (horizontal) y * BOARD + q else q * BOARD + x
            sum += GAUSS5[k + 2] * (plane[idx].toInt() and U8)
        }
        return ((sum + GAUSS5_HALF) / GAUSS5_SUM).toByte()
    }

    private fun scrambleSquare(
        image: GrayImage,
        square: String,
        seed: Long,
    ): GrayImage {
        val out = GrayImage(BOARD, BOARD, image.data.copyOf())
        val rng = java.util.Random(seed)
        val box = squareRegion(square, BOARD, true)
        for (y in (box[1] - HALO).coerceAtLeast(0) until (box[3] + HALO).coerceAtMost(BOARD)) {
            for (x in (box[0] - HALO).coerceAtLeast(0) until (box[2] + HALO).coerceAtMost(BOARD)) {
                out.data[y * BOARD + x] = rng.nextInt(U8 + 1).toByte()
            }
        }
        return out
    }

    private companion object {
        const val MIN_TIER_A_FRAMES = 247
        const val Z_HOT = 8.0
        const val BASELINE_ABS_THR = 20.0
        const val OCCL_CENSUS_THR = 24.0
        const val OCCLUSION_COLOR_THR = 1.5
        const val NEUTRAL_BOARD = 170
        const val LO_TEXTURE = 60
        const val HI_TEXTURE = 200
        const val HALO = 8
        val GAUSS5 = intArrayOf(1, 4, 6, 4, 1)
        const val GAUSS5_SUM = 16
        const val GAUSS5_HALF = 8
        const val GRAY_B = 0.114
        const val GRAY_G = 0.587
        const val GRAY_R = 0.299
    }
}

/** Minimal [CnnObservation] stub — the `_FakeObs` of `tests/test_move_tracker.py:918`. */
private class FakeObservation(
    private val occupied: Map<String, Boolean> = emptyMap(),
    private val confident: Set<String> = emptySet(),
    private val pOccluded: Map<String, Double> = emptyMap(),
) : CnnObservation {
    override fun occupied(square: String): Boolean = occupied[square] ?: false

    override fun confident(
        square: String,
        thr: Double,
    ): Boolean = square in confident

    override fun labelConfident(
        square: String,
        thr: Double,
    ): Boolean = square in confident

    override fun label(square: String): String? = null

    override fun conf(square: String): Double = if (square in confident) 1.0 else 0.0

    override fun pOccluded(square: String): Double = pOccluded[square] ?: 0.0

    override fun occupancyOnly(): CnnObservation = this
}
