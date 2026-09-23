package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.ParityFrame
import com.chesslab.engine.parity.assertExact
import com.chesslab.engine.parity.assertExactList
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// Invariant 2: a shadow-vetoed square leaves `changed` and KEEPS its z — a vacated square darkens to board
// colour and reads as a shadow. The opposite lives in `Taint.kt`.

private const val U8 = 0xFF

private const val MIN_TIER_A_FRAMES = 247

private const val MIN_SHADOW_FRAMES = 100

private const val BOARD = TEST_BOARD_SIZE

class VetoesTest {
    /** Where the guard dropped the census channel, Python and the port take the band fast path. */
    @Test
    fun applyVetoesMatchesPythonOnEveryTierAFrame() {
        var checked = 0
        var shadowFrames = 0
        var bandFrames = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val state = EngineState(clip.meta.effectiveConfig.toTrackerConfig(), STARTPOS, clip.meta.whitePov)
            val refs = HashMap<List<Int>, Pair<GrayImage, BgrImage>>()
            for (frame in clip.frames) {
                val tierA = frame.tierA
                // `refFrames == null`: `_maybe_patch_anomaly` mutated ref_gray in place; not reconstructible (currently none).
                if (tierA?.refFrames == null) continue
                val tierB = requireNotNull(frame.tierB)
                val refFrames = requireNotNull(tierA.refFrames)
                val where = "$name/${frame.frame}"
                val (refGray, refBgr) = refs.getOrPut(refFrames) { clip.meanGray(refFrames) to clip.meanBgr(refFrames) }
                state.refGray = refGray
                state.refBgr = refBgr
                val cur = clip.meanGray(tierA.curFrames)
                val curBgr = clip.meanBgr(tierA.curFrames)
                // The guard dropped the channel: Python has neither `cens` nor `_cens_raw` and computes the band locally.
                val guarded = tierA.censusNoiseZ == null
                if (guarded) bandFrames++
                if (tierA.hsvShadowSquares.isNotEmpty()) shadowFrames++
                state.censRaw = if (guarded) null else tierA.censusRaw.toZArray()

                state.applyVetoes(cur, curBgr, ofSquares(tierA.vetoCandidates))

                assertExactList(tierB.shadowVeto, state.shadowVetoed.sortedSquareNames(), "$where _shadow_vetoed")
                assertExact(tierB.changed.toSet(), state.changed.sortedSquareNames().toSet(), "$where changed")
                checked++
            }
        }
        assertTrue(checked >= MIN_TIER_A_FRAMES, "only $checked tier-A frames replayed")
        assertTrue(shadowFrames >= MIN_SHADOW_FRAMES, "only $shadowFrames frames carried an HSV shadow")
        assertTrue(bandFrames > 0, "the census band fast path was never exercised")
    }

    /** Invariant 8 from the fixtures: a shadow square with RAW census >= thr > NORMALIZED is not vetoed. */
    @Test
    fun censusThresholdReadsTheRawChannelInTheFixtures() {
        var discriminating = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val thr = clip.meta.effectiveConfig.censusThr
            for (frame in clip.frames) {
                discriminating += countDiscriminating(name, frame, thr)
            }
        }
        assertTrue(discriminating > 0, "no fixture square separates the raw from the normalized channel")
    }

    private fun countDiscriminating(
        name: String,
        frame: ParityFrame,
        thr: Double,
    ): Int {
        val tierA = frame.tierA ?: return 0
        val vetoed = requireNotNull(frame.tierB).shadowVeto
        var found = 0
        for (square in tierA.hsvShadowSquares) {
            val raw = tierA.censusRaw.getValue(square)
            val norm = tierA.censusNormalized.getValue(square)
            if (raw >= thr && norm < thr) {
                found++
                assertFalse(square in vetoed, "$name/${frame.frame} $square must survive the raw gate")
            }
        }
        return found
    }

    @Test
    fun handShadowRemovedFromChangedAndKeepsZ() {
        val state = shadowScenario()
        state.computeEvidence(handShadowGray())
        val before = state.lastZ.copyOf()
        val candidates = hotSquares(state.lastZ, state.config.zThr)
        assertTrue(candidates != 0L, "the scenario must produce candidates")

        state.applyVetoes(handShadowGray(), handShadowBgr(), candidates)

        assertEquals(candidates, state.shadowVetoed, "every shadowed candidate must be vetoed")
        assertEquals(0L, state.changed, "nothing may survive as a move candidate")
        for (i in 0 until Squares.COUNT) {
            assertEquals(before[i], state.lastZ[i], 0.0, "${Squares.ALL[i]} z was modified")
        }
    }

    @Test
    fun hsvShadowUniformDarkening() {
        val ref = bgrFrame(level = SHADOW_LIGHT)
        val cur = bgrFrame(level = SHADOW_DARK)

        val shadows = shadowsOf(ref, cur, ofSquares("e4", "d5"))

        assertEquals(ofSquares("e4", "d5"), shadows, "uniform darkening is a cast shadow")
    }

    @Test
    fun hsvShadowIgnoresRealPiece() {
        val ref = bgrFrame(level = SHADOW_LIGHT)
        val cur = bgrFrame(level = SHADOW_LIGHT)
        paintBgr(cur, "e4", b = 30, g = 40, r = 200)

        val shadows = shadowsOf(ref, cur, ofSquares("e4"))

        assertEquals(0L, shadows, "an arriving coloured piece must not read as shadow")
    }

    @Test
    fun censusLowForUniformDarkening() {
        val ref = grayFrame(base = SHADOW_LIGHT)
        val cur = grayFrame(base = SHADOW_DARK)
        val out = DoubleArray(Squares.COUNT)

        perSquareCensusChange(censusTransform(ref, out = ByteArray(BOARD * BOARD)), cur, squareBoxes(BOARD, true), out)

        assertTrue(out[Squares.index("e4")] < CENSUS_QUIET, "census must stay near zero (${out[Squares.index("e4")]})")
    }

    @Test
    fun multiplicativeShadowIsCensusQuiet() {
        val ref = smoothTexture(seed = 7L)
        val cur = darkenSquare(ref, "d5", factor = 0.6)
        val out = DoubleArray(Squares.COUNT)

        perSquareCensusChange(censusTransform(ref, out = ByteArray(BOARD * BOARD)), cur, squareBoxes(BOARD, true), out)
        val z = SquareNoise(initStd = 4.0, stdFloor = 2.0).z(out, DoubleArray(Squares.COUNT))

        assertTrue(z[Squares.index("d5")] < Z_HOT, "a multiplicative shadow must not fire the census channel")
    }

    /** A strong cast shadow latched as OCCLUDED and stalled detection; `occlCensusThr = 0` reproduces it. */
    @Test
    fun hardShadowIsNotOcclusion() {
        val ref = smoothTexture(seed = 3L)
        val cur = darkenSquare(ref, "e4", factor = 0.5)
        val boxes = squareBoxes(BOARD, true)
        val codes = censusTransform(ref, out = ByteArray(BOARD * BOARD))
        val e4 = Squares.index("e4")

        val structural =
            BaselineScratch().baselineOcclusionAndShadow(
                cur,
                ref,
                boxes,
                BOARD,
                BASELINE_ABS_THR,
                true,
                BaselineEvidence(refCodes = codes, occlCensusThr = 24.0),
            )
        val legacy =
            BaselineScratch().baselineOcclusionAndShadow(
                cur,
                ref,
                boxes,
                BOARD,
                BASELINE_ABS_THR,
                true,
                BaselineEvidence(refCodes = codes),
            )

        assertFalse(structural.occluded.has(e4), "a hard shadow is not an occluder")
        assertTrue(structural.shadow.has(e4), "a hard shadow must land in the shadow set")
        assertTrue(legacy.occluded.has(e4), "legacy mode must reproduce the old behaviour")
    }

    /** Invariant 8 as a unit: normalized 12, raw 55, `censusThr` 40 — an HSV shadow whose raw census says a
     *  structure changed survives as a candidate. */
    @Test
    fun censusThrComparesRawNotNormalized() {
        val state = shadowScenario()
        state.computeEvidence(handShadowGray())
        val changed = hotSquares(state.lastZ, state.config.zThr)
        val survivor = java.lang.Long.numberOfTrailingZeros(changed)
        val raw = requireNotNull(state.censRaw)
        raw.fill(0.0)
        raw[survivor] = RAW_ABOVE_THR
        requireNotNull(state.lastCens)[survivor] = NORMALIZED_BELOW_THR

        state.applyVetoes(handShadowGray(), handShadowBgr(), changed)

        assertEquals(40.0, state.config.censusThr, 0.0, "the fixture threshold moved")
        assertTrue(state.changed.has(survivor), "the survivor's RAW census is above the threshold")
        assertFalse(state.shadowVetoed.has(survivor), "the survivor must not be shadow-vetoed")
        assertTrue(state.shadowVetoed != 0L, "the other shadowed squares must still be vetoed")
    }

    /** Reads the CURRENTLY latched set, not a permanently-true `not set()`. */
    @Test
    fun sessionCaptureWaitsForTheLatchToClear() {
        val state = shadowScenario()
        state.tainted = ofSquares("c6", "d6")

        state.queueSessionCapture("e4")
        assertEquals("e4", state.pendingCapture?.san, "a latched board must defer the photo")

        state.tainted = 0L
        state.queueSessionCapture("e5")
        assertEquals(null, state.pendingCapture, "a clean board flushes it immediately")
    }

    @Test
    fun bandFastPathVetoesWithoutTheEvidenceChannel() {
        val state = shadowScenario(censusZWeight = 0.0)
        state.computeEvidence(handShadowGray())
        assertEquals(null, state.censRaw, "the channel must be off in this scenario")
        val changed = hotSquares(state.lastZ, state.config.zThr)

        state.applyVetoes(handShadowGray(), handShadowBgr(), changed)

        assertTrue(state.shadowVetoed != 0L, "the band fast path must reach the same verdict")
        assertEquals(0L, state.changed, "every shadowed candidate must be vetoed")
    }

    @Test
    fun withoutColourFramesNothingIsVetoed() {
        val state = shadowScenario()
        state.computeEvidence(handShadowGray())
        val changed = hotSquares(state.lastZ, state.config.zThr)
        state.refBgr = null

        state.applyVetoes(handShadowGray(), null, changed)

        assertEquals(0L, state.shadowVetoed, "no BGR pair, no HSV verdict; _shadow_vetoed is reset")
        assertEquals(changed, state.changed, "the candidates must pass through untouched")
    }

    /** `baselineOcclusion=0` liess dieses Veto weiterlaufen: `FrameLoop` nullte `shadowVetoed`, `applyVetoes` setzte es neu. */
    @Test
    fun theShadowVetoFollowsTheBaselineOcclusionSwitch() {
        val an = shadowScenario()
        an.computeEvidence(handShadowGray())
        val candidates = hotSquares(an.lastZ, an.config.zThr)
        an.applyVetoes(handShadowGray(), handShadowBgr(), candidates)
        assertEquals(candidates, an.shadowVetoed, "die Szene muss ueberhaupt vetoieren")

        val aus = EngineState(testConfig(boardSize = BOARD).copy(baselineOcclusion = false), STARTPOS, whitePov = true)
        aus.refGray = grayFrame(base = SHADOW_LIGHT)
        aus.refBgr = bgrFrame(level = SHADOW_LIGHT)
        aus.computeEvidence(handShadowGray())
        aus.applyVetoes(handShadowGray(), handShadowBgr(), candidates)

        assertEquals(0L, aus.shadowVetoed, "mit dem Schalter AUS darf kein Feld schattenvetoiert sein")
        assertEquals(candidates, aus.changed, "und die Kandidaten bleiben in `changed`")
    }

    /** Only the top two ranks darken, so median normalization leaves them hot. */
    private fun shadowScenario(censusZWeight: Double = 1.0): EngineState {
        val config = testConfig(boardSize = BOARD, censusZWeight = censusZWeight)
        val state = EngineState(config, STARTPOS, whitePov = true)
        state.refGray = grayFrame(base = SHADOW_LIGHT)
        state.refBgr = bgrFrame(level = SHADOW_LIGHT)
        return state
    }

    private fun shadowsOf(
        ref: BgrImage,
        cur: BgrImage,
        candidates: Long,
    ): Long {
        val hsvRef = ByteArray(ref.data.size)
        val hsvCur = ByteArray(cur.data.size)
        bgrToHsv(ref.data, ref.width, ref.height, hsvRef)
        bgrToHsv(cur.data, cur.width, cur.height, hsvCur)
        return hsvShadowSquares(hsvRef, hsvCur, PlaneGeometry(BOARD, BOARD, BOARD, true), candidates)
    }

    private fun hotSquares(
        z: DoubleArray,
        zThr: Double,
    ): Long {
        var hot = 0L
        for (i in 0 until Squares.COUNT) {
            if (z[i] >= zThr) hot = hot.with(i)
        }
        return hot
    }

    private fun paintBgr(
        image: BgrImage,
        square: String,
        b: Int,
        g: Int,
        r: Int,
    ) {
        val box = squareRegion(Squares.index(square), BOARD, true)
        for (y in box[1] until box[3]) {
            for (x in box[0] until box[2]) {
                val i = (y * BOARD + x) * BGR
                image.data[i] = b.toByte()
                image.data[i + 1] = g.toByte()
                image.data[i + 2] = r.toByte()
            }
        }
    }

    private fun darkenSquare(
        image: GrayImage,
        square: String,
        factor: Double,
    ): GrayImage {
        val out = GrayImage(BOARD, BOARD, image.data.copyOf())
        val box = squareRegion(Squares.index(square), BOARD, true)
        for (y in (box[1] - HALO).coerceAtLeast(0) until (box[3] + HALO).coerceAtMost(BOARD)) {
            for (x in (box[0] - HALO).coerceAtLeast(0) until (box[2] + HALO).coerceAtMost(BOARD)) {
                val i = y * BOARD + x
                out.data[i] = ((out.data[i].toInt() and U8) * factor).toInt().toByte()
            }
        }
        return out
    }

    private companion object {
        const val BGR = 3
        const val Z_HOT = 3.0
        const val CENSUS_QUIET = 5.0
        const val BASELINE_ABS_THR = 20.0
        const val RAW_ABOVE_THR = 55.0
        const val NORMALIZED_BELOW_THR = 12.0
        const val HALO = 8
    }
}
