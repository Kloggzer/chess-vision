package com.chesslab.tracker.cnn

import com.chesslab.tracker.log.TrackerLog
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** The attach once failed silently and the tracker ran diff-only for a whole session: every state is surfaced. */
sealed interface CnnState {
    /** Not a failure. */
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

/** The Android implementation lives in `log/AndroidTrackerLog.kt` so this file names no platform. */
typealias CnnLog = TrackerLog

/** [Failed] is **sticky** for the session so a broken model does not retry-and-log at loop rate. */
class CnnStateHolder(
    private val log: CnnLog,
) {
    private val mutable = MutableStateFlow<CnnState>(CnnState.Off)
    val state: StateFlow<CnnState> = mutable.asStateFlow()

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

    /** The one backend line per session. */
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
