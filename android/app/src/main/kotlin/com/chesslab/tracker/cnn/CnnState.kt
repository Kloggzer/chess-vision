package com.chesslab.tracker.cnn

import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

private const val TAG = "chesslabCnn"

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

/** Injectable so the state machine is assertable on the desktop JVM (`android.util.Log` is stubbed there). */
interface CnnLog {
    fun info(message: String)

    fun warn(
        message: String,
        error: Throwable?,
    )

    fun error(
        message: String,
        error: Throwable?,
    )
}

object AndroidCnnLog : CnnLog {
    override fun info(message: String) {
        Log.i(TAG, message)
    }

    override fun warn(
        message: String,
        error: Throwable?,
    ) {
        Log.w(TAG, message, error)
    }

    override fun error(
        message: String,
        error: Throwable?,
    ) {
        Log.e(TAG, message, error)
    }
}

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
