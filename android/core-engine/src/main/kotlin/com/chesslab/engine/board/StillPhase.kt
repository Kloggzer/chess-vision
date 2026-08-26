package com.chesslab.engine.board

import com.chesslab.engine.api.FrameInput

/**
 * Whether the board is moving, and whether what it settled into is worth a reading.
 *
 * The thresholds are grey levels on the raw rectified board, measured on the recordings of
 * 2026-08-25. They are the whole method: below [MOTION_THR] two frames count as the same still
 * scene, above [ACTIVITY_THR] a hand has crossed, and [CHANGE_THR] against the last UNDERSTOOD
 * still image is what makes a reading worth its cost.
 */
class StillPhase {
    private var prev: ByteArray? = null

    /** The last picture that was UNDERSTOOD — what a diff engine measures its change against. */
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

    /** What the last [observe] decided — so a caller can ask without asking twice. */
    var moving: Boolean = true
        private set

    /** True while the board is moving. Also the place where a hand is remembered. */
    fun observe(
        gray: ByteArray,
        input: FrameInput,
    ): Boolean {
        // Two boards are only comparable under the same corners: the quad is re-measured every
        // `alignEvery` frames — every third — and each measurement shifts the warp by a fraction
        // of a pixel, which lands in every cell as change that never happened. Such a frame is
        // therefore not evidence of motion, it is simply no evidence: it becomes the new reference
        // for the next comparison and the rest phase runs on undisturbed.
        val sameView = corners?.contentEquals(input.corners) == true
        corners = input.corners.copyOf()
        val previous = prev
        prev = gray
        val interPeak = if (previous == null || !sameView) null else peak(cellDeltas(previous, gray))
        if (interPeak != null && interPeak > ACTIVITY_THR) sawHand = true
        moving = decide(interPeak, previous, input)
        // Only a RESTING board may become the reference. Measured 2026-08-26: taking the first
        // frame whatever it showed baselined a hand mid-reach on `11-55-19`, and every comparison
        // afterwards measured against it — twelve squares "changed" before a move was played.
        if (reference == null && !moving) reference = gray
        return moving
    }

    private fun decide(
        interPeak: Double?,
        previous: ByteArray?,
        input: FrameInput,
    ): Boolean =
        when {
            // No comparable pair: no evidence either way, so the rest phase runs on undisturbed.
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

    /**
     * Asked BEFORE an inference: is the board in a state where a reading could say anything.
     *
     * The same question [due] answers, minus the picture — it is asked once per frame from the
     * observer's gate and must not cost a comparison of its own. It is deliberately permissive:
     * saying yes once too often costs one reading, saying no once too seldom costs a move.
     */
    fun wantsRead(): Boolean = !moving && (dirty || sawHand)

    /** Whether a reading available right now would tell us anything we do not already know. */
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

    /** The board is understood: this picture becomes the one everything is compared against. */
    fun settle(gray: ByteArray) {
        reference = gray
        dirty = false
        retries = 0
        sawHand = false
    }

    /** Something changed that we could not explain — try again, with widening gaps. */
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

    /** The gate's own state, for the log line that explains a frame which decided nothing. */
    fun debug(): String = "dirty=$dirty retries=$retries hand=$sawHand"

    fun state(): String =
        when {
            quietSinceMs == Long.MIN_VALUE -> "moving"
            dirty -> "move"
            else -> "waiting"
        }

    private companion object {
        /** Below this per-cell peak two consecutive frames count as still. */
        const val MOTION_THR = 5.0

        /**
         * A reading needs a hand to have crossed the board since the last understood state.
         * Without it drifting shadows push the change check over its line every few seconds —
         * measured 116 of 177 readings answering "unchanged" on one recording.
         */
        const val ACTIVITY_THR = 12.0

        /** Above this peak against the last understood still image, something has changed. */
        const val CHANGE_THR = 10.0

        /** Two still frames suffice: mid-grab readings cost one read and decide nothing. */
        const val SETTLE_MS = 60L

        const val RETRY_MS = 400L
        const val MAX_RETRIES = 3
    }
}
