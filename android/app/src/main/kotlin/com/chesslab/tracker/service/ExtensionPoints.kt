package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerEvent
import com.chesslab.tracker.camera.UncertaintySource
import com.chesslab.tracker.ui.UiState
import kotlinx.coroutines.flow.Flow

/**
 * Broadcasts UI state to remote spectators. Plugged in by phase 06 (Ktor LAN
 * server); `null` in the base service. Defined here so phase 06 wires in without
 * editing the service.
 */
interface GameStateSink {
    fun onState(state: UiState)
}

/**
 * Records the raw session (frames + FEN + events) for desktop export. Plugged in
 * by phase 07; `null` in the base service.
 */
interface SessionRecorder {
    fun onFrame(
        boardFenBefore: String,
        timestampNs: Long,
    )

    fun onEvent(event: TrackerEvent)
}

/**
 * Discrepancy #3 resolution: adapts the real engine uncertainty (surfaced by
 * [TrackerCoordinator.uncertain] as `lowMargin || stuck || pendingVerify`) to the
 * camera package's [UncertaintySource] boolean seam so [DynamicResolutionController]
 * escalates on the real signal.
 */
class EngineUncertaintySource(
    private val coordinator: TrackerCoordinator,
) : UncertaintySource {
    override val uncertainty: Flow<Boolean> = coordinator.uncertain
}
