package com.chesslab.tracker.ui.calibration

import android.graphics.Bitmap
import com.chesslab.geometry.margins4
import com.chesslab.tracker.camera.OpticsSettling
import com.chesslab.tracker.geometry.BoardDetector
import com.chesslab.tracker.geometry.CalibrationProfile
import com.chesslab.tracker.geometry.CalibrationResult
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.geometry.DEFAULT_MARKER_MARGIN
import com.chesslab.tracker.geometry.MeasuredGeometry
import com.chesslab.tracker.geometry.ProfileLoad
import com.chesslab.tracker.geometry.QuadRefinement
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.hypot
import kotlin.math.roundToInt

/** Interval between auto-detection attempts while aiming. */
private const val AUTO_DETECT_MS: Long = 500

enum class CalibrationStep { AIM, DETECTED, MANUAL, CONFIRM }

/** A manually tapped corner, in SOURCE pixels. */
data class TapPoint(
    val x: Float,
    val y: Float,
)

/** Adjustment bounds for a marker outset — 0 is "markers on the field corners", 12 % is absurd. */
private const val MARGIN_MIN: Double = 0.0
private const val MARGIN_MAX: Double = 0.12

/**
 * What the "Re-measure camera" button is doing, or what it ended up doing.
 *
 * All three outcomes are distinct values rather than one string, because the difference between
 * them is what the user has to act on: a re-calibration needs nothing, a missing board needs the
 * camera aimed, and a timeout means the picture is unchanged and the button is worth pressing
 * again. Silence after a button that changes the optics is the one outcome that must not happen.
 */
sealed interface Remeasure {
    /** Focus, exposure and white balance are re-converging; the picture may visibly hunt. */
    data object Measuring : Remeasure

    /** They settled. Now the markers — because the image just moved under them. */
    data object Detecting : Remeasure

    /** Converged and re-calibrated: the profile now describes the picture as it is now. */
    data class Recalibrated(
        val focusDistance: Float?,
        val boardSize: Int,
        val pxPerSquare: Int,
    ) : Remeasure

    /** Converged and re-frozen, but no board was found. The optics moved, the profile did not. */
    data class NoMarkers(
        val focusDistance: Float?,
        val reason: String?,
    ) : Remeasure

    /** Nothing settled in time. The previous lock is back in force and nothing else changed. */
    data object TimedOut : Remeasure
}

/** One line for the screen. Kept beside [Remeasure] so every outcome is worded in one place. */
fun remeasureMessage(state: Remeasure): String =
    when (state) {
        Remeasure.Measuring -> "Re-measuring focus, exposure and white balance…"
        Remeasure.Detecting -> "Optics settled. Looking for the board…"
        is Remeasure.Recalibrated ->
            "Re-measured${state.focusDistance.asDiopters()} — board ${state.pxPerSquare} px/square, " +
                "rectified to ${state.boardSize} px."
        is Remeasure.NoMarkers ->
            "Optics re-measured${state.focusDistance.asDiopters()}, but the board was not found — " +
                "the saved geometry is unchanged. ${state.reason.orEmpty()}".trim()
        Remeasure.TimedOut ->
            "The camera never reported that it had settled. Nothing changed: the previous focus, " +
                "exposure and white balance are still in force."
    }

private fun Float?.asDiopters(): String = if (this == null) "" else " (focus %.2f dpt)".format(this)

private const val NO_FRAME = "waiting for a camera frame"

private const val CHECKING_GRID = "checking the grid…"

/** Percent, for reporting an offset as a fraction of one square. */
private const val PERCENT = 100.0

private const val CORNER_COUNT = 4
private const val SQUARES_PER_SIDE = 8

/**
 * Pixels per square as the CAMERA delivers them: the quad's longest edge in SOURCE pixels, over 8.
 *
 * Not `measuredBoardSize / 8`, which is what the profile stores: that one is clamped to 1280 px
 * (160 px/square) and would read the same number back at the user whatever the re-measure found.
 */
private fun sourcePxPerSquare(corners: FloatArray): Int {
    if (corners.size != CORNER_COUNT * 2) return 0
    var longest = 0.0
    for (i in 0 until CORNER_COUNT) {
        val j = (i + 1) % CORNER_COUNT
        val dx = (corners[j * 2] - corners[i * 2]).toDouble()
        val dy = (corners[j * 2 + 1] - corners[i * 2 + 1]).toDouble()
        longest = maxOf(longest, hypot(dx, dy))
    }
    return (longest / SQUARES_PER_SIDE).roundToInt()
}

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
    /**
     * Per-corner marker outset, `[a8, h8, h1, a1]`. Adjustable HERE because the codes are glued
     * on by hand: re-sticking them moves each corner independently, and the rectified preview
     * above is the only place the effect is visible.
     */
    val margin: List<Double> = margins4(DEFAULT_MARKER_MARGIN),
    val saved: Boolean = false,
    /** Progress and outcome of the last "Re-measure camera"; null until it is pressed once. */
    val remeasure: Remeasure? = null,
) {
    /** A wrong a8 assignment is invisible at runtime, so the confirmation screen is not skippable. */
    val canSave: Boolean get() = step == CalibrationStep.CONFIRM && orientationSeen && corners != null

    /** A sequence is in flight: the button is disabled and the aiming poll stands down. */
    val remeasuring: Boolean get() = remeasure == Remeasure.Measuring || remeasure == Remeasure.Detecting

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
    /** `CalibrationHost.remeasureOptics`. Null when no service is attached: the button is hidden. */
    private val remeasureOptics: (suspend () -> OpticsSettling)? = null,
) {
    private val _state = MutableStateFlow(CalibrationState())
    val state: StateFlow<CalibrationState> = _state.asStateFlow()

    /** Set only by the user on the confirmation screen — an untouched value is carried over. */
    private var whitePovTouched = false
    private var marginTouched = false

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

    /** True while a service is attached — the "Re-measure camera" button has something to call. */
    val canRemeasure: Boolean = remeasureOptics != null

    /** Poll ArUco while the user is aiming. Cancelled with the caller's scope. */
    suspend fun autoDetect() {
        while (scope.isActive) {
            // Stood down during a re-measure: the poll would otherwise detect against a lens that
            // is still hunting, which is the picture the sequence is in the middle of replacing.
            if (_state.value.step == CalibrationStep.AIM && !_state.value.remeasuring) detectNow()
            delay(AUTO_DETECT_MS)
        }
    }

    /**
     * One press, one sequence: **optics first, geometry second**.
     *
     * The order is the whole point. `OpticsLock` freezes focus, exposure and white balance once the
     * device says they settled, which is right for a fixed camera over a static board — but a bad
     * moment at start-up (a hand in the frame, the board not yet placed) is then held for the whole
     * session. Re-measuring means letting them converge again; and because focus breathing moves
     * the image, a marker quad measured before that describes a picture that is already gone. So
     * the detection below runs strictly after the optics report converged, never beside it.
     *
     * Not automatic and not a loop: the automatic path is what settled wrong in the first place.
     * Suspending like [autoDetect], so the screen owns the scope this runs in.
     */
    suspend fun remeasure(onRecalibrated: (CalibrationProfile) -> Unit = {}) {
        val optics = remeasureOptics
        if (optics == null || _state.value.remeasuring) return
        _state.value = _state.value.copy(remeasure = Remeasure.Measuring, note = null)
        val settling = optics()
        if (settling !is OpticsSettling.Converged) {
            // Nothing settled in time. `OpticsLock` put the previous lock back, so the picture is
            // exactly what it was — and the geometry must not be touched on the strength of it.
            _state.value = _state.value.copy(remeasure = Remeasure.TimedOut)
            return
        }
        val focus = settling.focusDistance
        _state.value = _state.value.copy(remeasure = Remeasure.Detecting)
        val result = detectNow()
        val corners = result?.takeIf { it.ok }?.corners
        if (corners == null) {
            _state.value = _state.value.copy(remeasure = Remeasure.NoMarkers(focus, result?.reason ?: NO_FRAME))
            return
        }
        // The orientation confirmation is skipped here, and only here. It guards the a8 ASSIGNMENT,
        // and this path changes neither the markers' meaning (marker N is corner N) nor `whitePov` —
        // it replaces the quad, and nothing else, with one measured moments ago through optics that
        // have just settled.
        val saved =
            store.saveRecalibrated(
                MeasuredGeometry(corners.copyOf(), result.frameWidth, result.frameHeight),
                whitePovOverride = if (whitePovTouched) _state.value.whitePov else null,
                savedAtMs = nowMs(),
                marginOverride = if (marginTouched) _state.value.margin else null,
            )
        _state.value =
            _state.value.copy(remeasure = Remeasure.Recalibrated(focus, saved.boardSize, sourcePxPerSquare(corners)))
        onRecalibrated(saved)
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

    /**
     * Accept the quad, refine it against the board's own grooves, then show the result.
     *
     * The refinement runs HERE and not in the aim poll: it is ~80 ms at `boardSize` 1600 and the
     * poll fires twice a second. Running it before the preview is what makes the preview honest —
     * the user confirms the geometry the crops will actually be cut with, and if the grid was off
     * they see by how much.
     *
     * Why it matters: the whole Python corpus was cut 3-6 px off-grid until 2026-07-31 with nothing
     * failing, and re-cutting it moved the model's empty-crop margin 5.5x. The 18 recorded clips
     * still sit at 8.8 % of a square. Training that tolerance back in does not work —
     * `--jitter-translate 0.09` cost 548 misses against 3.
     */
    fun toConfirm() {
        val s = _state.value
        val corners = s.corners ?: return
        // Start from what is stored, not from the default: a recalibration should not silently
        // discard outsets the user measured by hand last time.
        val margin = store.geometry.margin
        _state.value =
            s.copy(step = CalibrationStep.CONFIRM, orientationSeen = true, note = CHECKING_GRID, margin = margin)
        scope.launch {
            val refined = detector.refine(corners)
            val use = refined?.corners ?: corners
            // The user may have gone back while this ran; writing a quad into the AIM step would
            // resurrect a candidate they rejected.
            if (_state.value.step == CalibrationStep.CONFIRM) {
                _state.value = _state.value.copy(corners = use, note = refined?.let(::gridNote))
            }
            refreshWarp(use, s.whitePov, margin)
        }
    }

    /** One corner's outset, in `[a8, h8, h1, a1]` order. Re-rectifies the preview immediately. */
    fun setMargin(
        corner: Int,
        value: Double,
    ) {
        marginTouched = true
        val s = _state.value
        val next = s.margin.toMutableList().also { it[corner] = value.coerceIn(MARGIN_MIN, MARGIN_MAX) }
        _state.value = s.copy(margin = next)
        s.corners?.let { c -> scope.launch { refreshWarp(c, s.whitePov, next) } }
    }

    fun setWhitePov(value: Boolean) {
        whitePovTouched = true
        val s = _state.value.copy(whitePov = value)
        _state.value = s
        s.corners?.let { c -> scope.launch { refreshWarp(c, value, s.margin) } }
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
                    marginOverride = if (marginTouched) s.margin else null,
                )
            _state.value = _state.value.copy(saved = true)
            onSaved(saved)
        }
    }

    private suspend fun detectNow(): CalibrationResult? {
        if (_state.value.detecting) return null
        _state.value = _state.value.copy(detecting = true)
        val result = detector.detect()
        val s = _state.value.copy(detecting = false)
        if (result == null) {
            _state.value = s.copy(note = NO_FRAME)
            return null
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
        return result
    }

    private suspend fun refreshWarp(
        corners: FloatArray,
        whitePov: Boolean,
        margin: List<Double>,
    ) {
        val bitmap = detector.warp(corners, whitePov, margin)
        _state.value = _state.value.copy(warped = bitmap)
    }
}

/**
 * The offset as a fraction of ONE SQUARE, never in raw pixels.
 *
 * "4 px" means nothing without the board size — it is 4 % of a square at `boardSize` 800 and 2 % at
 * 1600. The percentage is the number that transfers between the phone, the rig and the recorded
 * clips, which is the whole reason this measurement exists.
 */
private fun gridNote(r: QuadRefinement): String {
    fun pct(px: Double) = "${(px / r.cellPx * PERCENT).roundToInt()}%"
    return if (r.applied) {
        "grid corrected: ${pct(r.beforePx)} → ${pct(r.afterPx)} of a square"
    } else {
        "grid sits on the squares (${pct(r.beforePx)} of a square)"
    }
}
