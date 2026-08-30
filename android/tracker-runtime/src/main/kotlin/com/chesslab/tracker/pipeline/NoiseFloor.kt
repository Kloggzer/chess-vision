package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.board.BOARD_PX
import com.chesslab.engine.board.busyLevel
import com.chesslab.engine.board.cellDeltas
import com.chesslab.engine.board.grayBoard

/** No pair measured yet — the perf line then carries no `noise=` at all. */
const val NOISE_UNMEASURED = -1.0

/**
 * What the diff channel sees when nothing happens: `ChangeEvidence.busy` over a pair of
 * consecutive frames, measured here because the app runs `CLASSIC` and never computes one.
 *
 * A cell mean over ~120x120 source pixels damps uncorrelated noise by sqrt(N), so what a gain
 * change does to the raw image says nothing about what it does here — `docs/board-exposure.md`.
 */
class NoiseFloor(
    /** Two frames of work per interval; the perf line prints once a second and cannot use more. */
    private val everyFrames: Long = DEFAULT_INTERVAL,
) {
    private var armed: ByteArray? = null
    private var armedCorners: FloatArray? = null
    private var due = 0L

    var busy = NOISE_UNMEASURED
        private set

    /** A hand crossing raises this like a move does — read the session's low end, not one line. */
    fun observe(
        seq: Long,
        corners: FloatArray,
        board: (Int) -> BgrImage?,
    ) {
        if (armed == null && seq < due) return
        val gray = board(BOARD_PX)?.let(::grayBoard)
        if (gray == null) {
            disarm()
            return
        }
        val previous = armed
        // Two boards are comparable only under the same corners: `LiveAlign` re-derives the quad
        // every few frames and each measurement shifts the warp by a fraction of a pixel, which
        // lands in every cell as change that never happened — see `StillPhase.observe`.
        if (previous != null && armedCorners?.contentEquals(corners) == true) {
            busy = busyLevel(cellDeltas(previous, gray))
            disarm()
            due = seq + everyFrames
            return
        }
        armed = gray
        armedCorners = corners.copyOf()
    }

    /** After an exposure step: a pair straddling it measures the step, not the floor. */
    fun disarm() {
        armed = null
        armedCorners = null
    }

    private companion object {
        /** One second at the phone's 15 fps, so the sample is fresh when the line is written. */
        const val DEFAULT_INTERVAL = 15L
    }
}
