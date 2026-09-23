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

private const val U8 = 0xFF

private const val MIN_TIER_A_FRAMES = 247

private const val Z_HOT = 3.0

class EvidenceTest {
    /** Replays the never-reset noise models. Where the guard fired, the census update is already inside `computeEvidence`. */
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
            // `refFrames == null`: `_maybe_patch_anomaly` mutated ref_gray in place.
            if (tierA == null || refFrames == null) continue
            val where = "${clip.name}/${frame.frame}"
            state.refGray = refs.getOrPut(refFrames) { clip.meanGray(refFrames) }
            val cur = clip.meanGray(tierA.curFrames)

            state.computeEvidence(cur)

            assertCloseMap(tierA.normalizedDiffs, state.lastDiffs.asSquareMap(), "$where diffs")
            assertCloseMap(tierA.zFused, state.lastZ.asSquareMap(), "$where zFused")
            val censusZ = tierA.censusNoiseZ
            if (censusZ == null) {
                assertNull(state.lastCens, "$where cens must be null when the guard fires")
                assertNull(state.censRaw, "$where censRaw must be null when the guard fires")
                guardFrames++
            } else {
                assertCloseMap(tierA.censusNormalized, requireNotNull(state.lastCens).asSquareMap(), "$where cens")
                assertCloseMap(tierA.censusRaw, requireNotNull(state.censRaw).asSquareMap(), "$where censRaw")
            }

            val exclude = ofSquares(tierA.noiseExclude)
            state.noise.update(tierA.normalizedDiffs.toZArray(), exclude)
            if (censusZ != null) {
                state.censusNoise.update(tierA.censusNormalized.toZArray(), exclude, CENSUS_NOISE_EXCLUDE_ALPHA_SCALE)
            }
            assertCloseMap(tierA.noiseMean, state.noise.mean.asSquareMap(), "$where noiseMean")
            assertCloseMap(tierA.censusNoiseStd, state.censusNoise.std.asSquareMap(), "$where censusNoiseStd")
            onFrame()
        }
        return guardFrames
    }

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

    /** `test_dark_on_dark_seen_by_census_not_gray` — the reason the census channel exists. */
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

    /** Invariant 8: the raw copy is taken BEFORE normalization. */
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

    @Test
    fun censusChannelDroppedWhenTooManyHotSquares() {
        val state = testState(testConfig(maxChanged = 6))
        val ref = texturedFrame(seed = 3L)
        state.refGray = ref
        val cur = scrambleSquares(ref, Squares.ALL.take(state.config.maxChanged + 3))

        state.computeEvidence(cur)

        assertNull(state.lastCens, "the census channel must be dropped")
        assertNull(state.censRaw, "the raw copy must be dropped with it")
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
    }

    @Test
    fun refCensusCodesCacheKeysOnIdentity() {
        val state = testState()
        val ref = texturedFrame(seed = 23L)
        state.refGray = ref
        val first = state.refCensusCodes()
        assertTrue(first === state.refCensusCodes(), "the same reference object must hit the cache")
        // The code buffer is REUSED across recomputes, so compare copies.
        val firstCodes = first.copyOf()

        val twin = GrayImage(ref.width, ref.height, ref.data.copyOf())
        state.refGray = twin
        val secondCodes = state.refCensusCodes().copyOf()
        assertTrue(state.refCensusFor === twin, "the cache key is the image identity, not equality")
        assertTrue(firstCodes.contentEquals(secondCodes), "equal pixels still give equal codes")

        // The probe sits INSIDE a box: codes are only computed there.
        val boxes = state.evidenceBoxes
        val probe = (boxes.y0[0] + boxes.y1[0]) / 2 * twin.width + (boxes.x0[0] + boxes.x1[0]) / 2
        twin.data[probe] = (twin.data[probe].toInt() xor U8).toByte()
        state.refCensusFor = null
        val thirdCodes = state.refCensusCodes().copyOf()
        assertTrue(!secondCodes.contentEquals(thirdCodes), "an invalidated cache must recompute")
    }

    @Test
    fun adoptedReferenceCodesEqualAFreshTransform() {
        val state = testState()
        state.refGray = texturedFrame(seed = 41L)
        val cur = texturedFrame(seed = 42L)
        state.computeEvidence(cur)
        state.refGray = cur
        state.refCensusFor = null
        val adopted = state.refCensusCodes().copyOf()

        val fresh = censusTransform(cur, out = ByteArray(cur.width * cur.height))
        val boxes = state.evidenceBoxes
        for (i in 0 until Squares.COUNT) {
            for (y in boxes.y0[i] until boxes.y1[i]) {
                for (x in boxes.x0[i] until boxes.x1[i]) {
                    val at = y * cur.width + x
                    assertEquals(fresh[at], adopted[at], "square ${Squares.ALL[i]} code at ($x, $y)")
                }
            }
        }
    }

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
