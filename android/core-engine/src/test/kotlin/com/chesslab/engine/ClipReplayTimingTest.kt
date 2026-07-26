package com.chesslab.engine

import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.STARTPOS
import com.chesslab.engine.api.TrackerEngine
import com.chesslab.engine.parity.ParityClip
import com.chesslab.engine.parity.ParityFixtures
import com.chesslab.engine.parity.toTrackerConfig
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfSystemProperty

/**
 * End-to-end timing of [com.chesslab.engine.api.TrackerEngine.onFrame] over every committed clip —
 * the same 969 frames `ClipReplayParityTest` asserts on, with the assertions removed.
 *
 * A per-stage microbenchmark can flatter an optimisation that was not on the frame path at all;
 * this cannot. **Asserts nothing.** Off by default; run with `-Pchesslab.profile=true`.
 *
 * These are desktop-JVM figures at the fixtures' `detSize` (320), not the phone's 800.
 */
@EnabledIfSystemProperty(named = "chesslab.profile", matches = "true")
class ClipReplayTimingTest {
    @Test
    fun timeEveryClipReplay() {
        val clips = ParityFixtures.clips().map { ParityFixtures.load(it) }
        // Decode and warm the JIT first: the fixtures are gzipped delta chains, and timing the
        // decoder would drown the engine entirely.
        repeat(WARMUP) { clips.forEach { replay(it) } }
        var frames = 0
        var best = Long.MAX_VALUE
        repeat(REPS) {
            val t0 = System.nanoTime()
            frames = clips.sumOf { replay(it) }
            best = minOf(best, System.nanoTime() - t0)
        }
        val ms = best / 1e6
        println(
            "\n=== clip replay: ${clips.size} clips, $frames frames, detSize ${clips[0].meta.detSize} ===\n" +
                "  total ${"%.1f".format(ms)} ms   per frame ${"%.3f".format(ms / frames)} ms\n",
        )
    }

    private fun replay(clip: ParityClip): Int {
        val meta = clip.meta
        val engine = TrackerEngine(meta.effectiveConfig.toTrackerConfig(), meta.startFen ?: STARTPOS)
        engine.setFen(meta.startFen ?: STARTPOS)
        val promotionPiece = meta.movesUci.firstOrNull { it.length == PROMO_UCI_LENGTH }?.get(PROMO_UCI_LENGTH - 1) ?: 'q'
        var clock = VCLOCK_START
        var previous = meta.frames.first()
        for ((position, index) in meta.frames.withIndex()) {
            clock += if (position == 0) 1.0 / meta.fps else (index - previous) / meta.fps
            previous = index
            val frame = clip.frame(index)
            engine.onFrame(
                FrameInput(
                    seq = frame.seq.toLong(),
                    grayDet = clip.gray(frame.frame),
                    bgrDet = requireNotNull(clip.bgr(frame.frame)),
                    corners = FROZEN_CORNERS,
                    motionRoiScore = frame.motionRoiScore,
                    gridLineCoverage = 1.0,
                    lumaPreClahe = frame.lumaPreClahe,
                    timestampMs = Math.round(clock * MS_PER_S),
                ),
            )
            if (engine.state.promoPending != null) engine.choosePromotion(promotionPiece)
        }
        return meta.frames.size
    }

    private companion object {
        const val WARMUP = 2
        const val REPS = 5
        const val PROMO_UCI_LENGTH = 5
        const val VCLOCK_START = 1_700_000_000.0
        const val MS_PER_S = 1000.0
        val FROZEN_CORNERS = FloatArray(8) { it.toFloat() }
    }
}
