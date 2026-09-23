package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.assertCloseMap
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// Step 4 of `_try_detect`, entry.md invariant 9: the illegal-move alarm FREEZES learning. Excluded
// squares learn nothing in the gray lane and at 0.125 * alpha in the census lane.

private const val MIN_TIER_A_FRAMES = 247

class NoiseLearningTest {
    /**
     * Never reset in Python, so one mis-ordered update diverges from the next frame on. Where the guard
     * already learned the census inside `computeEvidence` (`censusNoiseZ == null`), Python passes `cens = None`.
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
                // `refFrames == null`: `_maybe_patch_anomaly` mutated ref_gray in place (D01a-6).
                if (tierA?.refFrames == null) continue
                val tierB = requireNotNull(frame.tierB)
                val refFrames = requireNotNull(tierA.refFrames)
                val where = "$name/${frame.frame}"
                state.refGray = refs.getOrPut(refFrames) { clip.meanGray(refFrames) }

                state.computeEvidence(clip.meanGray(tierA.curFrames))
                val changed = tierB.changed.toSet()
                val shadowVeto = tierB.shadowVeto.toSet()
                assertEquals(tierA.noiseExclude.toSet(), changed + shadowVeto, "$where noiseExclude")
                if (changed.isNotEmpty()) excludeFrames++
                state.changed = ofSquares(changed)
                state.shadowVetoed = ofSquares(shadowVeto)

                state.learnNoise()

                assertCloseMap(tierA.noiseMean, state.noise.mean.asSquareMap(), "$where noiseMean")
                assertCloseMap(tierA.noiseStd, state.noise.std.asSquareMap(), "$where noiseStd")
                assertCloseMap(tierA.censusNoiseMean, state.censusNoise.mean.asSquareMap(), "$where censusNoiseMean")
                assertCloseMap(tierA.censusNoiseStd, state.censusNoise.std.asSquareMap(), "$where censusNoiseStd")
                checked++
            }
        }
        assertTrue(checked >= MIN_TIER_A_FRAMES, "only $checked tier-A frames replayed")
        assertTrue(excludeFrames > 0, "no frame ever excluded a candidate square")
    }

    /** entry.md 9: learning the illegal deltas would desensitize the squares that PROVE the desync — healing by drift. */
    @Test
    fun alarmFreezesNoiseLearning() {
        val state = testState()
        state.feed(diffs = 40.0, cens = 30.0)
        state.alarm = TrackerEvent.Alarm("illegal_move", listOf("e4"), null, null)
        val grayMean = state.noise.mean.copyOf()
        val grayStd = state.noise.std.copyOf()
        val censMean = state.censusNoise.mean.copyOf()
        val censStd = state.censusNoise.std.copyOf()

        state.learnNoise()

        for (i in 0 until Squares.COUNT) {
            assertEquals(grayMean[i], state.noise.mean[i], 0.0, "${Squares.ALL[i]} gray mean")
            assertEquals(grayStd[i], state.noise.std[i], 0.0, "${Squares.ALL[i]} gray std")
            assertEquals(censMean[i], state.censusNoise.mean[i], 0.0, "${Squares.ALL[i]} census mean")
            assertEquals(censStd[i], state.censusNoise.std[i], 0.0, "${Squares.ALL[i]} census std")
        }

        // Control: the very same call learns once the alarm is released.
        state.alarm = null
        state.learnNoise()
        assertNotEquals(grayMean[Squares.index("a1")], state.noise.mean[Squares.index("a1")], "learning must resume")
    }

    /** Full census exclusion would deadlock a flat square that tie-flips from frame one. */
    @Test
    fun censusLaneUsesExcludeAlphaScale() {
        val state = testState()
        val value = 40.0
        val i = Squares.index("e4")
        val j = Squares.index("a1")
        state.feed(diffs = value, cens = value, changedSquares = ofSquares("e4"))

        state.learnNoise()

        assertEquals(0.0, state.noise.mean[i], 0.0, "the gray lane must learn NOTHING on an excluded square")
        val alpha = NOISE_ALPHA_DEFAULT
        assertEquals(alpha * value, state.noise.mean[j], 1e-12, "a non-excluded square learns at full alpha")
        val slow = alpha * CENSUS_NOISE_EXCLUDE_ALPHA_SCALE
        assertEquals(slow * value, state.censusNoise.mean[i], 1e-12, "the census lane learns at alpha/8")
        assertEquals(alpha * value, state.censusNoise.mean[j], 1e-12, "and at full alpha elsewhere")
    }

    /** The exclusion set is `changed | shadowVeto` — both, never only one of them. */
    @Test
    fun bothChangedAndShadowVetoAreExcluded() {
        val state = testState()
        state.feed(diffs = 40.0, cens = null, changedSquares = ofSquares("e4"), veto = ofSquares("d5"))

        state.learnNoise()

        assertEquals(0.0, state.noise.mean[Squares.index("e4")], 0.0, "a candidate square must not be learned")
        assertEquals(0.0, state.noise.mean[Squares.index("d5")], 0.0, "a shadow-vetoed square must not be learned")
        assertTrue(state.noise.mean[Squares.index("a1")] > 0.0, "everything else learns")
    }

    /** A tainted square's z is zeroed, so it never becomes `changed` and used to reach the EMA at FULL alpha. */
    @Test
    fun taintedSquaresAreNotLearned() {
        val state = testState()
        state.feed(diffs = 40.0, cens = 40.0)
        state.tainted = ofSquares("e4")
        val i = Squares.index("e4")
        val std = state.noise.std[i]

        state.learnNoise()

        assertEquals(0.0, state.noise.mean[i], 0.0, "the gray lane must learn NOTHING on a tainted square")
        assertEquals(std, state.noise.std[i], 0.0, "and no spread either")
        val slow = NOISE_ALPHA_DEFAULT * CENSUS_NOISE_EXCLUDE_ALPHA_SCALE
        assertEquals(slow * 40.0, state.censusNoise.mean[i], 1e-12, "the census lane learns at alpha/8, like `changed`")
        assertTrue(state.noise.mean[Squares.index("a1")] > 0.0, "everything else learns")
    }

    /** `cens == null` (channel off or dropped) leaves the census lane completely untouched. */
    @Test
    fun censusLaneUntouchedWithoutAChannel() {
        val state = testState()
        val before = state.censusNoise.mean.copyOf()
        state.feed(diffs = 40.0, cens = null)

        state.learnNoise()

        for (i in 0 until Squares.COUNT) {
            assertEquals(before[i], state.censusNoise.mean[i], 0.0, "${Squares.ALL[i]} census mean")
        }
        assertTrue(state.noise.mean[Squares.index("a1")] > 0.0, "the gray lane still learns")
    }

    /** `test_shadow_squares_not_learned_into_noise` — end to end through the veto. */
    @Test
    fun shadowSquaresNotLearned() {
        val state = testState()
        state.refGray = grayFrame(base = SHADOW_LIGHT)
        state.refBgr = bgrFrame(level = SHADOW_LIGHT)
        val cur = handShadowGray()
        val curBgr = handShadowBgr()

        state.computeEvidence(cur)
        var hot = 0L
        for (i in 0 until Squares.COUNT) {
            if (state.lastZ[i] >= state.config.zThr) hot = hot.with(i)
        }
        state.applyVetoes(cur, curBgr, hot)
        state.learnNoise()

        assertTrue(state.shadowVetoed != 0L, "the veto must actually have fired")
        state.shadowVetoed.forEachSquare { i ->
            assertEquals(0.0, state.noise.mean[i], 0.0, "${Squares.ALL[i]} must not be learned")
        }
    }

    // -- helpers -----------------------------------------------------------------------------------

    /** Both channels flat at the given levels, plus the post-veto sets `learnNoise` reads. */
    private fun EngineState.feed(
        diffs: Double,
        cens: Double?,
        changedSquares: Long = 0L,
        veto: Long = 0L,
    ) {
        lastDiffs.fill(diffs)
        lastCens = if (cens == null) null else DoubleArray(Squares.COUNT) { cens }
        changed = changedSquares
        shadowVetoed = veto
    }
}
