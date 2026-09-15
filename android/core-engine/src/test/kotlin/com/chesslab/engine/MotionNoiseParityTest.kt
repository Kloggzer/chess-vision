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

// Parity of phase 01d's three primitives against the phase-00b golden fixtures.
//
// `TrackerConfig` is always built from `meta.effectiveConfig` (README "BUILD YOUR TrackerConfig
// FROM THIS"): `occlusionColorThr` is 1.5 in the fixtures, `detSize` is 320 and several clips run
// with `overhang = 0.0`. Kotlin defaults would diverge for a reason that looks like a port bug.

private const val U8 = 0xFF

/** How the reference of a non-detection frame is recovered — see the class KDoc of the test. */
private class BaselineInputs(
    val refGray: GrayImage,
    val gamutFrames: List<Int>,
)

/** Coverage counters of [MotionNoiseParityTest.baselineOcclusionMatchesPython]. */
private class BaselineCounts {
    var checked = 0
    var withCore = 0
    var withChroma = 0
}

class MotionNoiseParityTest {
    /**
     * `motion_score` (`tracker.py`) over EVERY emitted frame of all 18 clips.
     *
     * `tierB.motionScore` is `max(motion_score(prevGray, curGray), motionRoi)` (`tracker.py`),
     * and the fixture stream *is* the input stream, so `prevGray` is the previously emitted frame's
     * gray plane (the first frame diffs against itself -> 0.0).
     */
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

    /**
     * Replays both `SquareNoise` lanes over the recorded diff sequence of every clip.
     *
     * Python never resets either model, so this is a full replay from the constructor state:
     * `noiseZ` / `censusNoiseZ` are `z()` **before** that frame's update, `noiseMean` / `noiseStd`
     * (and the census pair) are the model **after** it. A port that mis-orders learning vs. scoring
     * diverges on the very next frame.
     *
     * `censusNoiseZ == null` marks the frames where `_compute_evidence`'s channel-local guard
     * dropped the census channel and learned the disturbance with FULL alpha and no exclusion
     * (`tracker.py`) — 3 frames over the 18 clips.
     */
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
                val diffs = toArray(tierA.normalizedDiffs)
                val cens = toArray(tierA.censusNormalized)
                val exclude = ofSquares(tierA.noiseExclude)

                assertCloseMap(tierA.noiseZ, toMap(gray.z(diffs, scratch)), "$where noiseZ")
                val censusZ = tierA.censusNoiseZ
                if (censusZ != null) {
                    assertCloseMap(censusZ, toMap(census.z(cens, scratch)), "$where censusNoiseZ")
                }

                gray.update(diffs, exclude)
                if (censusZ != null) {
                    census.update(cens, exclude, CENSUS_NOISE_EXCLUDE_ALPHA_SCALE)
                } else {
                    census.update(cens)
                    fullLearnFrames++
                }

                assertCloseMap(tierA.noiseMean, toMap(gray.mean), "$where noiseMean")
                assertCloseMap(tierA.noiseStd, toMap(gray.std), "$where noiseStd")
                assertCloseMap(tierA.censusNoiseMean, toMap(census.mean), "$where censusNoiseMean")
                assertCloseMap(tierA.censusNoiseStd, toMap(census.std), "$where censusNoiseStd")
                checked++
            }
        }
        assertTrue(checked >= MIN_TIER_A_FRAMES, "only $checked tier-A frames replayed")
        assertTrue(fullLearnFrames > 0, "the census full-learning guard was never exercised")
    }

    /**
     * `_baseline_occlusion_and_shadow` (`tracker.py`) on every frame that carries a
     * `baselineOcclusion` block — the hand-over-the-board frames, which is where the classifier and
     * the chroma-outlier branch actually fire.
     *
     * The block is computed on the RAW current frame against `self.ref_gray` (`tracker.py`),
     * so the reference has to be recovered: `_set_ref` only ever runs inside `_try_detect` (a
     * tier-A frame) or at the very first baseline capture, which precedes every block. Therefore
     * the reference in force at a block frame is exactly `tierA.refFrames` of the **next** tier-A
     * frame, and the active gamut is that frame's `activeGamutFrames`. Verified against the Python
     * implementation over all 173 recoverable blocks before this test was written.
     */
    @Test
    fun baselineOcclusionMatchesPython() {
        val counts = BaselineCounts()
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            checkClipBaselines(clip, counts)
            // `absThr` is the caller's `motionPxThr * 4`, never derived inside the function.
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
        return if (refFrames == null) null else BaselineInputs(meanGray(clip, refFrames), tierA.activeGamutFrames)
    }

    private fun buildGamut(
        clip: ParityClip,
        frames: List<Int>,
    ): ColorGamut? {
        val det = clip.meta.detSize
        val mean = meanBgr(clip, frames)
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

    /** Python `_RunningMean.mean_uint8`: `(sum / n)` TRUNCATED, not rounded. */
    private fun meanGray(
        clip: ParityClip,
        frames: List<Int>,
    ): GrayImage {
        val det = clip.meta.detSize
        return GrayImage(det, det, meanPlane(frames.map { clip.gray(it).data }, det * det))
    }

    private fun meanBgr(
        clip: ParityClip,
        frames: List<Int>,
    ): ByteArray {
        val det = clip.meta.detSize
        val planes = frames.map { requireNotNull(clip.bgr(it)) { "frame $it has no BGR plane" }.data }
        return meanPlane(planes, det * det * BGR_CHANNELS)
    }

    private fun meanPlane(
        planes: List<ByteArray>,
        size: Int,
    ): ByteArray {
        require(planes.isNotEmpty()) { "no planes to average" }
        val acc = LongArray(size)
        for (plane in planes) {
            for (i in 0 until size) {
                acc[i] += (plane[i].toInt() and U8).toLong()
            }
        }
        val out = ByteArray(size)
        for (i in 0 until size) {
            out[i] = (acc[i] / planes.size).toByte()
        }
        return out
    }

    private fun toArray(values: Map<String, Double>): DoubleArray = DoubleArray(Squares.COUNT) { values.getValue(Squares.ALL[it]) }

    private fun toMap(values: DoubleArray): Map<String, Double> = Squares.ALL.withIndex().associate { (i, s) -> s to values[i] }

    private companion object {
        const val BGR_CHANNELS = 3
        const val ABS_THR_FACTOR = 4.0
        const val MIN_MOTION_FRAMES = 969
        const val MIN_TIER_A_FRAMES = 247
        const val MIN_BASELINE_FRAMES = 173
        const val MIN_CORE_FRAMES = 87
    }
}
