package com.chesslab.engine

import com.chesslab.engine.parity.ParityClip
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.ParityGamut
import com.chesslab.engine.parity.assertClose
import com.chesslab.engine.parity.assertExact
import com.chesslab.engine.parity.meanOf
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.math.abs

/** Colour vetoes and board gamut parity; `occlusionColorThr` is 1.5 in the fixtures, not `TRACK_DEFAULTS`' 3.0 (D00b-3). */
class ShadowGamutParityTest {
    @Test
    fun hsvShadowSquaresMatchPython() {
        var checked = 0
        var nonEmpty = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val cfg = clip.meta.effectiveConfig.toTrackerConfig()
            val size = clip.meta.detSize
            val geom = PlaneGeometry(size, size, cfg.detSize, clip.meta.whitePov, cfg.overhang)
            val planes = clip.bgrPlanes()
            for (frame in clip.tierAFrames()) {
                val tierA = requireNotNull(frame.tierA)
                val refFrames = tierA.refFrames ?: continue
                val refHsv = hsvOf(planes.meanOf(refFrames), size)
                val curHsv = hsvOf(planes.meanOf(tierA.curFrames), size)
                val actual =
                    hsvShadowSquares(
                        refHsv = refHsv,
                        curHsv = curHsv,
                        geom = geom,
                        candidates = ofSquares(tierA.vetoCandidates),
                    )
                assertExact(
                    tierA.hsvShadowSquares.toSet(),
                    actual.sortedSquareNames().toSet(),
                    "$name/${frame.frame}: hsvShadowSquares",
                )
                if (tierA.hsvShadowSquares.isNotEmpty()) nonEmpty++
                checked++
            }
        }
        assertTrue(checked > 0, "no tier-A frame was consumed")
        assertTrue(nonEmpty > 0, "no fixture frame carried a non-empty shadow set")
    }

    /**
     * The per-square feature is a mean of 8-bit channels, so it inherits the <= 1 LSB colour-conversion
     * exception (`parity/README.md`, STATUS D01c-4); the 1e-4 tolerance is for the from-features test.
     */
    @Test
    fun boardColorGamutMatchesPython() {
        var checked = 0
        val worst = Worst()
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val cfg = clip.meta.effectiveConfig.toTrackerConfig()
            val size = clip.meta.detSize
            // The gamut always uses the BASE boxes; extendUp must not leak in.
            val geom = PlaneGeometry(size, size, cfg.detSize, clip.meta.whitePov, 0.0)
            val planes = clip.bgrPlanes()
            for (frame in clip.tierAFrames()) {
                val expected = frame.tierA?.gamut ?: continue
                val bgr = planes.meanOf(expected.fromFrames)
                val gamut = boardColorGamut(colorPlanes(bgr, size), geom)
                assertNotNull(gamut, "$name/${frame.frame}: gamut must be built")
                requireNotNull(gamut)
                assertEquals(SQUARES, gamut.n, "$name/${frame.frame}: usable squares")
                assertEquals(expected.feats.size, gamut.n, "$name/${frame.frame}: feature count")
                worst.record(expected, gamut)
                checked++
            }
        }
        assertTrue(checked > 0, "no gamut fixture was consumed")
        assertTrue(worst.feat <= LSB, "worst feature deviation ${worst.feat} > $LSB LSB over $checked gamuts")
        assertTrue(worst.mu <= LSB, "worst mu deviation ${worst.mu} > $LSB LSB over $checked gamuts")
        assertTrue(worst.inv <= INV_REL, "worst invCov relative deviation ${worst.inv} > $INV_REL over $checked gamuts")
    }

    /** Running maxima of the end-to-end gamut deviation. */
    private class Worst {
        var feat = 0.0
        var mu = 0.0
        var inv = 0.0

        fun record(
            expected: ParityGamut,
            actual: ColorGamut,
        ) {
            for (k in 0 until actual.n) {
                for (j in 0 until DIM) {
                    feat = maxOf(feat, abs(expected.feats[k][j] - actual.feats[k * DIM + j]))
                }
            }
            for (j in 0 until DIM) {
                mu = maxOf(mu, abs(expected.mu[j] - actual.mu[j]))
            }
            for (i in 0 until DIM * DIM) {
                val e = expected.inv[i / DIM][i % DIM]
                inv = maxOf(inv, abs(e - actual.invCov[i]) / maxOf(INV_FLOOR, abs(e)))
            }
        }
    }

    /** Fed Python's own features, isolating the covariance/inverse math from the colour conversion. */
    @Test
    fun gamutStatisticsFromPythonFeaturesMatchPython() {
        var checked = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            for (frame in clip.tierAFrames()) {
                val expected = frame.tierA?.gamut ?: continue
                val n = expected.feats.size
                val gamut = requireNotNull(colorGamutFromFeatures(flatten(expected.feats), n))
                for (j in 0 until DIM) {
                    assertClose(expected.mu[j], gamut.mu[j], "$name/${frame.frame}: mu[$j]")
                }
                assertInvClose(expected.inv, gamut.invCov, "$name/${frame.frame} (from features)")
                checked++
            }
        }
        assertTrue(checked > 0, "no gamut fixture was consumed")
    }

    /** `occlusion_color_squares` on the quiet detection frames — Python's sets are empty there. */
    @Test
    fun occlusionColorSquaresMatchPythonOnDetectionFrames() {
        var checked = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val cfg = clip.meta.effectiveConfig.toTrackerConfig()
            val size = clip.meta.detSize
            // Python calls this with the DEFAULT extend_up = 0.0, never with the overhang.
            val geom = PlaneGeometry(size, size, cfg.detSize, clip.meta.whitePov, 0.0)
            val planes = clip.bgrPlanes()
            for (frame in clip.tierAFrames()) {
                val tierA = requireNotNull(frame.tierA)
                if (tierA.refFrames == null) continue
                val gamut = boardColorGamut(colorPlanes(planes.meanOf(tierA.activeGamutFrames), size), geom)
                val cur = colorPlanes(planes.meanOf(tierA.curFrames), size)
                val actual =
                    occlusionColorSquares(cur, geom, gamut, ofSquares(tierA.vetoCandidates), tierA.occlusionColorThr)
                assertExact(
                    tierA.occlusionColorSquares.toSet(),
                    actual.sortedSquareNames().toSet(),
                    "$name/${frame.frame}: occlusionColorSquares",
                )
                checked++
            }
        }
        assertTrue(checked > 0, "no tier-A frame was consumed")
    }

    /** The case the veto exists for, a hand over the board — on the frame's OWN warp, not the averaged `cur`. */
    @Test
    fun occlusionColorSquaresMatchPythonOnHandFrames() {
        var checked = 0
        var nonEmpty = 0
        for (name in ParityFixtures.clips()) {
            val clip = ParityFixtures.load(name)
            val cfg = clip.meta.effectiveConfig.toTrackerConfig()
            val size = clip.meta.detSize
            val geom = PlaneGeometry(size, size, cfg.detSize, clip.meta.whitePov, 0.0)
            val active = activeGamutFrames(clip)
            val planes = clip.bgrPlanes()
            val gamuts = HashMap<List<Int>, ColorGamut?>()
            for (frame in clip.frames) {
                val baseline = frame.baseline
                val from = active[frame.frame]
                if (baseline == null || from == null) continue
                val gamut = gamuts.getOrPut(from) { boardColorGamut(colorPlanes(planes.meanOf(from), size), geom) }
                val cur = colorPlanes(planes.getValue(frame.frame), size)
                val actual =
                    occlusionColorSquares(cur, geom, gamut, ofSquares(baseline.strongCandidates), baseline.colorThr)
                assertExact(
                    baseline.chromaOutliers.toSet(),
                    actual.sortedSquareNames().toSet(),
                    "$name/${frame.frame}: baselineOcclusion.chromaOutliers",
                )
                if (baseline.chromaOutliers.isNotEmpty()) nonEmpty++
                checked++
            }
        }
        assertTrue(checked > 0, "no baseline-occlusion frame was consumed")
        assertTrue(nonEmpty > 0, "no fixture frame carried a non-empty chroma-outlier set")
    }

    // -----------------------------------------------------------------------------------

    /**
     * The gamut changes only at a quiet re-anchor (a Tier-A frame), so it is carried forward; where that
     * disagrees with the next Tier-A frame's `activeGamutFrames`, the frame is `null` rather than guessed.
     */
    private fun activeGamutFrames(clip: ParityClip): Map<Int, List<Int>?> {
        val first = clip.tierAFrames().firstOrNull()?.tierA ?: return emptyMap()
        val forward = HashMap<Int, List<Int>>()
        var current = first.activeGamutFrames
        for (frame in clip.frames) {
            forward[frame.frame] = current
            val tierA = frame.tierA
            if (tierA != null) current = tierA.gamut?.fromFrames ?: tierA.activeGamutFrames
        }
        val next = HashMap<Int, List<Int>?>()
        var upcoming: List<Int>? = null
        for (frame in clip.frames.reversed()) {
            frame.tierA?.let { upcoming = it.activeGamutFrames }
            next[frame.frame] = upcoming
        }
        return clip.frames.associate { frame ->
            val fwd = forward.getValue(frame.frame)
            frame.frame to if (fwd == next[frame.frame]) fwd else null
        }
    }

    private fun flatten(rows: List<List<Double>>): DoubleArray {
        val out = DoubleArray(rows.size * DIM)
        for (k in rows.indices) {
            for (j in 0 until DIM) {
                out[k * DIM + j] = rows[k][j]
            }
        }
        return out
    }

    private fun assertInvClose(
        expected: List<List<Double>>,
        actual: DoubleArray,
        what: String,
    ) {
        for (i in 0 until DIM) {
            for (j in 0 until DIM) {
                assertClose(expected[i][j], actual[i * DIM + j], "$what: invCov[$i][$j]")
            }
        }
    }

    private fun hsvOf(
        bgr: ByteArray,
        size: Int,
    ): ByteArray = bgrToHsv(bgr, size, size, ByteArray(bgr.size))

    private fun colorPlanes(
        bgr: ByteArray,
        size: Int,
    ): ColorPlanes =
        ColorPlanes(
            bgrToLab(bgr, size, size, ByteArray(bgr.size)),
            bgrToHsv(bgr, size, size, ByteArray(bgr.size)),
        )

    private companion object {
        const val SQUARES = 64
        const val DIM = 3

        /** The documented BGR->Lab/HSV conversion exception, propagated through a channel mean. */
        const val LSB = 1.0

        /** Relative bound on the end-to-end inverse covariance; see D01c-4. */
        const val INV_REL = 1e-2

        /** Floor of the relative denominator, so a near-zero entry stays comparable. */
        const val INV_FLOOR = 1e-3
    }
}
