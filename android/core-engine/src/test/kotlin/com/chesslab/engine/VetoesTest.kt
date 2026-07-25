package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.parity.ParityClip
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.ParityFrame
import com.chesslab.engine.parity.assertExact
import com.chesslab.engine.parity.assertExactList
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// `_apply_vetoes` (`tracker.py:3141-3176`) — the CAST-SHADOW veto.
//
// entry.md invariant 2, this half: a shadow-vetoed square leaves `changed` and **keeps its z**.
// A vacated square darkens to board colour and reads as a shadow to the HSV test; zeroing z there
// would destroy the from-evidence of every real move. The opposite semantics live in `Taint.kt`.
//
// Scenarios mirrored from `tests/test_move_tracker.py`:
//   test_shadow_veto_removes_hand_shadow_in_detect (:1244) -> handShadowRemovedFromChanged
//   test_hsv_shadow_detects_uniform_darkening (:1220)      -> hsvShadowUniformDarkening
//   test_hsv_shadow_ignores_real_piece (:1228)             -> hsvShadowIgnoresRealPiece
//   test_census_low_for_uniform_darkening (:1236)          -> censusLowForUniformDarkening
//   test_multiplicative_shadow_is_census_quiet (:2194)     -> multiplicativeShadowIsCensusQuiet
//   test_hard_shadow_is_shadow_not_occlusion (:2236)       -> hardShadowIsNotOcclusion
//
// `TrackerConfig` always comes from `meta.effectiveConfig` (README: "BUILD YOUR TrackerConfig FROM
// THIS") — `detSize` is 320, `overhang` is 0.0 on several clips, `occlusionColorThr` is 1.5.

private const val U8 = 0xFF

private const val MIN_TIER_A_FRAMES = 247

/** `parity`: how many tier-A frames carry at least one HSV shadow square (STATUS 01c: 109). */
private const val MIN_SHADOW_FRAMES = 100

private const val BOARD = 400

/** Board colour of the synthetic shadow scenarios (Python's `_bgr` helper, `:1210`). */
private const val LIGHT = 120

/** The same board under a hand's shadow — same chroma, ratio 0.6, well inside `[vLo, vHi]`. */
private const val SHADOWED = 72

/** Rows 0..99 of a 400 px board = ranks 8 and 7, so the upper median stays at the light level. */
private const val SHADOW_ROWS = 100

class VetoesTest {
    /**
     * Full replay of `_apply_vetoes` over **every tier-A frame of all 18 clips**.
     *
     * The candidate set is the fixture's own post-taint `changed` (`tierA.vetoCandidates`), the raw
     * census channel is `tierA.censusRaw` — except on the three frames where the channel-local
     * guard dropped it, which is exactly where Python takes the band fast path and so does the port.
     */
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
                // `refFrames == null` = `_maybe_patch_anomaly` mutated ref_gray in place; that frame
                // is not reconstructible from the planes (D01a-6). Currently none of the 247 is.
                if (tierA?.refFrames == null) continue
                val tierB = requireNotNull(frame.tierB)
                val refFrames = requireNotNull(tierA.refFrames)
                val where = "$name/${frame.frame}"
                val (refGray, refBgr) = refs.getOrPut(refFrames) { meanPair(clip, refFrames) }
                state.refGray = refGray
                state.refBgr = refBgr
                val (cur, curBgr) = meanPair(clip, tierA.curFrames)
                // `censusNoiseZ == null` = the guard dropped the channel; Python then has neither
                // `cens` nor `_cens_raw` and computes the candidate band locally (`:3155-3161`).
                val guarded = tierA.censusNoiseZ == null
                if (guarded) bandFrames++
                if (tierA.hsvShadowSquares.isNotEmpty()) shadowFrames++
                state.censRaw = if (guarded) null else tierA.censusRaw.toMutableMap()
                val cens = if (guarded) null else tierA.censusNormalized

                val result = state.applyVetoes(cur, curBgr, LinkedHashSet(tierA.vetoCandidates), cens)

                assertExact(tierB.shadowVeto.toSet(), result.shadowVeto, "$where shadowVeto")
                assertExactList(tierB.shadowVeto, state.shadowVetoed, "$where _shadow_vetoed")
                assertExact(tierB.changed.toSet(), result.changed, "$where post-veto changed")
                checked++
            }
        }
        assertTrue(checked >= MIN_TIER_A_FRAMES, "only $checked tier-A frames replayed")
        assertTrue(shadowFrames >= MIN_SHADOW_FRAMES, "only $shadowFrames frames carried an HSV shadow")
        assertTrue(bandFrames > 0, "the census band fast path was never exercised")
    }

    /**
     * entry.md invariant 8, proved from the fixtures themselves: `censusThr` compares against the
     * **RAW** census channel.
     *
     * The clips contain a square that the HSV test calls a shadow, whose RAW census is above 40 and
     * whose NORMALIZED census is below it. Python does not veto it (`tierB.shadowVeto` is empty
     * there); a port reading the normalized channel would.
     */
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

    /** Shadow squares whose RAW census is above [thr] while the NORMALIZED one is below it. */
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

    /**
     * **Named invariant test (entry.md 2).** A shadow-vetoed square leaves `changed` and its z is
     * byte-identical before and after `applyVetoes` — the from-evidence of a vacated square must
     * survive into scoring.
     */
    @Test
    fun shadowVetoPreservesZ() {
        val state = shadowScenario()
        val evidence = state.computeEvidence(shadowGray())
        val before = LinkedHashMap(evidence.z)
        val changed = hotSquares(evidence.z, state.config.zThr)
        assertTrue(changed.isNotEmpty(), "the scenario must produce candidates")

        val result = state.applyVetoes(shadowGray(), shadowBgr(), changed, evidence.cens)

        assertTrue(result.shadowVeto.isNotEmpty(), "the shadow veto must fire")
        for (square in result.shadowVeto) {
            assertFalse(square in result.changed, "$square must leave the changed set")
            assertEquals(before.getValue(square), evidence.z.getValue(square), 0.0, "$square z was modified")
        }
        for (square in Squares.ALL) {
            assertEquals(before.getValue(square), evidence.z.getValue(square), 0.0, "$square z was modified")
        }
    }

    /**
     * `test_shadow_veto_removes_hand_shadow_in_detect` — a hand's shadow over two ranks is filtered
     * out entirely, so the tracker keeps its base truth instead of going `too_many_changed`.
     */
    @Test
    fun handShadowRemovedFromChanged() {
        val state = shadowScenario()
        val evidence = state.computeEvidence(shadowGray())
        val changed = hotSquares(evidence.z, state.config.zThr)
        val candidates = LinkedHashSet(changed)

        val result = state.applyVetoes(shadowGray(), shadowBgr(), changed, evidence.cens)

        assertExact(candidates, result.shadowVeto, "every shadowed candidate must be vetoed")
        assertTrue(result.changed.isEmpty(), "nothing may survive as a move candidate")
        assertExactList(candidates.sorted(), state.shadowVetoed, "_shadow_vetoed")
    }

    /** `test_hsv_shadow_detects_uniform_darkening` — same chroma, uniformly darker. */
    @Test
    fun hsvShadowUniformDarkening() {
        val ref = flatBgr(LIGHT)
        val cur = flatBgr(SHADOWED)

        val shadows = shadowsOf(ref, cur, listOf("e4", "d5"))

        assertExact(setOf("e4", "d5"), shadows, "uniform darkening is a cast shadow")
    }

    /** `test_hsv_shadow_ignores_real_piece` — a saturated red block is a piece, not a shadow. */
    @Test
    fun hsvShadowIgnoresRealPiece() {
        val ref = flatBgr(LIGHT)
        val cur = flatBgr(LIGHT)
        paintBgr(cur, "e4", b = 30, g = 40, r = 200)

        val shadows = shadowsOf(ref, cur, listOf("e4"))

        assertTrue(shadows.isEmpty(), "an arriving coloured piece must not read as shadow")
    }

    /** `test_census_low_for_uniform_darkening` — a pure brightness change carries no structure. */
    @Test
    fun censusLowForUniformDarkening() {
        val ref = GrayImage(BOARD, BOARD, ByteArray(BOARD * BOARD) { LIGHT.toByte() })
        val cur = GrayImage(BOARD, BOARD, ByteArray(BOARD * BOARD) { SHADOWED.toByte() })
        val out = DoubleArray(Squares.COUNT)

        perSquareCensusChange(censusTransform(ref, out = ByteArray(BOARD * BOARD)), cur, squareBoxes(BOARD, true), out)

        assertTrue(out[Squares.index("e4")] < CENSUS_QUIET, "census must stay near zero (${out[Squares.index("e4")]})")
    }

    /**
     * `test_multiplicative_shadow_is_census_quiet` — a cast shadow scales every pixel by the same
     * factor, so the census comparisons (and therefore the codes) are preserved. Without that
     * property the structural channel would manufacture ghost evidence out of every shadow.
     */
    @Test
    fun multiplicativeShadowIsCensusQuiet() {
        val ref = smoothTexture(seed = 7L)
        val cur = darkenSquare(ref, "d5", factor = 0.6)
        val out = DoubleArray(Squares.COUNT)

        perSquareCensusChange(censusTransform(ref, out = ByteArray(BOARD * BOARD)), cur, squareBoxes(BOARD, true), out)
        val z = SquareNoise(initStd = 4.0, stdFloor = 2.0).z(out, DoubleArray(Squares.COUNT))

        assertTrue(z[Squares.index("d5")] < Z_HOT, "a multiplicative shadow must not fire the census channel")
    }

    /**
     * `test_hard_shadow_is_shadow_not_occlusion` — the user-reported bug: a strong cast shadow used
     * to exceed the absdiff threshold and latch the square as OCCLUDED, which zeroes z and stalls
     * detection. Structural mode classifies it as a shadow; legacy mode (`occlCensusThr = 0`)
     * reproduces the old misclassification.
     */
    @Test
    fun hardShadowIsNotOcclusion() {
        val ref = smoothTexture(seed = 3L)
        val cur = darkenSquare(ref, "e4", factor = 0.5)
        val boxes = squareBoxes(BOARD, true)
        val codes = censusTransform(ref, out = ByteArray(BOARD * BOARD))
        val params = BaselineParams(BOARD, BASELINE_ABS_THR, true)

        val structural =
            baselineOcclusionAndShadow(cur, ref, boxes, params, BaselineEvidence(refCodes = codes, occlCensusThr = 24.0))
        val legacy = baselineOcclusionAndShadow(cur, ref, boxes, params, BaselineEvidence(refCodes = codes))

        assertFalse("e4" in Squares.maskToSet(structural.occluded), "a hard shadow is not an occluder")
        assertTrue("e4" in Squares.maskToSet(structural.shadow), "a hard shadow must land in the shadow set")
        assertTrue("e4" in Squares.maskToSet(legacy.occluded), "legacy mode must reproduce the old behaviour")
    }

    /**
     * entry.md invariant 8 as a unit: normalized 12, raw 55, `censusThr` 40. The square IS an HSV
     * shadow, but its raw census says a structure changed there, so it survives as a candidate.
     */
    @Test
    fun censusThrComparesRawNotNormalized() {
        val state = shadowScenario()
        val evidence = state.computeEvidence(shadowGray())
        val changed = hotSquares(evidence.z, state.config.zThr)
        val survivor = changed.first()
        val raw = requireNotNull(state.censRaw)
        for (square in Squares.ALL) raw[square] = 0.0
        raw[survivor] = RAW_ABOVE_THR
        val cens = requireNotNull(evidence.cens).toMutableMap()
        cens[survivor] = NORMALIZED_BELOW_THR

        val result = state.applyVetoes(shadowGray(), shadowBgr(), changed, cens)

        assertEquals(40.0, state.config.censusThr, 0.0, "the fixture threshold moved")
        assertTrue(survivor in result.changed, "$survivor must survive: its RAW census is above the threshold")
        assertFalse(survivor in result.shadowVeto, "$survivor must not be shadow-vetoed")
        assertTrue(result.shadowVeto.isNotEmpty(), "the other shadowed squares must still be vetoed")
    }

    /**
     * `:3173-3176` — the third return value is the CURRENTLY LATCHED set, so 03d's "only photograph
     * a clean board" guard is a real condition instead of a permanently-true `not set()`.
     */
    @Test
    fun occludedSetIsTheLatchedSet() {
        val state = shadowScenario()
        state.tainted["c6"] = state.nowS + 1.0
        state.tainted["d6"] = state.nowS + 1.0

        val result = state.applyVetoes(shadowGray(), shadowBgr(), LinkedHashSet(), null)

        assertExact(setOf("c6", "d6"), result.occludedSet, "occludedSet must mirror the latch")
    }

    /**
     * The `censusZWeight == 0` band fast path (`:3155-3161`): with no evidence-side census channel
     * the veto computes its own over the candidate rows, and that map is RAW already.
     */
    @Test
    fun bandFastPathVetoesWithoutTheEvidenceChannel() {
        val state = shadowScenario(censusZWeight = 0.0)
        val evidence = state.computeEvidence(shadowGray())
        assertEquals(null, state.censRaw, "the channel must be off in this scenario")
        val changed = hotSquares(evidence.z, state.config.zThr)

        val result = state.applyVetoes(shadowGray(), shadowBgr(), changed, evidence.cens)

        assertTrue(result.shadowVeto.isNotEmpty(), "the band fast path must reach the same verdict")
        assertTrue(result.changed.isEmpty(), "every shadowed candidate must be vetoed")
    }

    /** No colour reference (or no colour frame) means no shadow veto at all (`:3153`). */
    @Test
    fun withoutColourFramesNothingIsVetoed() {
        val state = shadowScenario()
        val evidence = state.computeEvidence(shadowGray())
        val changed = hotSquares(evidence.z, state.config.zThr)
        state.refBgr = null

        val result = state.applyVetoes(shadowGray(), null, changed, evidence.cens)

        assertTrue(result.shadowVeto.isEmpty(), "no BGR pair, no HSV verdict")
        assertTrue(result.changed.isNotEmpty(), "the candidates must pass through untouched")
        assertTrue(state.shadowVetoed.isEmpty(), "_shadow_vetoed must be reset every frame")
    }

    // -- scenario helpers ------------------------------------------------------------------------

    /**
     * The two-rank hand shadow of `test_shadow_squares_not_learned_into_noise` (`:1381`): only the
     * top 100 rows darken, so median normalization leaves them hot instead of cancelling a global
     * exposure shift.
     */
    private fun shadowScenario(censusZWeight: Double = 1.0): EngineState {
        val config = testConfig(boardSize = BOARD, censusZWeight = censusZWeight)
        val state = EngineState(config, STARTPOS, whitePov = true)
        state.refGray = flatGray(LIGHT)
        state.refBgr = flatBgr(LIGHT)
        return state
    }

    private fun shadowGray(): GrayImage {
        val image = flatGray(LIGHT)
        for (y in 0 until SHADOW_ROWS) {
            for (x in 0 until BOARD) image.data[y * BOARD + x] = SHADOWED.toByte()
        }
        return image
    }

    private fun shadowBgr(): BgrImage {
        val image = flatBgr(LIGHT)
        for (y in 0 until SHADOW_ROWS) {
            for (x in 0 until BOARD * BGR) image.data[y * BOARD * BGR + x] = SHADOWED.toByte()
        }
        return image
    }

    private fun shadowsOf(
        ref: BgrImage,
        cur: BgrImage,
        candidates: List<String>,
    ): Set<String> {
        val hsvRef = ByteArray(ref.data.size)
        val hsvCur = ByteArray(cur.data.size)
        bgrToHsv(ref.data, ref.width, ref.height, hsvRef)
        bgrToHsv(cur.data, cur.width, cur.height, hsvCur)
        return hsvShadowSquares(hsvRef, hsvCur, PlaneGeometry(BOARD, BOARD, BOARD, true), candidates)
    }

    private fun hotSquares(
        z: Map<String, Double>,
        zThr: Double,
    ): LinkedHashSet<String> = z.filterValues { it >= zThr }.keys.toCollection(LinkedHashSet())

    private fun flatGray(level: Int) = GrayImage(BOARD, BOARD, ByteArray(BOARD * BOARD) { level.toByte() })

    private fun flatBgr(level: Int) = BgrImage(BOARD, BOARD, ByteArray(BOARD * BOARD * BGR) { level.toByte() })

    private fun paintBgr(
        image: BgrImage,
        square: String,
        b: Int,
        g: Int,
        r: Int,
    ) {
        val box = squareRegion(square, BOARD, true)
        for (y in box[1] until box[3]) {
            for (x in box[0] until box[2]) {
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
            val q = reflect((if (horizontal) x else y) + k)
            val idx = if (horizontal) y * BOARD + q else q * BOARD + x
            sum += GAUSS5[k + 2] * (plane[idx].toInt() and U8)
        }
        return ((sum + GAUSS5_HALF) / GAUSS5_SUM).toByte()
    }

    private fun reflect(p: Int): Int =
        when {
            p < 0 -> -p
            p >= BOARD -> 2 * BOARD - 2 - p
            else -> p
        }

    /** Multiplicative darkening of one square plus an 8 px halo — Python's shadow construction. */
    private fun darkenSquare(
        image: GrayImage,
        square: String,
        factor: Double,
    ): GrayImage {
        val out = GrayImage(BOARD, BOARD, image.data.copyOf())
        val box = squareRegion(square, BOARD, true)
        for (y in (box[1] - HALO).coerceAtLeast(0) until (box[3] + HALO).coerceAtMost(BOARD)) {
            for (x in (box[0] - HALO).coerceAtLeast(0) until (box[2] + HALO).coerceAtMost(BOARD)) {
                val i = y * BOARD + x
                out.data[i] = ((out.data[i].toInt() and U8) * factor).toInt().toByte()
            }
        }
        return out
    }

    private fun meanPair(
        clip: ParityClip,
        frames: List<Int>,
    ): Pair<GrayImage, BgrImage> {
        val det = clip.meta.detSize
        val gray = LongArray(det * det)
        val bgr = LongArray(det * det * BGR)
        for (index in frames) {
            val g = clip.gray(index).data
            for (i in gray.indices) gray[i] += (g[i].toInt() and U8).toLong()
            val b = requireNotNull(clip.bgr(index)) { "frame $index has no BGR plane" }.data
            for (i in bgr.indices) bgr[i] += (b[i].toInt() and U8).toLong()
        }
        val n = frames.size
        // `_RunningMean.mean_uint8`: `(sum / n)` TRUNCATED, not rounded.
        return GrayImage(det, det, ByteArray(gray.size) { (gray[it] / n).toByte() }) to
            BgrImage(det, det, ByteArray(bgr.size) { (bgr[it] / n).toByte() })
    }

    private companion object {
        const val BGR = 3
        const val Z_HOT = 3.0
        const val CENSUS_QUIET = 5.0
        const val BASELINE_ABS_THR = 20.0
        const val RAW_ABOVE_THR = 55.0
        const val NORMALIZED_BELOW_THR = 12.0
        const val LO_TEXTURE = 60
        const val HI_TEXTURE = 200
        const val HALO = 8
        val GAUSS5 = intArrayOf(1, 4, 6, 4, 1)
        const val GAUSS5_SUM = 16
        const val GAUSS5_HALF = 8
    }
}
