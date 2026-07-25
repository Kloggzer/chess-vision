package com.chesslab.tracker.ui.calibration

import android.graphics.Bitmap
import com.chesslab.tracker.geometry.BoardDetector
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.geometry.MeasuredGeometry
import com.chesslab.tracker.geometry.ProfileLoad
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/** Interval between auto-detection attempts while aiming. */
private const val AUTO_DETECT_MS: Long = 500

enum class CalibrationStep { AIM, DETECTED, MANUAL, CONFIRM }

/** A manually tapped corner, in SOURCE pixels. */
data class TapPoint(
    val x: Float,
    val y: Float,
)

data class CalibrationState(
    val step: CalibrationStep = CalibrationStep.AIM,
    /** 8 floats `[a8, h8, h1, a1]` in source pixels; never sorted. */
    val corners: FloatArray? = null,
    val markerIds: List<Int> = emptyList(),
    val frameWidth: Int = 0,
    val frameHeight: Int = 0,
    val note: String? = null,
    val whitePov: Boolean = true,
    val taps: List<TapPoint> = emptyList(),
    val detecting: Boolean = false,
    val orientationSeen: Boolean = false,
    val warped: Bitmap? = null,
    val saved: Boolean = false,
) {
    /** A wrong a8 assignment is invisible at runtime, so the confirmation screen is not skippable. */
    val canSave: Boolean get() = step == CalibrationStep.CONFIRM && orientationSeen && corners != null

    override fun equals(other: Any?): Boolean = this === other

    override fun hashCode(): Int = System.identityHashCode(this)
}

/**
 * Step machine + detection scheduling. Holds no camera, no OpenCV type and no Compose type, which
 * is what makes every rule here decidable on the JVM.
 */
class CalibrationViewModel(
    private val detector: BoardDetector,
    private val store: CalibrationStore,
    private val scope: CoroutineScope,
    private val nowMs: () -> Long = System::currentTimeMillis,
) {
    private val _state = MutableStateFlow(CalibrationState())
    val state: StateFlow<CalibrationState> = _state.asStateFlow()

    /** Set only by the user on the confirmation screen — an untouched value is carried over. */
    private var whitePovTouched = false

    init {
        scope.launch {
            val stored = store.load()
            if (stored is ProfileLoad.Ok && !whitePovTouched) {
                _state.value = _state.value.copy(whitePov = stored.profile.whitePov)
            } else if (stored is ProfileLoad.Discarded) {
                _state.value = _state.value.copy(note = stored.reason)
            }
        }
    }

    /** Poll ArUco while the user is aiming. Cancelled with the caller's scope. */
    suspend fun autoDetect() {
        while (scope.isActive) {
            if (_state.value.step == CalibrationStep.AIM) detectNow()
            delay(AUTO_DETECT_MS)
        }
    }

    fun detectOnce() {
        scope.launch { detectNow() }
    }

    fun beginManual() {
        _state.value = _state.value.copy(step = CalibrationStep.MANUAL, taps = emptyList(), note = null)
    }

    /** [point] is already mapped to source pixels by [mapTapToSource]. Stored in TAP order. */
    fun tap(point: TapPoint) {
        val s = _state.value
        if (s.taps.size >= CORNER_PROMPTS.size) return
        val taps = s.taps + point
        _state.value = s.copy(taps = taps, corners = tapsToCorners(taps) ?: s.corners)
    }

    fun undoTap() {
        val taps = _state.value.taps.dropLast(1)
        _state.value = _state.value.copy(taps = taps, corners = tapsToCorners(taps))
    }

    fun restartTaps() {
        _state.value = _state.value.copy(taps = emptyList(), corners = null)
    }

    fun toConfirm() {
        val s = _state.value
        val corners = s.corners ?: return
        _state.value = s.copy(step = CalibrationStep.CONFIRM, orientationSeen = true, note = null)
        scope.launch { refreshWarp(corners, s.whitePov) }
    }

    fun setWhitePov(value: Boolean) {
        whitePovTouched = true
        val s = _state.value.copy(whitePov = value)
        _state.value = s
        s.corners?.let { c -> scope.launch { refreshWarp(c, value) } }
    }

    fun back() {
        _state.value = _state.value.copy(step = CalibrationStep.AIM, warped = null, orientationSeen = false)
    }

    fun save(onSaved: (CalibrationProfile) -> Unit = {}) {
        val s = _state.value
        if (!s.canSave) return
        val corners = s.corners ?: return
        scope.launch {
            val saved =
                store.saveRecalibrated(
                    MeasuredGeometry(corners.copyOf(), s.frameWidth, s.frameHeight),
                    whitePovOverride = if (whitePovTouched) s.whitePov else null,
                    savedAtMs = nowMs(),
                )
            _state.value = _state.value.copy(saved = true)
            onSaved(saved)
        }
    }

    private suspend fun detectNow() {
        if (_state.value.detecting) return
        _state.value = _state.value.copy(detecting = true)
        val result = detector.detect()
        val s = _state.value.copy(detecting = false)
        if (result == null) {
            _state.value = s.copy(note = "waiting for a camera frame")
            return
        }
        // The frame size is stamped even on a FAILED detection: it is the source size the manual
        // 4-tap fallback maps its taps into, and it must come from the detected Mat (a7dab73).
        val sized = s.copy(frameWidth = result.frameWidth, frameHeight = result.frameHeight, markerIds = result.markerIds)
        _state.value =
            if (result.ok) {
                sized.copy(step = CalibrationStep.DETECTED, corners = result.corners, note = result.reason)
            } else {
                sized.copy(note = result.reason)
            }
    }

    private suspend fun refreshWarp(
        corners: FloatArray,
        whitePov: Boolean,
    ) {
        val bitmap = detector.warp(corners, whitePov)
        _state.value = _state.value.copy(warped = bitmap)
    }
}
