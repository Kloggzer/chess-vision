package com.chesslab.tracker.service

import android.content.Context
import com.chesslab.geometry.BoardGeometry
import com.chesslab.tracker.cnn.Attached
import com.chesslab.tracker.cnn.CnnModelAssets
import com.chesslab.tracker.cnn.OnnxSquareClassifier
import com.chesslab.tracker.cnn.requestedBackend
import com.chesslab.tracker.geometry.CalibrationStore
import com.chesslab.tracker.log.AndroidTrackerLog
import com.chesslab.tracker.settings.AppSettings
import com.chesslab.tracker.settings.BoardOrientation
import com.chesslab.tracker.settings.SettingsRepository

// 07a's app-level settings, applied. All four were persisted, exported and read by nobody
// (STATUS D07a-11). Each is consumed at tracker CONSTRUCTION, which is exactly why all four are
// restart-required — `resolutionMode` in `TrackerService.wireSession`/`restartTracker` via
// `cameraRequestFor`, and the other three here.

/**
 * `modelDir`, `modelAsset` and `epRequest`, plus the requested-vs-actual record 07b renders.
 *
 * [Attached] carries the classifier's MEASURED answer, never the request: a quiet fall-through from
 * the NPU to the CPU is the same failure as a silent attach failure, one rung softer — same fps, ten
 * times the latency (MEMORY `android-live-bringup-2607`). `classifier.backend` is what ORT's own
 * profile saw execute, so this line cannot repeat a wish back as a result. `staged.dir.name` is the
 * model that was really staged for the same reason — with three bundled models an A/B is worthless
 * if the panel echoes the request back instead of naming what ran.
 */
private const val CNN_TAG = "chesslabCnn"

fun openClassifier(
    context: Context,
    app: AppSettings,
    probe: CnnRuntimeProbe,
): Attached {
    val staged = CnnModelAssets.fromAssets(context, app.modelDir, app.modelAsset).stage()
    val classifier = OnnxSquareClassifier.open(staged, AndroidTrackerLog(CNN_TAG), app.epRequest)
    probe.requestedEp = requestedBackend(staged, app.epRequest)
    probe.actualEp = classifier.backend
    probe.modelDir = staged.dir.name
    probe.model = classifier.model
    probe.inputShape = classifier.inputShape
    probe.lastRunMs = classifier::lastRunMs
    return Attached(classifier, classifier.backend, classifier.model)
}

/**
 * `orientation`, START direction: the stored profile wins and the setting is synced to it.
 *
 * 06a's calibration screen has its own a8 switch and writes the profile, so at startup the profile
 * is the truth — a stale setting must not transpose the board behind the user's back. The other
 * direction (setting wins, written into the profile) belongs to an explicit restart; see
 * `CalibrationStore.applyOrientation`.
 */
suspend fun adoptStoredOrientation(
    calibration: CalibrationStore,
    settings: SettingsRepository,
): BoardGeometry {
    calibration.load()
    val stored = calibration.geometry
    val app = settings.appSettings.value
    val fromProfile = BoardOrientation.entries.first { it.whitePov == stored.whitePov }
    if (fromProfile != app.orientation) settings.updateApp(app.copy(orientation = fromProfile))
    return stored
}
