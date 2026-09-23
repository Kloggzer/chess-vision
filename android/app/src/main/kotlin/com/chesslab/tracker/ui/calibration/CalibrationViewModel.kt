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
import java.io.IOException
import kotlin.math.hypot

private const val AUTO_DETECT_MS: Long = 500

private const val NO_FRAME = "Waiting for the camera…"

private const val SAVE_FAILED = "The calibration could not be stored — it will be tried again."

private fun loadFailed(reason: String?) = "The saved calibration could not be read ($reason) — retrying."

private const val ALL_MARKERS = 4

private const val CORNER_FLOATS = ALL_MARKERS * 2

private const val FULL_STABLE_READS = 3

private const val PARTIAL_STABLE_READS = 5

/** Three markers determine a projective board; two only allow the unsafe similarity fallback. */
private const val MIN_MARKERS_FOR_SAVE = 3

private const val MAX_STABLE_DRIFT = 0.012f

/** No alignment here: the saved corners are only a seed — `LiveAlign` re-detects the markers every third
 *  frame, so nothing a user nudges survives into the game. */
data class CalibrationState(
    val corners: FloatArray? = null,
    val markerIds: List<Int> = emptyList(),
    val frameWidth: Int = 0,
    val frameHeight: Int = 0,
    /** Plain language, never a raw detector string. */
    val note: String = NO_FRAME,
    val detecting: Boolean = false,
    val saved: Boolean = false,
    val stableReads: Int = 0,
) {
    val found: Boolean get() = corners != null && frameWidth > 0

    override fun equals(other: Any?): Boolean = this === other

    override fun hashCode(): Int = System.identityHashCode(this)
}

/** No camera, OpenCV or Compose type, so every rule here is decidable on the JVM. */
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

    var onAdopted: (CalibrationProfile) -> Unit = {}

    suspend fun autoDetect(stopAfterSaved: Boolean = false) {
        var loaded = false
        while (scope.isActive) {
            if (stopAfterSaved && _state.value.saved) return
            // Before the profile is read, detection would search with the default marker dictionary.
            loaded = loaded || loadStored()
            if (loaded) detectOnce()
            adopt(_state.value, onAdopted)
            delay(AUTO_DETECT_MS)
        }
    }

    /** Automatic, no confirmation: the quad is a seed. Four codes after three stable reads, three after five
     *  (one printed marker that will not decode); two fall back to a similarity fit and are never stored.
     *  Written once per change ([MeasuredGeometry.differsFrom]). Orientation is never touched here. */
    private fun adopt(
        s: CalibrationState,
        onSaved: (CalibrationProfile) -> Unit,
    ) {
        val corners = s.corners ?: return
        val required = requiredStableReads(s.markerIds.size)
        if (required == null || s.stableReads < required || writing) return
        val measured = MeasuredGeometry(corners.copyOf(), s.frameWidth, s.frameHeight)
        val stored = store.current
        if (stored != null && !measured.differsFrom(stored)) {
            if (s.saved) return
            _state.value = _state.value.copy(saved = true)
            onSaved(stored.copy(corners = measured.corners.copyOf()))
            return
        }
        writing = true
        scope.launch {
            // A throwing store left [writing] set, and this instance never adopted a board again.
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

    private suspend fun loadStored(): Boolean =
        try {
            store.load()
            true
        } catch (e: IOException) {
            _state.value = _state.value.copy(note = loadFailed(e.message))
            false
        }

    internal suspend fun detectOnce() {
        if (_state.value.detecting) return
        _state.value = _state.value.copy(detecting = true)
        // The guard is a latch: a throwing detector must still open it, or every later poll returns at once.
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
        // Stamped even on a FAILED detection: the source size must come from the detected Mat (a7dab73).
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

/** From the marker COUNT, not the detector's log string: every line ends in something the user can do. */
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
        ok -> "Board found — $markers of $ALL_MARKERS codes visible, the rest estimated."
        markers > 0 -> "Only $markers of $ALL_MARKERS codes in view — move the camera back."
        else -> "No board yet — point the camera at the whole board."
    }
}
