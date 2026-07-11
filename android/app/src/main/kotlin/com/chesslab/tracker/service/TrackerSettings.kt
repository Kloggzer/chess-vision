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
    CAMERA,
}

/**
 * Immutable snapshot of every user-facing setting (DataStore-backed by
 * [SettingsRepository]). Split into the Python live/constructor groups
 * (`app.py:24-47,50`): the *live tunables* update the running engine/pipeline in
 * place, while the *constructor params* require an engine rebuild.
 *
 * Live tunables (mirror `_live_tuning_kwargs`): [motionThr], [zThr], [censusThr],
 * [occlusionColorThr], [overhang], [motionHoldS], [claheClip], [darkLumaThr]
 * (Android-only, no Python counterpart). `motionMargin`
 * remains persisted for backward compatibility but is not exposed: Android motion
 * is measured on the already-warped board, where an outside-board ROI cannot exist.
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
    val censusZWeight: Double = TrackerConfig.DEFAULT_CENSUS_Z_WEIGHT,
    val maxChanged: Int = TrackerConfig.DEFAULT_MAX_CHANGED,
    val occlusionColorThr: Double = TrackerConfig.DEFAULT_OCCLUSION_COLOR_THR,
    val motionMargin: Double = TrackerConfig.DEFAULT_MOTION_MARGIN,
    val overhang: Double = TrackerConfig.DEFAULT_OVERHANG,
    val motionHoldS: Double = TrackerConfig.DEFAULT_MOTION_HOLD_S,
    val claheClip: Double = TrackerConfig.DEFAULT_DIFF_CLAHE_CLIP,
    // Wobble tolerance of the gray diff in px ("virtual wobble" min-diff); 0 = exact.
    // App default 1 (phone-mount shake), engine default 0 (Python/clip parity).
    val diffJitterPx: Int = DEFAULT_DIFF_JITTER_PX,
    // Lighting robustness: per-square illumination cancel (empty squares/gradients) + census-quiet
    // light veto (occupied squares — edges scale in place). App default on, engine default off (parity).
    val lightingRobust: Boolean = DEFAULT_LIGHTING_ROBUST,
    // Dark-frame gate: skip detection when the pre-CLAHE board mean is below this
    // (CLAHE stretches sensor noise on a near-black scene into phantom diffs). 0 disables.
    val darkLumaThr: Double = DEFAULT_DARK_LUMA_THR,
    // Warp geometry: fraction the ArUco markers sit outside the playing field.
    val arucoMargin: Double = DEFAULT_ARUCO_MARGIN,
    // Recording (phase 07)
    val autoRecord: Boolean = true,
    // CNN safeguard (phase 05); needs an imported model (CnnModelStore) to attach.
    val cnnEnabled: Boolean = false,
    val cnnConfThr: Double = DEFAULT_CNN_CONF_THR,
    // Analysis (phase 05/06): default Stockfish search depth for the games/analysis screen.
    val analysisDepth: Int = DEFAULT_ANALYSIS_DEPTH,
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
            censusZWeight = censusZWeight,
            maxChanged = maxChanged,
            occlusionColorThr = occlusionColorThr,
            motionMargin = motionMargin,
            overhang = overhang,
            motionHoldS = motionHoldS,
            diffClaheClip = claheClip,
            diffJitterPx = diffJitterPx,
            diffIllumCancel = lightingRobust,
            diffLightVeto = lightingRobust,
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

        /** ArUco markers sit ~6% outside the field (Python `profile_from_frame`, calibration.py:150). */
        const val DEFAULT_ARUCO_MARGIN: Double = 0.06

        /** Pre-CLAHE mean gray below this = scene too dark to trust the diff (0..255 scale). */
        const val DEFAULT_DARK_LUMA_THR: Double = 18.0

        /** Live default absorbs ~1px phone-mount wobble; engine keeps 0 for clip parity. */
        const val DEFAULT_DIFF_JITTER_PX: Int = 1

        /** Live default on (real rooms have moving light); engine keeps false for clip parity. */
        const val DEFAULT_LIGHTING_ROBUST: Boolean = true

        /** Mirrors `AnalysisEngine.DEFAULT_DEPTH` — deep enough for accuracy grading, fast on-device. */
        const val DEFAULT_ANALYSIS_DEPTH: Int = 12
    }
}
