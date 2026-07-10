package com.chesslab.tracker.service

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import com.chesslab.tracker.camera.Resolution
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * DataStore-backed persistence for [TrackerSettings]. The [settings] flow emits the
 * current snapshot; the `set*` helpers persist single fields. Pure
 * (de)serialization lives in [decode]/`edit` blocks so it can be reasoned about
 * without a device — the DataStore instance is injected so tests can supply a
 * fake.
 */
class SettingsRepository(
    private val store: DataStore<Preferences>,
) {
    val settings: Flow<TrackerSettings> = store.data.map(::decode)

    suspend fun update(transform: (TrackerSettings) -> TrackerSettings) {
        store.edit { prefs ->
            val next = transform(decode(prefs))
            encode(prefs, next)
        }
    }

    private companion object Keys {
        val PAIR_LOOK_AHEAD = booleanPreferencesKey("pair_look_ahead")
        val AMBIGUITY_MARGIN = doublePreferencesKey("ambiguity_margin")
        val USE_PRIOR = booleanPreferencesKey("use_prior")
        val RESOLUTION = stringPreferencesKey("resolution")
        val DYNAMIC_RESOLUTION = booleanPreferencesKey("dynamic_resolution")
        val MOTION_THR = doublePreferencesKey("motion_thr")
        val Z_THR = doublePreferencesKey("z_thr")
        val CENSUS_THR = doublePreferencesKey("census_thr")
        val CENSUS_Z_WEIGHT = doublePreferencesKey("census_z_weight")
        val MAX_CHANGED = intPreferencesKey("max_changed")
        val ARUCO_MARGIN = doublePreferencesKey("aruco_margin")
        val OCCLUSION_COLOR_THR = doublePreferencesKey("occlusion_color_thr")
        val MOTION_MARGIN = doublePreferencesKey("motion_margin")
        val OVERHANG = doublePreferencesKey("overhang")
        val MOTION_HOLD_S = doublePreferencesKey("motion_hold_s")
        val CLAHE_CLIP = doublePreferencesKey("clahe_clip")
        val AUTO_RECORD = booleanPreferencesKey("auto_record")
        val CNN_ENABLED = booleanPreferencesKey("cnn_enabled")
        val CNN_CONF_THR = doublePreferencesKey("cnn_conf_thr")
        val EXPERIMENTAL = booleanPreferencesKey("experimental_detection")
        val DEBUG_CARD = booleanPreferencesKey("debug_card")
        val OVERLAY_VIEW = stringPreferencesKey("overlay_view")
    }

    /** Pure Preferences -> [TrackerSettings] mapping (defaults from [TrackerSettings]). */
    internal fun decode(prefs: Preferences): TrackerSettings = decodeDetection(prefs, decodeCore(prefs, TrackerSettings()))

    /** Game, camera, experimental and debug fields. */
    private fun decodeCore(
        prefs: Preferences,
        d: TrackerSettings,
    ): TrackerSettings =
        d.copy(
            pairLookAhead = prefs[PAIR_LOOK_AHEAD] ?: d.pairLookAhead,
            ambiguityMargin = prefs[AMBIGUITY_MARGIN] ?: d.ambiguityMargin,
            usePrior = prefs[USE_PRIOR] ?: d.usePrior,
            resolution = prefs[RESOLUTION]?.let(::resolutionOf) ?: d.resolution,
            dynamicResolution = prefs[DYNAMIC_RESOLUTION] ?: d.dynamicResolution,
            autoRecord = prefs[AUTO_RECORD] ?: d.autoRecord,
            cnnEnabled = prefs[CNN_ENABLED] ?: d.cnnEnabled,
            cnnConfThr = prefs[CNN_CONF_THR] ?: d.cnnConfThr,
            experimentalDetection = prefs[EXPERIMENTAL] ?: d.experimentalDetection,
            debugCard = prefs[DEBUG_CARD] ?: d.debugCard,
            overlayView = prefs[OVERLAY_VIEW]?.let(::overlayOf) ?: d.overlayView,
        )

    /** Live-tunable detection thresholds. */
    private fun decodeDetection(
        prefs: Preferences,
        d: TrackerSettings,
    ): TrackerSettings =
        d.copy(
            motionThr = prefs[MOTION_THR] ?: d.motionThr,
            zThr = prefs[Z_THR] ?: d.zThr,
            censusThr = prefs[CENSUS_THR] ?: d.censusThr,
            censusZWeight = prefs[CENSUS_Z_WEIGHT] ?: d.censusZWeight,
            maxChanged = prefs[MAX_CHANGED] ?: d.maxChanged,
            arucoMargin = prefs[ARUCO_MARGIN] ?: d.arucoMargin,
            occlusionColorThr = prefs[OCCLUSION_COLOR_THR] ?: d.occlusionColorThr,
            motionMargin = prefs[MOTION_MARGIN] ?: d.motionMargin,
            overhang = prefs[OVERHANG] ?: d.overhang,
            motionHoldS = prefs[MOTION_HOLD_S] ?: d.motionHoldS,
            claheClip = prefs[CLAHE_CLIP] ?: d.claheClip,
        )

    internal fun encode(
        prefs: androidx.datastore.preferences.core.MutablePreferences,
        s: TrackerSettings,
    ) {
        prefs[PAIR_LOOK_AHEAD] = s.pairLookAhead
        prefs[AMBIGUITY_MARGIN] = s.ambiguityMargin
        prefs[USE_PRIOR] = s.usePrior
        prefs[RESOLUTION] = s.resolution.name
        prefs[DYNAMIC_RESOLUTION] = s.dynamicResolution
        prefs[AUTO_RECORD] = s.autoRecord
        prefs[CNN_ENABLED] = s.cnnEnabled
        prefs[CNN_CONF_THR] = s.cnnConfThr
        prefs[MOTION_THR] = s.motionThr
        prefs[Z_THR] = s.zThr
        prefs[CENSUS_THR] = s.censusThr
        prefs[CENSUS_Z_WEIGHT] = s.censusZWeight
        prefs[MAX_CHANGED] = s.maxChanged
        prefs[ARUCO_MARGIN] = s.arucoMargin
        prefs[OCCLUSION_COLOR_THR] = s.occlusionColorThr
        prefs[MOTION_MARGIN] = s.motionMargin
        prefs[OVERHANG] = s.overhang
        prefs[MOTION_HOLD_S] = s.motionHoldS
        prefs[CLAHE_CLIP] = s.claheClip
        prefs[EXPERIMENTAL] = s.experimentalDetection
        prefs[DEBUG_CARD] = s.debugCard
        prefs[OVERLAY_VIEW] = s.overlayView.name
    }

    private fun resolutionOf(name: String): Resolution = Resolution.entries.firstOrNull { it.name == name } ?: Resolution.R1080P

    private fun overlayOf(name: String): OverlayView = OverlayView.entries.firstOrNull { it.name == name } ?: OverlayView.BOARD
}
