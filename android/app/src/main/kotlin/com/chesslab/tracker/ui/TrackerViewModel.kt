package com.chesslab.tracker.ui

import android.app.Application
import android.graphics.Bitmap
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.chesslab.tracker.geometry.BoardCorners
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.service.SettingsRepository
import com.chesslab.tracker.service.TrackerService
import com.chesslab.tracker.service.TrackerSettings
import com.chesslab.tracker.service.settingsDataStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

private const val CAMERA_ID = "back"

/**
 * Bridges the bound [TrackerService], the [SettingsRepository] and the
 * [CalibrationStore] to the Compose screens. Holds no camera/engine logic itself
 * — the service owns those; this only forwards state and control intents.
 */
class TrackerViewModel(
    app: Application,
) : AndroidViewModel(app) {
    private val settingsRepo = SettingsRepository(settingsDataStore(app))
    private val calibrationStore = CalibrationStore(app.filesDir.resolve("calibration"))

    val settings: StateFlow<TrackerSettings> =
        settingsRepo.settings.stateIn(viewModelScope, SharingStarted.Eagerly, TrackerSettings())

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private val _board = MutableStateFlow<Bitmap?>(null)
    val board: StateFlow<Bitmap?> = _board.asStateFlow()

    private var service: TrackerService? = null

    /** The active calibration profile, or null when the board is not yet calibrated. */
    val profile: StateFlow<CalibrationProfile?> =
        MutableStateFlow(calibrationStore.load(CAMERA_ID)).asStateFlow()

    fun onServiceConnected(bound: TrackerService) {
        service = bound
        viewModelScope.launch { bound.uiState.collect { _uiState.value = it } }
        viewModelScope.launch { bound.boardBitmap.collect { _board.value = it } }
        calibrationStore.load(CAMERA_ID)?.let(bound::start)
    }

    fun onServiceDisconnected() {
        service = null
    }

    fun updateSettings(transform: (TrackerSettings) -> TrackerSettings) {
        viewModelScope.launch { settingsRepo.update(transform) }
    }

    fun saveCalibration(
        corners: BoardCorners,
        whitePov: Boolean,
        sourceWidth: Int,
        sourceHeight: Int,
    ) {
        val profile =
            CalibrationProfile(
                corners = corners,
                whitePov = whitePov,
                sourceWidth = sourceWidth,
                sourceHeight = sourceHeight,
            )
        calibrationStore.save(CAMERA_ID, profile)
        service?.start(profile)
    }

    fun undo() {
        service?.undo()
    }

    fun reset() {
        service?.reset()
    }

    fun forcePromote(piece: String) {
        service?.forcePromote(piece)
    }
}
