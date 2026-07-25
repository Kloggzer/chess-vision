package com.chesslab.tracker.camera

import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/**
 * Pure device-robustness policy: how long to wait before the next rebind, when to log the single
 * diagnosis line, when to retry once at a lower resolution, and when the escalation may reset.
 * Ports `tracker.py`'s `_reconnect_backoff`, `_log_reconnect_diagnosis`, `_downshift_target` and
 * the sustained-recovery rule in `_loop`.
 *
 * Holds no CameraX and no Android type: [TrackerCamera] is the untestable shell around it.
 */
class ReconnectPolicy(
    reconnectGraceS: Double = DEFAULT_GRACE_S,
) {
    private val baseS = max(MIN_BASE_S, reconnectGraceS)

    /** Consecutive failed bindings since the last sustained recovery. */
    var attempts: Int = 0
        private set

    /** Latched once the lower mode has been offered — Python never downshifts twice. */
    var downshifted: Boolean = false
        private set

    private var diagnosed = false
    private var lastFailureMs = Long.MIN_VALUE

    /** 3 / 6 / 12 / 24 / 30 / 30 … — a genuinely gone device must not be hammered forever. */
    fun backoffS(): Double = min(CAP_S, baseS * 2.0.pow(min(attempts, MAX_DOUBLINGS)))

    fun onFailure(nowMs: Long) {
        attempts++
        lastFailureMs = nowMs
    }

    /**
     * Sustained recovery only. One lucky frame between two stalls must NOT clear the escalation,
     * or a camera that oscillates open/stall never reaches the diagnosis or the downshift.
     */
    fun onFrameDelivered(nowMs: Long) {
        if (attempts == 0 || nowMs - lastFailureMs < HEALTHY_MS) return
        attempts = 0
        diagnosed = false
    }

    /** True exactly once per escalation: one clear line, then stay quiet at the cap. */
    fun shouldDiagnose(): Boolean {
        if (diagnosed || attempts < DIAGNOSE_AFTER) return false
        diagnosed = true
        return true
    }

    /**
     * One retry at a lower mode when a high-bandwidth binding keeps failing. Python restricts this
     * to local USB sources (`isinstance(self._src, int)`); Android has no such distinction and the
     * bandwidth argument holds for the ISP path too, so here it always applies (see STATUS.md).
     */
    fun offerDownshift(delivered: DeliveredSize?): Boolean {
        if (downshifted || attempts < DOWNSHIFT_AFTER) return false
        // No frame yet means no trustworthy size, and the request is never a substitute for one.
        val px = delivered?.let { it.width.toLong() * it.height } ?: 0L
        if (px < FULL_HD_PX) return false
        downshifted = true
        return true
    }

    private companion object {
        const val DEFAULT_GRACE_S = 2.0
        const val MIN_BASE_S = 3.0
        const val CAP_S = 30.0
        const val MAX_DOUBLINGS = 4
        const val HEALTHY_MS = 10_000L
        const val DIAGNOSE_AFTER = 2
        const val DOWNSHIFT_AFTER = 2
        const val FULL_HD_PX = 1920L * 1080L
    }
}
