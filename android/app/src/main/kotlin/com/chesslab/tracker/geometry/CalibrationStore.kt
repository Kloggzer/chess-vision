package com.chesslab.tracker.geometry

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.chesslab.geometry.BoardGeometry
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

// Persistence + the ensure_profile carry-over rule (`calibration.py:222`, docstring:
// "Silently falling back to the defaults here would reset a hand-set white_pov: false and
// transpose every label of the next session").

private val PROFILE_KEY = stringPreferencesKey("calibration_profile")

/** `profile_from_frame`'s default: the markers sit this fraction outside the playing field. */
private const val MARKER_MARGIN: Double = 0.06

// Its OWN DataStore file: 06c's settings store and the safety-critical geometry must not share a
// write path.
private val Context.calibrationDataStore: DataStore<Preferences> by preferencesDataStore(name = "calibration")

fun calibrationStore(context: Context): CalibrationStore =
    CalibrationStore(DataStoreProfileBacking(context.applicationContext.calibrationDataStore))

/** The one thing the store needs from its backing. A fake makes the carry-over rule JVM-testable. */
interface ProfileBacking {
    val text: Flow<String?>

    suspend fun write(text: String)
}

class DataStoreProfileBacking(
    private val store: DataStore<Preferences>,
) : ProfileBacking {
    override val text: Flow<String?> = store.data.map { it[PROFILE_KEY] }

    override suspend fun write(text: String) {
        store.edit { it[PROFILE_KEY] = text }
    }
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
    var geometry: BoardGeometry = BoardGeometry(margin = MARKER_MARGIN)
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
    ): CalibrationProfile {
        val existing = (load() as? ProfileLoad.Ok)?.profile
        val next = carryOver(existing, measured, whitePovOverride, savedAtMs)
        save(next)
        return next
    }
}

/** Pure `ensure_profile` carry-over. An explicit user choice still wins (Python's `setdefault`). */
fun carryOver(
    existing: CalibrationProfile?,
    measured: MeasuredGeometry,
    whitePovOverride: Boolean? = null,
    savedAtMs: Long = 0L,
): CalibrationProfile =
    existing?.copy(
        whitePov = whitePovOverride ?: existing.whitePov,
        corners = measured.corners.copyOf(),
        sourceWidth = measured.sourceWidth,
        sourceHeight = measured.sourceHeight,
        savedAtMs = savedAtMs,
        version = PROFILE_SCHEMA_VERSION,
    ) ?: CalibrationProfile(
        name = "default",
        whitePov = whitePovOverride ?: true,
        sourceWidth = measured.sourceWidth,
        sourceHeight = measured.sourceHeight,
        corners = measured.corners.copyOf(),
        savedAtMs = savedAtMs,
    )
