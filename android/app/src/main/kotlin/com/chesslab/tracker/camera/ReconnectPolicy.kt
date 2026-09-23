package com.chesslab.tracker.camera

import kotlin.math.min
import kotlin.math.pow

/** Pure policy, no CameraX type: [TrackerCamera] is the untestable shell around it. */
class ReconnectPolicy {
    var attempts: Int = 0
        private set

    var downshifted: Boolean = false
        private set

    private var diagnosed = false
    private var lastFailureMs = Long.MIN_VALUE

    /** 3 / 6 / 12 / 24 / 30 / 30 … — a genuinely gone device must not be hammered forever. */
    fun backoffS(): Double = min(CAP_S, BASE_S * 2.0.pow(min(attempts, MAX_DOUBLINGS)))

    fun onFailure(nowMs: Long) {
        attempts++
        lastFailureMs = nowMs
    }

    /** Sustained recovery only: one lucky frame between stalls must NOT clear the escalation, or an
     *  oscillating camera never reaches the diagnosis or the downshift. */
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

    /** Always, not only for USB sources as in Python: the bandwidth argument holds for the ISP path too. */
    fun offerDownshift(delivered: DeliveredSize?): Boolean {
        if (downshifted || attempts < DOWNSHIFT_AFTER) return false
        // No frame yet means no trustworthy size, and the request is never a substitute for one.
        val px = delivered?.let { it.width.toLong() * it.height } ?: 0L
        if (px < FULL_HD_PX) return false
        downshifted = true
        return true
    }

    private companion object {
        const val BASE_S = 3.0
        const val CAP_S = 30.0
        const val MAX_DOUBLINGS = 4
        const val HEALTHY_MS = 10_000L
        const val DIAGNOSE_AFTER = 2
        const val DOWNSHIFT_AFTER = 2
        const val FULL_HD_PX = 1920L * 1080L
    }
}
