package com.chesslab.tracker.geometry

import com.chesslab.geometry.BoardGeometry
import com.chesslab.geometry.margins4
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlin.math.roundToInt

interface ProfileBacking {
    val text: Flow<String?>

    suspend fun write(text: String)
}

/** What a calibration run actually MEASURES. Everything else is carried over. */
data class MeasuredGeometry(
    val corners: FloatArray,
    val sourceWidth: Int,
    val sourceHeight: Int,
) {
    override fun equals(other: Any?): Boolean =
        this === other ||
            (
                other is MeasuredGeometry &&
                    corners.contentEquals(other.corners) &&
                    sourceWidth == other.sourceWidth &&
                    sourceHeight == other.sourceHeight
            )

    override fun hashCode(): Int = 31 * (31 * corners.contentHashCode() + sourceWidth) + sourceHeight
}

class CalibrationStore(
    private val backing: ProfileBacking,
) {
    val profile: Flow<ProfileLoad> = backing.text.map(::decodeProfile)

    /**
     * Geometry of the last profile read or written — what ArUco detects against. Read from a
     * background detection thread, hence `@Volatile`.
     */
    @Volatile
    var geometry: BoardGeometry = BoardGeometry(margin = margins4(DEFAULT_MARKER_MARGIN))
        private set

    suspend fun load(): ProfileLoad = profile.first().also { if (it is ProfileLoad.Ok) geometry = it.profile.geometry() }

    suspend fun save(profile: CalibrationProfile) {
        backing.write(encodeProfile(profile))
        geometry = profile.geometry()
    }

    /**
     * Make [whitePov] the profile's orientation and return the geometry that follows from it.
     *
     * 07a's orientation setting is written INTO the profile rather than applied beside it: only
     * the profile is carried over by [saveRecalibrated] (`ensure_profile`, calibration.py:222), so
     * a value living anywhere else would be silently reset by the next recalibration — and a wrong
     * a8 transposes every label of the session.
     */
    suspend fun applyOrientation(whitePov: Boolean): BoardGeometry {
        val stored = (load() as? ProfileLoad.Ok)?.profile
        when {
            stored == null -> geometry = geometry.copy(whitePov = whitePov)
            stored.whitePov != whitePov -> save(stored.copy(whitePov = whitePov))
        }
        return geometry
    }

    /**
     * Persist a recalibration. Only the corners and the source size are replaced; `whitePov`,
     * `boardSize`, `margin`, `markerDict` and `crop` survive from the existing profile unless the
     * user changed them on the confirmation screen ([whitePovOverride]).
     */
    suspend fun saveRecalibrated(
        measured: MeasuredGeometry,
        whitePovOverride: Boolean? = null,
        savedAtMs: Long = 0L,
        marginOverride: List<Double>? = null,
    ): CalibrationProfile {
        val existing = (load() as? ProfileLoad.Ok)?.profile
        val next = carryOver(existing, measured, whitePovOverride, savedAtMs, marginOverride)
        save(next)
        return next
    }
}

/**
 * The rectified board's edge length, MEASURED from where the board really is in the frame.
 *
 * It used to be a constant 1600, and that number was the single biggest cost on the phone. The
 * board occupies about 630 px of a 1080p frame — 79 px per square — so rectifying to 1600 does not
 * recover detail, it INVENTS it, and then every per-pixel stage pays for the invention: the
 * detection warp ran at 800x800 where all eighteen validated regression clips run at 320x320, and
 * the CNN crop warp at 1640x1640.
 *
 * Measured, the warp neither throws real pixels away nor fabricates any. Rounded to a multiple of
 * [BOARD_SIZE_STEP] so that halving it for the detection warp, and eighthing THAT into squares,
 * both stay integral. Clamped because a board filling the frame edge to edge is as suspect as one
 * that is a smudge.
 */
fun measuredBoardSize(corners: FloatArray): Int {
    if (corners.size != CORNER_FLOATS) return FALLBACK_BOARD_SIZE
    var longest = 0.0
    for (i in 0 until CORNER_COUNT) {
        val j = (i + 1) % CORNER_COUNT
        val dx = (corners[j * 2] - corners[i * 2]).toDouble()
        val dy = (corners[j * 2 + 1] - corners[i * 2 + 1]).toDouble()
        longest = maxOf(longest, kotlin.math.hypot(dx, dy))
    }
    val stepped = ((longest / BOARD_SIZE_STEP).roundToInt()) * BOARD_SIZE_STEP
    return stepped.coerceIn(MIN_BOARD_SIZE, MAX_BOARD_SIZE)
}

/** Malformed corners are a programming error; fall back to the size every regression clip uses. */
private const val FALLBACK_BOARD_SIZE = 640

private const val CORNER_COUNT = 4
private const val CORNER_FLOATS = CORNER_COUNT * 2

/** `boardSize / 2` (detectScale) `/ 8` (squares) must both stay whole. */
private const val BOARD_SIZE_STEP = 16

/** Below this a square is under 40 px and the CNN crop is mostly interpolation. */
private const val MIN_BOARD_SIZE = 320

/** Above this we are back to paying for pixels no lens delivered. */
private const val MAX_BOARD_SIZE = 1280

/** Pure `ensure_profile` carry-over. An explicit user choice still wins (Python's `setdefault`). */
fun carryOver(
    existing: CalibrationProfile?,
    measured: MeasuredGeometry,
    whitePovOverride: Boolean? = null,
    savedAtMs: Long = 0L,
    marginOverride: List<Double>? = null,
): CalibrationProfile =
    existing?.copy(
        whitePov = whitePovOverride ?: existing.whitePov,
        margin = marginOverride ?: existing.margin,
        corners = measured.corners.copyOf(),
        // NOT carried over: it is a measurement, and the thing it measures just changed.
        boardSize = measuredBoardSize(measured.corners),
        sourceWidth = measured.sourceWidth,
        sourceHeight = measured.sourceHeight,
        savedAtMs = savedAtMs,
        version = PROFILE_SCHEMA_VERSION,
    ) ?: CalibrationProfile(
        boardSize = measuredBoardSize(measured.corners),
        name = "default",
        whitePov = whitePovOverride ?: true,
        margin = marginOverride ?: margins4(DEFAULT_MARKER_MARGIN),
        sourceWidth = measured.sourceWidth,
        sourceHeight = measured.sourceHeight,
        corners = measured.corners.copyOf(),
        savedAtMs = savedAtMs,
    )
