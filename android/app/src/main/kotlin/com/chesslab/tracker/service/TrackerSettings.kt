package com.chesslab.tracker.service

import com.chesslab.engine.api.TrackerConfig
import com.chesslab.tracker.camera.CameraConfig
import com.chesslab.tracker.camera.Resolution

/**
 * The overlay debug views (port of `/api/view` modes, `tracker.py:2379`).
 * Colours: changed = magenta, shadow = cyan, occlusion = orange.
 */
enum class OverlayView {
    BOARD,
    DIFF,
    SHADOW,
    OCCLUSION,
    MOTION,
}

/**
 * Immutable snapshot of every user-facing setting (DataStore-backed by
 * [SettingsRepository]). Split into the Python live/constructor groups
 * (`app.py:24-47,50`): the *live tunables* update the running engine/pipeline in
 * place, while the *constructor params* require an engine rebuild.
 *
 * Live tunables (mirror `_live_tuning_kwargs`): [motionThr], [zThr], [censusThr],
 * [occlusionColorThr], [motionMargin], [overhang], [motionHoldS], [claheClip].
 * Everything else is a constructor param.
 */
data class TrackerSettings(
    // Game (constructor params)
    val pairLookAhead: Boolean = TrackerConfig.DEFAULT_PAIR_LOOK_AHEAD,
    val ambiguityMargin: Double = TrackerConfig.DEFAULT_AMBIGUITY_MARGIN_LL,
    val usePrior: Boolean = TrackerConfig.DEFAULT_USE_PRIOR,
    // Camera (constructor params)
    val resolution: Resolution = Resolution.R1080P,
    val dynamicResolution: Boolean = true,
    // Detection (live tunables)
    val motionThr: Double = TrackerConfig.DEFAULT_MOTION_THR,
    val zThr: Double = TrackerConfig.DEFAULT_Z_THR,
    val censusThr: Double = TrackerConfig.DEFAULT_CENSUS_THR,
    val occlusionColorThr: Double = TrackerConfig.DEFAULT_OCCLUSION_COLOR_THR,
    val motionMargin: Double = TrackerConfig.DEFAULT_MOTION_MARGIN,
    val overhang: Double = TrackerConfig.DEFAULT_OVERHANG,
    val motionHoldS: Double = TrackerConfig.DEFAULT_MOTION_HOLD_S,
    val claheClip: Double = TrackerConfig.DEFAULT_DIFF_CLAHE_CLIP,
    // Recording (phase 07)
    val autoRecord: Boolean = true,
    // CNN safeguard (phase 05); needs an imported model (CnnModelStore) to attach.
    val cnnEnabled: Boolean = false,
    val cnnConfThr: Double = DEFAULT_CNN_CONF_THR,
    // Experimental + Debug
    val experimentalDetection: Boolean = false,
    val debugCard: Boolean = false,
    val overlayView: OverlayView = OverlayView.BOARD,
) {
    /** Map the engine-relevant fields onto an immutable [TrackerConfig]. */
    fun toTrackerConfig(): TrackerConfig =
        TrackerConfig(
            motionThr = motionThr,
            zThr = zThr,
            ambiguityMarginLl = ambiguityMargin,
            censusThr = censusThr,
            occlusionColorThr = occlusionColorThr,
            motionMargin = motionMargin,
            overhang = overhang,
            motionHoldS = motionHoldS,
            diffClaheClip = claheClip,
            pairLookAhead = pairLookAhead,
            usePrior = usePrior,
        )

    /** Map the camera-relevant fields onto a [CameraConfig]. */
    fun toCameraConfig(): CameraConfig =
        CameraConfig(
            resolution = resolution,
            dynamicResolution = dynamicResolution,
        )

    /**
     * True when moving from [previous] to `this` touched a **constructor param**
     * (`app.py:50` split) — the service must rebuild the engine. Live-tunable-only
     * changes return false and are applied in place (CLAHE in the warp pipeline,
     * thresholds via a config swap that preserves game state).
     */
    fun requiresEngineRestart(previous: TrackerSettings): Boolean =
        pairLookAhead != previous.pairLookAhead ||
            usePrior != previous.usePrior ||
            resolution != previous.resolution ||
            dynamicResolution != previous.dynamicResolution

    companion object {
        /** `config.TRACK_DEFAULTS["cnn_conf_thr"]`. */
        const val DEFAULT_CNN_CONF_THR: Double = 0.85
    }
}
