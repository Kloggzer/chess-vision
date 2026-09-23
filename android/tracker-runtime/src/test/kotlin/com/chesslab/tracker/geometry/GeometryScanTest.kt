package com.chesslab.tracker.geometry

import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test

/** The specs/41 trap: quad spread is a MOVEMENT check that scores a consistently wrong quad beautifully. */
class GeometryScanTest {
    @Test
    fun aStaticQuadHasNoSpreadButCanStillBeWrong() {
        // Nowhere near a real board, and the spread is perfect: never a correctness gate.
        val quad = floatArrayOf(10f, 900f, 20f, 40f, 950f, 60f, 930f, 940f)
        val quads = List(5) { quad.copyOf() }
        val spread = quadSpreadRectified(quads, medianQuadOf(quads), boardSize = 800)
        assertEquals(5, spread.size)
        assertTrue(spread.all { it < 1e-6 }) { "identical quads must have zero spread, got $spread" }
    }

    @Test
    fun theMedianQuadIsTakenPerCornerAcrossSampledFrames() {
        val steady = floatArrayOf(0f, 0f, 100f, 0f, 100f, 100f, 0f, 100f)
        val outlier = floatArrayOf(500f, 700f, 600f, 700f, 600f, 800f, 500f, 800f)
        val quads = List(4) { steady.copyOf() } + listOf(outlier)
        val median = medianQuadOf(quads)
        assertTrue(steady.toList() == median.toList()) {
            "one mis-resolved frame must not move the median: expected ${steady.toList()}, got ${median.toList()}"
        }
    }

    @Test
    fun aWindowKeepsTheSamplesUpToTheFrameTheCandidateEndsAt() {
        val quads = List(10) { floatArrayOf(it.toFloat()) }
        assertEquals(3, windowOf(quads, sampleEvery = 10, upToFrame = 25).size)
        assertEquals(10, windowOf(quads, sampleEvery = 10, upToFrame = 5000).size)
        assertEquals(10, windowOf(quads, sampleEvery = 10, upToFrame = Int.MAX_VALUE).size)
    }

    @Test
    fun aMovedBoardShowsUpAsSpread() {
        val before = floatArrayOf(0f, 0f, 800f, 0f, 800f, 800f, 0f, 800f)
        val after = FloatArray(8) { before[it] + 40f }
        val quads = List(3) { before.copyOf() } + List(3) { after.copyOf() }
        val spread = quadSpreadRectified(quads, medianQuadOf(quads), boardSize = 800)
        assertTrue(spread.max() > QUAD_SPREAD_P90_MAX) {
            "a 40 px nudge must exceed the $QUAD_SPREAD_P90_MAX px gate, got max ${spread.max()}"
        }
    }

    @Test
    fun refusalsKeyOnTheAbsoluteGateAndTheClock() {
        val ok = scanned(alignPassRate = 0.98, aligned = 939, spreadP90 = 0.9, clockP90 = 0.0)
        assertTrue(geometryRefusals(ok).isEmpty())

        // 2026-08-08: the pass rate measures playing speed — rec-20260808-003957 (82.5 %, 837 aligned) is
        // labelable. Only a video without ENOUGH aligned samples is refused.
        val handsyButEvidenced = scanned(alignPassRate = 0.5, aligned = 500, spreadP90 = 0.9, clockP90 = 0.0)
        assertTrue(geometryRefusals(handsyButEvidenced).isEmpty())

        val sparse = scanned(alignPassRate = 0.5, aligned = 40, spreadP90 = 0.9, clockP90 = 0.0)
        assertTrue(geometryRefusals(sparse).single().contains("align to the board's own grid"))

        // A moving board is a WARNING: as a gate it refused `2026-08-13-19-34-23` (absolute gate 97.2 %).
        val nudged = scanned(alignPassRate = 0.98, aligned = 939, spreadP90 = 9.0, clockP90 = 0.0)
        assertTrue(geometryRefusals(nudged).isEmpty())
        assertTrue(geometryWarnings(nudged).single().contains("does not stand for every frame"))

        // VFR is a WARNING since 2026-08-14: the replay clock reads each frame's PTS (phone: 26.35/23.47 fps).
        val vfr = scanned(alignPassRate = 0.98, aligned = 939, spreadP90 = 0.9, clockP90 = 20.0)
        assertTrue(geometryRefusals(vfr).isEmpty())
        assertTrue(geometryWarnings(vfr).single().contains("variable-rate")) { geometryWarnings(vfr).toString() }
    }

    @Test
    fun anEmptyDistributionIsNullsNotZeros() {
        val d = distributionOf(emptyList())
        assertNull(d.median)
        assertNull(d.p90)
        assertNull(d.max)
    }

    private fun scanned(
        alignPassRate: Double,
        aligned: Int,
        spreadP90: Double,
        clockP90: Double,
    ): ScannedGeometry =
        ScannedGeometry(
            corners = listOf(doubleArrayOf(0.0, 0.0), doubleArrayOf(800.0, 0.0), doubleArrayOf(800.0, 800.0), doubleArrayOf(0.0, 800.0)),
            boardSize = 800,
            margin = DEFAULT_MARKER_MARGIN,
            frameWidth = 1080,
            frameHeight = 1920,
            fps = 30.0,
            alignPassRate = alignPassRate,
            aligned = aligned,
            sampled = 958,
            frames = 9576,
            sampleEvery = 10,
            markersSeen = mapOf(3 to 940, 2 to 17, 1 to 1),
            worstOffsetPx = Distribution(2.0, 2.4, 23.8),
            quadSpreadPx = Distribution(spreadP90 / 2, spreadP90, spreadP90 * 2),
            clockErrorMs = Distribution(0.0, clockP90, clockP90 * 2),
        )

    companion object {
        @JvmStatic
        @BeforeAll
        fun loadOpenCv() {
            Loader.load(opencv_java::class.java)
        }
    }
}
