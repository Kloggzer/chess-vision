package com.chesslab.tracker.pipeline

import com.chesslab.engine.api.BgrImage
import com.chesslab.engine.board.BOARD_PX
import com.chesslab.engine.board.busyLevel
import com.chesslab.engine.board.cellDeltas
import com.chesslab.engine.board.grayBoard

/** The perf line then carries no `noise=` at all. */
const val NOISE_UNMEASURED = -1.0

/** `ChangeEvidence.busy` over consecutive frames, measured here because the app runs `CLASSIC`. A cell mean damps
 *  noise by sqrt(N), so a gain change on the raw image says nothing about this. */
class NoiseFloor(
    private val everyFrames: Long = DEFAULT_INTERVAL,
) {
    private var armed: ByteArray? = null
    private var armedCorners: FloatArray? = null
    private var armedUntil = 0L
    private var due = 0L

    var busy = NOISE_UNMEASURED
        private set

    /** A hand crossing raises this like a move: read the session's low end, not one line. */
    fun observe(
        seq: Long,
        corners: FloatArray,
        board: (Int) -> BgrImage?,
    ) {
        // Ein scharf gestelltes Bild setzt die Sperre aus, aber mit Frist: passen die Ecken nie zusammen (`LiveAlign`
        // misst den Quad neu), stellte sonst jeder Frame neu scharf, ohne `due` zu drehen.
        if (armed != null && seq > armedUntil) {
            disarm()
            due = seq + everyFrames
        }
        if (armed == null && seq < due) return
        val gray = board(BOARD_PX)?.let(::grayBoard)
        if (gray == null) {
            disarm()
            return
        }
        val previous = armed
        // Comparable only under the same corners: each `LiveAlign` re-measure shifts the warp by a fraction of a
        // pixel, which lands in every cell as change that never happened.
        if (previous != null && armedCorners?.contentEquals(corners) == true) {
            busy = busyLevel(cellDeltas(previous, gray))
            disarm()
            due = seq + everyFrames
            return
        }
        if (previous == null) armedUntil = seq + PAIR_WINDOW
        armed = gray
        armedCorners = corners.copyOf()
    }

    /** A pair straddling an exposure step measures the step, not the floor. */
    fun disarm() {
        armed = null
        armedCorners = null
    }

    private companion object {
        const val DEFAULT_INTERVAL = 15L

        const val PAIR_WINDOW = 3L
    }
}
