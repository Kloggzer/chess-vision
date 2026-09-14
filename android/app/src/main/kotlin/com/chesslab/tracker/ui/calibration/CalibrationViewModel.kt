package com.chesslab.tracker.ui.calibration

import com.chesslab.tracker.geometry.BoardDetector
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.geometry.MeasuredGeometry
import com.chesslab.tracker.geometry.measuredBoardSize
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.hypot

/** Interval between detection attempts while the camera screen is open. */
private const val AUTO_DETECT_MS: Long = 500

private const val NO_FRAME = "Waiting for the camera…"

private const val SAVE_FAILED = "The calibration could not be stored — it will be tried again."

private const val ALL_MARKERS = 4

private const val CORNER_FLOATS = ALL_MARKERS * 2

/** A complete read converges quickly; a reconstructed corner needs longer confirmation. */
private const val FULL_STABLE_READS = 3

private const val PARTIAL_STABLE_READS = 5

/** Three markers determine a projective board; two only permit the unsafe similarity fallback. */
private const val MIN_MARKERS_FOR_SAVE = 3

/** Maximum corner motion between accepted reads, relative to the board's mean edge length. */
private const val MAX_STABLE_DRIFT = 0.012f

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
    val stableReads: Int = 0,
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

    @Volatile
    private var writing = false

    /** Set by the screen: where an adopted profile has to reach besides the store. */
    var onAdopted: (CalibrationProfile) -> Unit = {}

    /** Poll while the screen is open. The tracking screen stops after repairing its profile. */
    suspend fun autoDetect(stopAfterSaved: Boolean = false) {
        while (scope.isActive) {
            if (stopAfterSaved && _state.value.saved) return
            detectOnce()
            adopt(_state.value, onAdopted)
            delay(AUTO_DETECT_MS)
        }
    }

    /**
     * Adopt the board in the picture — automatically, on a FULL read.
     *
     * There is no button and no confirmation, because there is nothing here for a user to decide.
     * The quad is a seed the live path replaces within a few frames; what actually gets written is
     * config the detection measured better than a person could state it — board size and the source
     * dimensions everything downstream maps into.
     *
     * Four codes are accepted after three stable reads. Three codes still determine a projective
     * board and are accepted after five stable reads; this is the real-phone case where one printed
     * marker is visible but fails to decode. Two codes fall back to a similarity fit and are never
     * stored.
     *
     * Written once per change, not once per detection: [needsWrite] compares against what is stored,
     * so a steady camera costs nothing. Orientation is never touched — it is one bit, `whitePov` is
     * read only as a 180° rotation, the marker IDs already anchor a8, and it has its own switch in
     * Settings. A second control for the same bit is how the two drift apart.
     */
    private fun adopt(
        s: CalibrationState,
        onSaved: (CalibrationProfile) -> Unit,
    ) {
        val corners = s.corners ?: return
        val required = requiredStableReads(s.markerIds.size)
        if (required == null || s.stableReads < required || writing) return
        val measured = MeasuredGeometry(corners.copyOf(), s.frameWidth, s.frameHeight)
        if (!needsWrite(measured)) return
        writing = true
        scope.launch {
            // A store that throws used to leave [writing] set, and this instance then never
            // adopted a board again — silently, with the screen still saying "hold it there".
            val saved = runCatching { store.saveRecalibrated(measured, savedAtMs = nowMs()) }
            writing = false
            val profile = saved.getOrNull()
            if (profile == null) {
                _state.value = _state.value.copy(note = SAVE_FAILED)
                return@launch
            }
            _state.value = _state.value.copy(saved = true)
            onSaved(profile)
        }
    }

    /** Only the source frame and the measured board edge matter; the quad itself is re-derived. */
    private fun needsWrite(measured: MeasuredGeometry): Boolean {
        val stored = store.geometry
        return stored.boardSize != measuredBoardSize(measured.corners) ||
            !_state.value.saved
    }

    /**
     * One detection. `internal` rather than private so the poll's rules can be tested without
     * driving a `while (true)` loop through a virtual clock — the guard below is the interesting
     * part and it is a property of a single call, not of the schedule.
     */
    internal suspend fun detectOnce() {
        if (_state.value.detecting) return
        _state.value = _state.value.copy(detecting = true)
        // The guard above is a latch: a detector that throws must still open it, or every later
        // poll returns at the first line and the screen sits on its last note for good.
        val result =
            try {
                detector.detect()
            } finally {
                _state.value = _state.value.copy(detecting = false)
            }
        val s = _state.value
        if (result == null) {
            _state.value = s.copy(note = NO_FRAME)
            return
        }
        // The frame size is stamped even on a FAILED detection: it is the source size everything
        // downstream maps into, and it must come from the detected Mat (a7dab73).
        val detectedCorners = if (result.ok) result.corners else null
        val stableReads =
            if (result.ok && result.markerIds.size >= MIN_MARKERS_FOR_SAVE) {
                if (sameStableBoard(s.corners, result.corners)) s.stableReads + 1 else 1
            } else {
                0
            }
        _state.value =
            s.copy(
                frameWidth = result.frameWidth,
                frameHeight = result.frameHeight,
                markerIds = result.markerIds,
                corners = detectedCorners,
                stableReads = stableReads,
                note = boardNote(result.ok, result.markerIds.size, stableReads),
            )
    }
}

private fun requiredStableReads(markers: Int): Int? =
    when {
        markers >= ALL_MARKERS -> FULL_STABLE_READS
        markers >= MIN_MARKERS_FOR_SAVE -> PARTIAL_STABLE_READS
        else -> null
    }

/** The detector may jitter; stability means every corner stays within 1.2 % of one board edge. */
private fun sameStableBoard(
    previous: FloatArray?,
    current: FloatArray,
): Boolean {
    if (previous == null || previous.size != current.size || current.size != CORNER_FLOATS) return false
    val edges =
        (0 until ALL_MARKERS).map { corner ->
            val next = (corner + 1) % ALL_MARKERS
            hypot(
                current[next * 2] - current[corner * 2],
                current[next * 2 + 1] - current[corner * 2 + 1],
            )
        }
    val tolerance = edges.average().toFloat() * MAX_STABLE_DRIFT
    return (0 until ALL_MARKERS).all { corner ->
        hypot(
            current[corner * 2] - previous[corner * 2],
            current[corner * 2 + 1] - previous[corner * 2 + 1],
        ) <= tolerance
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
    stableReads: Int = FULL_STABLE_READS,
): String {
    val required = requiredStableReads(markers)
    return when {
        ok && required != null && stableReads < required ->
            "Board found — hold the phone still while calibration settles."
        ok && markers >= ALL_MARKERS -> "Board calibrated."
        ok && markers >= MIN_MARKERS_FOR_SAVE -> "Board calibrated from $markers stable codes."
        // Fewer than four is not a failure — the missing corners are reconstructed — but it is worth
        // saying, because it is the difference between a measured quad and an inferred one.
        ok -> "Board found — $markers of $ALL_MARKERS codes visible, the rest estimated."
        markers > 0 -> "Only $markers of $ALL_MARKERS codes in view — move the camera back."
        else -> "No board yet — point the camera at the whole board."
    }
}
