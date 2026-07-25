package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.api.TrackerEvent
import com.chesslab.engine.parity.ParityClip
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.assertCloseMap
import com.chesslab.engine.parity.assertExact
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// `_compute_evidence` — the two channels, the RAW census copy and the channel-local guard.
//
// Scenarios mirrored from `tests/test_move_tracker.py`:
//   test_global_exposure_shift_not_stuck (:801)         -> globalExposureShiftNotStuck
//   test_normalize_diffs_isolates_hot_fields (:66)      -> medianNormalizationIsolatesHotSquares
//   test_dark_on_dark_seen_by_census_not_gray (:2174)   -> darkOnDarkSeenByCensusOnly
//   test_global_jitter_median_normalized (:2281)        -> globalJitterDoesNotFireCensus
//
// `TrackerConfig` always comes from `meta.effectiveConfig` (README: "BUILD YOUR TrackerConfig FROM
// THIS") — `detSize` is 320, `overhang` is 0.0 on several clips and `occlusionColorThr` is 1.5.

private const val U8 = 0xFF

private const val MIN_TIER_A_FRAMES = 247

private const val Z_HOT = 3.0

class EvidenceTest {
    /**
     * Full replay of `_compute_evidence` over **every tier-A frame of all 18 clips**.
     *
     * The noise models are never reset in Python, so this replays them from the constructor state:
     * `computeEvidence` scores against the model as it stands, then the test applies the frame's
     * update exactly as step 4 (03b) will — `noiseExclude` with the census lane's slow exclusion.
     * On the frames where the channel-local guard fired (`censusNoiseZ == null`) the update is
     * *inside* `computeEvidence` (full alpha, no exclusion), so the test must not repeat it —
     * STATUS D01d-4 in reverse.
     */
    @Test
    fun computeEvidenceMatchesPython() {
        var checked = 0
        var guardFrames = 0
        for (name in ParityFixtures.clips()) {
            guardFrames += replayClip(ParityFixtures.load(name)) { checked++ }
        }
        assertTrue(checked >= MIN_TIER_A_FRAMES, "only $checked tier-A frames replayed")
        assertTrue(guardFrames > 0, "the census channel-local guard was never exercised")
    }

    private fun replayClip(
        clip: ParityClip,
        onFrame: () -> Unit,
    ): Int {
        val config = clip.meta.effectiveConfig.toTrackerConfig()
        val state = EngineState(config, STARTPOS, clip.meta.whitePov)
        val refs = HashMap<List<Int>, GrayImage>()
        var guardFrames = 0
        for (frame in clip.frames) {
            val tierA = frame.tierA
            val refFrames = tierA?.refFrames
            // `refFrames == null` = `_maybe_patch_anomaly` mutated ref_gray in place; that frame is
            // not reconstructible from the planes (D01a-6). Currently none of the 247 is in it.
            if (tierA == null || refFrames == null) continue
            val where = "${clip.name}/${frame.frame}"
            state.refGray = refs.getOrPut(refFrames) { meanGray(clip, refFrames) }
            val cur = meanGray(clip, tierA.curFrames)

            state.computeEvidence(cur)

            assertCloseMap(tierA.normalizedDiffs, state.lastDiffs.asSquareMap(), "$where diffs")
            assertCloseMap(tierA.zFused, state.lastZ.asSquareMap(), "$where zFused")
            val censusZ = tierA.censusNoiseZ
            if (censusZ == null) {
                // The guard dropped the channel THIS frame: no census channel, no raw copy.
                assertNull(state.lastCens, "$where cens must be null when the guard fires")
                assertNull(state.censRaw, "$where censRaw must be null when the guard fires")
                assertTrue(state.structVals.isEmpty(), "$where structVals must be empty")
                guardFrames++
            } else {
                assertCloseMap(tierA.censusNormalized, requireNotNull(state.lastCens).asSquareMap(), "$where cens")
                assertCloseMap(tierA.censusRaw, requireNotNull(state.censRaw).asSquareMap(), "$where censRaw")
            }

            // Step 4 (phase 03b): the gray lane always learns; the census lane only when the
            // guard did NOT already learn it inside computeEvidence.
            val exclude = ofSquares(tierA.noiseExclude)
            state.noise.update(toArray(tierA.normalizedDiffs), exclude)
            if (censusZ != null) {
                state.censusNoise.update(
                    toArray(tierA.censusNormalized),
                    exclude,
                    CENSUS_NOISE_EXCLUDE_ALPHA_SCALE,
                )
            }
            assertCloseMap(tierA.noiseMean, toMap(state.noise.mean), "$where noiseMean")
            assertCloseMap(tierA.censusNoiseStd, toMap(state.censusNoise.std), "$where censusNoiseStd")
            onFrame()
        }
        return guardFrames
    }

    /**
     * `test_normalize_diffs_isolates_hot_fields` — 62 squares at 2.0, e2/e4 at 40.0: the UPPER
     * median (2.0) is subtracted, so only e2/e4 survive. Asserted through `computeEvidence`, i.e.
     * with the normalization really wired into the gray channel.
     */
    @Test
    fun medianNormalizationIsolatesHotSquares() {
        val state = testState(testConfig(censusZWeight = 0.0))
        state.refGray = grayFrame()
        val cur = grayFrame(listOf("e2", "e4"))

        state.computeEvidence(cur)

        for ((square, value) in state.lastDiffs.asSquareMap()) {
            if (square == "e2" || square == "e4") {
                assertTrue(value > 80.0, "$square should carry the blob (got $value)")
            } else {
                assertEquals(0.0, value, 1e-9, "$square should normalize to 0")
            }
        }
    }

    /**
     * `test_global_exposure_shift_not_stuck` — every square gets +42 brightness. Median
     * normalization removes the global component, so NO square is hot and nothing can look like
     * a move (which is what kept the tracker out of `too_many_changed`).
     */
    @Test
    fun globalExposureShiftNotStuck() {
        val state = testState(testConfig(censusZWeight = 0.0))
        state.refGray = grayFrame(base = 128)

        state.computeEvidence(grayFrame(base = 170))

        for (i in 0 until Squares.COUNT) {
            assertEquals(0.0, state.lastDiffs[i], 1e-9, "${Squares.ALL[i]} after a global shift")
            assertTrue(state.lastZ[i] < Z_HOT, "${Squares.ALL[i]} must not be hot")
        }
    }

    /**
     * `test_dark_on_dark_seen_by_census_not_gray` — a dark textured piece on a dark square. The
     * gray mean barely moves, the structural channel fires, and the FUSED `max` finds exactly the
     * one square. This is the reason the census channel exists.
     */
    @Test
    fun darkOnDarkSeenByCensusOnly() {
        val state = testState()
        val ref = grayFrame(base = 40)
        state.refGray = ref
        val cur = GrayImage(ref.width, ref.height, ref.data.copyOf())
        paintDisc(cur, "e4", seed = 42L, lo = 20, hi = 34)

        val grayOnly = testState(testConfig(censusZWeight = 0.0))
        grayOnly.refGray = ref
        grayOnly.computeEvidence(cur)
        state.computeEvidence(cur)
        val e4 = Squares.index("e4")

        assertTrue(grayOnly.lastZ[e4] < Z_HOT, "the gray channel alone must miss it (${grayOnly.lastZ[e4]})")
        assertTrue(state.lastZ[e4] >= Z_HOT, "the fused channel must see it (${state.lastZ[e4]})")
        var hot = 0L
        for (i in 0 until Squares.COUNT) {
            if (state.lastZ[i] >= Z_HOT) hot = hot.with(i)
        }
        assertExact(setOf("e4"), hot.sortedSquareNames().toSet(), "hot squares")
    }

    /**
     * `test_global_jitter_median_normalized` — one pixel of horizontal wobble shifts every piece
     * edge, so the RAW census fires on all textured squares at once. Median normalization strips
     * the global part; whatever survives is caught by the channel-local guard.
     */
    @Test
    fun globalJitterDoesNotFireCensus() {
        val state = testState()
        val ref = texturedFrame(seed = 5L)
        state.refGray = ref
        val cur = rollRight(ref)

        state.computeEvidence(cur)

        val hot = state.lastZ.count { it >= Z_HOT }
        assertTrue(
            state.lastCens == null || hot <= state.config.maxChanged + 2,
            "a global wobble must either drop the census channel or stay under the guard (hot=$hot)",
        )
    }

    /**
     * Invariant 8: `censusThr` (40.0) compares against the RAW census channel. The raw copy is
     * taken BEFORE normalization, so a square whose normalized value is pulled below the threshold
     * still reads above it on the raw map — that is the phantom-shadow-as-destination fix.
     */
    @Test
    fun censusThrComparesAgainstRawCensus() {
        val state = testState()
        val ref = texturedFrame(seed = 11L)
        state.refGray = ref
        val cur = rollRight(ref)

        state.computeEvidence(cur)
        assertNotNull(state.censRaw, "the raw copy must survive a wobble frame")
        assertNotNull(state.lastCens, "this fixture must not trip the channel guard")
        val raw = requireNotNull(state.censRaw)
        val norm = requireNotNull(state.lastCens)

        val thr = state.config.censusThr
        var pulledUnder = 0
        for (i in 0 until Squares.COUNT) {
            if (raw[i] >= thr && norm[i] < thr) pulledUnder++
        }
        assertTrue(pulledUnder > 0, "the fixture must contain a square normalization pulls under $thr")
    }

    /**
     * The channel-local guard: more structurally hot squares than any legal move — not even a
     * pair — could explain means a global disturbance. The census channel is dropped for this
     * frame, its raw copy with it, and `z` collapses to the gray channel.
     */
    @Test
    fun censusChannelDroppedWhenTooManyHotSquares() {
        val state = testState(testConfig(maxChanged = 6))
        val ref = texturedFrame(seed = 3L)
        state.refGray = ref
        val cur = scrambleSquares(ref, Squares.ALL.take(state.config.maxChanged + 3))

        state.computeEvidence(cur)

        assertNull(state.lastCens, "the census channel must be dropped")
        assertNull(state.censRaw, "the raw copy must be dropped with it")
        assertTrue(state.structVals.isEmpty())
        val grayOnly = testState(testConfig(maxChanged = 6, censusZWeight = 0.0))
        grayOnly.refGray = ref
        grayOnly.computeEvidence(cur)
        assertCloseMap(grayOnly.lastZ.asSquareMap(), state.lastZ.asSquareMap(), "z must equal the gray channel")
    }

    /** Invariant 9: a latched alarm freezes noise learning — including the guard's own update. */
    @Test
    fun censusDisturbanceNotLearnedWhileAlarmLatched() {
        val ref = texturedFrame(seed = 3L)
        val hot = Squares.ALL.take(TEST_GUARD_HOT_SQUARES)
        val quiet = testState(testConfig(maxChanged = 6))
        quiet.refGray = ref
        quiet.computeEvidence(scrambleSquares(ref, hot))

        val alarmed = testState(testConfig(maxChanged = 6))
        alarmed.refGray = ref
        alarmed.alarm = TrackerEvent.Alarm("illegal_move", listOf("e4"), null, null)
        val before = alarmed.censusNoise.mean.copyOf()
        alarmed.computeEvidence(scrambleSquares(ref, hot))

        assertTrue(quiet.censusNoise.mean.any { it != 0.0 }, "the quiet run must have learned the disturbance")
        for (i in 0 until Squares.COUNT) {
            assertEquals(before[i], alarmed.censusNoise.mean[i], 0.0, "square ${Squares.ALL[i]} learned under alarm")
        }
    }

    /**
     * `censusZWeight` is live-tunable. A leftover `_cens_raw` from an earlier frame would freeze
     * the shadow veto's threshold input, so it is cleared unconditionally at the top of every
     * frame.
     */
    @Test
    fun censRawClearedWhenWeightTunedToZero() {
        val state = testState()
        val ref = texturedFrame(seed = 17L)
        state.refGray = ref
        state.computeEvidence(rollRight(ref))
        assertNotNull(state.censRaw, "the first frame must produce a raw census map")

        state.config = state.config.copy(censusZWeight = 0.0)
        state.rebuildBoxes()
        state.computeEvidence(rollRight(ref))

        assertNull(state.censRaw, "a stale raw channel must never survive into the next frame")
        assertNull(state.lastCens)
        assertTrue(state.structVals.isEmpty())
    }

    /** `_ref_census_codes` caches on IDENTITY — an in-place patch invalidates it. */
    @Test
    fun refCensusCodesCacheKeysOnIdentity() {
        val state = testState()
        val ref = texturedFrame(seed = 23L)
        state.refGray = ref
        val first = state.refCensusCodes()
        assertTrue(first === state.refCensusCodes(), "the same reference object must hit the cache")
        // The code buffer is REUSED across recomputes (the buffer contract), so every content
        // comparison below has to be made against a copy.
        val firstCodes = first.copyOf()

        val twin = GrayImage(ref.width, ref.height, ref.data.copyOf())
        state.refGray = twin
        val secondCodes = state.refCensusCodes().copyOf()
        assertTrue(state.refCensusFor === twin, "the cache key is the image identity, not equality")
        assertTrue(firstCodes.contentEquals(secondCodes), "equal pixels still give equal codes")

        // `_maybe_patch_anomaly` mutates ref_gray in place and invalidates explicitly.
        twin.data[0] = (twin.data[0].toInt() xor U8).toByte()
        state.refCensusFor = null
        val thirdCodes = state.refCensusCodes().copyOf()
        assertTrue(!secondCodes.contentEquals(thirdCodes), "an invalidated cache must recompute")
    }

    // -- helpers ------------------------------------------------------------------------------

    private fun meanGray(
        clip: ParityClip,
        frames: List<Int>,
    ): GrayImage {
        val det = clip.meta.detSize
        val size = det * det
        val acc = LongArray(size)
        for (index in frames) {
            val plane = clip.gray(index).data
            for (i in 0 until size) {
                acc[i] += (plane[i].toInt() and U8).toLong()
            }
        }
        // `_RunningMean.mean_uint8`: `(sum / n)` TRUNCATED, not rounded.
        return GrayImage(det, det, ByteArray(size) { (acc[it] / frames.size).toByte() })
    }

    private fun toArray(values: Map<String, Double>): DoubleArray = DoubleArray(Squares.COUNT) { values.getValue(Squares.ALL[it]) }

    private fun toMap(values: DoubleArray): Map<String, Double> = Squares.ALL.withIndex().associate { (i, s) -> s to values[i] }

    /** A textured disc over roughly half the inset box of [square] (Python's `_piece`). */
    private fun paintDisc(
        image: GrayImage,
        square: String,
        seed: Long,
        lo: Int,
        hi: Int,
    ) {
        val rng = java.util.Random(seed)
        val r = squareRegion(Squares.index(square), image.width, true)
        val cx = (r[0] + r[2]) / 2
        val cy = (r[1] + r[3]) / 2
        val radius = (r[2] - r[0]) / 3
        for (y in cy - radius..cy + radius) {
            for (x in cx - radius..cx + radius) {
                val dx = x - cx
                val dy = y - cy
                if (dx * dx + dy * dy <= radius * radius) {
                    image.data[y * image.width + x] = (lo + rng.nextInt(hi - lo)).toByte()
                }
            }
        }
    }

    /** One pixel of horizontal wobble — `np.roll(ref, 1, axis=1)`. */
    private fun rollRight(image: GrayImage): GrayImage {
        val w = image.width
        val out = ByteArray(image.data.size)
        for (y in 0 until image.height) {
            for (x in 0 until w) {
                out[y * w + x] = image.data[y * w + (x + w - 1) % w]
            }
        }
        return GrayImage(w, image.height, out)
    }

    /** Replaces the pixels of the named squares with fresh noise — a structural change everywhere. */
    private fun scrambleSquares(
        image: GrayImage,
        squares: List<String>,
    ): GrayImage {
        val out = GrayImage(image.width, image.height, image.data.copyOf())
        val rng = java.util.Random(99L)
        for (square in squares) {
            val r = squareRegion(Squares.index(square), image.width, true)
            for (y in r[1] until r[3]) {
                for (x in r[0] until r[2]) {
                    out.data[y * image.width + x] = rng.nextInt(U8 + 1).toByte()
                }
            }
        }
        return out
    }

    private companion object {
        const val TEST_GUARD_HOT_SQUARES = 9
    }
}
