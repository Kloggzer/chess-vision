package com.chesslab.tracker.camera

import kotlin.math.min
import kotlin.math.pow

/**
 * Pure rebind backoff/diagnosis policy (ports the Python tracker's
 * `_reconnect_backoff` + `_log_reconnect_diagnosis`, `dba6f29`): a genuinely-gone
 * camera is not hammered every 3 s forever — the retry interval doubles per
 * consecutive failure (3 -> 6 -> 12 -> 24 s), capped at 30 s, and after
 * [DIAGNOSIS_AFTER] failed rebinds ONE clear diagnosis line is emitted (then the
 * policy stays quiet, retrying at the cap). The first successfully delivered
 * frame resets the schedule and re-arms the diagnosis.
 */
class ReconnectPolicy(
    private val baseS: Double = BASE_S,
    private val capS: Double = CAP_S,
) {
    /** Consecutive failed rebind attempts since the last delivered frame. */
    var attempts: Int = 0
        private set

    private var diagnosed = false

    /** Seconds to wait before the next rebind attempt. */
    fun backoffS(): Double = min(capS, baseS * 2.0.pow(min(attempts, MAX_EXP)))

    /** A rebind was scheduled/failed — grow the backoff. */
    fun onFailure() {
        attempts++
    }

    /** A frame reached the consumer — the camera is back; reset schedule + diagnosis. */
    fun onFrameDelivered() {
        attempts = 0
        diagnosed = false
    }

    /** True exactly ONCE, after [DIAGNOSIS_AFTER] failed rebinds — log the diagnosis then. */
    fun shouldDiagnose(): Boolean {
        if (diagnosed || attempts < DIAGNOSIS_AFTER) return false
        diagnosed = true
        return true
    }

    companion object {
        const val BASE_S: Double = 3.0
        const val CAP_S: Double = 30.0
        const val MAX_EXP: Int = 4
        const val DIAGNOSIS_AFTER: Int = 3
    }
}
