package com.chesslab.tracker.cnn

import com.chesslab.tracker.log.TrackerLog
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Whether the CNN safeguard is actually running. MEMORY `android-live-bringup-2607`: the
 * attach failed silently once and the tracker ran diff-only for a whole session with nobody
 * noticing. Every state is surfaced (06c mirrors [Failed] into `TrackerStatus.note`, 07b
 * renders it verbatim), so a CNN that is supposed to be on and is not cannot be missed.
 */
sealed interface CnnState {
    /** The user disabled the CNN — not a failure. */
    data object Off : CnnState

    data object Attaching : CnnState

    data class Ready(
        val backend: String,
        val model: String,
    ) : CnnState

    data class Failed(
        val reason: String,
    ) : CnnState
}

/**
 * Kept as a name because the CNN's call sites read better for it; it IS the general seam.
 * The Android implementation lives in `log/AndroidTrackerLog.kt` so this file names no platform.
 */
typealias CnnLog = TrackerLog

/**
 * The single owner of [CnnState]. Every transition logs at its level; [Failed] is **sticky**
 * for the session so a broken model does not retry-and-log at loop rate — only [retry], which
 * the debug screen calls explicitly, clears it.
 */
class CnnStateHolder(
    private val log: CnnLog,
) {
    private val mutable = MutableStateFlow<CnnState>(CnnState.Off)
    val state: StateFlow<CnnState> = mutable.asStateFlow()

    /** @return false when a sticky [CnnState.Failed] blocks the attach. */
    fun beginAttach(): Boolean {
        if (mutable.value is CnnState.Failed) return false
        mutable.value = CnnState.Attaching
        log.info("CNN attaching")
        return true
    }

    fun retry(): Boolean {
        mutable.value = CnnState.Off
        return beginAttach()
    }

    /** The one backend line per session (`ee7c83c` / the manual logcat check). */
    fun ready(
        backend: String,
        model: String,
        classes: Int,
    ) {
        mutable.value = CnnState.Ready(backend, model)
        log.info("CNN inference backend: $backend (model=$model, classes=$classes)")
    }

    fun failed(
        reason: String,
        error: Throwable?,
    ) {
        val named = reason.ifBlank { error?.javaClass?.simpleName ?: "unknown" }
        mutable.value = CnnState.Failed(named)
        log.error("CNN attach FAILED, tracker degrades to diff-only: $named", error)
    }

    fun off() {
        mutable.value = CnnState.Off
        log.info("CNN disabled")
    }
}
