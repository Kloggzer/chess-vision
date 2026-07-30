package com.chesslab.tracker.ui.debug

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.service.CnnRuntimeInfo
import com.chesslab.tracker.service.DebugCrops
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Everything the debug screen may see of the running tracker.
 *
 * Note what is NOT here: no engine, no camera, no frame pipeline, no second status flow. The
 * panels are a pure function of [status] plus the two pull-only probes below, which exist because
 * pixels and the ONNX provider cannot travel through `TrackerStatus` — `:core-engine` holds no
 * frame history and knows nothing about execution providers.
 */
interface DebugSession {
    val status: StateFlow<TrackerStatus?>
    val cnnState: StateFlow<CnnState>
    val config: StateFlow<TrackerConfig>

    /**
     * 07a's `SettingsRepository.debugEnabled` — the user's explicit "keep it on" switch. When it is
     * off, closing the screen disarms the payload; when it is on, the payload survives so a live
     * session can be inspected after the fact.
     */
    val debugPinned: StateFlow<Boolean>

    /** Arms the extra `TrackerStatus.debug` payload AND the crop tap. Off is the default. */
    fun setDebugEnabled(on: Boolean)

    /** The crops of the last glance, or null. Called at most at 2 Hz, off the analyzer thread. */
    fun latestCrops(): DebugCrops?

    fun cnnRuntime(): CnnRuntimeInfo

    /** The one way out of the sticky `CnnState.Failed` (05c's `CnnObserver.retryAttach`). */
    fun retryCnnAttach()
}

/**
 * Where the debug screen picks its session up — the same pattern as `TrackerSessionHost`, for the
 * same reason: the service publishes, the composition reads, and a screen that renders before the
 * service is bound gets [NoDebugSession] instead of a crash.
 */
object DebugSessionHost {
    private val current = MutableStateFlow<DebugSession?>(null)

    val session: StateFlow<DebugSession?> = current

    fun publish(session: DebugSession?) {
        current.value = session
    }
}

/** The unbound session: renders, arms nothing. */
object NoDebugSession : DebugSession {
    override val status: StateFlow<TrackerStatus?> = MutableStateFlow(null)
    override val cnnState: StateFlow<CnnState> = MutableStateFlow(CnnState.Off)
    override val config: StateFlow<TrackerConfig> = MutableStateFlow(TrackerConfig())
    override val debugPinned: StateFlow<Boolean> = MutableStateFlow(false)

    override fun setDebugEnabled(on: Boolean) = Unit

    override fun latestCrops(): DebugCrops? = null

    override fun cnnRuntime() = CnnRuntimeInfo(null, null, null, null, null, 0.0, 0)

    override fun retryCnnAttach() = Unit
}
