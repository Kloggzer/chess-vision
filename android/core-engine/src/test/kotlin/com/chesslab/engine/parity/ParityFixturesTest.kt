package com.chesslab.engine.parity

import kotlinx.serialization.json.int
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Smoke test for the phase-00b golden fixtures. It asserts that the fixtures LOAD and are
 * internally consistent — never that the engine behaves; `TrackerEngine` is still `TODO()`
 * until phase 03d.
 */
class ParityFixturesTest {
    @Test
    fun everyClipLoadsWithAscendingFrames() {
        val clips = ParityFixtures.clips()
        assertConsumed(clips, "parity/index.json clips")
        for (name in clips) {
            val clip = ParityFixtures.load(name)
            assertConsumed(clip.frames, "$name frames")
            assertEquals(clip.meta.frames, clip.frames.map { it.frame }, "$name: frame order")
            assertEquals(
                clip.meta.frames.sorted(),
                clip.meta.frames,
                "$name: meta.frames must be ascending",
            )
            assertEquals("delta-u8", clip.meta.planeEncoding, "$name: plane encoding")
        }
    }

    @Test
    fun firstGrayPlaneHasDetSizeSquaredBytes() {
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val first = clip.meta.frames.first()
            val gray = clip.gray(first)
            assertEquals(clip.meta.detSize * clip.meta.detSize, gray.data.size, "$name: gray plane size")
            assertEquals(clip.meta.detSize, gray.width, "$name: gray width")
            val bgr = requireNotNull(clip.bgr(first)) { "$name: first frame must carry a bgr plane" }
            assertEquals(
                clip.meta.detSize * clip.meta.detSize * clip.meta.channelsBgr,
                bgr.data.size,
                "$name: bgr plane size",
            )
        }
    }

    @Test
    fun everyFrameCarriesADecisionAndTierAIsWellFormed() {
        var tierACount = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            for (frame in clip.frames) {
                val tierB = requireNotNull(frame.tierB) { "$name/${frame.frame}: tierB missing" }
                assertTrue(
                    tierB.state in VALID_STATES,
                    "$name/${frame.frame}: state '${tierB.state}' not in $VALID_STATES",
                )
                val tierA = frame.tierA ?: continue
                tierACount += 1
                assertEquals(SQUARES, tierA.perSquareDiff.size, "$name/${frame.frame}: perSquareDiff size")
                assertEquals(SQUARES, tierA.zFused.size, "$name/${frame.frame}: zFused size")
                assertEquals(SQUARES, tierA.noiseStd.size, "$name/${frame.frame}: noiseStd size")
            }
            assertConsumed(clip.tierAFrames(), "$name: tier-A frames")
        }
        assertTrue(tierACount > 0, "no tier-A record in any clip")
    }

    @Test
    fun rawUndilatedOcclusionCoreIsPresent() {
        // entry.md invariant 3: the '>2 -> occluded' gate counts the RAW core, so the core
        // must be a subset of the dilated occlusion set and must be emitted separately.
        var seen = 0
        for (name in ParityFixtures.clips()) {
            for (frame in ParityFixtures.load(name).frames) {
                val baseline = frame.baseline ?: continue
                seen += 1
                assertTrue(
                    baseline.occludedDilated.containsAll(baseline.core),
                    "$name/${frame.frame}: core is not a subset of the dilated occlusion set",
                )
            }
        }
        assertTrue(seen > 0, "no baseline-occlusion record in any clip")
    }

    @Test
    fun sharedColorSpaceAndGeometryFixturesLoad() {
        for (patch in listOf("sweep", "board")) {
            val bgr = ParityFixtures.colorSpacePlane(patch, "bgr")
            assertEquals(bgr.size, ParityFixtures.colorSpacePlane(patch, "hsv").size, "$patch hsv size")
            assertEquals(bgr.size, ParityFixtures.colorSpacePlane(patch, "lab").size, "$patch lab size")
        }
        assertTrue(ParityFixtures.colorSpaceMeta().contains("\"sweepStep\""), "colorspace meta")
        assertTrue(ParityFixtures.geometryMeta().contains("\"squareRegions\""), "geometry meta")
    }

    @Test
    fun effectiveConfigBuildsTheTrackerConfigTheFixtureWasProducedWith() {
        for (name in ParityFixtures.clips()) {
            val meta = ParityFixtures.load(name).meta
            val eff = meta.effectiveConfig
            val cfg = eff.toTrackerConfig()
            // Round-trip of the 43 settable knobs, spot-checked on the ones that differ
            // from the Kotlin defaults, plus the four derived members.
            assertEquals(eff.occlusionColorThr, cfg.occlusionColorThr, "$name: occlusionColorThr")
            assertEquals(eff.overhang, cfg.overhang, "$name: overhang")
            assertEquals(eff.censusThr, cfg.censusThr, "$name: censusThr")
            assertEquals(eff.minGridLineCoverage, cfg.minGridLineCoverage, "$name: minGridLineCoverage")
            assertEquals(eff.boardSize, cfg.boardSize, "$name: boardSize")
            assertEquals(eff.detSize, cfg.detSize, "$name: derived detSize")
            assertEquals(meta.detSize, cfg.detSize, "$name: meta.detSize vs TrackerConfig.detSize")
            // settle/avg/confirm are CNN-CONDITIONAL in TrackerConfig but plain constructor
            // overrides in Python (STATUS D00b-17): the seam cannot express an override, so
            // only clips WITHOUT one may be compared against the derived value. Every port
            // must read these three from effectiveConfig, never from TrackerConfig.
            assertDerived(name, "settle_frames", meta, eff.settleFrames, cfg.settleFrames(cnnOn = false))
            assertDerived(name, "avg_frames", meta, eff.avgFrames, cfg.avgFrames(cnnOn = false))
            assertDerived(name, "confirm_frames", meta, eff.confirmFrames, cfg.confirmFrames(cnnOn = false))
            // The fixture value must NOT be assumed equal to the Kotlin default.
            assertEquals(FIXTURE_OCCLUSION_COLOR_THR, eff.occlusionColorThr, "$name: fixture thr")
        }
    }

    @Test
    fun sharedPureFunctionFixturesAreNonEmpty() {
        for (fixture in CNN_FIXTURES) {
            assertConsumed(ParityFixtures.jsonl("_cnn/$fixture"), fixture)
        }
        val corners = ParityFixtures.jsonl("_geometry/resolve_corners.jsonl")
        assertConsumed(corners, "resolve_corners.jsonl")
        val grid = ParityFixtures.jsonl("_geometry/grid_coverage.jsonl")
        assertConsumed(grid, "grid_coverage.jsonl")
        for (row in grid) {
            val rel = row.getValue("plane").jsonPrimitive.content
            val w = row.getValue("width").jsonPrimitive.int
            val h = row.getValue("height").jsonPrimitive.int
            assertEquals(w * h, ParityFixtures.geometryPlane(rel).size, "grid plane $rel")
        }
    }

    @Test
    fun tierBCompleteClipsAreTheOnesReproducingPython() {
        val index = ParityFixtures.index()
        for (name in index.clips) {
            val meta = ParityFixtures.load(name).meta
            assertEquals(
                meta.tierBComplete,
                name in index.tierBComplete,
                "$name: index and meta disagree on tierBComplete",
            )
            if (meta.tierBComplete && meta.expectedSans != null) {
                assertEquals(meta.expectedSans, meta.replayedSans, "$name: replayed move list")
            }
        }
        assertConsumed(index.tierBComplete, "index.tierBComplete")
    }

    @Test
    fun toleranceContractBehavesAsDocumented() {
        assertTrue(parityClose(0.0, 1e-5), "absolute floor")
        assertTrue(!parityClose(0.0, 1e-3), "absolute floor must not swallow 1e-3")
        assertTrue(parityClose(1000.0, 1000.05), "relative tolerance")
        assertTrue(!parityClose(1000.0, 1000.5), "relative tolerance must not swallow 5e-4")
    }

    private fun assertDerived(
        clip: String,
        pyKey: String,
        meta: ParityMeta,
        effective: Int,
        derived: Int,
    ) {
        val override =
            meta.trackerKwargs
                ?.get(pyKey)
                ?.jsonPrimitive
                ?.intOrNull
        if (override == null) {
            assertEquals(derived, effective, "$clip: derived $pyKey")
        } else {
            assertEquals(override, effective, "$clip: $pyKey override not reflected in effectiveConfig")
        }
    }

    private companion object {
        const val SQUARES = 64

        /** Python's `MoveTracker.__init__` default — NOT `TRACK_DEFAULTS`' 3.0. See STATUS D00b-3. */
        const val FIXTURE_OCCLUSION_COLOR_THR = 1.5
        val VALID_STATES = setOf("waiting", "moving", "occluded", "move")
        val CNN_FIXTURES =
            listOf(
                "cnn_observation.jsonl",
                "cnn_score.jsonl",
                "cnn_verify.jsonl",
                "cnn_identity.jsonl",
                "cnn_derive.jsonl",
                "cnn_resync.jsonl",
                "cnn_guess.jsonl",
            )
    }
}
