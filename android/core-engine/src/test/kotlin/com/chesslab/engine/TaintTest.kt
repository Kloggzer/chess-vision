package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.CnnObservation
import com.chesslab.engine.api.CnnSnapshot
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.assertExactList
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// The occlusion taint latch (`_try_detect` step 2) and `_cnn_occlusion_filter`.
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
     * at taint time.
     */
    @Test
    fun occlusionVetoZeroesZ() {
        val state = handState()
        state.motionOccluded = ofSquares("e3", "e4", "e5")
        state.setZ("e3", "e4", "e5")

        state.applyTaints()

        assertEquals(ofSquares("e3", "e4", "e5"), state.tainted, "the hand must latch")
        state.assertZeroed("e3", "e4", "e5")
        // Next frame: nothing new is occluded, no motion, evidence still hot -> still latched.
        state.nowS += 1.0
        state.setZ("e3", "e4", "e5")
        state.applyTaints()
        state.assertZeroed("e3", "e4", "e5")
    }

    /**
     * **Named invariant test (entry.md 4).** Latched squares carry no evidence but still count:
     * the hypothesis gate reads `blockedN = tainted.countOneBits()`. 3 changed + 4 latched against
     * `maxChanged = 6` must reach the too-much-change gate, and the latched squares must NOT be in
     * `changed`.
     */
    @Test
    fun taintedSquaresCountTowardMaxChanged() {
        val state = handState(maxChanged = 6)
        state.motionOccluded = ofSquares("a6", "b6", "c6", "d6")
        state.setZ("a6", "b6", "c6", "d6", "e2", "e4", "g1")

        state.applyTaints()

        var changed = 0L
        for (i in 0 until Squares.COUNT) {
            if (state.lastZ[i] >= state.config.zThr) changed = changed.with(i)
        }
        val blockedN = state.tainted.countOneBits()
        assertEquals(4, blockedN, "every occluded square must be latched")
        assertEquals(ofSquares("e2", "e4", "g1"), changed, "latched squares must not be candidates")
        assertTrue(changed.countOneBits() + blockedN > state.config.maxChanged, "the gate must trip: 3 + 4 > 6")
    }

    /**
     * **Named invariant test.** A square where the CNN is confident and DISAGREES with the FEN is a
     * real move and must pass through untainted. Tainting it would zero the evidence of the very
     * move being detected.
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

        val taint = state.cnnOcclusionFilter(ofSquares("e2", "a3", "b3"))

        assertEquals(ofSquares("a3", "b3"), taint, "only agreement and unconfidence are tainted")
        assertFalse(taint.has(Squares.index("e2")), "a confident CNN/FEN disagreement is a real move")
    }

    /**
     * **Named invariant test.** The latch never releases on the timer alone: expired hold + no
     * motion + still-hot evidence keeps it latched with z zeroed; motion releases it.
     */
    @Test
    fun latchReleaseNeedsMotionOrBaselineReturn() {
        val state = handState()
        state.nowS = 100.0
        state.latch("e3", expiry = state.nowS - 5.0)
        state.lastMotionTs = 0.0

        state.setZ("e3")
        state.applyTaints()
        assertTrue(state.tainted.has(Squares.index("e3")), "an expired taint without motion must survive")
        state.assertZeroed("e3")

        // Motion after the taint was last refreshed -> released at expiry.
        state.lastMotionTs = state.nowS - 1.0
        state.setZ("e3")
        state.applyTaints()
        assertFalse(state.tainted.has(Squares.index("e3")), "motion since the taint releases the latch")
    }

    /** `test_resting_hand_taints_and_blocks_reanchor` — the observer's `occluded` class latches. */
    @Test
    fun restingHandTaintsAndBlocksReanchor() {
        val state = handState()
        // The hand ARRIVED: motion is fresh, so the plausibility filter lets the head speak.
        state.lastMotionTs = state.nowS
        state.cnnSnap = snapshot(state, FakeObservation(pOccluded = mapOf("e3" to 0.9, "e4" to 0.9)))
        state.setZ("e3", "e4")

        state.applyTaints()

        assertEquals(ofSquares("e3", "e4"), state.tainted, "the resting hand must latch")
        state.assertZeroed("e3", "e4")
        assertExactList(listOf("e3", "e4"), state.occludedVetoed.sortedSquareNames(), "latched squares are occluded")
    }

    /**
     * The model-head plausibility filter (2026-08-14): `real14-80` flags phantom `occluded`
     * squares, and each raw flag used to latch a taint and read as a hand. A LONE flag is not
     * hand-shaped, and a hand-shaped cluster on a board that has been QUIET longer than the
     * observation is fresh cannot be an arriving hand — unless the groove read corroborates a
     * resting one.
     */
    @Test
    fun aLoneOccludedFlagIsAMisreadNotAHand() {
        val state = handState()
        state.lastMotionTs = state.nowS
        state.cnnSnap = snapshot(state, FakeObservation(pOccluded = mapOf("e3" to 0.9)))
        state.setZ("e3")

        state.applyTaints()

        assertEquals(0L, state.tainted, "a lone flag with fresh motion must not latch")
        assertTrue(state.lastZ[Squares.index("e3")] >= state.config.zThr, "e3 keeps its evidence")
    }

    /** The queenside-flank incident: a connected phantom cluster on a quiet board, grid arm silent. */
    @Test
    fun aQuietBoardCannotGrowAHand() {
        val state = handState()
        state.lastMotionTs = 0.0 // nowS is 10.0 — quiet for longer than OBS_MAX_AGE_S
        state.cnnSnap =
            snapshot(state, FakeObservation(pOccluded = mapOf("a3" to 0.9, "a4" to 0.9, "b3" to 0.9, "b4" to 0.9)))
        state.setZ("a3", "a4", "b3", "b4")

        state.applyTaints()

        assertEquals(0L, state.tainted, "phantom flags on a quiet board must not latch")
        assertFalse(state.handInFrame(), "and must not read as a hand in frame")
    }

    /** The grid arm vouches for a hand at REST beyond the motion window (003957's incident shape). */
    @Test
    fun theGrooveReadCarriesARestingHandPastStaleMotion() {
        val state = handState()
        state.lastMotionTs = 0.0
        state.cnnSnap =
            snapshot(
                state,
                FakeObservation(pOccluded = mapOf("e3" to 0.9, "e4" to 0.9)),
                gridOccluded = ofSquares("e3", "e4"),
            )
        state.setZ("e3", "e4")

        state.applyTaints()

        assertEquals(ofSquares("e3", "e4"), state.tainted, "grid corroboration keeps the resting hand latched")
    }

    /** `modelHandShapeFilter=false` restores the raw head — the A/B arm a replay measures against. */
    @Test
    fun theGateOffPositionRestoresTheRawHead() {
        val state = handState()
        state.config = state.config.copy(modelHandShapeFilter = false)
        state.lastMotionTs = 0.0
        state.cnnSnap = snapshot(state, FakeObservation(pOccluded = mapOf("e3" to 0.9)))
        state.setZ("e3")

        state.applyTaints()

        assertEquals(ofSquares("e3"), state.tainted, "the raw head taints a lone quiet flag")
    }

    /** Nicht symmetrisch, und das ist der Punkt: auf demselben Feld gibt der Formfilter AUS die
     *  rohe Menge, der Arm-Schalter AUS gibt nichts. Verwechselt weitet die Ablation den Arm. */
    @Test
    fun theShapeFilterWidensWhereTheArmSwitchSilences() {
        fun handSquares(config: (TrackerConfig) -> TrackerConfig): Long {
            val state = handState()
            state.config = config(state.config)
            state.lastMotionTs = 0.0
            val snap = snapshot(state, FakeObservation(pOccluded = mapOf("e3" to 0.9)))
            state.cnnSnap = snap
            return state.modelHandSquares(snap)
        }

        assertEquals(0L, handSquares { it }, "with both on, a lone quiet flag is not hand-shaped")
        assertEquals(ofSquares("e3"), handSquares { it.copy(modelHandShapeFilter = false) }, "filter off = the RAW head")
        assertEquals(0L, handSquares { it.copy(modelHandArm = false) }, "arm off = nothing, like gridHandGate")
        assertEquals(
            0L,
            handSquares { it.copy(modelHandArm = false, modelHandShapeFilter = false) },
            "the arm switch wins over the filter switch",
        )
    }

    /** `test_taint_persists_without_motion_while_evidence_hot` — a still hand cannot vanish. */
    @Test
    fun taintPersistsWithoutMotion() {
        val state = handState()
        state.nowS = 100.0
        // Last motion long BEFORE the taint was set, hold long expired.
        state.lastMotionTs = state.nowS - 60.0
        state.latch("e3", expiry = state.nowS - 5.0)

        state.setZ("e3")
        state.applyTaints()

        assertTrue(state.tainted.has(Squares.index("e3")), "the latch must survive — no motion since the taint")
    }

    /** `test_taint_releases_on_motion_or_baseline` — both release paths. */
    @Test
    fun taintReleasesOnMotionOrBaseline() {
        val state = handState()
        state.nowS = 100.0

        // A: motion AFTER the taint was last refreshed.
        state.latch("e3", expiry = state.nowS - 5.0)
        state.lastMotionTs = state.nowS - 1.0
        state.setZ("e3")
        state.applyTaints()
        assertFalse(state.tainted.has(Squares.index("e3")), "release path A (motion)")

        // B: no motion since, but the evidence is back to baseline.
        state.latch("f5", expiry = state.nowS - 5.0)
        state.lastMotionTs = state.nowS - 60.0
        state.setZ()
        state.applyTaints()
        assertFalse(state.tainted.has(Squares.index("f5")), "release path B (evidence back to baseline)")
    }

    /**
     * Turning the settle wait off must not turn the occlusion latch off with it.
     *
     * `motionHoldS` had four readers and only one was the wait it is named after; the other three
     * were this latch — how long a taint holds, and the window in which motion counts as having
     * happened since it. Setting the wait to zero to read moves sooner therefore expired every hand
     * taint the instant it was set, disarming the veto that is supposed to carry the load. The two
     * are separate knobs now, and this is the test that keeps them separate.
     */
    @Test
    fun theOcclusionLatchKeepsItsHoldWhenTheSettleWaitIsOff() {
        val state = EngineState(testConfig(boardSize = BOARD).copy(motionHoldS = 0.0), STARTPOS, whitePov = true)
        state.nowS = 100.0
        // Three squares: without a CNN snapshot the filter falls back to the size heuristic.
        state.motionOccluded = ofSquares("e3", "e4", "e5")
        state.setZ("e3", "e4", "e5")

        state.applyTaints()
        assertEquals(ofSquares("e3", "e4", "e5"), state.tainted, "the hand latches")

        // A frame later, with motion still fresh: under one shared knob the taint would already be
        // expired (`nowS > nowS + 0.0`) and released on the motion arm.
        state.nowS += 0.1
        state.lastMotionTs = state.nowS
        state.motionOccluded = 0L
        state.setZ("e3", "e4", "e5")
        state.applyTaints()

        assertEquals(ofSquares("e3", "e4", "e5"), state.tainted, "and holds for occluderHoldS, not for motionHoldS")
        state.assertZeroed("e3", "e4", "e5")
    }

    /** `test_stale_snapshot_does_not_taint` — an old observation says nothing about this frame. */
    @Test
    fun staleSnapshotFallsBackToHeuristic() {
        val state = handState()
        state.nowS = 100.0
        state.cnnSnap =
            snapshot(state, FakeObservation(pOccluded = mapOf("e3" to 0.9, "e4" to 0.9)), ageS = 10.0)

        state.setZ("e3", "e4")
        state.applyTaints()

        assertEquals(0L, state.tainted, "a stale snapshot must not taint anything")
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

        assertEquals(ofSquares("a3"), state.cnnOcclusionFilter(ofSquares("a3")), "fresh: FEN agreement = noise")

        state.cnnSnap = snapshot(state, obs, ageS = 10.0)
        assertEquals(0L, state.cnnOcclusionFilter(ofSquares("a3")), "stale: one square is not a hand")
        assertEquals(
            ofSquares("a3", "b3", "c3"),
            state.cnnOcclusionFilter(ofSquares("a3", "b3", "c3")),
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
        state.setZ(*squares.toTypedArray())

        state.applyTaints()

        assertEquals(0L, state.tainted, "nothing may latch without occlusion evidence")
        for (square in squares) {
            assertTrue(state.lastZ[Squares.index(square)] >= state.config.zThr, "$square must keep its evidence")
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

        val c3 = Squares.index("c3")
        assertTrue(result.occluded.has(c3), "a textured occluder is occluded")
        assertFalse(result.shadow.has(c3), "and it is not a shadow")

        val state = handState()
        state.motionOccluded = result.occluded
        state.setZ("c3")
        state.applyTaints()
        state.assertZeroed("c3")
        assertTrue(state.tainted.has(c3), "and latched")
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

        val f6 = Squares.index("f6")
        val blind = classify(ref, cur)
        assertTrue(blind.shadow.has(f6), "without chroma it reads as a shadow")
        assertFalse(blind.occluded.has(f6), "that is the blind spot")

        val seen =
            BaselineScratch().baselineOcclusionAndShadow(
                cur,
                ref,
                squareBoxes(BOARD, true),
                BOARD,
                BASELINE_ABS_THR,
                true,
                BaselineEvidence(
                    refCodes = censusTransform(ref, out = ByteArray(BOARD * BOARD)),
                    occlCensusThr = OCCL_CENSUS_THR,
                    curBgr = curBgr,
                    gamut = gamut,
                    colorThr = OCCLUSION_COLOR_THR,
                ),
            )
        assertTrue(seen.occluded.has(f6), "the chroma outlier makes it an occluder")
        assertFalse(seen.shadow.has(f6), "and no longer a shadow")
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
                for (i in 0 until Squares.COUNT) state.lastZ[i] = tierA.zFused.getValue(Squares.ALL[i])
                val before = state.lastZ.copyOf()

                state.applyTaints()

                assertEquals(0L, state.tainted, "$name/${frame.frame} nothing may latch")
                for (i in 0 until Squares.COUNT) {
                    assertEquals(before[i], state.lastZ[i], 0.0, "$name/${frame.frame} ${Squares.ALL[i]} z")
                }
                checked++
            }
        }
        assertTrue(checked >= MIN_TIER_A_FRAMES, "only $checked tier-A frames replayed")
    }

    /** The dilated/core keep-alive stamps expire on `nowS`, never on a frame count. */
    @Test
    fun expiryStampsAreReadAgainstTheEngineClock() {
        val state = handState()
        state.nowS = 10.0
        state.occlusionExpiry[Squares.index("a1")] = 9.9
        state.occlusionExpiry[Squares.index("a2")] = 10.5
        state.occlCoreExpiry[Squares.index("a1")] = 9.9
        state.occlCoreExpiry[Squares.index("a3")] = 10.5

        assertEquals(ofSquares("a2"), state.liveExpiry(state.occlusionExpiry), "expired dilated stamps are dead")
        assertEquals(ofSquares("a3"), state.liveExpiry(state.occlCoreExpiry), "expired core stamps are dead")
    }

    // -- helpers -----------------------------------------------------------------------------------

    private fun handState(maxChanged: Int = 6): EngineState {
        val state = EngineState(testConfig(boardSize = BOARD, maxChanged = maxChanged), STARTPOS, whitePov = true)
        state.nowS = 10.0
        return state
    }

    /** Every square cold except the named ones, written into the state's live z. */
    private fun EngineState.setZ(vararg hot: String) {
        lastZ.fill(0.0)
        for (square in hot) lastZ[Squares.index(square)] = Z_HOT
    }

    private fun EngineState.assertZeroed(vararg squares: String) {
        for (square in squares) {
            assertEquals(0.0, lastZ[Squares.index(square)], 0.0, "$square z must be zeroed while latched")
        }
    }

    /** Latch [square] with an explicit expiry stamp — the shape `releaseLatches` reads. */
    private fun EngineState.latch(
        square: String,
        expiry: Double,
    ) {
        val i = Squares.index(square)
        tainted = tainted.with(i)
        taintExpiry[i] = expiry
        // Wie die Produktion: der Beginn wird MITGESCHRIEBEN, nicht aus dem Hold
        // zurueckgerechnet — sonst laege er auf 0 und jede Bewegung zaehlte als danach.
        taintStart[i] = expiry - config.occluderHoldS
    }

    private fun snapshot(
        state: EngineState,
        obs: CnnObservation,
        ageS: Double = 0.0,
        gridOccluded: Long = 0L,
    ) = CnnSnapshot(
        obs = obs,
        seq = 0,
        tsMs = ((state.nowS - ageS) * MS_PER_S).toLong(),
        inferMs = 0.0,
        warped = null,
        gray = null,
        fen = state.board.fen(),
        gridOccluded = gridOccluded,
    )

    private fun classify(
        ref: GrayImage,
        cur: GrayImage,
    ) = BaselineScratch().baselineOcclusionAndShadow(
        cur,
        ref,
        squareBoxes(BOARD, true),
        BOARD,
        BASELINE_ABS_THR,
        true,
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
        val box = squareRegion(Squares.index(square), BOARD, true)
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
        val box = squareRegion(Squares.index(square), BOARD, true)
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

/** Minimal [CnnObservation] stub — the `_FakeObs` of `tests/test_move_tracker.py`. */
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
