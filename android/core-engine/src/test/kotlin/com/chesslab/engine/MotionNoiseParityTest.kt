package com.chesslab.engine

import com.chesslab.engine.api.GrayImage
import com.chesslab.engine.parity.ParityClip
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.ParityFrame
import com.chesslab.engine.parity.assertClose
import com.chesslab.engine.parity.assertCloseMap
import com.chesslab.engine.parity.assertExact
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

// Configs from `meta.effectiveConfig`: Kotlin defaults diverge (`occlusionColorThr` 1.5, `detSize` 320) like a port bug.

private class BaselineInputs(
    val refGray: GrayImage,
    val gamutFrames: List<Int>,
)

private class BaselineCounts {
    var checked = 0
    var withCore = 0
    var withChroma = 0
}

class MotionNoiseParityTest {
    /** `max(motion_score(prev, cur), motionRoi)`; the first frame diffs against itself. */
    @Test
    fun motionScoreMatchesPython() {
        var checked = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val pxThr =
                clip.meta.effectiveConfig
                    .toTrackerConfig()
                    .motionPxThr
            var prev: ByteArray? = null
            for (frame in clip.frames) {
                if (frame.skipped) continue
                val cur = clip.gray(frame.frame).data
                val score = motionScore(prev ?: cur, cur, pxThr)
                prev = cur
                val tierB = frame.tierB
                if (tierB != null) {
                    assertClose(
                        tierB.motionScore,
                        maxOf(score, frame.motionRoiScore),
                        "$name/${frame.frame} motionScore",
                    )
                    checked++
                }
            }
        }
        assertTrue(checked >= MIN_MOTION_FRAMES, "only $checked motion frames asserted")
    }

    /** `noiseZ` is BEFORE the frame's update, `noiseMean`/`noiseStd` AFTER. Where `censusNoiseZ == null` the
     *  guard learned the census at FULL alpha, no exclusion. */
    @Test
    fun squareNoiseTraceMatchesPython() {
        var checked = 0
        var fullLearnFrames = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val gray = SquareNoise()
            val census = SquareNoise(initStd = CENSUS_NOISE_INIT_STD, stdFloor = CENSUS_NOISE_STD_FLOOR)
            val scratch = DoubleArray(Squares.COUNT)
            for (frame in clip.frames) {
                val tierA = frame.tierA ?: continue
                val where = "$name/${frame.frame}"
                val diffs = tierA.normalizedDiffs.toZArray()
                val cens = tierA.censusNormalized.toZArray()
                val exclude = ofSquares(tierA.noiseExclude)

                assertCloseMap(tierA.noiseZ, gray.z(diffs, scratch).asSquareMap(), "$where noiseZ")
                val censusZ = tierA.censusNoiseZ
                if (censusZ != null) {
                    assertCloseMap(censusZ, census.z(cens, scratch).asSquareMap(), "$where censusNoiseZ")
                }

                gray.update(diffs, exclude)
                if (censusZ != null) {
                    census.update(cens, exclude, CENSUS_NOISE_EXCLUDE_ALPHA_SCALE)
                } else {
                    census.update(cens)
                    fullLearnFrames++
                }

                assertCloseMap(tierA.noiseMean, gray.mean.asSquareMap(), "$where noiseMean")
                assertCloseMap(tierA.noiseStd, gray.std.asSquareMap(), "$where noiseStd")
                assertCloseMap(tierA.censusNoiseMean, census.mean.asSquareMap(), "$where censusNoiseMean")
                assertCloseMap(tierA.censusNoiseStd, census.std.asSquareMap(), "$where censusNoiseStd")
                checked++
            }
        }
        assertTrue(checked >= MIN_TIER_A_FRAMES, "only $checked tier-A frames replayed")
        assertTrue(fullLearnFrames > 0, "the census full-learning guard was never exercised")
    }

    /** `_set_ref` runs only inside `_try_detect`, so a block frame's reference is the NEXT tier-A frame's
     *  `refFrames` (verified in Python on all 173 blocks). */
    @Test
    fun baselineOcclusionMatchesPython() {
        val counts = BaselineCounts()
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            checkClipBaselines(clip, counts)
            // `absThr` is the caller's `motionPxThr * 4`, never derived inside.
            val anyBlock = clip.frames.firstNotNullOfOrNull { it.baseline }
            val pxThr =
                clip.meta.effectiveConfig
                    .toTrackerConfig()
                    .motionPxThr
            if (anyBlock != null) {
                assertClose(pxThr * ABS_THR_FACTOR, anyBlock.absThr, "$name absThr")
            }
        }
        assertTrue(counts.checked >= MIN_BASELINE_FRAMES, "only ${counts.checked} baseline frames asserted")
        assertTrue(counts.withCore >= MIN_CORE_FRAMES, "only ${counts.withCore} frames carried a non-empty raw core")
        assertTrue(counts.withChroma > 0, "the chroma-outlier branch was never exercised")
    }

    private fun checkClipBaselines(
        clip: ParityClip,
        counts: BaselineCounts,
    ) {
        val det = clip.meta.detSize
        val boxes = squareBoxes(det, clip.meta.whitePov)
        val gamuts = HashMap<List<Int>, ColorGamut?>()
        for ((index, frame) in clip.frames.withIndex()) {
            val block = frame.baseline ?: continue
            val inputs = baselineInputs(clip, index)
            if (inputs != null) {
                val gamut = gamuts.getOrPut(inputs.gamutFrames) { buildGamut(clip, inputs.gamutFrames) }
                checkBaselineFrame(clip, frame, boxes, inputs, gamut)
                if (block.core.isNotEmpty()) counts.withCore++
                if (block.chromaOutliers.isNotEmpty()) counts.withChroma++
                counts.checked++
            }
        }
    }

    private fun checkBaselineFrame(
        clip: ParityClip,
        frame: ParityFrame,
        boxes: SquareBoxes,
        inputs: BaselineInputs,
        gamut: ColorGamut?,
    ) {
        val block = requireNotNull(frame.baseline)
        val det = clip.meta.detSize
        val curBgr = requireNotNull(clip.bgr(frame.frame)) { "${clip.name}/${frame.frame} has no BGR plane" }
        val evidence =
            BaselineEvidence(
                refCodes = censusTransform(inputs.refGray, out = censusBuffer(det, det)),
                occlCensusThr = block.occlCensusThr,
                curBgr = curBgr,
                gamut = gamut,
                colorThr = block.colorThr,
            )
        val result =
            BaselineScratch().baselineOcclusionAndShadow(
                clip.gray(frame.frame),
                inputs.refGray,
                boxes,
                det,
                block.absThr,
                clip.meta.whitePov,
                evidence,
            )
        val where = "${clip.name}/${frame.frame}"
        assertExact(block.occludedDilated.toSet(), result.occluded.sortedSquareNames().toSet(), "$where occludedDilated")
        assertExact(block.shadowDilated.toSet(), result.shadow.sortedSquareNames().toSet(), "$where shadowDilated")
        assertExact(block.core.toSet(), result.core.sortedSquareNames().toSet(), "$where baselineOcclusion.core")
        assertEquals(0L, result.core.without(result.occluded), "$where core square outside the dilated set")
        assertEquals(0L, result.shadow and result.occluded, "$where shadow and occluded overlap")
    }

    private fun baselineInputs(
        clip: ParityClip,
        index: Int,
    ): BaselineInputs? {
        val next: ParityFrame? = clip.frames.drop(index + 1).firstOrNull { it.tierA != null }
        val tierA = next?.tierA
        val refFrames = tierA?.refFrames
        return if (refFrames == null) null else BaselineInputs(clip.meanGray(refFrames), tierA.activeGamutFrames)
    }

    private fun buildGamut(
        clip: ParityClip,
        frames: List<Int>,
    ): ColorGamut? {
        val det = clip.meta.detSize
        val mean = clip.meanBgr(frames).data
        val geom = PlaneGeometry(det, det, det, clip.meta.whitePov)
        return boardColorGamut(ColorPlanes(toLab(mean, det), toHsv(mean, det)), geom)
    }

    private fun toLab(
        bgr: ByteArray,
        det: Int,
    ): ByteArray = bgrToLab(bgr, det, det, ByteArray(det * det * BGR_CHANNELS))

    private fun toHsv(
        bgr: ByteArray,
        det: Int,
    ): ByteArray = bgrToHsv(bgr, det, det, ByteArray(det * det * BGR_CHANNELS))

    private companion object {
        const val BGR_CHANNELS = 3
        const val ABS_THR_FACTOR = 4.0
        const val MIN_MOTION_FRAMES = 969
        const val MIN_TIER_A_FRAMES = 247
        const val MIN_BASELINE_FRAMES = 173
        const val MIN_CORE_FRAMES = 87
    }
}
