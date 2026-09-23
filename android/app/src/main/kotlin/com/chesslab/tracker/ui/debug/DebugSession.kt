package com.chesslab.tracker.ui.debug

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.service.CnnRuntimeInfo
import com.chesslab.tracker.service.DebugCrops
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** No engine, camera or pipeline: [status] plus two pull-only probes, because pixels and the ONNX provider
 *  cannot travel through `TrackerStatus`. */
interface DebugSession {
    val status: StateFlow<TrackerStatus?>
    val cnnState: StateFlow<CnnState>
    val config: StateFlow<TrackerConfig>

    /** Off: closing the screen disarms the payload; on: it survives for inspection after the fact. */
    val debugPinned: StateFlow<Boolean>

    val workProfilingAvailable: Boolean
    val workProfilingEnabled: StateFlow<Boolean>

    fun setDebugEnabled(on: Boolean)

    fun setWorkProfilingEnabled(on: Boolean)

    fun workProfileReport(): String?

    /** Called at most at 2 Hz, off the analyzer thread. */
    fun latestCrops(): DebugCrops?

    fun cnnRuntime(): CnnRuntimeInfo

    /** The one way out of the sticky `CnnState.Failed`. */
    fun retryCnnAttach()
}

/** A screen rendered before the service binds gets [NoDebugSession] instead of a crash. */
object DebugSessionHost {
    private val current = MutableStateFlow<DebugSession?>(null)

    val session: StateFlow<DebugSession?> = current

    fun publish(session: DebugSession?) {
        current.value = session
    }
}

object NoDebugSession : DebugSession {
    override val status: StateFlow<TrackerStatus?> = MutableStateFlow(null)
    override val cnnState: StateFlow<CnnState> = MutableStateFlow(CnnState.Off)
    override val config: StateFlow<TrackerConfig> = MutableStateFlow(TrackerConfig())
    override val debugPinned: StateFlow<Boolean> = MutableStateFlow(false)
    override val workProfilingAvailable = false
    override val workProfilingEnabled: StateFlow<Boolean> = MutableStateFlow(false)

    override fun setDebugEnabled(on: Boolean) = Unit

    override fun setWorkProfilingEnabled(on: Boolean) = Unit

    override fun workProfileReport(): String? = null

    override fun latestCrops(): DebugCrops? = null

    override fun cnnRuntime() = CnnRuntimeInfo(null, null, null, null, null, null, 0.0, 0)

    override fun retryCnnAttach() = Unit
}
