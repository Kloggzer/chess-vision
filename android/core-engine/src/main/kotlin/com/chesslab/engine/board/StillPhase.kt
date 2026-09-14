package com.chesslab.engine.board

import com.chesslab.engine.api.FrameInput

/** Thresholds are raw-board gray levels measured on recordings from 2026-08-25. */
// TODO: Remove or wire this orphan; no production caller can exercise its independent settle state.
class StillPhase {
    private var prev: ByteArray? = null

    /** Diff reference must be the last understood picture. */
    var reference: ByteArray? = null
        private set

    private var quietSinceMs = Long.MIN_VALUE
    private var lastReadMs = Long.MIN_VALUE
    private var retries = 0
    private var dirty = false
    private var sawHand = false
    private var corners: FloatArray? = null

    var lastMotionSeq: Long = Long.MAX_VALUE
        private set

    var moving: Boolean = true
        private set

    fun observe(
        gray: ByteArray,
        input: FrameInput,
    ): Boolean {
        // Corner remeasurement shifts the warp fractionally, so different quads are incomparable.
        val sameView = corners?.contentEquals(input.corners) == true
        corners = input.corners.copyOf()
        val previous = prev
        prev = gray
        val interPeak = if (previous == null || !sameView) null else peak(cellDeltas(previous, gray))
        if (interPeak != null && interPeak > ACTIVITY_THR) sawHand = true
        moving = decide(interPeak, previous, input)
        // Only resting frames may anchor; 2026-08-26 `11-55-19` anchored a hand and dirtied 12 squares.
        if (reference == null && !moving) reference = gray
        return moving
    }

    private fun decide(
        interPeak: Double?,
        previous: ByteArray?,
        input: FrameInput,
    ): Boolean =
        when {
            // No comparable pair means no new motion evidence.
            interPeak == null -> previous == null || quietSinceMs == Long.MIN_VALUE
            interPeak > MOTION_THR -> {
                lastMotionSeq = input.seq
                quietSinceMs = Long.MIN_VALUE
                retries = 0
                true
            }
            else -> {
                if (quietSinceMs == Long.MIN_VALUE) quietSinceMs = input.timestampMs
                input.timestampMs - quietSinceMs < SETTLE_MS
            }
        }

    /** Permissive pre-inference gate: a false positive costs one read; a false negative costs a move. */
    fun wantsRead(): Boolean = !moving && (dirty || sawHand)

    fun due(
        nowMs: Long,
        gray: ByteArray,
    ): Boolean =
        if (dirty) {
            retries < MAX_RETRIES && nowMs - lastReadMs >= RETRY_MS * (1 shl retries)
        } else {
            sawHand && reference?.let { peak(cellDeltas(it, gray)) > CHANGE_THR } == true
        }

    fun read(nowMs: Long) {
        lastReadMs = nowMs
    }

    fun settle(gray: ByteArray) {
        reference = gray
        dirty = false
        retries = 0
        sawHand = false
    }

    fun smudge() {
        dirty = true
        retries += 1
    }

    fun reset() {
        prev = null
        reference = null
        quietSinceMs = Long.MIN_VALUE
        retries = 0
        dirty = false
        sawHand = false
        lastMotionSeq = Long.MAX_VALUE
    }

    fun debug(): String = "dirty=$dirty retries=$retries hand=$sawHand"

    fun state(): String =
        when {
            quietSinceMs == Long.MIN_VALUE -> "moving"
            dirty -> "move"
            else -> "waiting"
        }

    private companion object {
        /** Per-cell peak below 5 gray levels counts as still. */
        const val MOTION_THR = 5.0

        /** Hand activity gates reads; shadow drift caused 116/177 redundant reads in one recording. */
        const val ACTIVITY_THR = 12.0

        /** A peak above 10 gray levels marks change from the understood still. */
        const val CHANGE_THR = 10.0

        /** 60 ms allows two still frames and avoids mid-grab reads. */
        const val SETTLE_MS = 60L

        const val RETRY_MS = 400L
        const val MAX_RETRIES = 3
    }
}
