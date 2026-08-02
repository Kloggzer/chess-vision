package com.chesslab.tracker.ui.calibration

import android.graphics.Bitmap
import com.chesslab.geometry.margins4
import com.chesslab.geometry.nudgeInRectified
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

private const val NO_FRAME = "waiting for a camera frame"

private const val CHECKING_GRID = "checking the grid…"

private const val CORNERS = 4

/** No adjustment at all — the automatic's own quad. */
fun zeroNudge(): List<DoubleArray> = List(CORNERS) { doubleArrayOf(0.0, 0.0) }

/** `[x, y, x, y, …]` as the point list the geometry helpers take. */
private fun FloatArray.toPointList(): List<DoubleArray> =
    (0 until size / 2).map { doubleArrayOf(this[it * 2].toDouble(), this[it * 2 + 1].toDouble()) }

/** Percent, for reporting an offset as a fraction of one square. */
private const val PERCENT = 100.0

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
    /**
     * The quad the per-corner [nudge] offsets are measured FROM — the automatic's own answer.
     *
     * Kept apart from [corners] so the eight offsets stay absolute. Folding them in and re-reading
     * them back would make every adjustment relative to the last one, which drifts: the same slider
     * at the same position would mean something different depending on how it got there.
     */
    val baseCorners: FloatArray? = null,
    /** Per-corner `[dx, dy]` in RECTIFIED pixels, `[a8, h8, h1, a1]`; + shows more of the board. */
    val nudge: List<DoubleArray> = List(CORNERS) { doubleArrayOf(0.0, 0.0) },
    /** The rectified board's edge in pixels — what one unit of [nudge] is a pixel OF. */
    val boardSize: Int = 0,
    /** True while the automatic fine-tune is re-fitting against the grooves. */
    val refining: Boolean = false,
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
    private var marginTouched = false

    /**
     * The eight offsets, in rectified pixels, applied to [CalibrationState.baseCorners].
     *
     * ONE entry point rather than a setter and a reset, because they are the same act with a
     * different argument — the caller passes the whole next set, so "move a8 sideways" and "back to
     * the automatic's quad" go down the same path and cannot drift apart.
     *
     * Every slot is recomputed from the base rather than from the current quad — see
     * [CalibrationState.baseCorners] for why. The warp is refreshed on every change because the
     * rectified board above IS the instrument: a number without the picture reacting to it is a
     * number nobody can judge.
     */
    fun applyNudge(next: List<DoubleArray>) {
        val s = _state.value
        val base = s.baseCorners ?: return
        if (next.size != CORNERS || s.boardSize <= 0) return
        val quad = base.toPointList()
        val moved = base.copyOf()
        next.forEachIndexed { i, off ->
            val p = nudgeInRectified(quad, s.boardSize, i, off[0], off[1])
            moved[i * 2] = p[0].toFloat()
            moved[i * 2 + 1] = p[1].toFloat()
        }
        _state.value = s.copy(nudge = next, corners = moved)
        scope.launch { refreshWarp(moved, s.whitePov, s.margin) }
    }

    /**
     * Re-run the groove fit against the quad as it stands now, and adopt the answer as the new base.
     *
     * The same refinement [toConfirm] runs once on the way in, on a button, because the way in is
     * not the only moment it is worth running: after eight manual nudges the quad is a different
     * quad, and the fit that failed to find the grooves from the automatic's corners may well find
     * them from yours. Adopting the result as the base zeroes the offsets — they described a quad
     * that no longer exists.
     */
    fun autoFineTune() {
        val s = _state.value
        val corners = s.corners ?: return
        if (s.refining) return
        _state.value = s.copy(refining = true, note = CHECKING_GRID)
        scope.launch {
            val refined = detector.refine(corners)
            val use = refined?.corners ?: corners
            val now = _state.value
            _state.value =
                now.copy(
                    refining = false,
                    corners = use,
                    baseCorners = use.copyOf(),
                    nudge = zeroNudge(),
                    note = refined?.let(::gridNote) ?: "the grooves were not found — the corners are unchanged",
                )
            refreshWarp(use, now.whitePov, now.margin)
        }
    }

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

    /**
     * The manual corner taps, whole — append, undo and start-over are one act with one argument.
     *
     * Three members collapsed into this for the same reason [applyNudge] is one: they only ever
     * differed in the list they produced, and a caller that hands over the next list cannot get the
     * three out of step with each other.
     */
    fun setTaps(taps: List<TapPoint>) {
        val next = taps.take(CORNER_PROMPTS.size)
        _state.value = _state.value.copy(taps = next, corners = tapsToCorners(next) ?: _state.value.corners)
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
            s.copy(
                step = CalibrationStep.CONFIRM,
                orientationSeen = true,
                note = CHECKING_GRID,
                margin = margin,
                boardSize = store.geometry.boardSize,
                nudge = zeroNudge(),
            )
        scope.launch {
            val refined = detector.refine(corners)
            val use = refined?.corners ?: corners
            // The user may have gone back while this ran; writing a quad into the AIM step would
            // resurrect a candidate they rejected.
            if (_state.value.step == CalibrationStep.CONFIRM) {
                _state.value = _state.value.copy(corners = use, baseCorners = use.copyOf(), note = refined?.let(::gridNote))
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

    /**
     * Leave the orientation check, back to wherever the corners came FROM.
     *
     * It used to go to [CalibrationStep.AIM] unconditionally, which threw away manual work without
     * saying so: the taps survive in the state, but AIM restarts the ArUco poll and the next
     * detection overwrites the quad the user had just placed by hand. "Corners look wrong" after
     * setting them by hand has exactly one sensible destination, and it is not the automatic.
     */
    fun back() {
        val s = _state.value
        val to = if (s.taps.isNotEmpty()) CalibrationStep.MANUAL else CalibrationStep.AIM
        _state.value = s.copy(step = to, warped = null, orientationSeen = false)
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
