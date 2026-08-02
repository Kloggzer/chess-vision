package com.chesslab.tracker.ui.calibration

import com.chesslab.tracker.geometry.BoardDetector
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.geometry.MeasuredGeometry
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/** Interval between detection attempts while the camera screen is open. */
private const val AUTO_DETECT_MS: Long = 500

private const val NO_FRAME = "Waiting for the camera…"

private const val ALL_MARKERS = 4

/**
 * What the camera screen knows about the board, and nothing more.
 *
 * **There is no alignment here, deliberately (2026-08-02, specs/36).** This used to be a four-step
 * wizard with a rectified preview, an orientation switch, four marker-outset steppers and eight
 * corner sliders. All of it went, for one reason that makes the rest moot: **the saved corners are
 * only a seed.** `TrackerStack` writes them once at construction and `LiveAlign` re-detects the
 * markers every third frame for the whole session, so a quad a user spends a minute nudging is gone
 * a few hundred milliseconds into the game. `CLAUDE.md` says the same from the other side — a
 * calibration profile is geometry CONFIG (board size, orientation, crop params), not a stored
 * position.
 *
 * So there was never anything here for a human to improve, and asking them to judge alignment asked
 * them to grade a quantity the app re-derives twice a second and measures better than an eye can.
 * What remains: is there a board in the picture, and does the user want to use it.
 */
data class CalibrationState(
    /** 8 floats `[a8, h8, h1, a1]` in source pixels; null until a board is found. */
    val corners: FloatArray? = null,
    val markerIds: List<Int> = emptyList(),
    val frameWidth: Int = 0,
    val frameHeight: Int = 0,
    /** One line for the user, already in plain language — never a raw detector string. */
    val note: String = NO_FRAME,
    val detecting: Boolean = false,
    val saved: Boolean = false,
) {
    /** A board is in the picture and can be adopted. The only condition on the button. */
    val found: Boolean get() = corners != null && frameWidth > 0

    override fun equals(other: Any?): Boolean = this === other

    override fun hashCode(): Int = System.identityHashCode(this)
}

/**
 * Poll the detector, report what it found, adopt it on request.
 *
 * Holds no camera, no OpenCV type and no Compose type, which is what makes every rule here
 * decidable on the JVM.
 */
class CalibrationViewModel(
    private val detector: BoardDetector,
    private val store: CalibrationStore,
    private val scope: CoroutineScope,
    private val nowMs: () -> Long = System::currentTimeMillis,
) {
    private val _state = MutableStateFlow(CalibrationState())
    val state: StateFlow<CalibrationState> = _state.asStateFlow()

    /** Poll while the screen is open. Cancelled with the caller's scope. */
    suspend fun autoDetect() {
        while (scope.isActive) {
            detectOnce()
            delay(AUTO_DETECT_MS)
        }
    }

    /**
     * Adopt the board in the picture: board size, source dimensions, the seed quad.
     *
     * Orientation is NOT written here. It is one bit — `whitePov` is read only as a 180° rotation,
     * and the marker IDs already anchor a8 — and it has its own switch in Settings, which is the one
     * place it belongs. A second control for the same bit is how the two drift apart.
     */
    fun save(onSaved: (CalibrationProfile) -> Unit = {}) {
        val s = _state.value
        val corners = s.corners ?: return
        scope.launch {
            val saved =
                store.saveRecalibrated(
                    MeasuredGeometry(corners.copyOf(), s.frameWidth, s.frameHeight),
                    savedAtMs = nowMs(),
                )
            _state.value = _state.value.copy(saved = true)
            onSaved(saved)
        }
    }

    /**
     * One detection. `internal` rather than private so the poll's rules can be tested without
     * driving a `while (true)` loop through a virtual clock — the guard below is the interesting
     * part and it is a property of a single call, not of the schedule.
     */
    internal suspend fun detectOnce() {
        if (_state.value.detecting) return
        _state.value = _state.value.copy(detecting = true)
        val result = detector.detect()
        val s = _state.value.copy(detecting = false)
        if (result == null) {
            _state.value = s.copy(note = NO_FRAME)
            return
        }
        // The frame size is stamped even on a FAILED detection: it is the source size everything
        // downstream maps into, and it must come from the detected Mat (a7dab73).
        _state.value =
            s.copy(
                frameWidth = result.frameWidth,
                frameHeight = result.frameHeight,
                markerIds = result.markerIds,
                corners = if (result.ok) result.corners else null,
                note = boardNote(result.ok, result.markerIds.size),
            )
    }
}

/**
 * The state as one sentence, built from the marker COUNT rather than the detector's own string.
 *
 * The detector's `reason` is written for a log — "only 2 of 4 markers visible — quad reconstructed"
 * tells a developer what happened and tells a user nothing about what to do. Every line here ends in
 * a fact the user can act on by moving the phone.
 */
internal fun boardNote(
    ok: Boolean,
    markers: Int,
): String =
    when {
        ok && markers >= ALL_MARKERS -> "Board found."
        // Fewer than four is not a failure — the missing corners are reconstructed — but it is worth
        // saying, because it is the difference between a measured quad and an inferred one.
        ok -> "Board found — $markers of $ALL_MARKERS codes visible, the rest estimated."
        markers > 0 -> "Only $markers of $ALL_MARKERS codes in view — move the camera back."
        else -> "No board yet — point the camera at the whole board."
    }
