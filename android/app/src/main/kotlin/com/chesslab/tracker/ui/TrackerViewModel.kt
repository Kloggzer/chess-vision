package com.chesslab.tracker.ui

import android.app.Application
import android.graphics.Bitmap
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.chesslab.tracker.cnn.CnnModelStore
import com.chesslab.tracker.games.GameStore
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
    val modelStore = CnnModelStore(app.filesDir)
    private val calibrationStore = CalibrationStore(app.filesDir.resolve("calibration"))

    /** Finished-game library, read by phase 06's games list/analysis screens. */
    val gameStore = GameStore(app.filesDir.resolve("games"))

    val settings: StateFlow<TrackerSettings> =
        settingsRepo.settings.stateIn(viewModelScope, SharingStarted.Eagerly, TrackerSettings())

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private val _board = MutableStateFlow<Bitmap?>(null)
    val board: StateFlow<Bitmap?> = _board.asStateFlow()

    private val _rawPreview = MutableStateFlow<Bitmap?>(null)
    val rawPreview: StateFlow<Bitmap?> = _rawPreview.asStateFlow()

    private var service: TrackerService? = null

    /**
     * The active calibration profile, or null when the board is not yet calibrated.
     * Driven purely by the service's [TrackerService.activeProfile] — set by ArUco
     * auto-calibration or a manual save, cleared on recalibrate. Not seeded from the
     * store, so a stale saved profile never masks the "not calibrated yet" state.
     */
    private val _profile = MutableStateFlow<CalibrationProfile?>(null)
    val profile: StateFlow<CalibrationProfile?> = _profile.asStateFlow()

    fun onServiceConnected(bound: TrackerService) {
        service = bound
        viewModelScope.launch {
            var wasGameOver = false
            bound.uiState.collect { state ->
                _uiState.value = state
                // Auto-save on the false -> true gameOver transition (checkmate/stalemate/
                // draw reached live), so a finished game lands in the library even if the
                // user never explicitly resets.
                if (state.gameOver && !wasGameOver) {
                    maybeSaveCurrentGame()
                }
                wasGameOver = state.gameOver
            }
        }
        viewModelScope.launch { bound.boardBitmap.collect { _board.value = it } }
        viewModelScope.launch { bound.rawPreview.collect { _rawPreview.value = it } }
        // Reflect the service's active profile (manual save OR ArUco auto-calibration).
        viewModelScope.launch { bound.activeProfile.collect { _profile.value = it } }
        // Always start in preview-only: ArUco auto-calibration is the primary geometry
        // source and drives start() itself. A saved profile does not auto-start (it would
        // block auto-calibration and can be stale); the manual tab remains a fallback.
        bound.startPreviewOnly()
    }

    /** Persist the current game if it has any moves. Idempotent to call redundantly. */
    private fun maybeSaveCurrentGame() {
        val state = _uiState.value
        if (state.moves.isNotEmpty()) {
            gameStore.save(state.moves, state.fen)
        }
    }

    fun onServiceDisconnected() {
        service?.setCalibrationActive(false)
        service = null
    }

    /** Retain (or release) the latest frame for ArUco while the calibration screen is shown. */
    fun setCalibrationActive(active: Boolean) {
        service?.setCalibrationActive(active)
    }

    /** Clone of the latest full-res frame for ArUco; caller MUST release. */
    fun latestCalibrationFrame(): org.opencv.core.Mat? = service?.latestCalibrationFrame()

    /** Drop the saved calibration and return to preview so the user can re-align. */
    fun recalibrate() {
        maybeSaveCurrentGame()
        calibrationStore.delete(CAMERA_ID)
        _profile.value = null
        service?.stopTrackingToPreview()
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
        _profile.value = profile
    }

    fun undo() {
        service?.undo()
    }

    fun reset() {
        maybeSaveCurrentGame()
        service?.reset()
    }

    /** Re-capture the reference from the current board without changing the game. */
    fun renewBaseline() {
        service?.renewBaseline()
    }

    fun forcePromote(piece: String) {
        service?.forcePromote(piece)
    }
}
