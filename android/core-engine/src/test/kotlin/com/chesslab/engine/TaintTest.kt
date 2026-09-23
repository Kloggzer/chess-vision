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

// Invariant 2: an occluded square's z is ZEROED every frame until release (`Vetoes.kt` does the opposite);
// invariant 4: latched squares still COUNT toward `maxChanged`.

private const val U8 = 0xFF

private const val BOARD = TEST_BOARD_SIZE

private const val BGR = 3

private const val MS_PER_S = 1000.0

class TaintTest {
    /** Zeroed on EVERY latched frame: zeroing only at taint time let a still hand outlive the hold. */
    @Test
    fun occlusionVetoZeroesZ() {
        val state = handState()
        state.motionOccluded = ofSquares("e3", "e4", "e5")
        state.setZ("e3", "e4", "e5")

        state.applyTaints()

        assertEquals(ofSquares("e3", "e4", "e5"), state.tainted, "the hand must latch")
        state.assertZeroed("e3", "e4", "e5")
        state.nowS += 1.0
        state.setZ("e3", "e4", "e5")
        state.applyTaints()
        state.assertZeroed("e3", "e4", "e5")
    }

    /** `blockedN = tainted.countOneBits()`: 3 changed + 4 latched > 6. */
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

    /** A confident CNN/FEN disagreement is a real move; tainting it would zero the move's own evidence. */
    @Test
    fun cnnDisagreementIsNotTainted() {
        val state = handState()
        state.cnnRun = true
        // e2: confident disagreement (move); a3: confident agreement (noise); b3: unconfident (occlusion).
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

        state.lastMotionTs = state.nowS - 1.0
        state.setZ("e3")
        state.applyTaints()
        assertFalse(state.tainted.has(Squares.index("e3")), "motion since the taint releases the latch")
    }

    @Test
    fun restingHandTaintsAndBlocksReanchor() {
        val state = handState()
        // Fresh motion lets the head through the plausibility filter.
        state.lastMotionTs = state.nowS
        state.cnnSnap = snapshot(state, FakeObservation(pOccluded = mapOf("e3" to 0.9, "e4" to 0.9)))
        state.setZ("e3", "e4")

        state.applyTaints()

        assertEquals(ofSquares("e3", "e4"), state.tainted, "the resting hand must latch")
        state.assertZeroed("e3", "e4")
        assertExactList(listOf("e3", "e4"), state.occludedVetoed.sortedSquareNames(), "latched squares are occluded")
    }

    /** Phantom `occluded` flags each latched a taint; a LONE flag is not hand-shaped. */
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

    /** The grid arm vouches for a hand at REST beyond the motion window (003957's shape). */
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

    /** Nicht symmetrisch: Formfilter AUS gibt die rohe Menge, Arm-Schalter AUS gibt nichts. Verwechselt weitet die Ablation den Arm. */
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

    @Test
    fun taintPersistsWithoutMotion() {
        val state = handState()
        state.nowS = 100.0
        state.lastMotionTs = state.nowS - 60.0
        state.latch("e3", expiry = state.nowS - 5.0)

        state.setZ("e3")
        state.applyTaints()

        assertTrue(state.tainted.has(Squares.index("e3")), "the latch must survive — no motion since the taint")
    }

    @Test
    fun taintReleasesOnMotionOrBaseline() {
        val state = handState()
        state.nowS = 100.0

        state.latch("e3", expiry = state.nowS - 5.0)
        state.lastMotionTs = state.nowS - 1.0
        state.setZ("e3")
        state.applyTaints()
        assertFalse(state.tainted.has(Squares.index("e3")), "release path A (motion)")

        state.latch("f5", expiry = state.nowS - 5.0)
        state.lastMotionTs = state.nowS - 60.0
        state.setZ()
        state.applyTaints()
        assertFalse(state.tainted.has(Squares.index("f5")), "release path B (evidence back to baseline)")
    }

    /** `motionHoldS` had three readers here: a zero settle wait expired every hand taint at once. The knobs stay separate. */
    @Test
    fun theOcclusionLatchKeepsItsHoldWhenTheSettleWaitIsOff() {
        val state = EngineState(testConfig(boardSize = BOARD).copy(motionHoldS = 0.0), STARTPOS, whitePov = true)
        state.nowS = 100.0
        state.motionOccluded = ofSquares("e3", "e4", "e5")
        state.setZ("e3", "e4", "e5")

        state.applyTaints()
        assertEquals(ofSquares("e3", "e4", "e5"), state.tainted, "the hand latches")

        state.nowS += 0.1
        state.lastMotionTs = state.nowS
        state.motionOccluded = 0L
        state.setZ("e3", "e4", "e5")
        state.applyTaints()

        assertEquals(ofSquares("e3", "e4", "e5"), state.tainted, "and holds for occluderHoldS, not for motionHoldS")
        state.assertZeroed("e3", "e4", "e5")
    }

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

    /** Flat and darker, a skin tone reads as a shadow without chroma. */
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

    /** The clips run with `cnn_run=None`, so Python's `_tainted` is empty on all 969 frames. */
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

    @Test
    fun applyTaintsLetsAConfidentDisagreementThrough() {
        val state = handState()
        state.cnnRun = true
        state.cnnSnap = snapshot(state, FakeObservation(occupied = mapOf("e2" to false), confident = setOf("e2")))
        state.motionOccluded = ofSquares("e2")
        state.setZ("e2")
        state.applyTaints()
        assertEquals(0L, state.tainted)
    }

    @Test
    fun twoSquaresWithoutAnObservationAreNoHand() {
        val state = handState()
        state.motionOccluded = ofSquares("a3", "b3")
        state.setZ("a3", "b3")
        state.applyTaints()
        assertEquals(0L, state.tainted)
    }

    /** Unsicher gelesen UND dem Brett widersprechend bleibt ein Verdecker — das Modell sah nichts. */
    @Test
    fun anUnconfidentDisagreementIsStillAnOccluder() {
        val state = handState()
        state.cnnRun = true
        state.cnnSnap = snapshot(state, FakeObservation(occupied = mapOf("d2" to false)))
        assertEquals(ofSquares("d2"), state.cnnOcclusionFilter(ofSquares("d2")))
    }

    private fun handState(maxChanged: Int = 6): EngineState {
        val state = EngineState(testConfig(boardSize = BOARD, maxChanged = maxChanged), STARTPOS, whitePov = true)
        state.nowS = 10.0
        return state
    }

    private fun EngineState.setZ(vararg hot: String) {
        lastZ.fill(0.0)
        for (square in hot) lastZ[Squares.index(square)] = Z_HOT
    }

    private fun EngineState.assertZeroed(vararg squares: String) {
        for (square in squares) {
            assertEquals(0.0, lastZ[Squares.index(square)], 0.0, "$square z must be zeroed while latched")
        }
    }

    private fun EngineState.latch(
        square: String,
        expiry: Double,
    ) {
        val i = Squares.index(square)
        tainted = tainted.with(i)
        taintExpiry[i] = expiry
        // Wie die Produktion: der Beginn wird MITGESCHRIEBEN — sonst laege er auf 0 und jede Bewegung zaehlte als danach.
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
        const val HALO = 8
        const val GRAY_B = 0.114
        const val GRAY_G = 0.587
        const val GRAY_R = 0.299
    }
}

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
