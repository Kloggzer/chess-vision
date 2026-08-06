package com.chesslab.tracker.geometry

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

// Persistence + the ensure_profile carry-over rule (`calibration.py:222`, docstring:
// "Silently falling back to the defaults here would reset a hand-set white_pov: false and
// transpose every label of the next session").

private val PROFILE_KEY = stringPreferencesKey("calibration_profile")

// Its OWN DataStore file: 06c's settings store and the safety-critical geometry must not share a
// write path.
private val Context.calibrationDataStore: DataStore<Preferences> by preferencesDataStore(name = "calibration")

fun calibrationStore(context: Context): CalibrationStore =
    CalibrationStore(DataStoreProfileBacking(context.applicationContext.calibrationDataStore))

/** The one thing the store needs from its backing. A fake makes the carry-over rule JVM-testable. */
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
