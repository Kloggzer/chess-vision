package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.parity.ParityClip
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.assertCloseMap
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// Step 4 of `_try_detect` — per-square noise learning (`tracker.py:2909-2921`).
//
// entry.md invariant 9: the illegal-move alarm FREEZES learning. Excluded squares learn nothing in
// the gray lane and at 0.125 * alpha in the census lane; the two lanes are never unified.
//
// Scenarios mirrored from `tests/test_move_tracker.py`:
//   test_shadow_squares_not_learned_into_noise (:1381) -> shadowSquaresNotLearned

private const val U8 = 0xFF

private const val MIN_TIER_A_FRAMES = 247

private const val BOARD = 400

private const val LIGHT = 120

private const val SHADOWED = 72

private const val SHADOW_ROWS = 100

class NoiseLearningTest {
    /**
     * Full replay of steps 2 and 4 over **every tier-A frame of all 18 clips**, from the
     * constructor state — the noise models are never reset in Python, so a single mis-ordered or
     * mis-scaled update diverges from the next frame on.
     *
     * `learnNoise` is fed the fixture's own post-veto `changed` and `shadowVeto`; the frames where
     * the channel-local guard already learned the census channel inside `computeEvidence`
     * (`censusNoiseZ == null`) must NOT be learned again — that is Python's own control flow, since
     * it passes `cens = None` to step 4 there.
     */
    @Test
    fun learnNoiseMatchesPythonOnEveryTierAFrame() {
        var checked = 0
        var excludeFrames = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val state = EngineState(clip.meta.effectiveConfig.toTrackerConfig(), STARTPOS, clip.meta.whitePov)
            val refs = HashMap<List<Int>, GrayImage>()
            for (frame in clip.frames) {
                val tierA = frame.tierA
                // `refFrames == null` = `_maybe_patch_anomaly` mutated ref_gray in place; that frame
                // is not reconstructible from the planes (D01a-6). Currently none of the 247 is.
                if (tierA?.refFrames == null) continue
                val tierB = requireNotNull(frame.tierB)
                val refFrames = requireNotNull(tierA.refFrames)
                val where = "$name/${frame.frame}"
                state.refGray = refs.getOrPut(refFrames) { meanGray(clip, refFrames) }

                val evidence = state.computeEvidence(meanGray(clip, tierA.curFrames))
                val changed = tierB.changed.toSet()
                val shadowVeto = tierB.shadowVeto.toSet()
                // The emitter records `noiseExclude = changed | shadowVeto` (00b); asserting it
                // here pins that the two sets the port learns from are the ones Python used.
                assertEquals(tierA.noiseExclude.toSet(), changed + shadowVeto, "$where noiseExclude")
                if (changed.isNotEmpty()) excludeFrames++

                state.learnNoise(evidence.diffs, evidence.cens, changed, shadowVeto)

                assertCloseMap(tierA.noiseMean, toMap(state.noise.mean), "$where noiseMean")
                assertCloseMap(tierA.noiseStd, toMap(state.noise.std), "$where noiseStd")
                assertCloseMap(tierA.censusNoiseMean, toMap(state.censusNoise.mean), "$where censusNoiseMean")
                assertCloseMap(tierA.censusNoiseStd, toMap(state.censusNoise.std), "$where censusNoiseStd")
                checked++
            }
        }
        assertTrue(checked >= MIN_TIER_A_FRAMES, "only $checked tier-A frames replayed")
        assertTrue(excludeFrames > 0, "no frame ever excluded a candidate square")
    }

    /**
     * **Named invariant test (entry.md 9).** With the alarm latched both lanes are bit-identical
     * afterwards. The reference/game-state pairing is fiction under an alarm, and adapting the
     * persistent illegal deltas into the EMA would desensitize exactly the squares that PROVE the
     * desync — the alarm would "heal" by drift instead of by user correction.
     */
    @Test
    fun alarmFreezesNoiseLearning() {
        val state = testState()
        val diffs = channel(hot = 40.0)
        val cens = channel(hot = 30.0)
        state.alarm = TrackerEvent.Alarm("illegal_move", listOf("e4"), null, null)
        val grayMean = state.noise.mean.copyOf()
        val grayStd = state.noise.std.copyOf()
        val censMean = state.censusNoise.mean.copyOf()
        val censStd = state.censusNoise.std.copyOf()

        state.learnNoise(diffs, cens, emptySet(), emptySet())

        for (i in 0 until Squares.COUNT) {
            assertEquals(grayMean[i], state.noise.mean[i], 0.0, "${Squares.ALL[i]} gray mean")
            assertEquals(grayStd[i], state.noise.std[i], 0.0, "${Squares.ALL[i]} gray std")
            assertEquals(censMean[i], state.censusNoise.mean[i], 0.0, "${Squares.ALL[i]} census mean")
            assertEquals(censStd[i], state.censusNoise.std[i], 0.0, "${Squares.ALL[i]} census std")
        }

        // Control: the very same call learns once the alarm is released.
        state.alarm = null
        state.learnNoise(diffs, cens, emptySet(), emptySet())
        assertNotEquals(grayMean[Squares.index("a1")], state.noise.mean[Squares.index("a1")], "learning must resume")
    }

    /**
     * **Named invariant test.** The two lanes differ in exactly one number: an excluded square
     * learns NOTHING in the gray lane (`excludeAlphaScale = 0.0`) and at `alpha * 0.125` in the
     * census lane, whose full exclusion would deadlock a flat square that tie-flips from frame one.
     */
    @Test
    fun censusLaneUsesExcludeAlphaScale() {
        val state = testState()
        val value = 40.0
        val diffs = channel(hot = value)
        val cens = channel(hot = value)
        val excluded = setOf("e4")
        val i = Squares.index("e4")
        val j = Squares.index("a1")

        state.learnNoise(diffs, cens, excluded, emptySet())

        assertEquals(0.0, state.noise.mean[i], 0.0, "the gray lane must learn NOTHING on an excluded square")
        val alpha = NOISE_ALPHA_DEFAULT
        assertEquals(alpha * value, state.noise.mean[j], 1e-12, "a non-excluded square learns at full alpha")
        val slow = alpha * CENSUS_NOISE_EXCLUDE_ALPHA_SCALE
        assertEquals(slow * value, state.censusNoise.mean[i], 1e-12, "the census lane learns at alpha/8")
        assertEquals(alpha * value, state.censusNoise.mean[j], 1e-12, "and at full alpha elsewhere")
    }

    /** The exclusion set is `changed | shadowVeto` — both, never only one of them (`:2918`). */
    @Test
    fun bothChangedAndShadowVetoAreExcluded() {
        val state = testState()
        val diffs = channel(hot = 40.0)

        state.learnNoise(diffs, null, setOf("e4"), setOf("d5"))

        assertEquals(0.0, state.noise.mean[Squares.index("e4")], 0.0, "a candidate square must not be learned")
        assertEquals(0.0, state.noise.mean[Squares.index("d5")], 0.0, "a shadow-vetoed square must not be learned")
        assertTrue(state.noise.mean[Squares.index("a1")] > 0.0, "everything else learns")
    }

    /** `cens == null` (channel off or dropped) leaves the census lane completely untouched. */
    @Test
    fun censusLaneUntouchedWithoutAChannel() {
        val state = testState()
        val before = state.censusNoise.mean.copyOf()

        state.learnNoise(channel(hot = 40.0), null, emptySet(), emptySet())

        for (i in 0 until Squares.COUNT) {
            assertEquals(before[i], state.censusNoise.mean[i], 0.0, "${Squares.ALL[i]} census mean")
        }
        assertTrue(state.noise.mean[Squares.index("a1")] > 0.0, "the gray lane still learns")
    }

    /**
     * `test_shadow_squares_not_learned_into_noise` — end to end through the veto: a recurring hand
     * shadow that inflated the EMA would desensitize a later real move on those squares.
     */
    @Test
    fun shadowSquaresNotLearned() {
        val state = EngineState(testConfig(boardSize = BOARD), STARTPOS, whitePov = true)
        state.refGray = flatGray(LIGHT)
        state.refBgr = flatBgr(LIGHT)
        val cur = shadowGray()
        val curBgr = shadowBgr()

        val evidence = state.computeEvidence(cur)
        val changed =
            evidence.z
                .filterValues { it >= state.config.zThr }
                .keys
                .toCollection(LinkedHashSet())
        val result = state.applyVetoes(cur, curBgr, changed, evidence.cens)
        state.learnNoise(evidence.diffs, evidence.cens, result.changed, result.shadowVeto)

        assertTrue(result.shadowVeto.isNotEmpty(), "the veto must actually have fired")
        for (square in result.shadowVeto) {
            assertEquals(0.0, state.noise.mean[Squares.index(square)], 0.0, "$square must not be learned")
        }
    }

    // -- helpers -----------------------------------------------------------------------------------

    /** A 64-key channel map with every square at [hot]. */
    private fun channel(hot: Double): Map<String, Double> = Squares.ALL.associateWith { hot }

    private fun toMap(values: DoubleArray): Map<String, Double> = Squares.ALL.withIndex().associate { (i, s) -> s to values[i] }

    private fun meanGray(
        clip: ParityClip,
        frames: List<Int>,
    ): GrayImage {
        val det = clip.meta.detSize
        val acc = LongArray(det * det)
        for (index in frames) {
            val plane = clip.gray(index).data
            for (i in acc.indices) acc[i] += (plane[i].toInt() and U8).toLong()
        }
        // `_RunningMean.mean_uint8`: `(sum / n)` TRUNCATED, not rounded.
        return GrayImage(det, det, ByteArray(acc.size) { (acc[it] / frames.size).toByte() })
    }

    private fun flatGray(level: Int) = GrayImage(BOARD, BOARD, ByteArray(BOARD * BOARD) { level.toByte() })

    private fun flatBgr(level: Int) = BgrImage(BOARD, BOARD, ByteArray(BOARD * BOARD * BGR) { level.toByte() })

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

    private companion object {
        const val BGR = 3
    }
}
