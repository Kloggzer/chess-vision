package com.chesslab.engine

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.api.FrameInput
import com.chesslab.engine.api.GrayImage
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Detection eligibility only: no inference, natives or claim of move correctness. */
class CommitLatencyProbeTest {
    @Test
    fun compareHoldsAtPhoneFrameRates() {
        for (periodMs in listOf(33L, 67L, 100L)) {
            for (gridCovered in listOf(false, true)) {
                val baseline = firstDetection(periodMs, gridCovered, 0.20)
                val shorter = firstDetection(periodMs, gridCovered, 0.05)
                println("periodMs=$periodMs grid=$gridCovered defaultMs=$baseline shorterMs=$shorter")
                assertTrue(shorter <= baseline)
                // The settle frames still bind even when the hold is shorter.
                assertTrue(shorter >= 2 * periodMs)
            }
        }
    }

    private fun firstDetection(
        periodMs: Long,
        gridCovered: Boolean,
        holdS: Double,
    ): Long {
        val cfg =
            testConfig(boardSize = 80, minGridLineCoverage = 0.5).copy(
                motionHoldS = holdS,
                occluderHoldS = holdS,
            )
        val state = testState(cfg)
        state.cnnRun = true
        state.syncAvgWindow()
        val gray = grayFrame(boardSize = 80)
        val bgr = bgrFrame(boardSize = 80)
        state.refGray = gray
        state.refBgr = bgr
        state.refFen = state.board.fen()
        val loop = FrameLoop(state) { _, _ -> error("reference already exists") }
        for (index in 0L..30L) {
            val result =
                loop.step(
                    FrameInput(
                        seq = index + 1,
                        grayDet = GrayImage(gray.width, gray.height, gray.data.copyOf()),
                        bgrDet = BgrImage(bgr.width, bgr.height, bgr.data.copyOf()),
                        corners = FloatArray(8),
                        motionRoiScore = if (index == 0L) 1.0 else 0.0,
                        gridLineCoverage = if (index == 0L && gridCovered) 0.0 else 1.0,
                        lumaPreClahe = 128.0,
                        timestampMs = 1000L + index * periodMs,
                    ),
                )
            if (result is FrameOutcome.Detect) return index * periodMs
        }
        error("no detection within the bounded probe")
    }
}
