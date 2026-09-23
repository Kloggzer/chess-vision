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

    fun differsFrom(stored: CalibrationProfile): Boolean =
        stored.boardSize != measuredBoardSize(corners) ||
            stored.sourceWidth != sourceWidth ||
            stored.sourceHeight != sourceHeight
}

class CalibrationStore(
    private val backing: ProfileBacking,
) {
    val profile: Flow<ProfileLoad> = backing.text.map(::decodeProfile)

    /** What ArUco detects against. Read from a background detection thread, hence `@Volatile`. */
    @Volatile
    var geometry: BoardGeometry = BoardGeometry(margin = margins4(DEFAULT_MARKER_MARGIN))
        private set

    /** Null until one was read, or when none is stored. */
    @Volatile
    var current: CalibrationProfile? = null
        private set

    suspend fun load(): ProfileLoad =
        profile.first().also {
            current = (it as? ProfileLoad.Ok)?.profile
            if (it is ProfileLoad.Ok) geometry = it.profile.geometry()
        }

    suspend fun save(profile: CalibrationProfile) {
        backing.write(encodeProfile(profile))
        current = profile
        geometry = profile.geometry()
    }

    /** Written INTO the profile, not beside it: only the profile survives [saveRecalibrated], and a wrong a8
     *  transposes every label of the session. */
    suspend fun applyOrientation(whitePov: Boolean): BoardGeometry {
        val stored = (load() as? ProfileLoad.Ok)?.profile
        when {
            stored == null -> geometry = geometry.copy(whitePov = whitePov)
            stored.whitePov != whitePov -> save(stored.copy(whitePov = whitePov))
        }
        return geometry
    }

    /** Only the corners and the source size are replaced; the rest survives unless [whitePovOverride] changes it. */
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

/** It used to be 1600: the board is ~630 px of a 1080p frame, so that INVENTED detail every per-pixel stage paid
 *  for. Rounded to [BOARD_SIZE_STEP] so halving and eighthing stay integral; clamped both ways. */
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

/** Malformed corners are a programming error; the size every regression clip uses. */
private const val FALLBACK_BOARD_SIZE = 640

private const val CORNER_COUNT = 4
private const val CORNER_FLOATS = CORNER_COUNT * 2

private const val BOARD_SIZE_STEP = 16

/** Below this a square is under 40 px and the CNN crop is mostly interpolation. */
private const val MIN_BOARD_SIZE = 320

/** Above this we pay for pixels no lens delivered. */
private const val MAX_BOARD_SIZE = 1280

/** An explicit user choice still wins (Python's `setdefault`). */
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
        // NOT carried over: it measures the thing that just changed.
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
