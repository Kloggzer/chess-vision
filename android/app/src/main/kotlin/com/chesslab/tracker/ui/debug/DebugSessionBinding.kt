package com.chesslab.tracker.ui.debug

import com.chesslab.engine.api.TrackerStatus
import com.chesslab.tracker.cnn.CnnState
import com.chesslab.tracker.service.CnnRuntimeInfo
import com.chesslab.tracker.service.DebugCrops
import com.chesslab.tracker.settings.SettingsRepository
import kotlinx.coroutines.flow.StateFlow

/**
 * Builds the [DebugSession] the service publishes.
 *
 * It exists so the service does not have to name a UI type beyond the host, and so the debug
 * screen's dependencies are a short, explicit list: two already-published flows, 07a's settings,
 * and three pull-only probes. There is no new flow, binder callback or broadcast in this phase.
 */
fun debugSession(
    status: StateFlow<TrackerStatus?>,
    cnnState: StateFlow<CnnState>,
    settings: SettingsRepository,
    onDebugEnabled: (Boolean) -> Unit,
    workProfilingAvailable: Boolean,
    workProfilingEnabled: StateFlow<Boolean>,
    onWorkProfilingEnabled: (Boolean) -> Unit,
    workProfileReport: () -> String?,
    crops: () -> DebugCrops?,
    runtime: () -> CnnRuntimeInfo,
    retry: () -> Unit,
): DebugSession =
    object : DebugSession {
        override val status = status
        override val cnnState = cnnState
        override val config = settings.config
        override val debugPinned = settings.debugEnabled
        override val workProfilingAvailable = workProfilingAvailable
        override val workProfilingEnabled = workProfilingEnabled

        override fun setDebugEnabled(on: Boolean) = onDebugEnabled(on)

        override fun setWorkProfilingEnabled(on: Boolean) = onWorkProfilingEnabled(on)

        override fun workProfileReport(): String? = workProfileReport()

        override fun latestCrops(): DebugCrops? = crops()

        override fun cnnRuntime(): CnnRuntimeInfo = runtime()

        override fun retryCnnAttach() = retry()
    }
