package com.chesslab.engine.api

import kotlinx.coroutines.flow.Flow

/** A confirmed diff candidate awaiting safeguard verification. Consumed by phase 05. */
data class MoveCandidate(
    val ucis: List<String>,
    val fenBefore: String,
    val priorUsed: Boolean,
    /** Frame seq the candidate was decided on — verify only accepts observations with `seq >= this`. */
    val seq: Int = 0,
)

/** Verdict for a pending move candidate. Consumed by phase 05. */
sealed interface VerifyVerdict {
    val ucis: List<String>

    /** Occupancy confirms the move(s) — commit. */
    data class For(
        override val ucis: List<String>,
    ) : VerifyVerdict

    /**
     * Occupancy contradicts the move(s) — discard as ghost. `boardUnchanged=true` means the
     * observation still matches the pre-move position (shadow/no move): the engine then pulls
     * the reference forward instead of keeping the stale base truth.
     */
    data class Against(
        override val ucis: List<String>,
        val reason: String,
        val boardUnchanged: Boolean = false,
    ) : VerifyVerdict

    /** Verification window elapsed without a clear view — candidate is discarded. */
    data class Timeout(
        override val ucis: List<String>,
    ) : VerifyVerdict
}

/**
 * CNN occupancy safeguard seam (implemented in phase 05, e.g. ONNX Runtime): non-blocking
 * pre-commit verification of diff candidates. The engine calls [requestVerify]; the
 * implementation pushes verdicts into [verdicts], which phase 05 wiring feeds back via
 * `TrackerEngine.onVerifyVerdict`. Consumed by phase 05.
 */
interface OccupancySafeguard {
    /** Non-blocking: observe the touched squares and eventually emit a verdict. */
    fun requestVerify(
        move: MoveCandidate,
        touched: List<String>,
    )

    /** FOR / AGAINST / TIMEOUT per pending move. */
    val verdicts: Flow<VerifyVerdict>
}

/** Uncertainty signal for dynamic resolution (phase 03) and the CNN safeguard (phase 05). */
data class Uncertainty(
    val lowMargin: Boolean = false,
    val stuck: Boolean = false,
    val pendingVerify: Boolean = false,
)
