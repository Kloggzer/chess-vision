package com.chesslab.tracker.geometry

import org.bytedeco.javacpp.Loader
import org.bytedeco.opencv.opencv_java
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test

/**
 * The measurement pieces against synthetic truth — the specs/41 trap encoded as tests: quad
 * spread is a MOVEMENT check that scores a consistently wrong quad beautifully, so nothing here
 * may read it as correctness, and the refusal gates must key on the absolute verdict.
 */
class GeometryScanTest {
    @Test
    fun aStaticQuadHasNoSpreadButCanStillBeWrong() {
        // Identical quads — wherever they sit, the spread about their median is zero. This is
        // exactly why spread must never be a correctness gate: these corners are nowhere near a
        // real board and the number is perfect.
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

        // The decision of 2026-08-08: a HANDSY video with plenty of aligned evidence is labelable
        // — the pass rate measures playing speed, and rec-20260808-003957 (82.5 %, 837 aligned,
        // flawless geometry) is exactly this row. Only a video without ENOUGH aligned samples
        // (board out of shot, footage too short) is refused.
        val handsyButEvidenced = scanned(alignPassRate = 0.5, aligned = 500, spreadP90 = 0.9, clockP90 = 0.0)
        assertTrue(geometryRefusals(handsyButEvidenced).isEmpty())

        val sparse = scanned(alignPassRate = 0.5, aligned = 40, spreadP90 = 0.9, clockP90 = 0.0)
        assertTrue(geometryRefusals(sparse).single().contains("align to the board's own grid"))

        // A moving board is a WARNING, not a refusal: the spread compares the quads against their
        // own median, so it measures movement and never correctness (CLAUDE.md). Reading it as a
        // gate refused `2026-08-13-19-34-23`, whose absolute gate passes on 97.2 % of its samples.
        val nudged = scanned(alignPassRate = 0.98, aligned = 939, spreadP90 = 9.0, clockP90 = 0.0)
        assertTrue(geometryRefusals(nudged).isEmpty())
        assertTrue(geometryWarnings(nudged).single().contains("does not stand for every frame"))

        val vfr = scanned(alignPassRate = 0.98, aligned = 939, spreadP90 = 0.9, clockP90 = 20.0)
        val reason = geometryRefusals(vfr).single()
        assertTrue(reason.contains("not constant-rate")) { reason }
    }

    @Test
    fun variableRateFootageGetsAReEncodeHint() {
        val hint = ffmpegCfrHint("data/testclip-raw/some game.mp4", 30.0)
        assertTrue(hint.startsWith("ffmpeg")) { hint }
        assertTrue(hint.contains("-vsync cfr")) { hint }
        assertTrue(hint.contains("some game-cfr.mp4")) { hint }
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
